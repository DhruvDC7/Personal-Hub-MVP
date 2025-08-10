import dayjs from "dayjs";
import { ObjectId } from "mongodb";
import { transactionSchema } from "@/models/schemas";
import logs from "@/helpers/logs";
import { errorObject } from "@/helpers/errorObject";
import {
  MongoApiFind,
  MongoApiInsertOne,
  MongoApiUpdateOne,
  MongoApiFindOne,
  MongoApiDeleteOne,
} from "@/helpers/mongo";

const toObjectId = (id) => ({ $oid: String(id) });

export async function GET(req) {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(2, 9);
  
  console.log(`[API] [${requestId}] GET /api/transactions - Starting`);
  
  try {
    const user_id = "demo-user";
    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month");
    const type = searchParams.get("type");
    const account = searchParams.get("account");
    const limit = parseInt(searchParams.get("limit")) || 0;
    const start = month
      ? dayjs(`${month}-01`).startOf("month").toDate()
      : dayjs().startOf("month").toDate();
    const end = month
      ? dayjs(`${month}-01`).endOf("month").toDate()
      : dayjs().endOf("month").toDate();

    const query = {
      user_id,
      happened_on: { $gte: start, $lte: end },
    };
    if (type) query.type = type;
    if (account) {
      try {
        query.account_id = toObjectId(account);
      } catch {
        return new Response(errorObject("invalid account", 400), {
          status: 400,
        });
      }
    }

    const { status, data, message } = await MongoApiFind(
      "transactions",
      query,
      { sort: { happened_on: -1 }, ...(limit ? { limit } : {}) }
    );
    if (!status) throw new Error(message);
    const items = data;
      
    console.log(`[API] [${requestId}] GET /api/transactions - Success (${Date.now() - startTime}ms) - Found ${items.length} items`);
    return Response.json({ status: true, data: items });
  } catch (e) {
    const errorMsg = e?.message || "GET /transactions failed";
    console.error(`[API] [${requestId}] GET /api/transactions - Error (${Date.now() - startTime}ms):`, errorMsg);
    console.error(e);
    await logs(req, errorMsg, 500);
    return new Response(errorObject("Internal error", 500), { status: 500 });
  }
}

export async function POST(req) {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(2, 9);
  
  console.log(`[API] [${requestId}] POST /api/transactions - Starting`);

  const raw = await req.json();
  const body = { ...raw };
  if (body.account && !body.account_id) {
    body.account_id = body.account;
    delete body.account;
  }
  const { error, value } = transactionSchema.validate(body, { abortEarly: false });
  
  if (error) {
    console.error(`[API] [${requestId}] POST /api/transactions - Validation failed (${Date.now() - startTime}ms):`, error.message);
    await logs(req, error.message, 403, raw);
    return new Response(errorObject(error.message, 403), { status: 403 });
  }
  
  try {
    const user_id = "demo-user";

    let accId;
    try {
      accId = new ObjectId(value.account_id);
    } catch {
      return new Response(errorObject("account_id invalid", 400), {
        status: 400,
      });
    }

    const { status: accStatus, data: acc } = await MongoApiFindOne(
      "accounts",
      { _id: toObjectId(accId.toString()), user_id }
    );

    if (!accStatus || !acc) {
      return new Response(
        errorObject("account_id invalid or not found", 404),
        { status: 404 }
      );
    }

    const doc = {
      ...value,
      account_id: accId,
      user_id,
      happened_on: new Date(value.happened_on),
      created_on: new Date(),
      updated_on: new Date(),
    };
    
    const { status, id, message } = await MongoApiInsertOne("transactions", doc);
    if (!status) throw new Error(message);
    console.log(`[API] [${requestId}] POST /api/transactions - Created transaction ${id} (${Date.now() - startTime}ms)`);

    // Update account balance
    console.log(`[API] [${requestId}] POST /api/transactions - Updating account balance, delta: ${delta}`);
    let delta = 0;
    if (value.type === "expense") delta = -value.amount;
    if (value.type === "income") delta = value.amount;
    
    if (delta !== 0) {
      await MongoApiUpdateOne(
        "accounts",
        { _id: toObjectId(accId.toString()), user_id },
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
    const errorMsg = e?.message || "POST /transactions failed";
    console.error(`[API] [${requestId}] POST /api/transactions - Error (${Date.now() - startTime}ms):`, errorMsg);
    console.error(e);
    await logs(req, errorMsg, 500, raw);
    return new Response(errorObject("Internal error", 500), { status: 500 });
  }
}

export async function PUT(req) {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(2, 9);
  
  console.log(`[API] [${requestId}] PUT /api/transactions - Starting`);

  try {
    const body = await req.json();
    if (body.account && !body.account_id) {
      body.account_id = body.account;
      delete body.account;
    }
    const { id, account_id, type, amount, currency, category, note, tags, happened_on, attachment_ids } = body || {};
    if (!id) return new Response(errorObject("id is required", 400), { status: 400 });

    const user_id = "demo-user";
    let txId;
    try {
      txId = new ObjectId(String(id));
    } catch {
      return new Response(errorObject("invalid id", 400), { status: 400 });
    }
    const { status: existingStatus, data: existing } = await MongoApiFindOne(
      "transactions",
      { _id: toObjectId(txId.toString()), user_id }
    );
    if (!existingStatus || !existing)
      return new Response(errorObject("transaction not found", 404), { status: 404 });

    // Prepare update fields
    const set = { updated_on: new Date() };
    if (account_id) {
      try {
        set.account_id = new ObjectId(String(account_id));
      } catch {
        return new Response(errorObject("invalid account_id", 400), {
          status: 400,
        });
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

    // Validate new account ownership if changed
    const newAccountId = set.account_id ? set.account_id : existing.account_id;
    const { status: accStatus, data: acc } = await MongoApiFindOne(
      "accounts",
      { _id: toObjectId(newAccountId.toString()), user_id }
    );
    if (!accStatus || !acc)
      return new Response(errorObject("account_id invalid or not found", 404), { status: 404 });

    // Compute balance adjustments
    const prevSign = existing.type === "expense" ? -1 : existing.type === "income" ? 1 : 0;
    const nextType = set.type ?? existing.type;
    const nextAmount = typeof set.amount === "number" ? set.amount : existing.amount;
    const nextSign = nextType === "expense" ? -1 : nextType === "income" ? 1 : 0;

    const prevAccId = existing.account_id;
    const nextAccId = newAccountId;

    const ops = [];
    if (prevSign !== 0) {
      ops.push(
        MongoApiUpdateOne(
          "accounts",
          { _id: toObjectId(prevAccId.toString()), user_id },
          { $inc: { balance: -(prevSign * existing.amount) }, $set: { updated_on: new Date() } }
        )
      );
    }
    if (nextSign !== 0) {
      ops.push(
        MongoApiUpdateOne(
          "accounts",
          { _id: toObjectId(nextAccId.toString()), user_id },
          { $inc: { balance: nextSign * nextAmount }, $set: { updated_on: new Date() } }
        )
      );
    }
    if (ops.length) await Promise.all(ops);

    await MongoApiUpdateOne(
      "transactions",
      { _id: toObjectId(txId.toString()), user_id },
      { $set: set }
    );
    console.log(`[API] [${requestId}] PUT /api/transactions - Updated transaction ${id} (${Date.now() - startTime}ms)`);
    return Response.json({ status: true, data: { id, ...set } });
  } catch (e) {
    const errorMsg = e?.message || "PUT /transactions failed";
    console.error(`[API] [${requestId}] PUT /api/transactions - Error (${Date.now() - startTime}ms):`, errorMsg);
    console.error(e);
    await logs(req, errorMsg, 500);
    return new Response(errorObject("Internal error", 500), { status: 500 });
  }
}

export async function DELETE(req) {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(2, 9);
  
  console.log(`[API] [${requestId}] DELETE /api/transactions - Starting`);
  
  try {
    const body = await req.json().catch(() => ({}));
    const { searchParams } = new URL(req.url);
    const id = body?.id || searchParams.get("id");
    if (!id) return new Response(errorObject("id is required", 400), { status: 400 });

    let objId;
    try {
      objId = new ObjectId(String(id));
    } catch {
      return new Response(errorObject("invalid id", 400), { status: 400 });
    }

    const user_id = "demo-user";
    const { status: txStatus, data: tx } = await MongoApiFindOne(
      "transactions",
      { _id: toObjectId(objId.toString()), user_id }
    );
    if (!txStatus || !tx)
      return new Response(errorObject("transaction not found", 404), { status: 404 });

    // reverse balance
    const sign = tx.type === "expense" ? -1 : tx.type === "income" ? 1 : 0;
    if (sign !== 0) {
      await MongoApiUpdateOne(
        "accounts",
        { _id: toObjectId(tx.account_id.toString()), user_id },
        { $inc: { balance: -(sign * tx.amount) }, $set: { updated_on: new Date() } }
      );
    }

    await MongoApiDeleteOne("transactions", { _id: toObjectId(objId.toString()), user_id });
    console.log(`[API] [${requestId}] DELETE /api/transactions - Deleted transaction ${id} (${Date.now() - startTime}ms)`);
    return Response.json({ status: true, data: { id } });
  } catch (e) {
    const errorMsg = e?.message || "DELETE /transactions failed";
    console.error(`[API] [${requestId}] DELETE /api/transactions - Error (${Date.now() - startTime}ms):`, errorMsg);
    console.error(e);
    await logs(req, errorMsg, 500);
    return new Response(errorObject("Internal error", 500), { status: 500 });
  }
}
