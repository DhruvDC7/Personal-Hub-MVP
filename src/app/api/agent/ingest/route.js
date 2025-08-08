import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongo";
import logs from "@/helpers/logs";
import { errorObject } from "@/helpers/errorObject";

// Naive parsers for MVP
function parseINR(text) {
  const m = text.match(/(?:rs|₹)?\s*([0-9]+(?:\.[0-9]+)?)/i);
  return m ? Number(m[1]) : null;
}

function parseType(text) {
  if (/spent|paid|buy|bought|petrol|food|rent|groc|fuel/i.test(text)) return "expense";
  if (/salary|credited|received|refund|income|interest/i.test(text)) return "income";
  if (/transfer|moved|sent to/i.test(text)) return "transfer";
  return "expense";
}

function parseCategory(text) {
  if (/petrol|fuel/i.test(text)) return "fuel";
  if (/food|lunch|dinner|meal|restaurant/i.test(text)) return "food";
  if (/rent/i.test(text)) return "rent";
  if (/groc/i.test(text)) return "grocery";
  if (/salary/i.test(text)) return "salary";
  return "general";
}

function findAccountIdByName(accounts, text) {
  const lower = text.toLowerCase();
  const hit = accounts.find(a => 
    lower.includes(a.name.toLowerCase().split(" ")[0])
  );
  return hit?._id || null;
}

export async function POST(req) {
  try {
    const body = await req.json();
    const text = String(body?.text || "");
    
    if (!text) {
      return new Response(
        errorObject("text is required", 403), 
        { status: 403 }
      );
    }

    const db = await getDb();
    const user_id = "demo-user";
    
    const accounts = await db
      .collection("accounts")
      .find({ user_id })
      .project({ _id: 1, name: 1 })
      .toArray();
      
    if (!accounts.length) {
      return new Response(
        errorObject("no accounts found; create an account first", 400), 
        { status: 400 }
      );
    }

    const amount = parseINR(text);
    const type = parseType(text);
    const category = parseCategory(text);
    const account_id = findAccountIdByName(accounts, text) || accounts[0]._id;

    if (!amount) {
      return new Response(
        errorObject("could not parse amount", 400), 
        { status: 400 }
      );
    }

    const doc = {
      user_id,
      account_id: new ObjectId(account_id),
      type,
      amount,
      currency: process.env.NEXT_PUBLIC_DEFAULT_CURRENCY || "INR",
      category,
      note: text,
      tags: ["agent"],
      happened_on: new Date(),
      attachment_ids: [],
      created_on: new Date(),
      updated_on: new Date(),
    };
    
    const r = await db.collection("transactions").insertOne(doc);

    // Update account balance
    let delta = 0;
    if (type === "expense") delta = -amount;
    if (type === "income") delta = amount;
    
    if (delta !== 0) {
      await db.collection("accounts").updateOne(
        { _id: new ObjectId(account_id), user_id },
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
    await logs(req, e?.message || "POST /agent/ingest failed", 500);
    return new Response(errorObject("Internal error", 500), { status: 500 });
  }
}
