// src/lib/crud.ts
import { Model } from "mongoose";
import { NextRequest } from "next/server";
import { ApiError, Ctx, created, getBody, getParam, handler, ok } from "./api-handler";

type Action = "list" | "create" | "get" | "update" | "remove";

type CrudOptions = {
    searchFields?: string[];   // fields used by ?search=
    filterFields?: string[];   // fields allowed as filters: ?status=active
    sort?: string;             // default sort, e.g. "-createdAt"
    select?: string;           // e.g. "-password"
    populate?: string;         // e.g. "category"
    // run before every handler: check login, role, etc. Throw ApiError to block.
    guard?: (req: NextRequest, action: Action) => Promise<void> | void;
    // change body before saving (add userId, slug, ...)
    beforeCreate?: (body: any, req: NextRequest) => Promise<any> | any;
    beforeUpdate?: (body: any, req: NextRequest) => Promise<any> | any;
};

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function createCrud<T>(Model: Model<T>, opt: CrudOptions = {}) {
    const run = (action: Action, fn: (req: NextRequest, ctx: Ctx) => Promise<any>) =>
        handler(async (req, ctx) => {
            await opt.guard?.(req, action);
            return fn(req, ctx);
        });

    return {
        /** GET /api/x?page=1&limit=10&search=abc&sort=-price&status=active */
        list: run("list", async (req) => {
            const sp = req.nextUrl.searchParams;
            const page = Math.max(1, Number(sp.get("page")) || 1);
            const limit = Math.min(100, Math.max(1, Number(sp.get("limit")) || 10));
            const sort = sp.get("sort") || opt.sort || "-createdAt";
            const search = sp.get("search")?.trim();

            const filter: Record<string, any> = {};
            opt.filterFields?.forEach((f) => {
                const v = sp.get(f);
                if (v !== null && v !== "") filter[f] = v;
            });
            if (search && opt.searchFields?.length) {
                filter.$or = opt.searchFields.map((f) => ({
                    [f]: { $regex: escapeRegex(search), $options: "i" },
                }));
            }

            let q = Model.find(filter).sort(sort).skip((page - 1) * limit).limit(limit);
            if (opt.select) q = q.select(opt.select);
            if (opt.populate) q = q.populate(opt.populate);

            const [items, total] = await Promise.all([q.lean(), Model.countDocuments(filter)]);

            return ok(items, { page, limit, total, totalPages: Math.ceil(total / limit) });
        }),

        /** POST /api/x */
        create: run("create", async (req) => {
            let body = await getBody(req);
            if (opt.beforeCreate) body = await opt.beforeCreate(body, req);
            const doc = await Model.create(body);
            return created(doc);
        }),

        /** GET /api/x/:id */
        getOne: run("get", async (_req, ctx) => {
            const id = await getParam(ctx, "id");
            let q = Model.findById(id);
            if (opt.select) q = q.select(opt.select);
            if (opt.populate) q = q.populate(opt.populate);
            const doc = await q.lean();
            if (!doc) throw ApiError.notFound();
            return doc;
        }),

        /** PUT or PATCH /api/x/:id */
        update: run("update", async (req, ctx) => {
            const id = await getParam(ctx, "id");
            let body = await getBody(req);
            if (opt.beforeUpdate) body = await opt.beforeUpdate(body, req);
            const doc = await Model.findByIdAndUpdate(id, body, { new: true, runValidators: true }).lean();
            if (!doc) throw ApiError.notFound();
            return doc;
        }),

        /** DELETE /api/x/:id */
        remove: run("remove", async (_req, ctx) => {
            const id = await getParam(ctx, "id");
            const doc = await Model.findByIdAndDelete(id).lean();
            if (!doc) throw ApiError.notFound();
            return { id };
        }),
    };
}