import type { VendorProductRecord } from "../vendor/schemas";
import { z } from "zod";

// ── Product ───────────────────────────────────────────────────────────────────
export const createProductSchema = z.object({
    productName: z.string().min(3, "Product name must be at least 3 characters long"),
    description: z.string().optional(),
    sku: z.string().optional(),
    barcode: z.string().optional(),
    retailPrice: z.number().optional(),
    price: z.number().optional(),
    unitId: z.number().int().positive().optional().nullable(),
    unitLabel: z.string().optional().nullable(),
    productCategoryId: z.number().int().positive("Category id must be greater than 0").optional(),
    parentProductId: z.number().int().positive().nullable().optional(),
    isTradeable: z.boolean().optional(),
    isLowStockAlertEnabled: z.boolean().optional(),
    hasFormula: z.boolean().optional(),
    minStock: z.number().min(0).optional(),
    imageUrl: z.string().optional().nullable(),
});

export const updateProductSchema = z.object({
    id: z.number().int().positive("Product id must be greater than 0"),
    productName: z.string().min(3, "Product name must be at least 3 characters long").optional(),
    description: z.string().optional(),
    sku: z.string().min(1, "SKU is required").optional(),
    barcode: z.string().optional(),
    retailPrice: z.number().optional(),
    price: z.number().optional(),
    unitId: z.number().int().positive().optional().nullable(),
    unitLabel: z.string().optional().nullable(),
    productCategoryId: z.number().int().positive("Category id must be greater than 0").optional(),
    parentProductId: z.number().int().positive().nullable().optional(),
    isTradeable: z.boolean().optional(),
    isLowStockAlertEnabled: z.boolean().optional(),
    minStock: z.number().min(0).optional(),
    imageUrl: z.string().optional().nullable(),
});

export const deleteProductSchema = z.object({
    id: z.number().int().positive("Product id must be greater than 0"),
});

export const getProductSchema = z.object({
    id: z.number().int().positive("Product id must be greater than 0"),
});

export const getProductsSchema = z.object({
    page: z.number().int().positive("Page must be greater than 0").optional(),
    limit: z.number().int().positive("Limit must be greater than 0").optional(),
    categoryId: z.number().int().positive().optional(),
    parentProductId: z.number().int().positive().optional(),
    rootOnly: z.boolean().optional(),
    isTradeable: z.boolean().optional(),
    search: z.string().optional(),
    lowStockOnly: z.boolean().optional(),
    facilityId: z.number().int().positive().optional(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type DeleteProductInput = z.infer<typeof deleteProductSchema>;
export type GetProductInput = z.infer<typeof getProductSchema>;
export type GetProductsQuery = z.infer<typeof getProductsSchema>;

export interface ProductStorageStockItem {
    id: number;
    productId: number;
    facilityId: number;
    sectionId?: number | null;
    stock: number;
    minStock: number;
    facility?: { id: number; facilityName: string; facilityCode: string };
    section?: { id: number; sectionName: string; sectionCode: string };
}

export interface ProductItem {
    producibleStock?: number;
    canBeSold?: boolean;
    id: number;
    productName: string;
    description?: string | null;
    sku?: string | null;
    barcode?: string | null;
    unitId?: number | null;
    unitLabel?: string | null;
    productCategoryId?: number | null;
    parentProductId?: number | null;
    parentProduct?: ProductItem | null;
    subProducts?: ProductItem[];
    isTradeable?: boolean;
    isLowStockAlertEnabled?: boolean;
  hasFormula?: boolean;
    currentStock?: number;
    minStock?: number;
    isLowStock?: boolean;
    retailPrice?: number | null;
    createdAt?: string;
    updatedAt?: string;
    category?: ProductCategoryItem | null;
    vendorProducts?: VendorProductRecord[];
    recipes?: ProductRecipeItem[];
    usedInRecipes?: ProductRecipeItem[];
    productImages?: Array<{
        id: number;
        imageUrl: string;
        altText?: string | null;
        isPrimary: boolean;
        sortOrder?: number;
    }>;
        storageStocks?: ProductStorageStockItem[];
    imageUrl?: string | null;
}

// ── Product Category ──────────────────────────────────────────────────────────
export const createProductCategorySchema = z.object({
    categoryName: z.string().min(1, "Category name is required"),
    parentCategoryId: z.number().int().positive().nullish(),
    description: z.string().nullish(),
});

export const updateProductCategorySchema = z.object({
    id: z.number().int().positive("Category id must be greater than 0"),
    categoryName: z.string().min(1, "Category name is required").optional(),
    parentCategoryId: z.number().int().positive().nullish(),
    description: z.string().nullish(),
});

export const deleteProductCategorySchema = z.object({
    id: z.number().int().positive("Category id must be greater than 0"),
});

export const getProductCategorySchema = z.object({
    id: z.number().int().positive("Category id must be greater than 0"),
});

export type CreateProductCategoryInput = z.infer<typeof createProductCategorySchema>;
export type UpdateProductCategoryInput = z.infer<typeof updateProductCategorySchema>;
export type DeleteProductCategoryInput = z.infer<typeof deleteProductCategorySchema>;
export type GetProductCategoryInput = z.infer<typeof getProductCategorySchema>;

export interface ProductCategoryItem {
    id: number;
    categoryName: string;
    parentCategoryId?: number | null;
    parentCategory?: { id: number; categoryName: string } | null;
    subCategories?: Array<{ id: number; categoryName: string }>;
    description?: string | null;
    createdAt?: string;
    updatedAt?: string;
}

// ── Product Inventory ─────────────────────────────────────────────────────────
export const createProductInventorySchema = z.object({
    facilityId: z.number().int().positive().optional().nullable(),
    sectionId: z.number().int().positive().optional().nullable(),
    productId: z.number().int().positive("Product id must be greater than 0"),
    transactionType: z.enum(["IN", "OUT", "ADJUSTMENT"]),
    quantity: z.number().int().positive("Quantity must be greater than 0"),
    reference: z.string().optional(),
    notes: z.string().optional(),
    transactionDate: z.string().datetime().optional(),
});

export const getProductInventorySchema = z.object({
    facilityId: z.number().int().positive().optional().nullable(),
    productId: z.number().int().positive("Product id must be greater than 0"),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().optional(),
});

export type CreateProductInventoryInput = z.infer<typeof createProductInventorySchema>;
export type GetProductInventoryInput = z.infer<typeof getProductInventorySchema>;

export interface ProductInventoryItem {
    id: number;
    productId: number;
    transactionType: "IN" | "OUT" | "ADJUSTMENT";
    quantity: number;
    currentStock: number;
    reference?: string | null;
    notes?: string | null;
    transactionDate?: string;
        facilityId?: number | null;
    sectionId?: number | null;
    facility?: { id: number; facilityName: string; facilityCode: string } | null;
    section?: { id: number; sectionName: string; sectionCode: string } | null;
    createdAt?: string;
}

// ── Product Price ─────────────────────────────────────────────────────────────
export const createProductPriceSchema = z.object({
    productId: z.number().int().positive("Product id must be greater than 0"),
    customerGroup: z.number().int().positive().optional().nullable(),
    amount: z.number().positive("Amount must be greater than 0"),
    priceType: z.enum(["retail", "wholesale", "special"]),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    currency: z.string().length(3, "Currency must be a 3-letter code").optional(),
});

export const updateProductPriceSchema = z.object({
    id: z.number().int().positive("Price id must be greater than 0"),
    customerGroup: z.number().int().positive().optional().nullable(),
    amount: z.number().positive("Amount must be greater than 0").optional(),
    priceType: z.enum(["retail", "wholesale", "special"]).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    currency: z.string().length(3, "Currency must be a 3-letter code").optional(),
});

export const deleteProductPriceSchema = z.object({
    id: z.number().int().positive("Price id must be greater than 0"),
});

export const getProductPriceSchema = z.object({
    productId: z.number().int().positive("Product id must be greater than 0"),
});

export type CreateProductPriceInput = z.infer<typeof createProductPriceSchema>;
export type UpdateProductPriceInput = z.infer<typeof updateProductPriceSchema>;
export type DeleteProductPriceInput = z.infer<typeof deleteProductPriceSchema>;
export type GetProductPriceInput = z.infer<typeof getProductPriceSchema>;

export interface ProductPriceItem {
    id: number;
    productId: number;
    customerGroup?: number | null;
    amount: number;
    priceType: "retail" | "wholesale" | "special";
    currency: string;
    startDate?: string | null;
    endDate?: string | null;
    createdAt?: string;
}


// ── Product Recipe ────────────────────────────────────────────────────────────
export const createProductRecipeSchema = z.object({
    productId: z.number().int().positive("Product ID is required"),
    ingredientProductId: z.number().int().positive("Ingredient Product ID is required"),
    quantity: z.number().positive("Quantity must be greater than zero"),
    unitId: z.number().int().positive().optional().nullable(),
    unitLabel: z.string().max(20).optional().nullable(),
    notes: z.string().optional().nullable(),
});

export const updateProductRecipeSchema = z.object({
    id: z.number().int().positive("Recipe item ID is required"),
    quantity: z.number().positive("Quantity must be greater than zero").optional(),
    unitId: z.number().int().positive().optional().nullable(),
    unitLabel: z.string().max(20).optional().nullable(),
    notes: z.string().optional().nullable(),
});

export const deleteProductRecipeSchema = z.object({
    id: z.number().int().positive("Recipe item ID is required"),
});

export const setProductRecipeSchema = z.object({
    productId: z.number().int().positive("Product ID is required"),
    items: z.array(
        z.object({
            ingredientProductId: z.number().int().positive("Ingredient Product ID is required"),
            quantity: z.number().positive("Quantity must be greater than zero"),
            unitId: z.number().int().positive().optional().nullable(),
            unitLabel: z.string().max(20).optional().nullable(),
            notes: z.string().optional().nullable(),
        })
    ),
});

export type CreateProductRecipeInput = z.infer<typeof createProductRecipeSchema>;
export type UpdateProductRecipeInput = z.infer<typeof updateProductRecipeSchema>;
export type DeleteProductRecipeInput = z.infer<typeof deleteProductRecipeSchema>;
export type SetProductRecipeInput = z.infer<typeof setProductRecipeSchema>;

export interface ProductRecipeItem {
    id: number;
    productId: number;
    ingredientProductId: number;
    quantity: number;
    unitId?: number | null;
    unitLabel?: string | null;
    notes?: string | null;
    createdAt?: string;
    updatedAt?: string;
    product?: {
        id: number;
        productName: string;
        sku?: string | null;
    };
    ingredient?: {
        id: number;
        productName: string;
        sku?: string | null;
        currentStock?: number;
        unitId?: number | null;
        unitLabel?: string | null;
        retailPrice?: number | null;
        unitCost?: number | null;
    };
    unit?: {
        id: number;
        unit: string;
        abbr: string;
        baseQuantity: string;
    } | null;
}


// ─── Production Batch Work Orders ──────────────────────────────────────────
export const createProductionBatchSchema = z.object({
    productId: z.number().int().positive("Product ID is required"),
    quantity: z.number().positive("Batch quantity must be greater than zero"),
    facilityId: z.number().int().positive("Facility is required"),
    personInChargeId: z.number().int().positive("Person in charge is required"),
    notes: z.string().optional().nullable(),
});

export const confirmProductionBatchSchema = z.object({
    id: z.number().int().positive("Batch ID is required"),
    notes: z.string().optional().nullable(),
});

export const cancelProductionBatchSchema = z.object({
    id: z.number().int().positive("Batch ID is required"),
    reason: z.string().optional().nullable(),
});

export const previewProductionBatchSchema = z.object({
    productId: z.number().int().positive("Product ID is required"),
    quantity: z.number().positive("Quantity must be greater than zero"),
    facilityId: z.number().int().positive().optional().nullable(),
});

export type CreateProductionBatchInput = z.infer<typeof createProductionBatchSchema>;
export type ConfirmProductionBatchInput = z.infer<typeof confirmProductionBatchSchema>;
export type CancelProductionBatchInput = z.infer<typeof cancelProductionBatchSchema>;
export type PreviewProductionBatchInput = z.infer<typeof previewProductionBatchSchema>;

export interface ProductionBatchItemRecord {
    id: number;
    batchId: number;
    ingredientProductId: number;
    quantityPerUnit: number;
    quantityConsumed: number;
    unitLabel?: string | null;
    unitCost: number;
    lineCost: number;
    ingredient?: {
        id: number;
        productName: string;
        sku?: string | null;
        unitLabel?: string | null;
    };
}

export interface ProductionBatchRecord {
    id: number;
    batchNumber: string;
    productId: number;
    facilityId?: number | null;
    personInChargeId?: number | null;
    quantity: number;
    unitLabel?: string | null;
    status: "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
    materialCost: number;
    laborCost: number;
    equipmentCost: number;
    totalCost: number;
    unitCost: number;
    notes?: string | null;
    producedAt?: string | null;
    confirmedAt?: string | null;
    confirmedBy?: string | null;
    cancelledAt?: string | null;
    cancelReason?: string | null;
    createdAt: string;
    facility?: {
        id: number;
        facilityName: string;
        facilityCode: string;
    } | null;
    personInCharge?: {
        id: number;
        profile?: {
            id: number;
            firstName: string;
            lastName?: string | null;
        } | null;
        position?: {
            id: number;
            name: string;
        } | null;
    } | null;
    confirmedByUser?: {
        id: string;
        username?: string | null;
    } | null;
    product?: {
        id: number;
        productName: string;
        sku?: string | null;
        currentStock?: number;
        unitLabel?: string | null;
    };
    items?: ProductionBatchItemRecord[];
}

export interface ProductionBatchPreviewResult {
    product: {
        id: number;
        productName: string;
        sku: string;
        unitLabel?: string | null;
        currentStock: number;
        targetQuantity: number;
        stockAfterProduction: number;
    };
    items: Array<{
        ingredientProductId: number;
        productName: string;
        sku: string;
        unitLabel?: string | null;
        qtyPerUnit: number;
        qtyNeeded: number;
        currentStock: number;
        hasEnoughStock: boolean;
        shortage: number;
        unitCost: number;
        lineCost: number;
    }>;
    canProduce: boolean;
    costBreakdown: {
        materialCost: number;
        laborCost: number;
        equipmentCost: number;
        totalCost: number;
        unitCost: number;
    };
}

// -------------------------------------------------------------
// Product Waste (Lost / Spoiled / Expired / Damaged Write-offs)
// -------------------------------------------------------------

export const wasteReasonSchema = z.enum([
  "EXPIRED",
  "SPOILED",
  "LOST",
  "DAMAGED",
  "SCRAP",
  "OTHER",
]);

export type WasteReason = z.infer<typeof wasteReasonSchema>;

export const createProductWasteSchema = z.object({
  productId: z.number().int().positive("Product ID is required"),
  facilityId: z.number().int().positive().optional().nullable(),
  sectionId: z.number().int().positive().optional().nullable(),
  quantity: z.number().positive("Quantity must be greater than 0"),
  reason: wasteReasonSchema,
  unitCost: z.number().min(0).optional().nullable(),
  notes: z.string().optional().nullable(),
  wasteDate: z.string().datetime().optional().nullable(),
});

export type CreateProductWasteInput = z.infer<typeof createProductWasteSchema>;

export const getProductWasteSchema = z.object({
  productId: z.coerce.number().int().positive().optional().nullable(),
  facilityId: z.coerce.number().int().positive().optional().nullable(),
  reason: wasteReasonSchema.optional().nullable(),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
});

export type GetProductWasteQuery = z.infer<typeof getProductWasteSchema>;

export interface ProductWasteRecord {
  id: number;
  productId: number;
  facilityId?: number | null;
  sectionId?: number | null;
  quantity: number;
  unitCost: number;
  totalCost: number;
  reason: WasteReason;
  notes?: string | null;
  wasteDate: string;
  createdAt: string;
  product?: {
    id: number;
    productName: string;
    sku?: string | null;
    unitLabel?: string | null;
    category?: { id: number; categoryName: string } | null;
  } | null;
  facility?: {
    id: number;
    facilityName: string;
    facilityCode: string;
    type?: string;
  } | null;
  section?: {
    id: number;
    sectionName: string;
    sectionCode: string;
  } | null;
  wasteCreatedBy?: {
    id: string;
    username: string;
    email: string;
  } | null;
}
