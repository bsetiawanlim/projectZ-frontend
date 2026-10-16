"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { Session, SessionUser, UserPermission } from "@pz/shared";
import { can } from "@pz/shared";
import { authApi, apiClient } from "./api";

export interface UserRoleInfo {
  id: number;
  roleName: string;
  roleAbbr: string;
}

interface AuthContextType {
  user: SessionUser | null;
  session: Session | null;
  role: UserRoleInfo | null;
  permissions: UserPermission[];
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  canAccess: (table: string, action: string) => boolean;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRoleInfo | null>(null);
  const [rolePermissions, setRolePermissions] = useState<UserPermission[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    try {
      const current = await authApi.getSession();
      setSession(current);

      if (current?.user) {
        // If super admin, role name is Super Administrator
        if (current.user.isSuperAdmin) {
          setRole({ id: 0, roleName: "Super Administrator", roleAbbr: "ADMIN" });
        } else if (current.user.roleId) {
          // Attempt to load role details and permissions
          try {
            const roleRes = await apiClient.post<any>("/api/role/get-id", { id: current.user.roleId });
            const roleData = roleRes?.data ?? roleRes;
            if (roleData && roleData.roleName) {
              setRole({
                id: roleData.id,
                roleName: roleData.roleName,
                roleAbbr: roleData.roleAbbr || "ROLE",
              });
              if (Array.isArray(roleData.permissions)) {
                setRolePermissions(
                  roleData.permissions
                    .filter((p: any) => p.status !== false)
                    .map((p: any) => ({ tableName: p.tableName, actionName: p.actionName }))
                );
              }
            }
          } catch {
            // Role fetching may be limited by permissions, fall back to any session-attached permissions
            const fallbackPerms =
              (current as any)?.permissions ||
              (current.user as any)?.permissions ||
              (current as any)?.role?.permissions ||
              [];
            if (Array.isArray(fallbackPerms)) {
              setRolePermissions(fallbackPerms);
            }
          }
        }
      } else {
        setRole(null);
        setRolePermissions([]);
      }
    } catch {
      setSession(null);
      setRole(null);
      setRolePermissions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const login = async (email: string, password: string) => {
    const s = await authApi.signIn(email, password);
    setSession(s);
    await refreshSession();
  };

  const logout = async () => {
    await authApi.signOut();
    setSession(null);
    setRole(null);
    setRolePermissions([]);
    window.location.href = "/login";
  };

  const canAccess = useCallback(
    (table: string, action: string) => {
      const effectivePerms: UserPermission[] = [
        ...((session as any)?.permissions || []),
        ...((session?.user as any)?.permissions || []),
        ...rolePermissions,
      ];

      return can(session?.user, table, action, effectivePerms);
    },
    [session, rolePermissions]
  );

  return (
    <AuthContext.Provider
      value={{
        user: session?.user ?? null,
        session,
        role,
        permissions: rolePermissions,
        isLoading,
        login,
        logout,
        canAccess,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
