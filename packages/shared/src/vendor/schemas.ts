import { z } from "zod";

export const vendorSchema = z.object({
    id: z.number().nullish(),
    profileId: z.number().nullish(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    phoneNumber: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    province: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().optional(),
    isCompany: z.boolean().optional(),
    vendorgroup: z.number().nullish(),
    departReason: z.string().nullish(),
});

export const deletevendorSchema = z.object({
    id: z.number(),
    departReason: z.string().nullish(),
});

export type VendorInput = z.infer<typeof vendorSchema>;
export type DeleteVendorInput = z.infer<typeof deletevendorSchema>;

export interface VendorProfileSummary {
    id?: number;
    firstName: string;
    lastName?: string | null;
    address?: string | null;
    city?: string | null;
    province?: string | null;
    postalCode?: string | null;
    country?: string | null;
    phoneNumber?: string | null;
    isCompany?: boolean;
}

export interface VendorProductRecord {
    id: number;
    vendorId: number;
    productId: number;
    vendorSku?: string | null;
    vendorPrice?: number | string | null;
    currency?: string | null;
    leadTimeDays?: number | null;
    minOrderQuantity?: number | null;
    isPreferred?: boolean;
    notes?: string | null;
    createdAt?: string;
    updatedAt?: string;
    product?: {
        id: number;
        productName: string;
        sku?: string | null;
        barcode?: string | null;
        currentStock?: number;
        unitLabel?: string | null;
        category?: {
            id: number;
            categoryName: string;
        } | null;
        productPrice?: Array<{
            id: number;
            amount: number | string;
            priceType: string;
        }>;
    } | null;
    vendor?: {
        id: number;
        vendorgroup?: number | null;
        profile?: {
            id: number;
            firstName: string;
            lastName?: string | null;
            isCompany?: boolean;
            phoneNumber?: string | null;
            address?: string | null;
            city?: string | null;
            province?: string | null;
        } | null;
    } | null;
}

export interface CreateVendorProductInput {
    vendorId: number;
    productId: number;
    vendorSku?: string | null;
    vendorPrice?: number | null;
    currency?: string;
    leadTimeDays?: number | null;
    minOrderQuantity?: number | null;
    isPreferred?: boolean;
    notes?: string | null;
}

export interface UpdateVendorProductInput {
    id: number;
    vendorSku?: string | null;
    vendorPrice?: number | null;
    currency?: string;
    leadTimeDays?: number | null;
    minOrderQuantity?: number | null;
    isPreferred?: boolean;
    notes?: string | null;
}

export interface DeleteVendorProductInput {
    id: number;
}

export interface VendorRecord {
    id: number;
    profileId: number;
    vendorgroup?: number | null;
    departReason?: string | null;
    deletedAt?: string | null;
    createdAt?: string;
    updatedAt?: string;
    profile?: VendorProfileSummary | null;
    vendorProducts?: VendorProductRecord[];
}


export interface VendorGroupInfo {
    id: number;
    name: string;
    description: string;
    badgeVariant?: "default" | "success" | "warning" | "danger" | "info";
}

export const VENDOR_GROUPS: VendorGroupInfo[] = [
    { id: 1, name: "Tier 1 (Primary Supplier)", description: "Direct strategic supplier with volume agreements and priority terms", badgeVariant: "success" },
    { id: 2, name: "Tier 2 (Secondary Supplier)", description: "Approved secondary or backup vendor partner", badgeVariant: "info" },
    { id: 3, name: "Tier 3 (Subcontractor / Logistics)", description: "Specialized service provider, freight, or subcontractor", badgeVariant: "warning" },
    { id: 4, name: "Wholesale Distributor", description: "Regional authorized distributor / wholesale aggregator", badgeVariant: "default" },
    { id: 5, name: "OEM / Manufacturer", description: "Direct factory or original equipment manufacturer", badgeVariant: "success" },
];

export function getVendorGroupName(groupId?: number | null): string {
    if (groupId == null) return "Tier 1 (Primary Supplier)";
    const group = VENDOR_GROUPS.find((g) => g.id === groupId);
    return group ? group.name : `Tier ${groupId}`;
}

export function getVendorGroupBadgeVariant(groupId?: number | null): "default" | "success" | "warning" | "danger" | "info" {
    if (groupId == null) return "success";
    const group = VENDOR_GROUPS.find((g) => g.id === groupId);
    return group?.badgeVariant || "default";
}
