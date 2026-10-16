import { z } from "zod";

export const salesOrderStatusEnum = z.enum(["DRAFT", "COMPLETED", "VOID", "REFUNDED"]);
export type SalesOrderStatus = z.infer<typeof salesOrderStatusEnum>;

export const paymentMethodEnum = z.enum(["CASH", "CARD", "BANK_TRANSFER", "EWALLET"]);
export type PaymentMethod = z.infer<typeof paymentMethodEnum>;

export const paymentStatusEnum = z.enum(["PENDING", "SETTLED", "FAILED", "REFUNDED"]);
export type PaymentStatus = z.infer<typeof paymentStatusEnum>;

// ── Nested item for create sales order ────────────────────────────────────────
export const nestedSalesOrderItemSchema = z.object({
    productId: z.number().int().positive("Product id must be greater than 0"),
    unitId: z.number().int().positive().optional().nullable(),
    quantity: z.number().positive("Quantity must be greater than 0"),
    unitPrice: z.number().min(0, "Unit price must be 0 or greater").optional(),
    discountPercentage: z.number().min(0).max(100).optional().default(0),
    notes: z.string().optional().nullable(),
});

// ── Sales Order ───────────────────────────────────────────────────────────────
export const createSalesOrderSchema = z.object({
    customerId: z.number().int().positive().optional().nullable(),
    facilityId: z.number().int().positive().optional().nullable(),
    tableNumber: z.string().max(50).optional().nullable(),
    orderDate: z.string().datetime().optional().nullable(),
    currency: z.string().length(3).optional().default("IDR"),
    includeDiscount: z.boolean().optional().default(false),
    discountPercentage: z.number().min(0).max(100).optional().default(0),
    includeTax: z.boolean().optional().default(false),
    taxPercentage: z.number().min(0).max(100).optional().default(0),
    notes: z.string().optional().nullable(),
    items: z.array(nestedSalesOrderItemSchema).optional().default([]),
});

export const updateSalesOrderSchema = z.object({
    id: z.number().int().positive(),
    customerId: z.number().int().positive().optional().nullable(),
    facilityId: z.number().int().positive().optional().nullable(),
    tableNumber: z.string().max(50).optional().nullable(),
    orderDate: z.string().datetime().optional().nullable(),
    currency: z.string().length(3).optional(),
    includeDiscount: z.boolean().optional(),
    discountPercentage: z.number().min(0).max(100).optional(),
    includeTax: z.boolean().optional(),
    taxPercentage: z.number().min(0).max(100).optional(),
    notes: z.string().optional().nullable(),
});

export const salesOrderQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(10).optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(["asc", "desc"]).default("desc").optional(),
    search: z.string().trim().optional(),
    status: salesOrderStatusEnum.optional(),
    customerId: z.coerce.number().int().positive().optional(),
    facilityId: z.coerce.number().int().positive().optional().nullable(),
    tableNumber: z.string().optional().nullable(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
});

export const dailySalesSummarySchema = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format").optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    facilityId: z.coerce.number().int().positive().optional().nullable(),
});

export const productSalesReportSchema = z.object({
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    facilityId: z.coerce.number().int().positive().optional().nullable(),
    limit: z.coerce.number().int().min(1).max(100).default(10).optional(),
});

export const createTableOrderSchema = z.object({
    facilityId: z.number().int().positive("Facility id must be greater than 0"),
    tableNumber: z.string().min(1, "Table number is required").max(50),
    customerName: z.string().max(100).optional().nullable(),
    customerPhone: z.string().max(30).optional().nullable(),
    notes: z.string().optional().nullable(),
    items: z.array(nestedSalesOrderItemSchema).min(1, "At least one item is required in the order"),
    paymentMethod: z.enum(["EWALLET", "BANK_TRANSFER", "CARD", "CASH"]).optional().nullable(),
    paymentProvider: z.string().max(50).optional().nullable(),
    referenceNumber: z.string().max(100).optional().nullable(),
    isPaid: z.boolean().optional().default(false),
});
export type CreateTableOrderInput = z.infer<typeof createTableOrderSchema>;

export const payTableOrderSchema = z.object({
    salesOrderId: z.number().int().positive("Sales order id must be greater than 0"),
    paymentMethod: z.enum(["EWALLET", "BANK_TRANSFER", "CARD", "CASH"]),
    paymentProvider: z.string().max(50).optional().nullable(),
    referenceNumber: z.string().max(100).optional().nullable(),
});
export type PayTableOrderInput = z.infer<typeof payTableOrderSchema>;

export const getTableOrderStatusSchema = z.object({
    salesOrderId: z.coerce.number().int().positive("Sales order id must be greater than 0"),
});
export type GetTableOrderStatusInput = z.infer<typeof getTableOrderStatusSchema>;

export interface TableOrderStatusResponse {
    order: SalesOrderRecord;
    isPaid: boolean;
    kitchenStatus: string;
    status: "DRAFT" | "COMPLETED" | "VOID" | "REFUNDED";
}

export const getTableMenuSchema = z.object({
    facilityId: z.coerce.number().int().positive().optional().nullable(),
});

export interface TableMenuItem {
    id: number;
    name: string;
    sku?: string | null;
    barcode?: string | null;
    description?: string | null;
    price: number;
    categoryId: number;
    categoryName: string;
    unitId?: number | null;
    unitLabel?: string | null;
    imageUrl?: string | null;
}

export interface TableMenuCategory {
    id: number;
    name: string;
    description?: string | null;
}

export interface TableMenuFacility {
    id: number;
    facilityCode: string;
    facilityName: string;
    type?: string | null;
    address?: string | null;
    phoneNumber?: string | null;
}

export interface TableMenuResponse {
    facility?: TableMenuFacility | null;
    categories: TableMenuCategory[];
    products: TableMenuItem[];
}

// ── Sales Order Item ──────────────────────────────────────────────────────────
export const createSalesOrderItemSchema = z.object({
    salesOrderId: z.number().int().positive(),
    productId: z.number().int().positive(),
    unitId: z.number().int().positive().optional().nullable(),
    quantity: z.number().positive(),
    unitPrice: z.number().min(0).optional(),
    discountPercentage: z.number().min(0).max(100).optional().default(0),
    notes: z.string().optional().nullable(),
});

export const updateSalesOrderItemSchema = z.object({
    id: z.number().int().positive(),
    unitId: z.number().int().positive().optional().nullable(),
    quantity: z.number().positive().optional(),
    unitPrice: z.number().min(0).optional(),
    discountPercentage: z.number().min(0).max(100).optional(),
    notes: z.string().optional().nullable(),
});

// ── Sales Payment ─────────────────────────────────────────────────────────────
export const createSalesPaymentSchema = z.object({
    salesOrderId: z.number().int().positive(),
    method: paymentMethodEnum,
    amount: z.number().positive(),
    referenceNumber: z.string().max(100).optional().nullable(),
    monetaryAccountId: z.number().int().positive().optional().nullable(),
    status: paymentStatusEnum.optional().default("SETTLED"),
    notes: z.string().optional().nullable(),
});

export const updateSalesPaymentSchema = z.object({
    id: z.number().int().positive(),
    method: paymentMethodEnum.optional(),
    amount: z.number().positive().optional(),
    referenceNumber: z.string().max(100).optional().nullable(),
    monetaryAccountId: z.number().int().positive().optional().nullable(),
    status: paymentStatusEnum.optional(),
    notes: z.string().optional().nullable(),
});

// ── Entity Interfaces ─────────────────────────────────────────────────────────
export interface SalesOrderItemRecord {
    id: number;
    salesOrderId: number;
    productId: number;
    productName: string;
    unitId?: number | null;
    quantity: number;
    unitPrice: number;
    discountPercentage: number;
    discountAmount: number;
    totalPrice: number;
    notes?: string | null;
}

export interface SalesPaymentRecord {
    id: number;
    salesOrderId: number;
    method: PaymentMethod;
    amount: number;
    changeAmount?: number | null;
    referenceNumber?: string | null;
    monetaryAccountId?: number | null;
    status: PaymentStatus;
    notes?: string | null;
    createdAt?: string;
}

export interface SalesOrderRecord {
    id: number;
    orderNumber: string;
    customerId?: number | null;
    facilityId?: number | null;
    facility?: { id: number; facilityCode: string; facilityName: string; type?: string } | null;
    tableNumber?: string | null;
    orderDate: string;
    subtotal: number;
    includeDiscount: boolean;
    discountPercentage: number;
    discountAmount: number;
    includeTax: boolean;
    taxPercentage: number;
    taxAmount: number;
    grandTotal: number;
    currency: string;
    status: SalesOrderStatus;
    notes?: string | null;
    createdAt?: string;
    updatedAt?: string;
    items?: SalesOrderItemRecord[];
    payments?: SalesPaymentRecord[];
    customer?: { id: number; profileId?: number; customergroup?: number | null } | null;
}

export interface DailySalesTrendPoint {
    date: string;
    revenue: number;
    orderCount: number;
    itemsSold: number;
}

export interface DailySalesSummaryResult {
    date: string;
    startDate?: string;
    endDate?: string;
    orderCount?: number;
    totalOrders?: number;
    totalItemsSold?: number;
    averageOrderValue?: number;
    totalSubtotal?: number;
    totalDiscount?: number;
    totalTax?: number;
    totalRevenue: number;
    paymentBreakdown: Record<string, { count: number; totalAmount: number } | number>;
    dailyTrend?: DailySalesTrendPoint[];
}

export interface ProductSalesItemReport {
    productId: number;
    productName: string;
    totalQuantity?: number;
    totalQuantitySold?: number;
    sku?: string | null;
    unitLabel?: string;
    categoryName?: string;
    imageUrl?: string | null;
    totalOrdersCount?: number;
    averagePrice?: number;
    totalRevenue: number;
}

// ── Midtrans Integration ─────────────────────────────────────────────
export const midtransSnapTokenSchema = z.object({
    salesOrderId: z.number().int().positive("Sales order ID must be greater than 0"),
    customerDetails: z.object({
        name: z.string().max(100).optional(),
        email: z.string().email().optional(),
        phone: z.string().max(30).optional(),
    }).optional(),
});
export type MidtransSnapTokenInput = z.infer<typeof midtransSnapTokenSchema>;

export const midtransChargeSchema = z.object({
    salesOrderId: z.number().int().positive("Sales order ID must be greater than 0"),
    paymentType: z.enum(["qris", "bank_transfer", "gopay", "shopeepay"]).default("qris"),
    bank: z.enum(["bca", "bni", "bri", "permata"]).optional(),
    customerDetails: z.object({
        name: z.string().max(100).optional(),
        email: z.string().email().optional(),
        phone: z.string().max(30).optional(),
    }).optional(),
});
export type MidtransChargeInput = z.infer<typeof midtransChargeSchema>;

export interface MidtransConfigResponse {
    clientKey: string;
    isProduction: boolean;
    snapScriptUrl: string;
    isConfigured: boolean;
    isSandboxSimulation: boolean;
}

export interface MidtransSnapTokenResult {
    token: string;
    redirectUrl: string;
    orderId: string;
    grossAmount: number;
    salesOrderNumber?: string;
    isSimulated?: boolean;
    message?: string;
}

export interface MidtransChargeResult {
    orderId: string;
    transactionId: string;
    paymentType: string;
    transactionStatus: string;
    grossAmount: number;
    salesOrderNumber?: string;
    qrString?: string;
    qrImageUrl?: string;
    vaNumber?: string;
    bank?: string;
    isSimulated?: boolean;
    message?: string;
}

export interface MidtransStatusResult {
    orderNumber: string;
    status: string;
    isPaid: boolean;
    grandTotal: number;
    payments?: SalesPaymentRecord[];
}

