// @/lib/db.js
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

export async function connectToDatabase() {
  const debugRaw = process.env.DEBUG_ANALYTICS_FUNNEL;
  const debug = Boolean(debugRaw) && (debugRaw === '1' || debugRaw.toLowerCase() === 'true' || debugRaw.toLowerCase() === 'yes');

  if (cached.conn) {
    if (debug) {
      const c = mongoose.connection;
      console.info('[db][debug] reuse connection', {
        readyState: c.readyState,
        dbName: c?.db?.databaseName,
        host: c.host,
        name: c.name,
      });
    }
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    if (debug) {
      console.info('[db][debug] connecting', {
        nodeEnv: process.env.NODE_ENV,
        vercelEnv: process.env.VERCEL_ENV,
        vercelRegion: process.env.VERCEL_REGION,
        hasMongoUri: Boolean(process.env.MONGODB_URI),
      });
    }

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      // Ensure all models are initialized to avoid OverwriteModelError
      mongoose.connection.on('connected', () => {
      });
      mongoose.connection.on('error', (err) => {
        console.error("Database connection error:", err);
      });

      if (debug) {
        const c = mongoose.connection;
        console.info('[db][debug] connected', {
          readyState: c.readyState,
          dbName: c?.db?.databaseName,
          host: c.host,
          name: c.name,
        });
      }
      return mongoose;
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

