import { z } from "zod";

export const facilityTypeEnum = z.enum(["WAREHOUSE", "STORE", "OFFICE", "FACTORY", "OTHER"]);
export const facilitySectionTypeEnum = z.enum(["ZONE", "AISLE", "RACK", "ROOM", "COUNTER", "DISPLAY", "STAGING", "OTHER"]);

export type FacilityType = z.infer<typeof facilityTypeEnum>;
export type FacilitySectionType = z.infer<typeof facilitySectionTypeEnum>;

export interface FacilitySectionRecord {
  id: number;
  facilityId: number;
  sectionCode: string;
  sectionName: string;
  type: FacilitySectionType;
  description?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  _count?: {
    storageStocks?: number;
    productInventories?: number;
  };
}

export interface FacilityRecord {
  id: number;
  facilityCode: string;
  facilityName: string;
  type: FacilityType;
  description?: string | null;
  address?: string | null;
  city?: string | null;
  province?: string | null;
  postalCode?: string | null;
  country?: string | null;
  phoneNumber?: string | null;
  email?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  sections?: FacilitySectionRecord[];
  _count?: {
    sections?: number;
    storageStocks?: number;
    employees?: number;
    purchaseOrders?: number;
    salesOrders?: number;
  };
}

export const createFacilitySchema = z.object({
  facilityCode: z.string().min(2).max(50),
  facilityName: z.string().min(2).max(150),
  type: facilityTypeEnum.default("WAREHOUSE"),
  description: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  province: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  phoneNumber: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  isActive: z.boolean().default(true),
});

export const updateFacilitySchema = z.object({
  id: z.number().int().positive(),
  facilityCode: z.string().min(2).max(50).optional(),
  facilityName: z.string().min(2).max(150).optional(),
  type: facilityTypeEnum.optional(),
  description: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  province: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  phoneNumber: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  isActive: z.boolean().optional(),
});

export const getFacilitiesQuerySchema = z.object({
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().optional(),
  type: facilityTypeEnum.optional(),
  isActive: z.boolean().optional(),
  search: z.string().optional(),
});

export const createFacilitySectionSchema = z.object({
  facilityId: z.number().int().positive(),
  sectionCode: z.string().min(1).max(50),
  sectionName: z.string().min(1).max(150),
  type: facilitySectionTypeEnum.default("ZONE"),
  description: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

export const updateFacilitySectionSchema = z.object({
  id: z.number().int().positive(),
  sectionCode: z.string().min(1).max(50).optional(),
  sectionName: z.string().min(1).max(150).optional(),
  type: facilitySectionTypeEnum.optional(),
  description: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export type CreateFacilityInput = z.infer<typeof createFacilitySchema>;
export type UpdateFacilityInput = z.infer<typeof updateFacilitySchema>;
export type GetFacilitiesQuery = z.infer<typeof getFacilitiesQuerySchema>;
export type CreateFacilitySectionInput = z.infer<typeof createFacilitySectionSchema>;
export type UpdateFacilitySectionInput = z.infer<typeof updateFacilitySectionSchema>;
