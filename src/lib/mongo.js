import { MongoClient, ServerApiVersion } from 'mongodb';

// Connection URI
const uri = process.env.MONGODB_URI;

// Connection options optimized for Vercel Fluid Compute
const options = {
  maxPoolSize: 20,
  minPoolSize: 5,
  maxIdleTimeMS: 120000,
  connectTimeoutMS: 10000,
  socketTimeoutMS: 60000,
  serverSelectionTimeoutMS: 10000,
  serverApi: {
    version: ServerApiVersion.v1,
    strict: false,
    deprecationErrors: true,
  },
  retryWrites: true,
  retryReads: true,
  waitQueueTimeoutMS: 10000,
};

// Validate MongoDB URI
if (!uri) {
  throw new Error('Please add your MONGODB_URI to .env');
}

/**
 * Global is used here to maintain a cached connection across function invocations.
 */
let cached = global.mongo;

if (!cached) {
  cached = global.mongo = {
    conn: null,
    promise: null,
    lastConnectionTime: null,
  };
}

/**
 * Get a cached MongoDB connection or create a new one
 * Optimized for Vercel Fluid Compute
 * @returns {Promise<MongoClient>} MongoDB client connection
 */
export async function connectToDatabase() {
  const now = Date.now();

  if (cached.conn) {
    if (!cached.lastConnectionTime || now - cached.lastConnectionTime > 6 * 60 * 60 * 1000) {
      console.log('Connection is stale, reconnecting to MongoDB Atlas');
      try {
        await cached.conn.close();
        cached.conn = null;
        cached.promise = null;
      } catch (error) {
        console.warn('Error closing stale connection:', error);
      }
    } else {
      return cached.conn;
    }
  }

  if (!cached.promise) {
    const client = new MongoClient(uri, options);

    cached.promise = client.connect()
      .then(client => {
        console.log('Connected to MongoDB Atlas with Fluid Compute optimizations');
        cached.lastConnectionTime = Date.now();
        return client;
      })
      .catch(error => {
        console.error('Failed to connect to MongoDB Atlas:', error);
        cached.promise = null;
        throw error;
      });
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (error) {
    cached.promise = null;
    throw error;
  }
}

/**
 * Get a database instance
 */
export async function getDatabase(dbName) {
  const client = await connectToDatabase();
  return client.db(dbName);
}

/**
 * Get a collection instance
 */
export async function getCollection(dbName, collectionName) {
  const db = await getDatabase(dbName);
  return db.collection(collectionName);
}

/**
 * Ping the database
 */
export async function pingDatabase() {
  try {
    const client = await connectToDatabase();
    await client.db("admin").command({ ping: 1 });
    return { status: "connected", timestamp: new Date() };
  } catch (error) {
    return { status: "error", error: error.message, timestamp: new Date() };
  }
}

/**
 * Export a lazy connection promise (for shared async usage)
 */
export const clientPromise = connectToDatabase();
