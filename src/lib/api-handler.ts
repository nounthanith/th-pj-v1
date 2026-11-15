// src/lib/api-handler.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "./db";

/* ---------- Errors you can throw anywhere ---------- */
export class ApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
        super(message);
        this.status = status;
    }
    static badRequest = (m = "Bad request") => new ApiError(400, m);
    static unauthorized = (m = "Unauthorized") => new ApiError(401, m);
    static forbidden = (m = "Forbidden") => new ApiError(403, m);
    static notFound = (m = "Not found") => new ApiError(404, m);
}

/* ---------- Response helpers ---------- */
export const ok = <T>(data: T, meta?: unknown, status = 200) =>
    NextResponse.json({ success: true, data, ...(meta ? { meta } : {}) }, { status });

export const created = <T>(data: T) => ok(data, undefined, 201);

export const fail = (message: string, status = 400) =>
    NextResponse.json({ success: false, message }, { status });

/* ---------- Convert any error to a clean response ---------- */
function toErrorResponse(e: any) {
    if (e instanceof ApiError) return fail(e.message, e.status);

    // Mongoose validation error
    if (e?.name === "ValidationError") {
        const msg = Object.values(e.errors).map((x: any) => x.message).join(", ");
        return fail(msg, 400);
    }
    // Invalid ObjectId
    if (e?.name === "CastError") return fail(`Invalid ${e.path}`, 400);
    // Duplicate key (unique field)
    if (e?.code === 11000) {
        const field = Object.keys(e.keyValue ?? {})[0] ?? "field";
        return fail(`${field} already exists`, 409);
    }
    // Bad JSON body
    if (e instanceof SyntaxError) return fail("Invalid JSON body", 400);

    console.error("[API ERROR]", e);
    return fail("Server error", 500);
}

/* ---------- Main wrapper ---------- */
export type Ctx = { params: Promise<Record<string, string>> };

type Fn = (req: NextRequest, ctx: Ctx) => Promise<Response | unknown>;

/**
 * Wrap any route:
 *  - connects to DB
 *  - try/catch for you
 *  - return a plain value and it becomes { success: true, data }
 *  - return a Response (ok(), created(), fail()) to control it yourself
 */
export function handler(fn: Fn) {
    return async (req: NextRequest, ctx: Ctx) => {
        try {
            await connectDB();
            const result = await fn(req, ctx);
            if (result instanceof Response) return result;
            return ok(result ?? null);
        } catch (e) {
            return toErrorResponse(e);
        }
    };
}

/* ---------- Small helpers to use inside handlers ---------- */
export const getBody = async <T = any>(req: NextRequest): Promise<T> => req.json();

export const getParam = async (ctx: Ctx, name: string) => {
    const p = await ctx.params;
    return p[name];
};

export function requireFields(body: Record<string, any>, fields: string[]) {
    const missing = fields.filter((f) => body[f] === undefined || body[f] === "");
    if (missing.length) throw ApiError.badRequest(`Missing: ${missing.join(", ")}`);
}