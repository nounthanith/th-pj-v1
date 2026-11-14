// src/lib/http.ts
export class HttpError extends Error {
    status: number;
    data: unknown;
    constructor(status: number, message: string, data?: unknown) {
        super(message);
        this.status = status;
        this.data = data;
    }
}

export type HttpOptions = Omit<RequestInit, "body"> & {
    body?: unknown;
    params?: Record<string, string | number | boolean | undefined | null>;
    token?: string;
    timeout?: number; // ms
    // Next.js caching (server side)
    next?: { revalidate?: number | false; tags?: string[] };
};

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

function buildUrl(url: string, params?: HttpOptions["params"]) {
    const full = url.startsWith("http") ? url : `${BASE_URL}${url}`;
    if (!params) return full;
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") qs.append(k, String(v));
    });
    const s = qs.toString();
    return s ? `${full}${full.includes("?") ? "&" : "?"}${s}` : full;
}

export async function http<T = unknown>(
    url: string,
    { body, params, token, timeout = 15000, headers, ...init }: HttpOptions = {}
): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    const isForm = typeof FormData !== "undefined" && body instanceof FormData;

    try {
        const res = await fetch(buildUrl(url, params), {
            ...init,
            signal: controller.signal,
            headers: {
                ...(isForm ? {} : { "Content-Type": "application/json" }),
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                ...headers,
            },
            body:
                body === undefined
                    ? undefined
                    : isForm
                        ? (body as FormData)
                        : JSON.stringify(body),
        });

        const text = await res.text();
        const data = text ? JSON.parse(text) : null;

        if (!res.ok) {
            throw new HttpError(
                res.status,
                (data && (data.message || data.error)) || res.statusText,
                data
            );
        }
        return data as T;
    } catch (err) {
        if ((err as Error).name === "AbortError") {
            throw new HttpError(408, "Request timeout");
        }
        throw err;
    } finally {
        clearTimeout(timer);
    }
}