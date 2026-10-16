import { z } from "zod";

export const profileSchema = z.object({
    id: z.number().nullish(),
    title: z.string().nullish(),
    firstName: z.string().min(2, "First name must be at least 2 characters"),
    lastName: z.string().nullish(),
    dateOfBirth: z.preprocess((val) => (val === "" ? null : val), z.union([z.string(), z.date()]).nullish()),
    gender: z.string().nullish(),
    address: z.string().nullish(),
    city: z.string().nullish(),
    province: z.string().nullish(),
    postalCode: z.string().nullish(),
    country: z.string().nullish(),
    phoneNumber: z.string().nullish(),
    phoneNumberVerified: z.boolean().nullish(),
    whatsapp: z.string().nullish(),
    whatsappVerified: z.boolean().nullish(),
    socialId: z.string().nullish(),
    taxId: z.string().nullish(),
    notes: z.string().nullish(),
    isCompany: z.boolean().optional().default(false),
    socialMedia: z.array(z.object({
        platform: z.string(),
        username: z.string().nullish(),
        url: z.string(),
        notes: z.string().nullish()
    })).nullish(),
});

export type ProfileInput = z.infer<typeof profileSchema>;

export const updateProfileSchema = profileSchema.extend({
    id: z.number(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;


export interface ProfileCustomerSummary {
    id: number;
    customergroup?: number | null;
    createdAt?: string | Date;
}

export interface ProfileVendorSummary {
    id: number;
    vendorgroup?: number | null;
    createdAt?: string | Date;
}

export interface ProfileEmployeeSummary {
    id: number;
    positionId?: number | null;
    startDate?: string | Date;
    position?: { id: number; name: string } | null;
}

export interface ProfileRecord {
    id: number;
    title?: string | null;
    firstName: string;
    lastName?: string | null;
    dateOfBirth?: string | Date | null;
    gender?: string | null;
    address?: string | null;
    city?: string | null;
    province?: string | null;
    postalCode?: string | null;
    country?: string | null;
    phoneNumber?: string | null;
    phoneNumberVerified?: boolean | null;
    whatsapp?: string | null;
    whatsappVerified?: boolean | null;
    socialId?: string | null;
    taxId?: string | null;
    notes?: string | null;
    isCompany: boolean;
    createdAt?: string;
    updatedAt?: string;
    socialMedia?: ProfileSocialMediaRecord[];
    customer?: ProfileCustomerSummary[];
    vendor?: ProfileVendorSummary[];
    employee?: ProfileEmployeeSummary[];
}

export function formatAddress(profile?: {
    address?: string | null;
    city?: string | null;
    province?: string | null;
    postalCode?: string | null;
    country?: string | null;
} | null): string {
    if (!profile) return "";
    const parts = [
        profile.address,
        profile.city,
        profile.province,
        profile.postalCode,
        profile.country
    ].filter(Boolean);
    return parts.join(", ");
}


export const profileSocialMediaSchema = z.object({
    profileId: z.number().int().positive("Profile ID is required"),
    platform: z.string().min(1, "Platform is required").max(50),
    username: z.string().max(100).nullish(),
    url: z.string().min(1, "URL is required").max(500),
    notes: z.string().nullish(),
});

export type ProfileSocialMediaInput = z.infer<typeof profileSocialMediaSchema>;

export const updateProfileSocialMediaSchema = z.object({
    id: z.number().int().positive("Social media ID is required"),
    platform: z.string().min(1).max(50).optional(),
    username: z.string().max(100).nullish(),
    url: z.string().min(1).max(500).optional(),
    notes: z.string().nullish(),
});

export type UpdateProfileSocialMediaInput = z.infer<typeof updateProfileSocialMediaSchema>;

export interface ProfileSocialMediaRecord {
    id: number;
    profileId: number;
    platform: string;
    username?: string | null;
    url: string;
    notes?: string | null;
    createdAt?: string;
    updatedAt?: string;
}
