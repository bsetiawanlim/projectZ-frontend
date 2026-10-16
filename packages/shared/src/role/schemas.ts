import { z } from "zod";

export const roleFacilityPermissionInputSchema = z.object({
    facilityId: z.number().int().positive(),
    canView: z.boolean().default(true),
    canManageStock: z.boolean().default(false),
    canTransact: z.boolean().default(false),
});

export type RoleFacilityPermissionInput = z.infer<typeof roleFacilityPermissionInputSchema>;

export interface RoleFacilityPermissionRecord {
    id: number;
    roleId: number;
    facilityId: number;
    canView: boolean;
    canManageStock: boolean;
    canTransact: boolean;
    createdAt?: string;
    facility?: {
        id: number;
        facilityCode: string;
        facilityName: string;
        type: string;
        city?: string | null;
    };
}

export const protoPermissionSchema = z.object({
    tableName: z.string().min(1, "Table name is required"),
    actionName: z.string().min(1, "Action name is required"),
    status: z.boolean().optional().default(true),
});

export const createRoleSchema = z.object({
    roleName: z.string().min(1, "Role name is required"),
    roleAbbr: z.string().min(1, "Role abbreviation is required"),
    description: z.string().nullish(),
    permissions: z.array(protoPermissionSchema).nullish(),
    facilityPermissions: z.array(roleFacilityPermissionInputSchema).nullish(),
});

export const updateRoleSchema = z.object({
    id: z.number().int().positive(),
    roleName: z.string().min(1, "Role name is required"),
    roleAbbr: z.string().min(1, "Role abbreviation is required"),
    description: z.string().nullish(),
    permissions: z.array(protoPermissionSchema).nullish(),
    facilityPermissions: z.array(roleFacilityPermissionInputSchema).nullish(),
});

export const deleteRoleSchema = z.object({
    id: z.number().int().positive(),
});

export type ProtoPermission = z.infer<typeof protoPermissionSchema>;
export type CreateRoleInput = z.infer<typeof createRoleSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
export type DeleteRoleInput = z.infer<typeof deleteRoleSchema>;

export interface RolePermissionItem {
    id: number;
    roleId: number;
    tableName: string;
    actionName: string;
    createdAt?: string;
}

export interface RoleRecord {
    id: number;
    roleName: string;
    roleAbbr: string;
    description?: string | null;
    createdAt?: string;
    updatedAt?: string;
    permissions?: RolePermissionItem[];
    facilityPermissions?: RoleFacilityPermissionRecord[];
}
