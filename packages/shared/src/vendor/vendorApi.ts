import type { ApiClient } from "../api/client";
import type { ApiSuccess, Paginated, PaginationParams } from "../api/types";
import type {
    VendorInput,
    VendorRecord,
    VendorProductRecord,
    CreateVendorProductInput,
    UpdateVendorProductInput,
} from "./schemas";

export function createVendorApi(client: ApiClient) {
    return {
        async createVendor(input: VendorInput): Promise<ApiSuccess<VendorRecord>> {
            return client.post<VendorRecord>("/api/vendor/create", input);
        },
        async updateVendor(input: VendorInput): Promise<ApiSuccess<VendorRecord>> {
            return client.post<VendorRecord>("/api/vendor/update", input);
        },
        async deleteVendor(id: number, departReason?: string): Promise<ApiSuccess<void>> {
            return client.post<void>("/api/vendor/delete", { id, departReason });
        },
        async restoreVendor(id: number): Promise<ApiSuccess<VendorRecord>> {
            return client.post<VendorRecord>("/api/vendor/restore", { id });
        },
        async listVendors(query?: PaginationParams): Promise<Paginated<VendorRecord>> {
            return client.list<VendorRecord>("/api/vendor/get-all", query);
        },

        // ── Vendor Product Offerings ──────────────────────────────────────────
        async getProductsByVendor(vendorId: number): Promise<ApiSuccess<VendorProductRecord[]>> {
            return client.get<VendorProductRecord[]>(`/api/vendor-product/by-vendor/${vendorId}`);
        },
        async createVendorProduct(input: CreateVendorProductInput): Promise<ApiSuccess<VendorProductRecord>> {
            return client.post<VendorProductRecord>("/api/vendor-product/create", input);
        },
        async updateVendorProduct(input: UpdateVendorProductInput): Promise<ApiSuccess<VendorProductRecord>> {
            return client.post<VendorProductRecord>("/api/vendor-product/update", input);
        },
        async deleteVendorProduct(id: number): Promise<ApiSuccess<void>> {
            return client.post<void>("/api/vendor-product/delete", { id });
        },
        async listVendorProducts(query?: PaginationParams & { vendorId?: number; productId?: number; search?: string }): Promise<Paginated<VendorProductRecord>> {
            return client.list<VendorProductRecord>("/api/vendor-product/get-all", query);
        },
    };
}
