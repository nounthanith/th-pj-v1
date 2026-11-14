// src/lib/api.ts
import { http, HttpOptions } from "./http";

type Opt = Omit<HttpOptions, "method" | "body">;

export const api = {
    get: <T>(url: string, opt?: Opt) => http<T>(url, { ...opt, method: "GET" }),
    post: <T>(url: string, body?: unknown, opt?: Opt) =>
        http<T>(url, { ...opt, method: "POST", body }),
    put: <T>(url: string, body?: unknown, opt?: Opt) =>
        http<T>(url, { ...opt, method: "PUT", body }),
    patch: <T>(url: string, body?: unknown, opt?: Opt) =>
        http<T>(url, { ...opt, method: "PATCH", body }),
    delete: <T>(url: string, opt?: Opt) =>
        http<T>(url, { ...opt, method: "DELETE" }),
};