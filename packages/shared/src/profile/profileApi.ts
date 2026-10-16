import type { ApiClient } from "../api/client";
import type { ApiSuccess, Paginated, PaginationParams } from "../api/types";
import type { ProfileInput, ProfileRecord, ProfileSocialMediaInput, UpdateProfileSocialMediaInput, ProfileSocialMediaRecord } from "./schemas";

export function createProfileApi(client: ApiClient) {
    return {
        async listProfiles(query?: PaginationParams & { isCompany?: boolean; role?: "customer" | "vendor" | "employee" | "all"; isCustomer?: boolean; isVendor?: boolean; isEmployee?: boolean }): Promise<Paginated<ProfileRecord>> {
            return client.list<ProfileRecord>("/api/profile/get-all", query);
        },
        async getProfile(id: number): Promise<ApiSuccess<ProfileRecord>> {
            return client.post<ProfileRecord>("/api/profile/get-id", { id });
        },
        async createProfile(input: ProfileInput): Promise<ApiSuccess<ProfileRecord>> {
            return client.post<ProfileRecord>("/api/profile/create", input);
        },
        async updateProfile(input: Partial<ProfileInput> & { id: number }): Promise<ApiSuccess<ProfileRecord>> {
            return client.post<ProfileRecord>("/api/profile/update", input);
        },
        async deleteProfile(profileId: number): Promise<ApiSuccess<null>> {
            return client.post<null>("/api/profile/delete", { profileId });
        },
        async getSocialMedias(profileId: number): Promise<ApiSuccess<ProfileSocialMediaRecord[]>> {
            return client.post<ProfileSocialMediaRecord[]>("/api/profileSocialMedia/get", { profileId });
        },
        async addSocialMedia(input: ProfileSocialMediaInput): Promise<ApiSuccess<ProfileSocialMediaRecord>> {
            return client.post<ProfileSocialMediaRecord>("/api/profileSocialMedia/create", input);
        },
        async updateSocialMedia(input: UpdateProfileSocialMediaInput): Promise<ApiSuccess<ProfileSocialMediaRecord>> {
            return client.post<ProfileSocialMediaRecord>("/api/profileSocialMedia/update", input);
        },
        async deleteSocialMedia(id: number): Promise<ApiSuccess<ProfileSocialMediaRecord>> {
            return client.post<ProfileSocialMediaRecord>("/api/profileSocialMedia/delete", { id });
        },
    };
}
