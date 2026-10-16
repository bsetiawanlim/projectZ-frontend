export interface PaginationMeta {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
}

export interface ApiSuccess<T = unknown> {
    success: true;
    statusCode: number;
    message: string;
    data: T;
    pagination?: PaginationMeta;
}

export interface Paginated<T> {
    items: T[];
    pagination: PaginationMeta;
}

export interface PaginationParams {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    search?: string;
    [key: string]: unknown;
}

export interface ApiErrorDetail {
    path?: string;
    message: string;
    code?: string;
}

/** Normalised error thrown by the API client for every non-2xx response. */
export class ApiError extends Error {
    constructor(
        message: string,
        public readonly status: number,
        public readonly code: string = "UNKNOWN",
        public readonly details: ApiErrorDetail[] | unknown = null
    ) {
        super(message);
        this.name = "ApiError";
    }

    get isUnauthorized() {
        return this.status === 401;
    }
    get isForbidden() {
        return this.status === 403;
    }
}
