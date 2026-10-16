import type { SessionUser } from "./authApi";

export interface UserPermission {
    tableName: string;
    actionName: string;
}

/**
 * Client-side permission helper matching backend plugins/permission.ts logic.
 * SuperAdmin has access to everything.
 */
export function can(
    user: SessionUser | null | undefined,
    tableName: string,
    actionName: string,
    permissions: UserPermission[] = []
): boolean {
    if (!user) return false;
    if (user.isSuperAdmin) return true;
    if (!user.roleId) return false;
    return permissions.some(
        (p) =>
            (p.tableName.toLowerCase() === tableName.toLowerCase() || p.tableName === "*") &&
            (p.actionName.toLowerCase() === actionName.toLowerCase() || p.actionName === "*")
    );
}
