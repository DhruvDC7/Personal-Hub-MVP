import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB;

let client;
let clientPromise;
let db;
let indexesCreated = false;
console.log(uri);
console.log(dbName);
// Simple logger using console.log
const log = (level, message, data = {}) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level}] ${message}`, data);
};

async function ensureIndexes(db) {
  try {
    log('info', 'Ensuring database indexes exist');
    
    // accounts: { user_id: 1, created_on: -1 }
    await db.collection("accounts").createIndexes([
      { key: { user_id: 1, created_on: -1 }, name: "accounts_user_created" },
    ]);
    console.log('[MongoDB] Created/Verified index: accounts_user_created');

    // transactions: { user_id: 1, happened_on: -1 }
    await db.collection("transactions").createIndexes([
      { key: { user_id: 1, happened_on: -1 }, name: "tx_user_happened" },
    ]);
    console.log('[MongoDB] Created/Verified index: tx_user_happened');

    // documents: { user_id: 1, created_on: -1 }
    await db.collection("documents").createIndexes([
      { key: { user_id: 1, created_on: -1 }, name: "docs_user_created" },
    ]);
    console.log('[MongoDB] Created/Verified index: docs_user_created');

    // logs: TTL on created_on (30 days)
    await db.collection("logs").createIndexes([
      { key: { created_on: 1 }, name: "logs_ttl_30d", expireAfterSeconds: 60 * 60 * 24 * 30 },
    ]);
    console.log('[MongoDB] Created/Verified TTL index: logs_ttl_30d');
    
  } catch (error) {
    console.error('[MongoDB] Failed to create indexes:', error.message);
    console.error(error.stack);
    throw error; // Re-throw to be handled by the caller
  }
}

export async function getDb() {
  const startTime = Date.now();
  
  if (db) {
    console.log('[MongoDB] Reusing existing database connection');
    return db;
  }

  if (!clientPromise) {
    if (!uri) {
      const error = new Error("MONGODB_URI is not defined");
      log('error', 'Database connection failed', { error: error.message });
      throw error;
    }
    
    console.log('[MongoDB] Creating new connection to MongoDB');
    
    try {
      client = new MongoClient(uri, { 
        maxPoolSize: 5,
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 10000,
      });
      
      // Add event listeners for connection status
      client.on('serverOpening', () => console.log('[MongoDB] Server opening connection'));
      client.on('serverClosed', () => console.warn('[MongoDB] Server closed connection'));
      client.on('serverHeartbeatFailed', (e) => console.error('[MongoDB] Server heartbeat failed:', e.message));
      
      clientPromise = client.connect();
    } catch (error) {
      console.error('[MongoDB] Failed to create client:', error.message);
      console.error(error.stack);
      throw error;
    }
  }

  try {
    console.log('[MongoDB] Waiting for connection to be established');
    await clientPromise;
    
    if (!dbName) {
      const error = new Error("MONGODB_DB is not defined");
      log('error', 'Database connection failed', { error: error.message });
      throw error;
    }
    
    db = client.db(dbName);
    console.log(`[MongoDB] Successfully connected to database '${dbName}' in ${Date.now() - startTime}ms`);
    
    if (!indexesCreated) {
      try {
        console.log('[MongoDB] Ensuring database indexes exist');
        await ensureIndexes(db);
        indexesCreated = true;
        console.log('[MongoDB] Database indexes verified/created successfully');
      } catch (error) {
        console.error('[MongoDB] Failed to create indexes (non-critical):', error.message);
        console.error(error.stack);
        // Continue even if index creation fails
      }
    }
    
    return db;
    
  } catch (error) {
    console.error(`[MongoDB] Connection failed after ${Date.now() - startTime}ms:`, error.message);
    console.error(error.stack);
    throw error;
  }
}
