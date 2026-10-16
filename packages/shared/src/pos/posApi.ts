import type { ApiClient } from "../api/client";
import type { ApiSuccess, Paginated } from "../api/types";
import type { z } from "zod";
import type {
    createSalesOrderSchema,
    updateSalesOrderSchema,
    salesOrderQuerySchema,
    createSalesOrderItemSchema,
    updateSalesOrderItemSchema,
    createSalesPaymentSchema,
    updateSalesPaymentSchema,
    productSalesReportSchema,
    SalesOrderRecord,
    SalesOrderItemRecord,
    SalesPaymentRecord,
    DailySalesSummaryResult,
    ProductSalesItemReport,
    CreateTableOrderInput,
    TableMenuResponse,
} from "./schemas";

export function createPosApi(client: ApiClient) {
    return {
        // ── Table Order (Public / Barcode Table Self-Ordering) ────────────────
        async getTableMenu(facilityId?: number): Promise<ApiSuccess<TableMenuResponse>> {
            return client.get<TableMenuResponse>("/api/pos/table-order/menu", facilityId ? { facilityId } : undefined);
        },
        async createTableOrder(input: CreateTableOrderInput): Promise<ApiSuccess<SalesOrderRecord>> {
            return client.post<SalesOrderRecord>("/api/pos/table-order/create", input);
        },

        // ── Sales Orders ──────────────────────────────────────────────────────
        async createSalesOrder(input: z.infer<typeof createSalesOrderSchema>): Promise<ApiSuccess<SalesOrderRecord>> {
            return client.post<SalesOrderRecord>("/api/pos/sales-order/create", input);
        },
        async updateSalesOrder(input: z.infer<typeof updateSalesOrderSchema>): Promise<ApiSuccess<SalesOrderRecord>> {
            return client.post<SalesOrderRecord>("/api/pos/sales-order/update", input);
        },
        async deleteSalesOrder(id: number): Promise<ApiSuccess<void>> {
            return client.post<void>("/api/pos/sales-order/delete", { id });
        },
        async getSalesOrder(id: number): Promise<ApiSuccess<SalesOrderRecord>> {
            return client.post<SalesOrderRecord>("/api/pos/sales-order/get", { id });
        },
        async listSalesOrders(query?: z.infer<typeof salesOrderQuerySchema>): Promise<Paginated<SalesOrderRecord>> {
            return client.list<SalesOrderRecord>("/api/pos/sales-order/all", query);
        },
        async completeSalesOrder(id: number): Promise<ApiSuccess<SalesOrderRecord>> {
            return client.post<SalesOrderRecord>("/api/pos/sales-order/complete", { id });
        },
        async voidSalesOrder(id: number, notes?: string | null): Promise<ApiSuccess<SalesOrderRecord>> {
            return client.post<SalesOrderRecord>("/api/pos/sales-order/void", { id, notes });
        },
        async refundSalesOrder(id: number, notes?: string | null): Promise<ApiSuccess<SalesOrderRecord>> {
            return client.post<SalesOrderRecord>("/api/pos/sales-order/refund", { id, notes });
        },
        async getDailySummary(query?: { date?: string; startDate?: string; endDate?: string; facilityId?: number } | string): Promise<ApiSuccess<DailySalesSummaryResult>> {
            const params = typeof query === "string" ? { date: query } : query;
            return client.get<DailySalesSummaryResult>("/api/pos/sales-order/summary/daily", params as Record<string, unknown> | undefined);
        },
        async getProductSalesReport(query?: z.infer<typeof productSalesReportSchema>): Promise<ApiSuccess<ProductSalesItemReport[]>> {
            return client.get<ProductSalesItemReport[]>("/api/pos/sales-order/report/product-sales", query as Record<string, unknown>);
        },

        // ── Sales Order Items ─────────────────────────────────────────────────
        async createItem(input: z.infer<typeof createSalesOrderItemSchema>): Promise<ApiSuccess<SalesOrderItemRecord>> {
            return client.post<SalesOrderItemRecord>("/api/pos/sales-order-item/create", input);
        },
        async updateItem(input: z.infer<typeof updateSalesOrderItemSchema>): Promise<ApiSuccess<SalesOrderItemRecord>> {
            return client.post<SalesOrderItemRecord>("/api/pos/sales-order-item/update", input);
        },
        async deleteItem(id: number): Promise<ApiSuccess<void>> {
            return client.post<void>("/api/pos/sales-order-item/delete", { id });
        },
        async getItem(id: number): Promise<ApiSuccess<SalesOrderItemRecord>> {
            return client.post<SalesOrderItemRecord>("/api/pos/sales-order-item/get", { id });
        },
        async listItems(salesOrderId: number): Promise<ApiSuccess<SalesOrderItemRecord[]>> {
            return client.post<SalesOrderItemRecord[]>("/api/pos/sales-order-item/list", { salesOrderId });
        },

        // ── Sales Payments ────────────────────────────────────────────────────
        async createPayment(input: z.infer<typeof createSalesPaymentSchema>): Promise<ApiSuccess<SalesPaymentRecord>> {
            return client.post<SalesPaymentRecord>("/api/pos/sales-payment/create", input);
        },
        async updatePayment(input: z.infer<typeof updateSalesPaymentSchema>): Promise<ApiSuccess<SalesPaymentRecord>> {
            return client.post<SalesPaymentRecord>("/api/pos/sales-payment/update", input);
        },
        async deletePayment(id: number): Promise<ApiSuccess<void>> {
            return client.post<void>("/api/pos/sales-payment/delete", { id });
        },
        async getPayment(id: number): Promise<ApiSuccess<SalesPaymentRecord>> {
            return client.post<SalesPaymentRecord>("/api/pos/sales-payment/get", { id });
        },
        async listPayments(salesOrderId: number): Promise<ApiSuccess<SalesPaymentRecord[]>> {
            return client.post<SalesPaymentRecord[]>("/api/pos/sales-payment/list", { salesOrderId });
        },
    };
}
