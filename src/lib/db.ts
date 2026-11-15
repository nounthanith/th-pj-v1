// src/lib/db.ts
import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI!;
if (!MONGODB_URI) throw new Error("Missing MONGODB_URI in .env.local");

// cache the connection (important for Next.js hot reload and serverless)
const g = globalThis as unknown as {
    _mongoose?: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };
};
const cached = (g._mongoose ??= { conn: null, promise: null });

export async function connectDB() {
    if (cached.conn) return cached.conn;
    cached.promise ??= mongoose.connect(MONGODB_URI, { bufferCommands: false });
    cached.conn = await cached.promise;
    return cached.conn;
}