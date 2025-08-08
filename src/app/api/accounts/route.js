import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongo";
import { accountSchema } from "@/models/schemas";
import logs from "@/helpers/logs";
import { errorObject } from "@/helpers/errorObject";

export async function GET(req) {
  try {
    const db = await getDb();
    const user_id = "demo-user";
    const items = await db.collection("accounts")
      .find({ user_id })
      .sort({ created_on: -1 })
      .toArray();
    return Response.json({ status: true, data: items });
  } catch (e) {
    await logs(req, e?.message || "GET /accounts failed", 500);
    return new Response(errorObject("Internal error", 500), { status: 500 });
  }
}

export async function POST(req) {
  const body = await req.json();
  const { error, value } = accountSchema.validate(body, { abortEarly: false });
  
  if (error) {
    await logs(req, error.message, 403, body);
    return new Response(errorObject(error.message, 403), { status: 403 });
  }
  
  try {
    const db = await getDb();
    const user_id = "demo-user";
    const doc = { 
      ...value, 
      user_id, 
      created_on: new Date(), 
      updated_on: new Date() 
    };
    
    const r = await db.collection("accounts").insertOne(doc);
    return Response.json(
      { status: true, data: { _id: r.insertedId, ...doc } },
      { status: 201 }
    );
  } catch (e) {
    await logs(req, e?.message || "POST /accounts failed", 500, body);
    return new Response(errorObject("Internal error", 500), { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const body = await req.json();
    const { _id, name, type, balance, currency, meta } = body || {};
    if (!_id) {
      return new Response(errorObject("_id is required", 400), { status: 400 });
    }
    const db = await getDb();
    const user_id = "demo-user";
    let objId;
    try {
      objId = new ObjectId(String(_id));
    } catch {
      return new Response(errorObject("invalid _id", 400), { status: 400 });
    }
    // Build update doc with only allowed fields
    const set = { updated_on: new Date() };
    if (typeof name === "string") set.name = name;
    if (typeof type === "string") set.type = type;
    if (typeof currency === "string") set.currency = currency;
    if (typeof balance === "number") set.balance = balance;
    if (meta && typeof meta === "object") set.meta = meta;

    const r = await db.collection("accounts").updateOne(
      { _id: objId, user_id },
      { $set: set }
    );
    if (r.matchedCount === 0) {
      return new Response(errorObject("account not found", 404), { status: 404 });
    }
    return Response.json({ status: true, data: { _id, ...set } });
  } catch (e) {
    await logs(req, e?.message || "PUT /accounts failed", 500);
    return new Response(errorObject("Internal error", 500), { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const { searchParams } = new URL(req.url);
    const id = body?._id || searchParams.get("id");
    if (!id) return new Response(errorObject("id is required", 400), { status: 400 });

    let _id;
    try {
      _id = new ObjectId(String(id));
    } catch {
      return new Response(errorObject("invalid id", 400), { status: 400 });
    }

    const db = await getDb();
    const user_id = "demo-user";

    // Ensure no linked transactions
    const txCount = await db
      .collection("transactions")
      .countDocuments({ account_id: _id, user_id });
    if (txCount > 0) {
      return new Response(
        errorObject("Account has transactions", 409),
        { status: 409 }
      );
    }

    const r = await db.collection("accounts").deleteOne({ _id, user_id });
    if (r.deletedCount === 0) {
      return new Response(errorObject("account not found", 404), { status: 404 });
    }
    return Response.json({ status: true, data: { _id: id } });
  } catch (e) {
    await logs(req, e?.message || "DELETE /accounts failed", 500);
    return new Response(errorObject("Internal error", 500), { status: 500 });
  }
}
