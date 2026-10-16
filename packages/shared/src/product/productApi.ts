import type { VendorProductRecord } from "../vendor/schemas";
import type { ApiClient } from "../api/client";
import type { ApiSuccess, Paginated } from "../api/types";
import type {
    CreateProductInput,
    UpdateProductInput,
    GetProductsQuery,
    ProductItem,
    CreateProductCategoryInput,
    UpdateProductCategoryInput,
    ProductCategoryItem,
    CreateProductInventoryInput,
    GetProductInventoryInput,
    ProductInventoryItem,
    CreateProductPriceInput,
    UpdateProductPriceInput,
    ProductPriceItem,
    CreateProductRecipeInput,
    UpdateProductRecipeInput,
    SetProductRecipeInput,
    ProductRecipeItem,
    CreateProductionBatchInput,
    ConfirmProductionBatchInput,
    CancelProductionBatchInput,
    PreviewProductionBatchInput,
    ProductionBatchRecord,
    ProductionBatchPreviewResult,
    CreateProductWasteInput,
    GetProductWasteQuery,
    ProductWasteRecord,
} from "./schemas";

export function createProductApi(client: ApiClient) {
    return {
        // ── Products ──────────────────────────────────────────────────────────
        async createProduct(input: CreateProductInput): Promise<ApiSuccess<ProductItem>> {
            return client.post<ProductItem>("/api/product/create", input);
        },
        async updateProduct(input: UpdateProductInput): Promise<ApiSuccess<ProductItem>> {
            return client.post<ProductItem>("/api/product/update", input);
        },
        async getVendorsByProduct(productId: number): Promise<ApiSuccess<VendorProductRecord[]>> {
            return client.get<VendorProductRecord[]>(`/api/vendor-product/by-product/${productId}`);
        },
        async deleteProduct(id: number): Promise<ApiSuccess<void>> {
            return client.post<void>("/api/product/delete", { id });
        },
        async getProduct(id: number): Promise<ApiSuccess<ProductItem>> {
            return client.post<ProductItem>("/api/product/get", { id });
        },
        async getProducts(params?: GetProductsQuery): Promise<ApiSuccess<ProductItem[]>> {
            return client.post<ProductItem[]>("/api/product/get-all", params ?? {});
        },

        // ── Product Categories ────────────────────────────────────────────────
        async createCategory(input: CreateProductCategoryInput): Promise<ApiSuccess<ProductCategoryItem>> {
            return client.post<ProductCategoryItem>("/api/product-category/create", input);
        },
        async updateCategory(input: UpdateProductCategoryInput): Promise<ApiSuccess<ProductCategoryItem>> {
            return client.post<ProductCategoryItem>("/api/product-category/update", input);
        },
        async deleteCategory(id: number): Promise<ApiSuccess<void>> {
            return client.post<void>("/api/product-category/delete", { id });
        },
        async getCategory(id: number): Promise<ApiSuccess<ProductCategoryItem>> {
            return client.post<ProductCategoryItem>("/api/product-category/get", { id });
        },
        async getCategories(): Promise<ApiSuccess<ProductCategoryItem[]>> {
            return client.post<ProductCategoryItem[]>("/api/product-category/get-all");
        },

        // ── Product Inventory ─────────────────────────────────────────────────
        async createInventory(input: CreateProductInventoryInput): Promise<ApiSuccess<ProductInventoryItem>> {
            return client.post<ProductInventoryItem>("/api/product/inventory/create", input);
        },
        async getInventory(input: GetProductInventoryInput): Promise<ApiSuccess<ProductInventoryItem[]>> {
            return client.post<ProductInventoryItem[]>("/api/product/inventory/get", input);
        },

        // ── Product Price ─────────────────────────────────────────────────────
        async createPrice(input: CreateProductPriceInput): Promise<ApiSuccess<ProductPriceItem>> {
            return client.post<ProductPriceItem>("/api/product/price/create", input);
        },
        async updatePrice(input: UpdateProductPriceInput): Promise<ApiSuccess<ProductPriceItem>> {
            return client.post<ProductPriceItem>("/api/product/price/update", input);
        },
        async deletePrice(id: number): Promise<ApiSuccess<void>> {
            return client.post<void>("/api/product/price/delete", { id });
        },
        async getPrices(productId: number): Promise<ApiSuccess<ProductPriceItem[]>> {
            return client.post<ProductPriceItem[]>("/api/product/price/get", { productId });
        },
        // ── Product Recipe ────────────────────────────────────────────────────
        async getRecipeByProduct(productId: number): Promise<ApiSuccess<ProductRecipeItem[]>> {
            return client.get<ProductRecipeItem[]>(`/api/product-recipe/by-product/${productId}`);
        },
        async getAllRecipes(query?: { productId?: number; ingredientProductId?: number; page?: number; limit?: number }): Promise<Paginated<ProductRecipeItem>> {
            return client.post<ProductRecipeItem[]>("/api/product-recipe/get-all", query || {}).then((res: any) => ({
                items: res.data || [],
                pagination: res.pagination || { page: 1, limit: 50, total: (res.data || []).length, totalPages: 1, hasNextPage: false, hasPrevPage: false }
            }));
        },
        async setProductRecipe(input: SetProductRecipeInput): Promise<ApiSuccess<ProductRecipeItem[]>> {
            return client.post<ProductRecipeItem[]>("/api/product-recipe/set", input);
        },
        async createRecipeItem(input: CreateProductRecipeInput): Promise<ApiSuccess<ProductRecipeItem>> {
            return client.post<ProductRecipeItem>("/api/product-recipe/create", input);
        },
        async updateRecipeItem(input: UpdateProductRecipeInput): Promise<ApiSuccess<ProductRecipeItem>> {
            return client.post<ProductRecipeItem>("/api/product-recipe/update", input);
        },
        async deleteRecipeItem(id: number): Promise<ApiSuccess<void>> {
            return client.post<void>("/api/product-recipe/delete", { id });
        },
        // ─── Production Batch Work Orders ──────────────────────────────────────────
        async previewProductionBatch(input: PreviewProductionBatchInput): Promise<ApiSuccess<ProductionBatchPreviewResult>> {
            return client.post<ProductionBatchPreviewResult>("/api/production-batch/preview", input);
        },
        async createProductionBatch(input: CreateProductionBatchInput): Promise<ApiSuccess<ProductionBatchRecord>> {
            return client.post<ProductionBatchRecord>("/api/production-batch/create", input);
        },
        async confirmProductionBatch(input: ConfirmProductionBatchInput): Promise<ApiSuccess<ProductionBatchRecord>> {
            return client.post<ProductionBatchRecord>("/api/production-batch/confirm-complete", input);
        },
        async cancelProductionBatch(input: CancelProductionBatchInput): Promise<ApiSuccess<ProductionBatchRecord>> {
            return client.post<ProductionBatchRecord>("/api/production-batch/cancel", input);
        },
        async getProductionBatches(query?: { productId?: number; facilityId?: number; personInChargeId?: number; status?: "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"; search?: string; page?: number; limit?: number }): Promise<Paginated<ProductionBatchRecord>> {
            return client.post<ProductionBatchRecord[]>("/api/production-batch/get-all", query || {}).then((res: any) => {
                const items = Array.isArray(res.data) ? res.data : Array.isArray(res) ? res : [];
                return {
                    items,
                    pagination: res.pagination || { page: 1, limit: 50, total: items.length, totalPages: 1, hasNextPage: false, hasPrevPage: false }
                };
            });
        },
        // --- Product Waste (Lost / Spoiled / Expired) ------------------------------
        async createWaste(input: CreateProductWasteInput): Promise<ApiSuccess<{ waste: ProductWasteRecord; currentStock: number }>> {
            return client.post<{ waste: ProductWasteRecord; currentStock: number }>("/api/product/waste/create", input);
        },
        async getWasteRecords(query?: GetProductWasteQuery): Promise<Paginated<ProductWasteRecord>> {
            return client.post<ProductWasteRecord[]>("/api/product/waste/get-all", query || {}).then((res: any) => ({
                items: res.data || [],
                pagination: res.pagination || { page: 1, limit: 20, total: (res.data || []).length, totalPages: 1, hasNextPage: false, hasPrevPage: false }
            }));
        },
    };
}