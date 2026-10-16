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
  };
}
