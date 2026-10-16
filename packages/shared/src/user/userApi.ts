import type { ApiClient } from "../api/client";
import type { UserRecord, CreateUserInput, UpdateUserInput, CheckUserDeleteResult } from "./types";

export function createUserApi(client: ApiClient) {
    return {
        async listUsers(): Promise<{ items: UserRecord[] }> {
            const res = await client.get<UserRecord[]>("/api/user/get-all");
            return { items: res.data ?? [] };
        },
        async createUser(data: CreateUserInput): Promise<UserRecord> {
            const res = await client.post<UserRecord>("/api/user/create", data);
            return res.data;
        },
        async updateUser(data: UpdateUserInput): Promise<UserRecord> {
            const res = await client.post<UserRecord>("/api/user/update", data);
            return res.data;
        },
        async toggleUserStatus(id: string): Promise<UserRecord> {
            const res = await client.post<UserRecord>("/api/user/toggle-status", { id });
            return res.data;
        },
        async checkCanDelete(id: string): Promise<CheckUserDeleteResult> {
            const res = await client.post<CheckUserDeleteResult>("/api/user/check-delete", { id });
            return res.data;
        },
        async deleteUser(id: string): Promise<void> {
            await client.post("/api/user/delete", { id });
        },
    };
}
