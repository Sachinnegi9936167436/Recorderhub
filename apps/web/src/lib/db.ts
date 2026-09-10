import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://recordhub_admin:developer123@recordhubdb.dxwpdx6.mongodb.net/recordhub';

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable');
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development and serverless invocations in production (Vercel).
 */
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

let cached: MongooseCache = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

export async function connectToDatabase(): Promise<typeof mongoose> {
  // If already connected and connection is healthy (readyState 1 = connected)
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  // If connection is in a disconnected/broken state (0 = disconnected, 3 = disconnecting), reset promise
  if (mongoose.connection.readyState === 0 || mongoose.connection.readyState === 3) {
    cached.conn = null;
    cached.promise = null;
  }

  if (!cached.promise) {
    const opts: mongoose.ConnectOptions = {
      bufferCommands: false,
      maxPoolSize: 2, // Optimized for Vercel Serverless containers
      minPoolSize: 0,
      maxIdleTimeMS: 5000,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 20000,
      connectTimeoutMS: 5000,
      heartbeatFrequencyMS: 10000,
      autoIndex: false,
      retryWrites: true,
      retryReads: true,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts)
      .then((m) => {
        return m;
      })
      .catch((err) => {
        cached.promise = null;
        cached.conn = null;
        throw err;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    cached.conn = null;
    throw e;
  }

  return cached.conn;
}

// Reset cache on connection drop so subsequent requests reconnect cleanly
if (typeof mongoose !== 'undefined' && mongoose.connection) {
  mongoose.connection.on('disconnected', () => {
    cached.conn = null;
    cached.promise = null;
  });
  mongoose.connection.on('error', () => {
    cached.conn = null;
    cached.promise = null;
  });
}

/**
 * Executes a MongoDB operation with automatic retry on transient serverless network / TLS socket drops.
 */
export async function withDbRetry<T>(operation: () => Promise<T>, maxRetries = 2): Promise<T> {
  let attempts = 0;
  while (attempts <= maxRetries) {
    try {
      await connectToDatabase();
      return await operation();
    } catch (err: any) {
      attempts++;
      const msg = (err?.message || '').toLowerCase();
      const isNetworkOrTlsError =
        err?.name === 'MongoNetworkError' ||
        err?.name === 'MongoServerSelectionError' ||
        err?.name === 'MongoTopologyClosedError' ||
        msg.includes('ssl') ||
        msg.includes('tlsv1') ||
        msg.includes('alert') ||
        msg.includes('econnreset') ||
        msg.includes('etimedout') ||
        msg.includes('epipe') ||
        msg.includes('socket') ||
        msg.includes('closed') ||
        msg.includes('resetpool') ||
        err?.errorLabelSet?.has?.('ResetPool') ||
        err?.errorLabelSet?.has?.('RetryableWriteError');

      if (isNetworkOrTlsError && attempts <= maxRetries) {
        console.warn(`[withDbRetry] Transient MongoDB TLS/Network error (attempt ${attempts}/${maxRetries}). Force-closing dead socket pool and reconnecting...`);
        cached.conn = null;
        cached.promise = null;
        try {
          if (mongoose.connection && mongoose.connection.readyState !== 0) {
            await mongoose.connection.close(true).catch(() => {});
          }
        } catch {}
        await new Promise((r) => setTimeout(r, 250 * attempts));
        continue;
      }
      throw err;
    }
  }
  throw new Error('Database operation failed after retries');
}


