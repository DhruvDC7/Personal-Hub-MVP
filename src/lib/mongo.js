// src/lib/mongo.js
import { MongoClient, ServerApiVersion, GridFSBucket } from 'mongodb';

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error('Please add your MONGODB_URI to .env');

const options = {
  maxPoolSize: 20,
  minPoolSize: 5,
  maxIdleTimeMS: 120000,
  connectTimeoutMS: 10000,
  socketTimeoutMS: 60000,
  serverSelectionTimeoutMS: 10000,
  serverApi: { version: ServerApiVersion.v1, strict: false, deprecationErrors: true },
  retryWrites: true,
  retryReads: true,
  waitQueueTimeoutMS: 10000,
};

let cached = global.mongo;
if (!cached) {
  cached = global.mongo = { conn: null, promise: null, lastConnectionTime: null };
}

export async function connectToDatabase() {
  const now = Date.now();

  // Reuse if fresh
  if (cached.conn) {
    if (!cached.lastConnectionTime || now - cached.lastConnectionTime > 6 * 60 * 60 * 1000) {
      try { await cached.conn.close(); } catch {}
      cached.conn = null; cached.promise = null;
    } else {
      return cached.conn;
    }
  }

  if (!cached.promise) {
    const client = new MongoClient(uri, options);
    cached.promise = client.connect()
      .then(c => { cached.lastConnectionTime = Date.now(); return c; })
      .catch(err => { cached.promise = null; throw err; });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

export async function getDatabase(dbName = process.env.MONGODB_DB) {
  const client = await connectToDatabase();
  return client.db(dbName);
}

export async function getCollection(dbName, collectionName) {
  const db = await getDatabase(dbName);
  return db.collection(collectionName);
}

export async function getGridFSBucket() {
  const db = await getDatabase(process.env.MONGODB_DB);
  return new GridFSBucket(db, { bucketName: 'documents', chunkSizeBytes: 255 * 1024 });
}

export async function getMongoClient() {
  const client = await connectToDatabase();
  const db = client.db(process.env.MONGODB_DB);
  const bucket = new GridFSBucket(db, { bucketName: 'documents', chunkSizeBytes: 255 * 1024 });
  return { client, db, bucket };
}

export const clientPromise = connectToDatabase();
