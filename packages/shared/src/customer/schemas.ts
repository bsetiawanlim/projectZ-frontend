import { z } from "zod";

export const customerSchema = z.object({
    id: z.number().nullish(),
    profileId: z.number().nullish(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    phoneNumber: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    province: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().optional(),
    isCompany: z.boolean().optional(),
    customergroup: z.number().nullish(),
    departReason: z.string().nullish(),
});

export const deleteCustomerSchema = z.object({
    id: z.number(),
    departReason: z.string().nullish(),
});

export type CustomerInput = z.infer<typeof customerSchema>;
export type DeleteCustomerInput = z.infer<typeof deleteCustomerSchema>;

export interface CustomerProfileSummary {
    id?: number;
    firstName: string;
    lastName?: string | null;
    address?: string | null;
    city?: string | null;
    province?: string | null;
    postalCode?: string | null;
    country?: string | null;
    phoneNumber?: string | null;
    isCompany?: boolean;
}

export interface CustomerRecord {
    id: number;
    profileId: number;
    customergroup?: number | null;
    departReason?: string | null;
    deletedAt?: string | null;
    createdAt?: string;
    updatedAt?: string;
    profile?: CustomerProfileSummary | null;
}

export interface CustomerGroupInfo {
    id: number;
    name: string;
    description: string;
    badgeVariant?: "default" | "success" | "warning" | "danger" | "info";
}

export const CUSTOMER_GROUPS: CustomerGroupInfo[] = [
    { id: 1, name: "Regular Customer", description: "Standard retail customer with standard pricing", badgeVariant: "default" },
    { id: 2, name: "VIP Member", description: "Loyal customer with loyalty benefits and special discounts", badgeVariant: "success" },
    { id: 3, name: "Wholesale / B2B", description: "Bulk purchasers with wholesale tier pricing", badgeVariant: "warning" },
    { id: 4, name: "Corporate Account", description: "Enterprise client with credit terms and dedicated handling", badgeVariant: "info" },
    { id: 5, name: "Distributor", description: "Commercial distributor or reseller tier", badgeVariant: "default" },
];

export function getCustomerGroupName(groupId?: number | null): string {
    if (groupId == null) return "Regular Customer";
    const group = CUSTOMER_GROUPS.find((g) => g.id === groupId);
    return group ? group.name : `Group ${groupId}`;
}

export function getCustomerGroupBadgeVariant(groupId?: number | null): "default" | "success" | "warning" | "danger" | "info" {
    if (groupId == null) return "default";
    const group = CUSTOMER_GROUPS.find((g) => g.id === groupId);
    return group?.badgeVariant || "default";
}

