import dayjs from "dayjs";
import { ObjectId } from "mongodb";
import { transactionSchema } from "@/models/schemas";
import logs from "@/helpers/logs";
import { errorObject } from "@/helpers/errorObject";
import {
  MongoClientFind,
  MongoClientInsertOne,
  MongoClientUpdateOne,
  MongoClientFindOne,
  MongoClientDeleteOne,
} from "@/helpers/mongo";
import { requireAuth } from "@/middleware/auth";
import { TRANSACTION_TYPES, CATEGORY_TRANSFER, ACCOUNT_TYPES } from "@/constants/types";

const toObjectId = (id) => id;

export async function GET(req) {
  try {
    const { userId } = requireAuth(req);
    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month");
    const type = searchParams.get("type");
    const account = searchParams.get("account");
    const limit = parseInt(searchParams.get("limit")) || 0;
    
    const query = { user_id: userId };
    if (month) {
      const start = dayjs(`${month}-01`).startOf("month").toDate();
      const end = dayjs(`${month}-01`).endOf("month").toDate();
      query.created_on = { $gte: start, $lte: end };
    }
    if (type) query.type = type;
    
    if (account) {
      // Include single-account txns and transfers involving this account
      query.$or = [
        { account_id: account },
        { from_account_id: account },
        { to_account_id: account },
      ];
    }

    const { status, data, message } = await MongoClientFind(
      "transactions",
      query,
      { sort: { created_on: -1 }, ...(limit ? { limit } : {}) }
    );
    
    if (!status) throw new Error(message);
    return Response.json({ status: true, data });
    
  } catch (e) {
    if (e.status === 401) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }
    await logs(req, e?.message || "Failed to fetch transactions", 500);
    return new Response(errorObject("Internal server error", 500), { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { error, value } = transactionSchema.validate(body, { abortEarly: false });
    
    if (error) {
      await logs(req, `Validation error: ${error.message}`, 400, body);
      return new Response(errorObject(error.message, 400), { status: 400 });
    }
    
    const { userId } = requireAuth(req);
    const now = new Date();
    const baseDoc = {
      user_id: userId,
      created_on: now,
      updated_on: now,
      happened_on: value.happened_on ? new Date(value.happened_on) : now,
    };

    // Same-currency only logic for transfers
    if (value.type === TRANSACTION_TYPES.TRANSFER) {
      const { from_account_id, to_account_id, amount, currency } = value;
      if (from_account_id === to_account_id) {
        return new Response(errorObject("From and To accounts must differ", 400), { status: 400 });
      }

      // Load both accounts and validate ownership + currency
      const [fromRes, toRes] = await Promise.all([
        MongoClientFindOne("accounts", { _id: from_account_id, user_id: userId }),
        MongoClientFindOne("accounts", { _id: to_account_id, user_id: userId }),
      ]);
      if (!fromRes.found) {
        return new Response(errorObject("From account not found", 404), { status: 404 });
      }
      if (!toRes.found) {
        return new Response(errorObject("To account not found", 404), { status: 404 });
      }
      const fromAcc = fromRes.data;
      const toAcc = toRes.data;
      const fromCur = fromAcc.currency || currency;
      const toCur = toAcc.currency || currency;
      if (fromCur !== toCur) {
        return new Response(errorObject("Cross-currency transfer not supported", 400), { status: 400 });
      }

      // Compute balance deltas
      // Default transfer: decrement from, increment to
      let fromDelta = -amount;
      let toDelta = +amount;
      const isFromLoan = String(fromAcc.type).toLowerCase() === ACCOUNT_TYPES.LOAN;
      const isToLoan = String(toAcc.type).toLowerCase() === ACCOUNT_TYPES.LOAN;

      // Loan semantics:
      // - Repayment (to loan): cash down, loan down
      if (isToLoan) {
        fromDelta = -amount; // asset down
        toDelta = -amount;   // loan down
      }
      // - Drawdown (from loan): cash up, loan up
      else if (isFromLoan) {
        fromDelta = +amount; // loan up
        toDelta = +amount;   // asset up
      }

      // Optional: ensure sufficient funds for asset accounts
      if (!isFromLoan && (fromAcc.balance ?? 0) < amount) {
        return new Response(errorObject("Insufficient balance in from account", 400), { status: 400 });
      }

      const doc = {
        ...baseDoc,
        type: TRANSACTION_TYPES.TRANSFER,
        from_account_id,
        to_account_id,
        amount,
        currency: fromCur,
        category: value.category || CATEGORY_TRANSFER,
        note: value.note || '',
        tags: value.tags || [],
        attachment_ids: value.attachment_ids || [],
      };

      const { status, id, message } = await MongoClientInsertOne("transactions", doc);
      if (!status) throw new Error(message);

      // Apply balance changes
      await Promise.all([
        MongoClientUpdateOne("accounts", { _id: from_account_id }, { $inc: { balance: fromDelta }, $set: { updated_on: now } }),
        MongoClientUpdateOne("accounts", { _id: to_account_id }, { $inc: { balance: toDelta }, $set: { updated_on: now } }),
      ]);

      return Response.json(
        { status: true, data: { id, ...doc } },
        { status: 201 }
      );
    }

    // Expense/Income
    const doc = {
      ...baseDoc,
      ...value,
    };
    const { status, id, message } = await MongoClientInsertOne("transactions", doc);
    if (!status) throw new Error(message);

    // Update account balance
    let delta = 0;
    if (value.type === "expense") delta = -value.amount;
    if (value.type === "income") delta = value.amount;
    
    if (delta !== 0) {
      await MongoClientUpdateOne(
        "accounts",
        { _id: value.account_id },
        {
          $inc: { balance: delta },
          $set: { updated_on: now },
        }
      );
    }

    return Response.json(
      { status: true, data: { id, ...doc } },
      { status: 201 }
    );
      
  } catch (e) {
    if (e.status === 401) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }
    await logs(req, `Transaction creation failed: ${e.message}`, 500, body);
    return new Response(errorObject("Failed to create transaction", 500), {
      status: 500
    });
  }
}

export async function PUT(req) {
  try {
    const body = await req.json();
    const { id, account_id, type, amount, currency, category, note, tags, attachment_ids } = body || {};
    
    if (!id) return new Response(errorObject("Transaction ID is required", 400), { status: 400 });

    const { userId } = requireAuth(req);
    let txId;
    
    try {
      txId = new ObjectId(String(id));
    } catch {
      return new Response(errorObject("Invalid transaction ID", 400), { status: 400 });
    }

    // Verify transaction exists
    const { found: existingFound, data: existing } = await MongoClientFindOne(
      "transactions",
      { _id: toObjectId(txId.toString()), user_id: userId }
    );
    
    if (!existingFound) {
      return new Response(errorObject("Transaction not found", 404), { status: 404 });
    }

    // Block edits for transfer transactions (not supported in this version)
    if (existing.type === TRANSACTION_TYPES.TRANSFER || type === TRANSACTION_TYPES.TRANSFER) {
      return new Response(errorObject("Editing transfers is not supported", 400), { status: 400 });
    }

    // Prepare update fields
    const set = { updated_on: new Date() };
    
    if (account_id) {
      try {
        set.account_id = new ObjectId(String(account_id));
      } catch {
        return new Response(errorObject("Invalid account ID", 400), { status: 400 });
      }
    }
    
    if (type) set.type = type;
    if (typeof amount === "number") set.amount = amount;
    if (currency) set.currency = currency;
    if (category) set.category = category;
    if (typeof note === "string") set.note = note;
    if (Array.isArray(tags)) set.tags = tags;

    if (Array.isArray(attachment_ids)) set.attachment_ids = attachment_ids;

    // Validate account ownership if changed
    const newAccountId = set.account_id ? set.account_id : existing.account_id;
    const { found: accFound, data: acc } = await MongoClientFindOne(
      "accounts",
      { _id: toObjectId(newAccountId.toString()), user_id: userId }
    );
    
    if (!accFound) {
      return new Response(errorObject("Account not found", 404), { status: 404 });
    }

    // Compute balance adjustments
    const prevSign = existing.type === "expense" ? -1 : existing.type === "income" ? 1 : 0;
    const nextType = set.type ?? existing.type;
    const nextAmount = typeof set.amount === "number" ? set.amount : existing.amount;
    const nextSign = nextType === "expense" ? -1 : nextType === "income" ? 1 : 0;

    const prevAccId = existing.account_id;
    const nextAccId = newAccountId;

    // Prepare balance updates
    const ops = [];
    if (prevSign !== 0) {
      ops.push(
        MongoClientUpdateOne(
          "accounts",
          { _id: toObjectId(prevAccId.toString()) },
          { $inc: { balance: -prevSign * existing.amount } }
        )
      );
    }
    
    if (nextSign !== 0) {
      ops.push(
        MongoClientUpdateOne(
          "accounts",
          { _id: toObjectId(nextAccId.toString()) },
          { $inc: { balance: nextSign * nextAmount } }
        )
      );
    }

    // Update transaction
    const { status, message } = await MongoClientUpdateOne(
      "transactions",
      { _id: toObjectId(txId.toString()), user_id: userId },
      { $set: set }
    );
    
    if (!status) throw new Error(message);

    // Execute balance updates
    await Promise.all(ops);

    return Response.json({ 
      status: true, 
      data: { id: txId, ...set } 
    });
      
  } catch (e) {
    if (e.status === 401) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }
    await logs(req, `Failed to update transaction: ${e.message}`, 500);
    return new Response(errorObject("Failed to update transaction", 500), {
      status: 500
    });
  }
}

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    
    if (!id) {
      return new Response(errorObject("Transaction ID is required", 400), { status: 400 });
    }

    const { userId } = requireAuth(req);
    let txId;
    
    try {
      txId = new ObjectId(String(id));
    } catch {
      return new Response(errorObject("Invalid transaction ID", 400), { status: 400 });
    }

    // Get transaction to update account balance
    const { status: existingStatus, data: existing } = await MongoClientFindOne(
      "transactions",
      { _id: toObjectId(txId.toString()), user_id: userId }
    );
    
    if (!existingStatus || !existing) {
      return new Response(errorObject("Transaction not found", 404), { status: 404 });
    }

    // Update account balance (reverse effects)
    if (existing.type === TRANSACTION_TYPES.TRANSFER) {
      // Reverse transfer deltas based on current account types
      const [fromRes, toRes] = await Promise.all([
        MongoClientFindOne("accounts", { _id: existing.from_account_id, user_id: userId }),
        MongoClientFindOne("accounts", { _id: existing.to_account_id, user_id: userId }),
      ]);
      const fromAcc = fromRes?.data || {};
      const toAcc = toRes?.data || {};
      const isFromLoan = String(fromAcc.type || '').toLowerCase() === ACCOUNT_TYPES.LOAN;
      const isToLoan = String(toAcc.type || '').toLowerCase() === ACCOUNT_TYPES.LOAN;

      // Original deltas in POST:
      // default: from -amount, to +amount
      // toLoan: from -amount, to -amount
      // fromLoan: from +amount, to +amount
      let fromDelta = -existing.amount;
      let toDelta = +existing.amount;
      if (isToLoan) {
        fromDelta = -existing.amount;
        toDelta = -existing.amount;
      } else if (isFromLoan) {
        fromDelta = +existing.amount;
        toDelta = +existing.amount;
      }
      // Reverse them for delete
      await Promise.all([
        MongoClientUpdateOne("accounts", { _id: existing.from_account_id }, { $inc: { balance: -fromDelta } }),
        MongoClientUpdateOne("accounts", { _id: existing.to_account_id }, { $inc: { balance: -toDelta } }),
      ]);
    } else {
      const sign = existing.type === "expense" ? 1 : existing.type === "income" ? -1 : 0;
      if (sign !== 0) {
        await MongoClientUpdateOne(
          "accounts",
          { _id: toObjectId(existing.account_id.toString()) },
          { $inc: { balance: sign * existing.amount } }
        );
      }
    }

    // Delete transaction
    const { status, message } = await MongoClientDeleteOne("transactions", {
      _id: toObjectId(txId.toString()),
      user_id: userId,
    });
    
    if (!status) throw new Error(message);

    return Response.json({ 
      status: true, 
      data: { id: txId } 
    });
      
  } catch (e) {
    if (e.status === 401) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }
    await logs(req, `Failed to delete transaction: ${e.message}`, 500);
    return new Response(errorObject("Failed to delete transaction", 500), {
      status: 500
    });
  }
}
