import type { ApiClient } from "../api/client";
import type { ApiSuccess, Paginated, PaginationParams } from "../api/types";
import type {
    CreatePurchaseOrderInput,
    UpdatePurchaseOrderInput,
    PurchaseOrderRecord,
    CreateRfqInput,
    RfqRecord,
} from "./schemas";

export function createOrderApi(client: ApiClient) {
    return {
        // ── Purchase Orders ──────────────────────────────────────────────────
        async listPurchaseOrders(query?: PaginationParams): Promise<Paginated<PurchaseOrderRecord>> {
            return client.list<PurchaseOrderRecord>("/api/purchase-order/get-all", query);
        },
        async getPurchaseOrder(id: number): Promise<ApiSuccess<{ purchaseOrder: PurchaseOrderRecord }>> {
            return client.post<{ purchaseOrder: PurchaseOrderRecord }>("/api/purchase-order/get", { id });
        },
        async createPurchaseOrder(input: CreatePurchaseOrderInput): Promise<ApiSuccess<{ purchaseOrder: PurchaseOrderRecord }>> {
            return client.post<{ purchaseOrder: PurchaseOrderRecord }>("/api/purchase-order/create", input);
        },
        async updatePurchaseOrder(input: UpdatePurchaseOrderInput): Promise<ApiSuccess<{ purchaseOrder: PurchaseOrderRecord }>> {
            return client.post<{ purchaseOrder: PurchaseOrderRecord }>("/api/purchase-order/update", input);
        },
        async deletePurchaseOrder(id: number): Promise<ApiSuccess<{ purchaseOrder: PurchaseOrderRecord }>> {
            return client.post<{ purchaseOrder: PurchaseOrderRecord }>("/api/purchase-order/delete", { id });
        },

        // ── RFQ (Requests for Quotation) ─────────────────────────────────────
        async listRfqs(query?: PaginationParams): Promise<Paginated<RfqRecord>> {
            return client.list<RfqRecord>("/api/rfq/get-all", query);
        },
        async createRfq(input: CreateRfqInput): Promise<ApiSuccess<{ rfq: RfqRecord }>> {
            return client.post<{ rfq: RfqRecord }>("/api/rfq/create", input);
        },
    };
}
