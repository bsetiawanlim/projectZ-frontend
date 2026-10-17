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
    facilityEmployees?: number;
    facilityProducts?: number;
    facilityEquipments?: number;
    tables?: number;
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

// Facility Employees (Many-to-Many Conjunction)
export interface FacilityEmployeeRecord {
  id: number;
  facilityId: number;
  employeeId: number;
  isPrimary: boolean;
  role?: string | null;
  notes?: string | null;
  assignedAt: string;
  createdAt?: string;
  updatedAt?: string;
  facility?: FacilityRecord;
  employee?: {
    id: number;
    profileId: number;
    positionId?: number | null;
    employmentType?: string;
    facilityId?: number | null;
    profile?: {
      id: number;
      firstName: string;
      lastName?: string | null;
      email?: string | null;
      phoneNumber?: string | null;
    };
    position?: {
      id: number;
      name?: string;
      positionName?: string;
    } | null;
  };
}

export const createFacilityEmployeeSchema = z.object({
  facilityId: z.number().int().positive(),
  employeeId: z.number().int().positive(),
  isPrimary: z.boolean().optional().default(false),
  role: z.string().max(100).optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const updateFacilityEmployeeSchema = z.object({
  id: z.number().int().positive(),
  isPrimary: z.boolean().optional(),
  role: z.string().max(100).optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type CreateFacilityEmployeeInput = z.input<typeof createFacilityEmployeeSchema>;
export type UpdateFacilityEmployeeInput = z.input<typeof updateFacilityEmployeeSchema>;

// Facility Products (Many-to-Many Conjunction)
export interface FacilityProductRecord {
  id: number;
  facilityId: number;
  productId: number;
  isTradeable: boolean;
  minStock?: number | null;
  maxStock?: number | null;
  isActive: boolean;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
  facility?: FacilityRecord;
  product?: {
    id: number;
    productName: string;
    sku: string;
    barcode?: string | null;
    currentStock?: number | string;
    isTradeable?: boolean;
    category?: { id: number; categoryName: string } | null;
    unit?: { id: number; name: string; symbol: string } | null;
    productPrice?: Array<{ id: number; amount: number | string; priceType: string }>;
    productImages?: Array<{ id: number; imageUrl: string; isPrimary: boolean }>;
    storageStocks?: Array<{ id: number; facilityId: number; sectionId?: number | null; stock: number | string; section?: { id: number; sectionName: string } | null }>;
  };
}

export const createFacilityProductSchema = z.object({
  facilityId: z.number().int().positive(),
  productId: z.number().int().positive(),
  isTradeable: z.boolean().optional().default(true),
  minStock: z.number().optional().nullable(),
  maxStock: z.number().optional().nullable(),
  isActive: z.boolean().optional().default(true),
  notes: z.string().optional().nullable(),
});

export const updateFacilityProductSchema = z.object({
  id: z.number().int().positive(),
  isTradeable: z.boolean().optional(),
  minStock: z.number().optional().nullable(),
  maxStock: z.number().optional().nullable(),
  isActive: z.boolean().optional(),
  notes: z.string().optional().nullable(),
});

export type CreateFacilityProductInput = z.input<typeof createFacilityProductSchema>;
export type UpdateFacilityProductInput = z.input<typeof updateFacilityProductSchema>;

// Facility Equipment (Many-to-Many Conjunction)
export interface FacilityEquipmentRecord {
  id: number;
  facilityId: number;
  equipmentEntityId: number;
  sectionId?: number | null;
  status: string;
  quantity: number;
  notes?: string | null;
  assignedAt: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  facility?: FacilityRecord;
  section?: FacilitySectionRecord | null;
  facilitySection?: FacilitySectionRecord | null;
  equipmentEntity?: {
    id: number;
    code?: string | null;
    name: string;
    description?: string | null;
    brand?: { id: number; name?: string; brandName?: string } | null;
    model?: { id: number; name?: string; modelName?: string } | null;
    equipmentType?: { id: number; name?: string; typeName?: string } | null;
    unit?: { id: number; name: string; symbol?: string } | null;
  };
}

export const createFacilityEquipmentSchema = z.object({
  facilityId: z.number().int().positive(),
  equipmentEntityId: z.number().int().positive(),
  sectionId: z.number().int().positive().optional().nullable(),
  status: z.string().max(50).optional().default("ACTIVE"),
  quantity: z.number().int().min(1).optional().default(1),
  notes: z.string().optional().nullable(),
  isActive: z.boolean().optional().default(true),
});

export const updateFacilityEquipmentSchema = z.object({
  id: z.number().int().positive(),
  sectionId: z.number().int().positive().optional().nullable(),
  status: z.string().max(50).optional(),
  quantity: z.number().int().min(1).optional(),
  notes: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export type CreateFacilityEquipmentInput = z.input<typeof createFacilityEquipmentSchema>;
export type UpdateFacilityEquipmentInput = z.input<typeof updateFacilityEquipmentSchema>;

// Facility Tables (Dining / Cafe / Seating)
export interface FacilityTableRecord {
  id: number;
  facilityId: number;
  sectionId?: number | null;
  tableNumber: string;
  label?: string | null;
  capacity: number;
  status: string; // "AVAILABLE" | "OCCUPIED" | "RESERVED" | "OUT_OF_SERVICE"
  qrCode?: string | null;
  isActive: boolean;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
  facility?: FacilityRecord;
  section?: FacilitySectionRecord | null;
}

export const createFacilityTableSchema = z.object({
  facilityId: z.number().int().positive(),
  sectionId: z.number().int().positive().optional().nullable(),
  tableNumber: z.string().min(1).max(50),
  label: z.string().max(100).optional().nullable(),
  capacity: z.number().int().min(1).optional().default(4),
  status: z.string().max(50).optional().default("AVAILABLE"),
  qrCode: z.string().optional().nullable(),
  isActive: z.boolean().optional().default(true),
  notes: z.string().optional().nullable(),
});

export const updateFacilityTableSchema = z.object({
  id: z.number().int().positive(),
  sectionId: z.number().int().positive().optional().nullable(),
  tableNumber: z.string().min(1).max(50).optional(),
  label: z.string().max(100).optional().nullable(),
  capacity: z.number().int().min(1).optional(),
  status: z.string().max(50).optional(),
  qrCode: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  notes: z.string().optional().nullable(),
});

export type CreateFacilityTableInput = z.input<typeof createFacilityTableSchema>;
export type UpdateFacilityTableInput = z.input<typeof updateFacilityTableSchema>;


