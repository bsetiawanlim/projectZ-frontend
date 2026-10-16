export interface UserRecord {
    id: string;
    name: string;
    email: string;
    roleId?: number | null;
    profileId?: number | null;
    isSuperAdmin?: boolean;
    emailVerified?: boolean;
    createdAt: string;
    updatedAt?: string | null;
    deletedAt?: string | null;
    role?: {
        id: number;
        roleName: string;
        roleAbbr: string;
    } | null;
    userProfile?: {
        id: number;
        firstName: string;
        lastName?: string | null;
        isCompany: boolean;
        phoneNumber?: string | null;
    } | null;
}

export interface CreateUserInput {
    name: string;
    email: string;
    password: string;
    roleId?: number | null;
    profileId?: number | null;
    isSuperAdmin?: boolean;
}

export interface UpdateUserInput {
    id: string;
    name?: string;
    roleId?: number | null;
    profileId?: number | null;
    isSuperAdmin?: boolean;
}

export interface CheckUserDeleteResult {
    canDelete: boolean;
    isSelf: boolean;
    isDeactivated: boolean;
    relatedRecords: string[];
}
