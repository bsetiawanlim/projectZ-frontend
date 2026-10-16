import { ApiError, type ApiSuccess, type Paginated, type PaginationParams } from "./types";

/** Platform-agnostic token storage; implemented per app (cookie-less mobile uses SecureStore). */
export interface TokenStorage {
    get(): Promise<string | null> | string | null;
    set(token: string | null): Promise<void> | void;
}

export interface ApiClientOptions {
    baseUrl: string;
    /** Web: true (cookie session). Mobile: false and use bearer token. */
    withCredentials?: boolean;
    tokenStorage?: TokenStorage;
    onUnauthorized?: () => void;
    fetchImpl?: typeof fetch;
}

export interface ApiClient {
    get<T>(path: string, query?: Record<string, unknown>): Promise<ApiSuccess<T>>;
    list<T>(path: string, query?: PaginationParams & Record<string, unknown>): Promise<Paginated<T>>;
    post<T>(path: string, body?: unknown): Promise<ApiSuccess<T>>;
    raw(path: string, init?: RequestInit): Promise<Response>;
}

function toQueryString(query?: Record<string, unknown>) {
    if (!query) return "";
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
        if (v !== undefined && v !== null && v !== "") params.append(k, String(v));
    }
    const s = params.toString();
    return s ? `?${s}` : "";
}

export function createApiClient(opts: ApiClientOptions): ApiClient {
    const doFetch = opts.fetchImpl ?? fetch;

    async function request(path: string, init: RequestInit = {}): Promise<Response> {
        const headers = new Headers(init.headers);
        if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
        const token = opts.tokenStorage ? await opts.tokenStorage.get() : null;
        if (token) headers.set("Authorization", `Bearer ${token}`);

        const res = await doFetch(`${opts.baseUrl}${path}`, {
            ...init,
            headers,
            credentials: opts.withCredentials === false ? "omit" : "include",
        });

        const newToken = res.headers.get("set-auth-token");
        if (newToken && opts.tokenStorage) await opts.tokenStorage.set(newToken);
        return res;
    }

    async function json<T>(res: Response): Promise<T> {
        const text = await res.text();
        const body = text ? safeParse(text) : null;
        if (!res.ok) {
            if (res.status === 401) opts.onUnauthorized?.();
            const b = (body ?? {}) as Record<string, any>;
            throw new ApiError(
                b.message ?? b.error ?? res.statusText ?? "Request failed",
                res.status,
                b.code ?? "UNKNOWN",
                b.details ?? null,
            );
        }
        return body as T;
    }

    return {
        raw: request,
        get: async (path, query) => json(await request(path + toQueryString(query))),
        post: async (path, body) =>
            json(await request(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) })),
        list: async <T>(path: string, query?: PaginationParams & Record<string, unknown>) => {
            const body = await json<ApiSuccess<T[]>>(await request(path + toQueryString(query)));
            return { items: body.data, pagination: body.pagination! };
        },
    };
}

function safeParse(text: string): unknown {
    try {
        return JSON.parse(text);
    } catch {
        return { message: text };
    }
}
