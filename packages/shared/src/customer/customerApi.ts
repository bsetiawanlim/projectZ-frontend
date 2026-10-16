import type { ApiClient } from "../api/client";
import type { ApiSuccess, Paginated, PaginationParams } from "../api/types";
import type { CustomerInput, CustomerRecord } from "./schemas";

export function createCustomerApi(client: ApiClient) {
    return {
        async createCustomer(input: CustomerInput): Promise<ApiSuccess<CustomerRecord>> {
            return client.post<CustomerRecord>("/api/customer/create", input);
        },
        async updateCustomer(input: CustomerInput): Promise<ApiSuccess<CustomerRecord>> {
            return client.post<CustomerRecord>("/api/customer/update", input);
        },
        async deleteCustomer(id: number, departReason?: string): Promise<ApiSuccess<void>> {
            return client.post<void>("/api/customer/delete", { id, departReason });
        },
        async restoreCustomer(id: number): Promise<ApiSuccess<CustomerRecord>> {
            return client.post<CustomerRecord>("/api/customer/restore", { id });
        },
        async listCustomers(query?: PaginationParams): Promise<Paginated<CustomerRecord>> {
            return client.list<CustomerRecord>("/api/customer/get-all", query);
        },
    };
}
