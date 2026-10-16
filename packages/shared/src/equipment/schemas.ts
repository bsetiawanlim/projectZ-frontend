import { z } from "zod";

export const createEquipmentEntitySchema = z.object({
    equipmentTypeId: z.number().int().positive().optional(),
    brandId: z.number().int().positive().optional(),
    modelId: z.number().int().positive().optional(),
    code: z.string().optional(),
    name: z.string().min(1, "Name is required"),
    description: z.string().optional(),
    unitId: z.number().int().positive().optional(),
    unitPrice: z.number().positive("Unit price must be greater than 0"),
});

export const updateEquipmentEntitySchema = z.object({
    id: z.number().int().positive("ID must be greater than 0"),
    equipmentTypeId: z.number().int().positive().optional(),
    brandId: z.number().int().positive().optional(),
    modelId: z.number().int().positive().optional(),
    code: z.string().optional(),
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    unitId: z.number().int().positive().optional(),
    unitPrice: z.number().positive().optional(),
});

export type CreateEquipmentEntityInput = z.infer<typeof createEquipmentEntitySchema>;
export type UpdateEquipmentEntityInput = z.infer<typeof updateEquipmentEntitySchema>;

export interface EquipmentBrandRecord {
    id: number;
    name: string;
    description?: string | null;
}

export interface EquipmentModelRecord {
    id: number;
    name: string;
    brandId?: number | null;
    equipmentTypeId?: number | null;
    type?: { id: number; name: string } | null;
}

export interface EquipmentTypeRecord {
    id: number;
    name: string;
    description?: string | null;
}

export interface EquipmentEntityRecord {
    id: number;
    equipmentTypeId?: number | null;
    brandId?: number | null;
    modelId?: number | null;
    code?: string | null;
    name: string;
    description?: string | null;
    unitId?: number | null;
    unitPrice: number;
    brand?: EquipmentBrandRecord | null;
    model?: EquipmentModelRecord | null;
    prices?: EquipmentPriceRecord[];
    equipmentFeature?: any[];
    equipmentMaintenance?: any[];
    createdAt?: string;
    updatedAt?: string;
}

export type EquipmentPriceType = "SALE" | "LEASE_DAILY" | "LEASE_MONTHLY" | "LEASE_YEARLY";

export const createEquipmentPriceSchema = z.object({
    equipmentEntityId: z.number().int().positive("Equipment ID must be positive"),
    customerGroup: z.number().int().positive().optional().nullable(),
    priceType: z.enum(["SALE", "LEASE_DAILY", "LEASE_MONTHLY", "LEASE_YEARLY"]),
    amount: z.number().positive("Amount must be greater than 0"),
    currency: z.string().default("USD").optional(),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
});

export const updateEquipmentPriceSchema = z.object({
    id: z.number().int().positive("ID is required"),
    equipmentEntityId: z.number().int().positive().optional(),
    customerGroup: z.number().int().positive().optional().nullable(),
    priceType: z.enum(["SALE", "LEASE_DAILY", "LEASE_MONTHLY", "LEASE_YEARLY"]).optional(),
    amount: z.number().positive("Amount must be greater than 0").optional(),
    currency: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
});

export interface CreateEquipmentPriceInput {
    equipmentEntityId: number;
    customerGroup?: number | null;
    priceType: EquipmentPriceType;
    amount: number;
    currency?: string;
    startDate: string;
    endDate?: string | null;
    notes?: string | null;
}

export interface UpdateEquipmentPriceInput {
    id: number;
    equipmentEntityId?: number;
    customerGroup?: number | null;
    priceType?: EquipmentPriceType;
    amount?: number;
    currency?: string;
    startDate?: string;
    endDate?: string | null;
    notes?: string | null;
}

export interface EquipmentPriceRecord {
    id: number;
    equipmentEntityId: number;
    customerGroup?: number | null;
    priceType: EquipmentPriceType;
    amount: number;
    currency: string;
    startDate: string;
    endDate?: string | null;
    notes?: string | null;
    createdAt?: string;
    updatedAt?: string;
    createdBy?: { id: number; name: string } | null;
    equipment?: { id: number; name: string; code?: string | null } | null;
}


