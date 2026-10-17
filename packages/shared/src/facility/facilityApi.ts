import type { ApiClient } from "../api/client";
import type { ApiSuccess, Paginated } from "../api/types";
import type {
  FacilityRecord,
  FacilitySectionRecord,
  CreateFacilityInput,
  UpdateFacilityInput,
  GetFacilitiesQuery,
  CreateFacilitySectionInput,
  UpdateFacilitySectionInput,
  FacilityEmployeeRecord,
  CreateFacilityEmployeeInput,
  UpdateFacilityEmployeeInput,
  FacilityProductRecord,
  CreateFacilityProductInput,
  UpdateFacilityProductInput,
  FacilityEquipmentRecord,
  CreateFacilityEquipmentInput,
  UpdateFacilityEquipmentInput,
  FacilityTableRecord,
  CreateFacilityTableInput,
  UpdateFacilityTableInput,
} from "./schemas";

export function createFacilityApi(client: ApiClient) {
  return {
    async createFacility(input: CreateFacilityInput): Promise<ApiSuccess<FacilityRecord>> {
      return client.post<FacilityRecord>("/api/facility/create", input);
    },
    async updateFacility(input: UpdateFacilityInput): Promise<ApiSuccess<FacilityRecord>> {
      return client.post<FacilityRecord>("/api/facility/update", input);
    },
    async deleteFacility(id: number): Promise<ApiSuccess<{ id: number }>> {
      return client.post<{ id: number }>("/api/facility/delete", { id });
    },
    async getFacility(id: number): Promise<ApiSuccess<FacilityRecord>> {
      return client.post<FacilityRecord>("/api/facility/get", { id });
    },
    async getFacilities(query?: GetFacilitiesQuery): Promise<Paginated<FacilityRecord>> {
      return client.post<FacilityRecord[]>("/api/facility/get-all", query ?? {}).then((res: any) => {
        const items = Array.isArray(res.data) ? res.data : Array.isArray(res) ? res : [];
        return {
          items,
          data: items,
          pagination: res.pagination || { page: 1, limit: items.length, total: items.length, totalPages: 1, hasNextPage: false, hasPrevPage: false },
        };
      });
    },
    async listFacilities(query?: GetFacilitiesQuery): Promise<Paginated<FacilityRecord>> {
      return client.post<FacilityRecord[]>("/api/facility/get-all", query ?? {}).then((res: any) => {
        const items = Array.isArray(res.data) ? res.data : Array.isArray(res) ? res : [];
        return {
          items,
          data: items,
          pagination: res.pagination || { page: 1, limit: items.length, total: items.length, totalPages: 1, hasNextPage: false, hasPrevPage: false },
        };
      });
    },

    // Sections
    async createSection(input: CreateFacilitySectionInput): Promise<ApiSuccess<FacilitySectionRecord>> {
      return client.post<FacilitySectionRecord>("/api/facility-section/create", input);
    },
    async updateSection(input: UpdateFacilitySectionInput): Promise<ApiSuccess<FacilitySectionRecord>> {
      return client.post<FacilitySectionRecord>("/api/facility-section/update", input);
    },
    async deleteSection(id: number): Promise<ApiSuccess<{ id: number }>> {
      return client.post<{ id: number }>("/api/facility-section/delete", { id });
    },
    async getSectionsByFacility(facilityId: number): Promise<ApiSuccess<FacilitySectionRecord[]>> {
      return client.post<FacilitySectionRecord[]>("/api/facility-section/get-by-facility", { facilityId });
    },

    // Facility Employees (Many-to-Many)
    async addEmployee(input: CreateFacilityEmployeeInput): Promise<ApiSuccess<FacilityEmployeeRecord>> {
      return client.post<FacilityEmployeeRecord>("/api/facility-employee/create", input);
    },
    async updateEmployee(input: UpdateFacilityEmployeeInput): Promise<ApiSuccess<FacilityEmployeeRecord>> {
      return client.post<FacilityEmployeeRecord>("/api/facility-employee/update", input);
    },
    async removeEmployee(id: number): Promise<ApiSuccess<{ id: number }>> {
      return client.post<{ id: number }>("/api/facility-employee/delete", { id });
    },
    async getEmployeesByFacility(facilityId: number, search?: string): Promise<ApiSuccess<FacilityEmployeeRecord[]>> {
      return client.post<FacilityEmployeeRecord[]>("/api/facility-employee/get-by-facility", { facilityId, search });
    },
    async getFacilitiesByEmployee(employeeId: number): Promise<ApiSuccess<FacilityEmployeeRecord[]>> {
      return client.post<FacilityEmployeeRecord[]>("/api/facility-employee/get-by-employee", { employeeId });
    },

    // Facility Products (Many-to-Many & Tradeable Flag per facility)
    async addProduct(input: CreateFacilityProductInput): Promise<ApiSuccess<FacilityProductRecord>> {
      return client.post<FacilityProductRecord>("/api/facility-product/create", input);
    },
    async updateProduct(input: UpdateFacilityProductInput): Promise<ApiSuccess<FacilityProductRecord>> {
      return client.post<FacilityProductRecord>("/api/facility-product/update", input);
    },
    async removeProduct(id: number): Promise<ApiSuccess<{ id: number }>> {
      return client.post<{ id: number }>("/api/facility-product/delete", { id });
    },
    async getProductsByFacility(
      facilityId: number,
      opts?: { isTradeable?: boolean; isActive?: boolean; search?: string }
    ): Promise<ApiSuccess<FacilityProductRecord[]>> {
      return client.post<FacilityProductRecord[]>("/api/facility-product/get-by-facility", { facilityId, ...opts });
    },

    // Facility Equipment (Many-to-Many)
    async addEquipment(input: CreateFacilityEquipmentInput): Promise<ApiSuccess<FacilityEquipmentRecord>> {
      return client.post<FacilityEquipmentRecord>("/api/facility-equipment/create", input);
    },
    async updateEquipment(input: UpdateFacilityEquipmentInput): Promise<ApiSuccess<FacilityEquipmentRecord>> {
      return client.post<FacilityEquipmentRecord>("/api/facility-equipment/update", input);
    },
    async removeEquipment(id: number): Promise<ApiSuccess<{ id: number }>> {
      return client.post<{ id: number }>("/api/facility-equipment/delete", { id });
    },
    async getEquipmentsByFacility(
      facilityId: number,
      opts?: { sectionId?: number; status?: string; search?: string }
    ): Promise<ApiSuccess<FacilityEquipmentRecord[]>> {
      return client.post<FacilityEquipmentRecord[]>("/api/facility-equipment/get-by-facility", { facilityId, ...opts });
    },

    // Facility Tables (Dining / Cafe / Seating)
    async addTable(input: CreateFacilityTableInput): Promise<ApiSuccess<FacilityTableRecord>> {
      return client.post<FacilityTableRecord>("/api/facility-table/create", input);
    },
    async updateTable(input: UpdateFacilityTableInput): Promise<ApiSuccess<FacilityTableRecord>> {
      return client.post<FacilityTableRecord>("/api/facility-table/update", input);
    },
    async removeTable(id: number): Promise<ApiSuccess<{ id: number }>> {
      return client.post<{ id: number }>("/api/facility-table/delete", { id });
    },
    async getTablesByFacility(
      facilityId: number,
      opts?: { sectionId?: number; status?: string; search?: string }
    ): Promise<ApiSuccess<FacilityTableRecord[]>> {
      return client.post<FacilityTableRecord[]>("/api/facility-table/get-by-facility", { facilityId, ...opts });
    },
  };
}

