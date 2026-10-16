import type { ApiClient } from "../api/client";
import type { ApiSuccess, Paginated, PaginationParams } from "../api/types";
import type {
    CreateEquipmentEntityInput,
    UpdateEquipmentEntityInput,
    EquipmentEntityRecord,
    EquipmentBrandRecord,
    EquipmentModelRecord,
    EquipmentTypeRecord,
    EquipmentPriceRecord,
    CreateEquipmentPriceInput,
    UpdateEquipmentPriceInput,
    DepreciationCalculationResult,
} from "./schemas";

export function createEquipmentApi(client: ApiClient) {
    return {
        async listEquipment(query?: PaginationParams): Promise<Paginated<EquipmentEntityRecord>> {
            return client.list<EquipmentEntityRecord>("/api/equipment/get-all", query);
        },
        async getEquipment(id: number): Promise<ApiSuccess<EquipmentEntityRecord>> {
            return client.post<EquipmentEntityRecord>("/api/equipment/get", { id });
        },
        async getEquipmentDepreciation(id: number, asOfDate?: string): Promise<ApiSuccess<{ equipment: EquipmentEntityRecord; depreciation: DepreciationCalculationResult }>> {
            return client.post<{ equipment: EquipmentEntityRecord; depreciation: DepreciationCalculationResult }>("/api/equipment/depreciation", { id, asOfDate });
        },
        async createEquipment(input: CreateEquipmentEntityInput): Promise<ApiSuccess<EquipmentEntityRecord>> {
            return client.post<EquipmentEntityRecord>("/api/equipment/create", input);
        },
        async updateEquipment(input: UpdateEquipmentEntityInput): Promise<ApiSuccess<EquipmentEntityRecord>> {
            return client.post<EquipmentEntityRecord>("/api/equipment/update", input);
        },
        async deleteEquipment(id: number): Promise<ApiSuccess<EquipmentEntityRecord>> {
            return client.post<EquipmentEntityRecord>("/api/equipment/delete", { id });
        },
        async listBrands(query?: PaginationParams): Promise<Paginated<EquipmentBrandRecord>> {
            return client.list<EquipmentBrandRecord>("/api/equipment-brand/get-all", query);
        },
        async listTypes(query?: PaginationParams): Promise<Paginated<EquipmentTypeRecord>> {
            return client.list<EquipmentTypeRecord>("/api/equipment-type/get-all", query);
        },
        async listModels(query?: PaginationParams): Promise<Paginated<EquipmentModelRecord>> {
            return client.list<EquipmentModelRecord>("/api/equipment-model/get-all", query);
        },
        async getEquipmentPrices(equipmentEntityId: number): Promise<ApiSuccess<EquipmentPriceRecord[]>> {
            return client.post<EquipmentPriceRecord[]>("/api/equipment-price/by-equipment", { equipmentEntityId });
        },
        async createEquipmentPrice(input: CreateEquipmentPriceInput): Promise<ApiSuccess<EquipmentPriceRecord>> {
            return client.post<EquipmentPriceRecord>("/api/equipment-price/create", input);
        },
        async updateEquipmentPrice(input: UpdateEquipmentPriceInput): Promise<ApiSuccess<EquipmentPriceRecord>> {
            return client.post<EquipmentPriceRecord>("/api/equipment-price/update", input);
        },
        async deleteEquipmentPrice(id: number): Promise<ApiSuccess<EquipmentPriceRecord>> {
            return client.post<EquipmentPriceRecord>("/api/equipment-price/delete", { id });
        },
    };
}

