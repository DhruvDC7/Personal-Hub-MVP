import { ObjectId } from "mongodb";
import { accountSchema } from "@/models/schemas";
import logs from "@/helpers/logs";
import { errorObject } from "@/helpers/errorObject";
import {
  MongoClientFind,
  MongoClientInsertOne,
  MongoClientUpdateOne,
  MongoClientDeleteOne,
} from "@/helpers/mongo";

const toObjectId = (id) => ({ $oid: String(id) });

export async function GET(req) {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(2, 9);
  
  console.log(`[API] [${requestId}] GET /api/accounts - Starting`);
  
  try {
    const user_id = "demo-user";
    console.log( "account get hit ");
    const { status, data, message } = await MongoClientFind(
      "accounts",
      { user_id },
      { sort: { created_on: -1 } }
    );
    if (!status) throw new Error(message);
    console.log(
      `[API] [${requestId}] GET /api/accounts - Success (${Date.now() - startTime}ms) - Found ${data.length} items`
    );
    return Response.json({ status: true, data });
  } catch (e) {
    const errorMsg = e?.message || "GET /accounts failed";
    console.error(`[API] [${requestId}] GET /api/accounts - Error (${Date.now() - startTime}ms):`, errorMsg);
    console.error(e);
    await logs(req, errorMsg, 500);
    return new Response(errorObject("Internal error", 500), { status: 500 });
  }
}

export async function POST(req) {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(2, 9);
  
  console.log(`[API] [${requestId}] POST /api/accounts - Starting`);
  
  const body = await req.json();
  const { error, value } = accountSchema.validate(body, { abortEarly: false });
  
  if (error) {
    console.error(`[API] [${requestId}] POST /api/accounts - Validation failed (${Date.now() - startTime}ms):`, error.message);
    await logs(req, error.message, 403, body);
    return new Response(errorObject(error.message, 403), { status: 403 });
  }
  
  try {
    const user_id = "demo-user";
    const doc = {
      ...value,
      user_id,
      created_on: new Date(),
      updated_on: new Date(),
    };
    const { status, id, message } = await MongoClientInsertOne("accounts", doc);
    if (!status) throw new Error(message);
    console.log(
      `[API] [${requestId}] POST /api/accounts - Created account ${id} (${Date.now() - startTime}ms)`
    );
    return Response.json(
      { status: true, data: { id, ...doc } },
      { status: 201 }
    );
  } catch (e) {
    const errorMsg = e?.message || "POST /accounts failed";
    console.error(`[API] [${requestId}] POST /api/accounts - Error (${Date.now() - startTime}ms):`, errorMsg);
    console.error(e);
    await logs(req, errorMsg, 500, body);
    return new Response(errorObject("Internal error", 500), { status: 500 });
  }
}

export async function PUT(req) {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(2, 9);
  
  console.log(`[API] [${requestId}] PUT /api/accounts - Starting`);
  
  try {
    const body = await req.json();
    const { id, name, type, balance, currency, meta } = body || {};
    if (!id) {
      return new Response(errorObject("id is required", 400), { status: 400 });
    }
    const user_id = "demo-user";
    try {
      new ObjectId(String(id));
    } catch {
      return new Response(errorObject("invalid id", 400), { status: 400 });
    }
    const set = { updated_on: new Date() };
    if (typeof name === "string") set.name = name;
    if (typeof type === "string") set.type = type;
    if (typeof currency === "string") set.currency = currency;
    if (typeof balance === "number") set.balance = balance;
    if (meta && typeof meta === "object") set.meta = meta;
    const { status, message } = await MongoClientUpdateOne(
      "accounts",
      { _id: toObjectId(id), user_id },
      { $set: set }
    );
    if (!status) throw new Error(message);
    console.log(
      `[API] [${requestId}] PUT /api/accounts - Updated account ${id} (${Date.now() - startTime}ms)`
    );
    return Response.json({ status: true, data: { id, ...set } });
  } catch (e) {
    const errorMsg = e?.message || "PUT /accounts failed";
    console.error(`[API] [${requestId}] PUT /api/accounts - Error (${Date.now() - startTime}ms):`, errorMsg);
    console.error(e);
    await logs(req, errorMsg, 500);
    return new Response(errorObject("Internal error", 500), { status: 500 });
  }
}

export async function DELETE(req) {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(2, 9);
  
  console.log(`[API] [${requestId}] DELETE /api/accounts - Starting`);
  
  try {
    const body = await req.json().catch(() => ({}));
    const { searchParams } = new URL(req.url);
    const id = body?.id || searchParams.get("id");
    if (!id) return new Response(errorObject("id is required", 400), { status: 400 });

    try {
      new ObjectId(String(id));
    } catch {
      return new Response(errorObject("invalid id", 400), { status: 400 });
    }
    const user_id = "demo-user";
    const { status: countStatus, data: count } = await MongoClientDocumentCount(
      "transactions",
      { account_id: toObjectId(id), user_id }
    );
    if (!countStatus) {
      return new Response(errorObject("Internal error", 500), { status: 500 });
    }
    if (count > 0) {
      return new Response(
        errorObject("Account has transactions", 409),
        { status: 409 }
      );
    }
    const { status: delStatus, message } = await MongoClientDeleteOne(
      "accounts",
      { _id: toObjectId(id), user_id }
    );
    if (!delStatus) throw new Error(message);
    console.log(
      `[API] [${requestId}] DELETE /api/accounts - Deleted account ${id} (${Date.now() - startTime}ms)`
    );
    return Response.json({ status: true, data: { id } });
  } catch (e) {
    const errorMsg = e?.message || "DELETE /accounts failed";
    console.error(`[API] [${requestId}] DELETE /api/accounts - Error (${Date.now() - startTime}ms):`, errorMsg);
    console.error(e);
    await logs(req, errorMsg, 500);
    return new Response(errorObject("Internal error", 500), { status: 500 });
  }
}
