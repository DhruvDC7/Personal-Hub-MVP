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

export async function GET(req) {
  try {
    const user_id = "demo-user";
    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month");
    const type = searchParams.get("type");
    const account = searchParams.get("account");
    const limit = parseInt(searchParams.get("limit")) || 0;
    
    const start = month ? dayjs(`${month}-01`).startOf("month").toDate() : dayjs().startOf("month").toDate();
    const end = month ? dayjs(`${month}-01`).endOf("month").toDate() : dayjs().endOf("month").toDate();

    const query = { user_id, happened_on: { $gte: start, $lte: end } };
    if (type) query.type = type;
    
    if (account) {
      query.account_id = account;
    }

    const { status, data, message } = await MongoClientFind(
      "transactions",
      query,
      { sort: { happened_on: -1 }, ...(limit ? { limit } : {}) }
    );
    
    if (!status) throw new Error(message);
    return Response.json({ status: true, data });
    
  } catch (e) {
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
    
    const user_id = "demo-user";
    const doc = {
      ...value,
      user_id,
      happened_on: new Date(value.happened_on),
      created_on: new Date(),
      updated_on: new Date(),
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
          $set: { updated_on: new Date() },
        }
      );
    }

    return Response.json(
      { status: true, data: { id, ...doc } },
      { status: 201 }
    );
      
  } catch (e) {
    await logs(req, `Transaction creation failed: ${e.message}`, 500, body);
    return new Response(errorObject("Failed to create transaction", 500), { 
      status: 500 
    });
  }
}

export async function PUT(req) {
  try {
    const body = await req.json();
    const { id, account_id, type, amount, currency, category, note, tags, happened_on, attachment_ids } = body || {};
    
    if (!id) return new Response(errorObject("Transaction ID is required", 400), { status: 400 });

    const user_id = "demo-user";
    let txId;
    
    try {
      txId = new ObjectId(String(id));
    } catch {
      return new Response(errorObject("Invalid transaction ID", 400), { status: 400 });
    }

    // Verify transaction exists
    const { status: existingStatus, data: existing } = await MongoClientFindOne(
      "transactions",
      { _id: toObjectId(txId.toString()), user_id }
    );
    
    if (!existingStatus || !existing) {
      return new Response(errorObject("Transaction not found", 404), { status: 404 });
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
    if (happened_on) set.happened_on = new Date(happened_on);
    if (Array.isArray(attachment_ids)) set.attachment_ids = attachment_ids;

    // Validate account ownership if changed
    const newAccountId = set.account_id ? set.account_id : existing.account_id;
    const { status: accStatus, data: acc } = await MongoClientFindOne(
      "accounts",
      { _id: toObjectId(newAccountId.toString()), user_id }
    );
    
    if (!accStatus || !acc) {
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
      { _id: toObjectId(txId.toString()), user_id },
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

    const user_id = "demo-user";
    let txId;
    
    try {
      txId = new ObjectId(String(id));
    } catch {
      return new Response(errorObject("Invalid transaction ID", 400), { status: 400 });
    }

    // Get transaction to update account balance
    const { status: existingStatus, data: existing } = await MongoClientFindOne(
      "transactions",
      { _id: toObjectId(txId.toString()), user_id }
    );
    
    if (!existingStatus || !existing) {
      return new Response(errorObject("Transaction not found", 404), { status: 404 });
    }

    // Update account balance
    const sign = existing.type === "expense" ? 1 : existing.type === "income" ? -1 : 0;
    
    if (sign !== 0) {
      await MongoClientUpdateOne(
        "accounts",
        { _id: toObjectId(existing.account_id.toString()) },
        { $inc: { balance: sign * existing.amount } }
      );
    }

    // Delete transaction
    const { status, message } = await MongoClientDeleteOne("transactions", {
      _id: toObjectId(txId.toString()),
      user_id,
    });
    
    if (!status) throw new Error(message);

    return Response.json({ 
      status: true, 
      data: { id: txId } 
    });
      
  } catch (e) {
    await logs(req, `Failed to delete transaction: ${e.message}`, 500);
    return new Response(errorObject("Failed to delete transaction", 500), { 
      status: 500 
    });
  }
}
