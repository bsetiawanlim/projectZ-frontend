import type { ApiClient } from "../api/client";
import type { ApiSuccess, Paginated, PaginationParams } from "../api/types";
import type { CreateRoleInput, RoleRecord, UpdateRoleInput } from "./schemas";

export function createRoleApi(client: ApiClient) {
    return {
        async createRole(input: CreateRoleInput): Promise<ApiSuccess<RoleRecord>> {
            return client.post<RoleRecord>("/api/role/create", input);
        },
        async updateRole(input: UpdateRoleInput): Promise<ApiSuccess<RoleRecord>> {
            return client.post<RoleRecord>("/api/role/update", input);
        },
        async deleteRole(id: number): Promise<ApiSuccess<RoleRecord>> {
            return client.post<RoleRecord>("/api/role/delete", { id });
        },
        async getRole(id: number): Promise<ApiSuccess<RoleRecord>> {
            return client.post<RoleRecord>('/api/role/get-id', { id });
        },
        async listRoles(query?: PaginationParams): Promise<Paginated<RoleRecord>> {
            return client.list<RoleRecord>("/api/role/get-all", query);
        },
    };
}
