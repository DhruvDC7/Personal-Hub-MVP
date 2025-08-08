import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB;

let client;
let clientPromise;
let db;
let indexesCreated = false;

async function ensureIndexes(db) {
  // accounts: { user_id: 1, created_on: -1 }
  await db.collection("accounts").createIndexes([
    { key: { user_id: 1, created_on: -1 }, name: "accounts_user_created" },
  ]);

  // transactions: { user_id: 1, happened_on: -1 }
  await db.collection("transactions").createIndexes([
    { key: { user_id: 1, happened_on: -1 }, name: "tx_user_happened" },
  ]);

  // documents: { user_id: 1, created_on: -1 }
  await db.collection("documents").createIndexes([
    { key: { user_id: 1, created_on: -1 }, name: "docs_user_created" },
  ]);

  // logs: TTL on created_on (30 days)
  await db.collection("logs").createIndexes([
    { key: { created_on: 1 }, name: "logs_ttl_30d", expireAfterSeconds: 60 * 60 * 24 * 30 },
  ]);
}

export async function getDb() {
  if (db) return db;

  if (!clientPromise) {
    if (!uri) throw new Error("MONGODB_URI is not defined");
    client = new MongoClient(uri, { maxPoolSize: 5 });
    clientPromise = client.connect();
  }

  await clientPromise;

  if (!dbName) throw new Error("MONGODB_DB is not defined");
  db = client.db(dbName);
  
  if (!indexesCreated) {
    try {
      await ensureIndexes(db);
      indexesCreated = true;
    } catch {
      // best-effort; don't block requests
    }
  }
  
  return db;
}
