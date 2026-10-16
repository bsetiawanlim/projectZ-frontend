import { z } from "zod";

export const orderStatusEnum = z.enum(["DRAFT", "PENDING", "APPROVED", "REJECTED"]);
export type OrderStatus = z.infer<typeof orderStatusEnum>;

// ── PO Line Item Schema ───────────────────────────────────────────────
export const purchaseOrderProductLineSchema = z.object({
    productId: z.number().int().positive("Product id must be greater than 0"),
    unitId:    z.number().int().positive().optional().nullable(),
    quantity:  z.number().positive("Quantity must be greater than 0"),
    price:     z.number().min(0, "Price must be 0 or greater").optional(),
    notes:     z.string().optional().nullable(),
});

export type PurchaseOrderProductLineInput = z.infer<typeof purchaseOrderProductLineSchema>;

export const createPurchaseOrderSchema = z.object({
    rfqId:       z.number().int().positive("RFQ id must be greater than 0"),
    vendorId:    z.number().int().positive("Vendor id must be greater than 0"),
    destinationFacilityId: z.number().int().positive().optional().nullable(),
    number:      z.string().min(1, "Purchase order number is required"),
    title:       z.string().min(1, "Title is required"),
    date:        z.string().datetime().optional(),
    dueDate:     z.string().datetime(),
    status:      orderStatusEnum,
    notes:       z.string().optional().nullable(),
    totalAmount: z.number().min(0).optional(),
    products:    z.array(purchaseOrderProductLineSchema).optional(),
});

export const updatePurchaseOrderSchema = z.object({
    id:          z.number().int().positive("Purchase order id must be greater than 0"),
    destinationFacilityId: z.number().int().positive().optional().nullable(),
    title:       z.string().min(1).optional(),
    date:        z.string().datetime().optional(),
    dueDate:     z.string().datetime().optional(),
    status:      orderStatusEnum.optional(),
    notes:       z.string().optional().nullable(),
    totalAmount: z.number().min(0).optional(),
    products:    z.array(purchaseOrderProductLineSchema).optional(),
});

export type CreatePurchaseOrderInput = z.infer<typeof createPurchaseOrderSchema>;
export type UpdatePurchaseOrderInput = z.infer<typeof updatePurchaseOrderSchema>;

export interface PurchaseOrderProductRecord {
    id: number;
    purchaseOrderId: number;
    productId: number;
    unitId?: number | null;
    quantity: number | string;
    price?: number | string;
    unitPrice?: number | string;
    totalPrice?: number | string;
    notes?: string | null;
    unit?: {
        id: number;
        name: string;
        symbol?: string | null;
    } | null;
    purchaseOrderProduct?: {
        id: number;
        productName: string;
        sku?: string | null;
        unitLabel?: string | null;
        unit?: {
            id: number;
            name: string;
            symbol?: string | null;
        } | null;
    } | null;
}

export interface PurchaseOrderRecord {
    id: number;
    rfqId: number;
    vendorId: number;
    destinationFacilityId?: number | null;
    destinationFacility?: { id: number; facilityCode: string; facilityName: string; type?: string } | null;
    number: string;
    title: string;
    date: string;
    dueDate: string;
    status: OrderStatus;
    notes?: string | null;
    totalAmount: number | string;
    purchaseOrderReference?: {
        id: number;
        number: string;
        title: string;
    } | null;
    purchaseOrderVendor?: {
        id: number;
        vendorCode?: string | null;
        vendorgroup?: number | null;
        profile?: {
            id?: number;
            firstName: string;
            lastName?: string | null;
            isCompany?: boolean;
            phoneNumber?: string | null;
            address?: string | null;
        } | null;
        vendorProfile?: {
            id?: number;
            firstName: string;
            lastName?: string | null;
            isCompany?: boolean;
            phoneNumber?: string | null;
            address?: string | null;
        } | null;
    } | null;
    purchaseOrderProducts?: PurchaseOrderProductRecord[];
    createdAt?: string;
    updatedAt?: string;
}

export const createRfqSchema = z.object({
    vendorId: z.number().int().positive("Vendor id must be greater than 0"),
    number: z.string().min(1, "RFQ number is required"),
    title: z.string().min(1, "RFQ title is required"),
    date: z.string().datetime().optional(),
    dueDate: z.string().datetime(),
    status: orderStatusEnum,
    notes: z.string().optional().nullable(),
});

export type CreateRfqInput = z.infer<typeof createRfqSchema>;

export interface RfqRecord {
    id: number;
    vendorId: number;
    number: string;
    title: string;
    date: string;
    dueDate: string;
    status: OrderStatus;
    notes?: string | null;
    createdAt?: string;
    updatedAt?: string;
}
