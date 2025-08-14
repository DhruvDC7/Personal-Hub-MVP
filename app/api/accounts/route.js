import { ObjectId } from "mongodb";
import { accountSchema } from "@/models/schemas";
import logs from "@/helpers/logs";
import { errorObject } from "@/helpers/errorObject";
import {
  MongoClientFind,
  MongoClientInsertOne,
  MongoClientUpdateOne,
  MongoClientFindOne,
  MongoClientDeleteOne,
  MongoClientDocumentCount,
} from "@/helpers/mongo";
import { MongoClientDeleteMany } from "@/helpers/mongo";
import { requireAuth } from "@/middleware/auth";

const toObjectId = (id) => id;

export async function GET(req) {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(2, 9);
  
  try {
    const { userId } = requireAuth(req);
    const { status, data, message } = await MongoClientFind(
      "accounts",
      { user_id: userId },
      { sort: { created_on: -1 } }
    );
    if (!status) throw new Error(message);
    return Response.json({ status: true, data });
  } catch (e) {
    if (e.status === 401) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }
    const errorMsg = e?.message || "GET /accounts failed";
    await logs(req, errorMsg, 500);
    return new Response(errorObject("Internal error", 500), { status: 500 });
  }
}

export async function POST(req) {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(2, 9);
  
  const body = await req.json();
  const { error, value } = accountSchema.validate(body, { abortEarly: false });
  
  if (error) {
    await logs(req, error.message, 403, body);
    return new Response(errorObject(error.message, 403), { status: 403 });
  }
  
  try {
    const { userId } = requireAuth(req);
    // Capture requested initial balance, but store account with balance 0 first
    const requestedInitialBalance = typeof value.balance === 'number' ? value.balance : 0;
    const now = new Date();
    const doc = {
      ...value,
      balance: 0,
      user_id: userId,
      created_on: now,
      updated_on: now,
    };
    const { status, id, message } = await MongoClientInsertOne("accounts", doc);
    if (!status) throw new Error(message);

    // If there is an initial balance, create an Opening Balance transaction
    if (requestedInitialBalance !== 0) {
      const openingAmount = Math.abs(requestedInitialBalance);
      // For loan accounts, a positive opening balance represents liability outstanding.
      // We record it as an EXPENSE (so it doesn't inflate income), but still INCREASE the loan balance.
      const isLoan = String(value?.type || '').toLowerCase() === 'loan';
      const openingType = isLoan
        ? (requestedInitialBalance >= 0 ? 'expense' : 'income')
        : (requestedInitialBalance >= 0 ? 'income' : 'expense');
      const txDoc = {
        user_id: userId,
        type: openingType,
        account_id: id,
        amount: openingAmount,
        currency: value.currency || 'INR',
        category: 'Opening Balance',
        note: 'Initial balance at account creation',
        tags: ['opening'],
        attachment_ids: [],
        created_on: now,
        updated_on: now,
        happened_on: now,
      };
      const txRes = await MongoClientInsertOne('transactions', txDoc);
      if (!txRes.status) throw new Error(txRes.message || 'Failed to create opening balance transaction');

      // Apply balance delta to the account, mirroring transaction semantics
      // For loans: positive requested balance should increase liability (balance)
      const delta = isLoan
        ? (requestedInitialBalance >= 0 ? openingAmount : -openingAmount)
        : (openingType === 'income' ? openingAmount : -openingAmount);
      await MongoClientUpdateOne(
        'accounts',
        { _id: id, user_id: userId },
        { $inc: { balance: delta }, $set: { updated_on: now } }
      );
    }

    return Response.json(
      { status: true, data: { id, ...doc, balance: requestedInitialBalance } },
      { status: 201 }
    );
  } catch (e) {
    if (e.status === 401) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }
    const errorMsg = e?.message || "POST /accounts failed";
    await logs(req, errorMsg, 500, body);
    return new Response(errorObject("Internal error", 500), { status: 500 });
  }
}

export async function PUT(req) {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(2, 9);
  
  try {
    const body = await req.json();
    const { id, name, type, balance, currency, meta } = body || {};
    if (!id) {
      return new Response(errorObject("id is required", 400), { status: 400 });
    }
    const { userId } = requireAuth(req);

    // Load existing account to compute balance delta and validate ownership
    const { found: accFound, data: existingAcc } = await MongoClientFindOne(
      "accounts",
      { _id: id, user_id: userId }
    );
    if (!accFound) {
      return new Response(errorObject("Account not found", 404), { status: 404 });
    }

    const now = new Date();
    const set = { updated_on: now };
    if (typeof name === "string") set.name = name;
    if (typeof type === "string") set.type = type;
    if (typeof currency === "string") set.currency = currency;
    if (meta && typeof meta === "object") set.meta = meta;

    // If balance provided, create an adjustment transaction and apply delta
    let appliedDelta = 0;
    if (typeof balance === "number" && typeof existingAcc.balance === "number" && balance !== existingAcc.balance) {
      appliedDelta = balance - existingAcc.balance;

      // Create a Balance Adjustment transaction (single-account)
      const amountAbs = Math.abs(appliedDelta);
      const isLoan = String(existingAcc?.type || '').toLowerCase() === 'loan';
      const txDoc = {
        user_id: userId,
        // Loan semantics: lowering loan (delta<0) is income; increasing loan (delta>0) is expense
        type: isLoan ? (appliedDelta >= 0 ? "expense" : "income") : (appliedDelta >= 0 ? "income" : "expense"),
        account_id: id,
        amount: amountAbs,
        currency: existingAcc.currency || currency || "INR",
        category: "Balance Adjustment",
        note: `Adjusted balance from ${existingAcc.balance} to ${balance}`,
        tags: ["adjustment"],
        attachment_ids: [],
        created_on: now,
        updated_on: now,
        happened_on: now,
      };
      const txRes = await MongoClientInsertOne("transactions", txDoc);
      if (!txRes.status) throw new Error(txRes.message || "Failed to create adjustment transaction");
    }

    // Build update operation: set fields and increment balance by delta if any
    const updateOp = appliedDelta !== 0
      ? { $set: set, $inc: { balance: appliedDelta } }
      : { $set: set };

    const { status, message } = await MongoClientUpdateOne(
      "accounts",
      { _id: id, user_id: userId },
      updateOp
    );
    if (!status) throw new Error(message);
    return Response.json({ status: true, data: { id, ...set, ...(appliedDelta !== 0 ? { balance } : {}) } });
  } catch (e) {
    if (e.status === 401) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }
    const errorMsg = e?.message || "PUT /accounts failed";
    await logs(req, errorMsg, 500, body);
    return new Response(errorObject("Internal error", 500), { status: 500 });
  }
}

export async function DELETE(req) {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(2, 9);
  
  try {
    const body = await req.json().catch(() => ({}));
    const { searchParams } = new URL(req.url);
    const id = body?.id || searchParams.get("id");
    const force = (body?.force ?? searchParams.get("force")) === "true";
    if (!id) return new Response(errorObject("id is required", 400), { status: 400 });

    try {
      new ObjectId(String(id));
    } catch {
      return new Response(errorObject("invalid id", 400), { status: 400 });
    }
    const { userId } = requireAuth(req);
    const { status: countStatus, data: count } = await MongoClientDocumentCount(
      "transactions",
      { account_id: id, user_id: userId }
    );
    if (!countStatus) {
      return new Response(errorObject("Internal error", 500), { status: 500 });
    }
    if (count > 0 && !force) {
      return new Response(
        errorObject("Account has transactions", 409),
        { status: 409 }
      );
    }
    // Cascade delete transactions if force=true
    if (count > 0 && force) {
      const delTx = await MongoClientDeleteMany(
        "transactions",
        { account_id: id, user_id: userId }
      );
      if (!delTx.status) {
        return new Response(errorObject("Failed to delete related transactions", 500), { status: 500 });
      }
    }
    const { status: delStatus, message } = await MongoClientDeleteOne(
      "accounts",
      { _id: id, user_id: userId }
    );
    if (!delStatus) throw new Error(message);
    return Response.json({ status: true, data: { id } });
  } catch (e) {
    if (e.status === 401) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }
    const errorMsg = e?.message || "DELETE /accounts failed";
    await logs(req, errorMsg, 500, { id });
    return new Response(errorObject("Internal error", 500), { status: 500 });
  }
}
