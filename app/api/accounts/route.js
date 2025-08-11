import { ObjectId } from "mongodb";
import { accountSchema } from "@/models/schemas";
import logs from "@/helpers/logs";
import { errorObject } from "@/helpers/errorObject";
import {
  MongoClientFind,
  MongoClientInsertOne,
  MongoClientUpdateOne,
  MongoClientDeleteOne,
  MongoClientDocumentCount,
} from "@/helpers/mongo";
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
    const doc = {
      ...value,
      user_id: userId,
      created_on: new Date(),
      updated_on: new Date(),
    };
    const { status, id, message } = await MongoClientInsertOne("accounts", doc);
    if (!status) throw new Error(message);
    return Response.json(
      { status: true, data: { id, ...doc } },
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
    const set = { updated_on: new Date() };
    if (typeof name === "string") set.name = name;
    if (typeof type === "string") set.type = type;
    if (typeof currency === "string") set.currency = currency;
    if (typeof balance === "number") set.balance = balance;
    if (meta && typeof meta === "object") set.meta = meta;
    const { status, message } = await MongoClientUpdateOne(
      "accounts",
      { _id: id, user_id: userId },
      { $set: set }
    );
    if (!status) throw new Error(message);
    return Response.json({ status: true, data: { id, ...set } });
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
    if (count > 0) {
      return new Response(
        errorObject("Account has transactions", 409),
        { status: 409 }
      );
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
