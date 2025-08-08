import dayjs from "dayjs";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongo";
import { transactionSchema } from "@/models/schemas";
import logs from "@/helpers/logs";
import { errorObject } from "@/helpers/errorObject";

export async function GET(req) {
  try {
    const db = await getDb();
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
        query.account_id = new ObjectId(String(account));
      } catch {
        return new Response(errorObject("invalid account", 400), {
          status: 400,
        });
      }
    }

    const cursor = db
      .collection("transactions")
      .find(query)
      .sort({ happened_on: -1 });
    if (limit) cursor.limit(limit);
    const items = await cursor.toArray();
      
    return Response.json({ status: true, data: items });
  } catch (e) {
    await logs(req, e?.message || "GET /transactions failed", 500);
    return new Response(errorObject("Internal error", 500), { status: 500 });
  }
}

export async function POST(req) {
  const raw = await req.json();
  const { error, value } = transactionSchema.validate(raw, { abortEarly: false });
  
  if (error) {
    await logs(req, error.message, 403, raw);
    return new Response(errorObject(error.message, 403), { status: 403 });
  }
  
  try {
    const db = await getDb();
    const user_id = "demo-user";

    let accId;
    try {
      accId = new ObjectId(value.account_id);
    } catch {
      return new Response(errorObject("account_id invalid", 400), {
        status: 400,
      });
    }

    const acc = await db.collection("accounts").findOne({
      _id: accId,
      user_id,
    });
    
    if (!acc) {
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
    
    const r = await db.collection("transactions").insertOne(doc);

    // Update account balance
    let delta = 0;
    if (value.type === "expense") delta = -value.amount;
    if (value.type === "income") delta = value.amount;
    
    if (delta !== 0) {
      await db.collection("accounts").updateOne(
        { _id: accId, user_id },
        { 
          $inc: { balance: delta }, 
          $set: { updated_on: new Date() } 
        }
      );
    }

    return Response.json(
      { status: true, data: { _id: r.insertedId, ...doc } },
      { status: 201 }
    );
  } catch (e) {
    await logs(req, e?.message || "POST /transactions failed", 500, raw);
    return new Response(errorObject("Internal error", 500), { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const body = await req.json();
    const { _id, account_id, type, amount, currency, category, note, tags, happened_on, attachment_ids } = body || {};
    if (!_id) return new Response(errorObject("_id is required", 400), { status: 400 });

    const db = await getDb();
    const user_id = "demo-user";
    let txId;
    try {
      txId = new ObjectId(String(_id));
    } catch {
      return new Response(errorObject("invalid _id", 400), { status: 400 });
    }
    const existing = await db.collection("transactions").findOne({ _id: txId, user_id });
    if (!existing) return new Response(errorObject("transaction not found", 404), { status: 404 });

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
    const acc = await db.collection("accounts").findOne({ _id: newAccountId, user_id });
    if (!acc) return new Response(errorObject("account_id invalid or not found", 404), { status: 404 });

    // Compute balance adjustments
    const prevSign = existing.type === "expense" ? -1 : existing.type === "income" ? 1 : 0;
    const nextType = set.type ?? existing.type;
    const nextAmount = typeof set.amount === "number" ? set.amount : existing.amount;
    const nextSign = nextType === "expense" ? -1 : nextType === "income" ? 1 : 0;

    const prevAccId = existing.account_id;
    const nextAccId = newAccountId;

    const ops = [];
    if (prevSign !== 0) {
      ops.push(db.collection("accounts").updateOne(
        { _id: prevAccId, user_id },
        { $inc: { balance: -(prevSign * existing.amount) }, $set: { updated_on: new Date() } }
      ));
    }
    if (nextSign !== 0) {
      ops.push(db.collection("accounts").updateOne(
        { _id: nextAccId, user_id },
        { $inc: { balance: nextSign * nextAmount }, $set: { updated_on: new Date() } }
      ));
    }
    if (ops.length) await Promise.all(ops);

    await db.collection("transactions").updateOne({ _id: txId, user_id }, { $set: set });
    return Response.json({ status: true, data: { _id, ...set } });
  } catch (e) {
    await logs(req, e?.message || "PUT /transactions failed", 500);
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
    const tx = await db.collection("transactions").findOne({ _id, user_id });
    if (!tx) return new Response(errorObject("transaction not found", 404), { status: 404 });

    // reverse balance
    const sign = tx.type === "expense" ? -1 : tx.type === "income" ? 1 : 0;
    if (sign !== 0) {
      await db.collection("accounts").updateOne(
        { _id: tx.account_id, user_id },
        { $inc: { balance: -(sign * tx.amount) }, $set: { updated_on: new Date() } }
      );
    }

    await db.collection("transactions").deleteOne({ _id, user_id });
    return Response.json({ status: true, data: { _id: id } });
  } catch (e) {
    await logs(req, e?.message || "DELETE /transactions failed", 500);
    return new Response(errorObject("Internal error", 500), { status: 500 });
  }
}
