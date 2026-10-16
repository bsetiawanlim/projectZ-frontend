"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/lib/authContext";
import { userApi } from "@/lib/api";
import { AddUserModal } from "@/components/users/AddUserModal";
import { EditUserModal } from "@/components/users/EditUserModal";
import { ViewProfileModal } from "@/components/users/ViewProfileModal";
import { DeactivateUserModal } from "@/components/users/DeactivateUserModal";
import { DeleteUserModal } from "@/components/users/DeleteUserModal";
import type { UserRecord } from "@pz/shared";

type StatusFilterType = "active" | "deactivated" | "superadmin" | "all";


type SortField = "user" | "role" | "privileges" | "profile" | "status";
type SortOrder = "asc" | "desc";

export default function UsersPage() {
  const { user, canAccess } = useAuth();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("user");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>("active");
  const [isAddOpen, setIsAddOpen] = useState(false);

  const canCreate = Boolean(
    user?.isSuperAdmin || canAccess("user", "create") || canAccess("user", "*")
  );
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [togglingUser, setTogglingUser] = useState<UserRecord | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserRecord | null>(null);
  const [viewingProfile, setViewingProfile] = useState<{
    profileId?: number | null;
    initialProfile?: {
      id?: number;
      firstName: string;
      lastName?: string | null;
      isCompany?: boolean;
      phoneNumber?: string | null;
      address?: string | null;
      socialId?: string | null;
      taxId?: string | null;
      whatsapp?: string | null;
    } | null;
    userName?: string;
    userEmail?: string;
  } | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await userApi.listUsers();
      setUsers(res.items || []);
    } catch (err) {
      console.error("Failed to load users", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.isSuperAdmin) {
      loadUsers();
    } else {
      setLoading(false);
    }
  }, [user, loadUsers]);

  const filteredUsers = useMemo(() => {
    let result = users;

    // 1. Status Filter (active / deactivated only)
    if (statusFilter === "active") {
      result = result.filter((u) => !u.deletedAt);
    } else if (statusFilter === "deactivated") {
      result = result.filter((u) => !!u.deletedAt);
    }

    // 2. Search Query (matches user name, email, role, or linked profile name)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((u) => {
        const userName = (u.name || "").toLowerCase();
        const userEmail = (u.email || "").toLowerCase();
        const roleName = (u.role?.roleName || "").toLowerCase();
        const roleAbbr = (u.role?.roleAbbr || "").toLowerCase();

        // Check linked profile name
        const linkedProfile = u.userProfile || (u as any).profile;
        const profileFirst = (linkedProfile?.firstName || "").toLowerCase();
        const profileLast = (linkedProfile?.lastName || "").toLowerCase();
        const profileFullName = `${profileFirst} ${profileLast}`.trim();

        return (
          userName.includes(q) ||
          userEmail.includes(q) ||
          roleName.includes(q) ||
          roleAbbr.includes(q) ||
          profileFirst.includes(q) ||
          profileLast.includes(q) ||
          profileFullName.includes(q)
        );
      });
    }

    // 3. Sorting
    return [...result].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "user": {
          const aName = a.name || a.email || "";
          const bName = b.name || b.email || "";
          comparison = aName.localeCompare(bName);
          break;
        }
        case "role": {
          const aRole = a.role?.roleName || "";
          const bRole = b.role?.roleName || "";
          comparison = aRole.localeCompare(bRole);
          break;
        }
        case "privileges": {
          const aPriv = a.isSuperAdmin ? 1 : 0;
          const bPriv = b.isSuperAdmin ? 1 : 0;
          comparison = aPriv - bPriv;
          break;
        }
        case "profile": {
          const aProfile = a.userProfile || (a as any).profile;
          const bProfile = b.userProfile || (b as any).profile;
          const aName = aProfile ? `${aProfile.firstName || ""} ${aProfile.lastName || ""}`.trim() : "";
          const bName = bProfile ? `${bProfile.firstName || ""} ${bProfile.lastName || ""}`.trim() : "";
          comparison = aName.localeCompare(bName);
          break;
        }
        case "status": {
          const aActive = !a.deletedAt ? 1 : 0;
          const bActive = !b.deletedAt ? 1 : 0;
          comparison = bActive - aActive; // active first by default
          break;
        }
        
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });
  }, [users, statusFilter, searchQuery, sortField, sortOrder]);

  if (!user?.isSuperAdmin) {
    return (
      <Card style={{ textAlign: "center", padding: "3rem" }}>
        <span style={{ fontSize: "2.5rem" }}>🔒</span>
        <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginTop: "1rem", color: "var(--accent-rose)" }}>
          Access Restricted
        </h2>
        <p style={{ color: "var(--text-secondary)", marginTop: "0.5rem" }}>
          User management and credential controls are restricted to Super Administrators only.
        </p>
      </Card>
    );
  }

  const activeCount = users.filter((u) => !u.deletedAt).length;
  const adminCount = users.filter((u) => u.isSuperAdmin).length;
  const deactivatedCount = users.filter((u) => !!u.deletedAt).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <h2 style={{ fontSize: "1.3rem", fontWeight: 700 }}>User Account Management</h2>
            <Badge variant="warning">Super Admin</Badge>
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginTop: "0.2rem" }}>
            Manage organizational users, authentication access, and security permissions
          </p>
        </div>
        {canCreate && (
          <Button id="create-user-btn" size="md" onClick={() => setIsAddOpen(true)}>
            + Create User
          </Button>
        )}
      </div>

      {/* Stats Bar with Status Filters */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem" }}>
        <Card
          onClick={() => setStatusFilter("active")}
          style={{
            padding: "1rem 1.25rem",
            cursor: "pointer",
            transition: "all var(--transition-fast)",
            borderColor: statusFilter === "active" ? "var(--accent-emerald)" : undefined,
            backgroundColor: statusFilter === "active" ? "rgba(16, 185, 129, 0.1)" : undefined,
            boxShadow: statusFilter === "active" ? "0 0 12px rgba(16, 185, 129, 0.25)" : undefined,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--accent-emerald)", textTransform: "uppercase" }}>Active Accounts</span>
            {statusFilter === "active" && <span style={{ fontSize: "0.7rem", color: "var(--accent-emerald)" }}>● Selected</span>}
          </div>
          <p style={{ fontSize: "1.5rem", fontWeight: 700, marginTop: "0.25rem", color: "var(--accent-emerald)" }}>{activeCount}</p>
        </Card>

        <Card
          onClick={() => setStatusFilter("deactivated")}
          style={{
            padding: "1rem 1.25rem",
            cursor: "pointer",
            transition: "all var(--transition-fast)",
            borderColor: statusFilter === "deactivated" ? "var(--accent-rose)" : undefined,
            backgroundColor: statusFilter === "deactivated" ? "rgba(244, 63, 94, 0.1)" : undefined,
            boxShadow: statusFilter === "deactivated" ? "0 0 12px rgba(244, 63, 94, 0.25)" : undefined,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--accent-rose)", textTransform: "uppercase" }}>Deactivated</span>
            {statusFilter === "deactivated" && <span style={{ fontSize: "0.7rem", color: "var(--accent-rose)" }}>● Selected</span>}
          </div>
          <p style={{ fontSize: "1.5rem", fontWeight: 700, marginTop: "0.25rem", color: "var(--accent-rose)" }}>{deactivatedCount}</p>
        </Card>

        <Card style={{ padding: "1rem 1.25rem" }}>
          <span style={{ fontSize: "0.75rem", color: "var(--accent-amber)", textTransform: "uppercase" }}>Super Admins</span>
          <p style={{ fontSize: "1.5rem", fontWeight: 700, marginTop: "0.25rem", color: "var(--accent-amber)" }}>{adminCount}</p>
        </Card>

        <Card style={{ padding: "1rem 1.25rem" }}>
          <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", textTransform: "uppercase" }}>Total Registered</span>
          <p style={{ fontSize: "1.5rem", fontWeight: 700, marginTop: "0.25rem", color: "var(--text-primary)" }}>{users.length}</p>
        </Card>
      </div>

      {/* Deactivated Notice Banner */}
      {statusFilter === "deactivated" && (
        <div
          style={{
            padding: "1rem 1.25rem",
            borderRadius: "var(--radius-md)",
            backgroundColor: "rgba(244, 63, 94, 0.08)",
            border: "1px solid rgba(244, 63, 94, 0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{ fontSize: "1.4rem" }}>🛑</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--accent-rose)" }}>
                Viewing Deactivated User Accounts ({deactivatedCount})
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.15rem" }}>
                These users cannot log in or access organizational registers. All audit logs, linked customer transactions, and profiles remain intact.
              </div>
            </div>
          </div>
          <Button
            size="sm"
            variant="secondary"
            id="back-to-active-users-btn"
            onClick={() => setStatusFilter("active")}
            style={{ fontSize: "0.75rem" }}
          >
            ← View Active Accounts
          </Button>
        </div>
      )}

      {/* Main Table Card */}
      <Card>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "1rem",
            marginBottom: "1.25rem",
          }}
        >
          {/* Search and Filters */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap", flex: 1 }}>
            {/* Search Input */}
            <div style={{ minWidth: "280px", maxWidth: "420px", flex: 1 }}>
              <Input
                id="search-users-input"
                placeholder="🔍 Search by name, email, role, or linked profile..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Status Filter Dropdown */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Status:</span>
              <select
                id="filter-users-status-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilterType)}
                style={{
                  padding: "0.45rem 0.85rem",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-subtle)",
                  backgroundColor: "var(--surface, var(--bg-surface-elevated))",
                  color: "var(--text-primary)",
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  outline: "none",
                }}
              >
                <option value="active">🟢 Active Accounts ({activeCount})</option>
                <option value="deactivated">🔴 Deactivated ({deactivatedCount})</option>
              </select>
            </div>

            {/* Reset Filters Button */}
            {(statusFilter !== "active" || searchQuery) && (
              <button
                type="button"
                id="reset-filters-btn"
                onClick={() => {
                  setStatusFilter("active");
                  setSearchQuery("");
                }}
                style={{
                  fontSize: "0.8rem",
                  color: "var(--text-muted)",
                  textDecoration: "underline",
                  cursor: "pointer",
                  padding: "0.3rem 0.5rem",
                }}
              >
                Reset filters
              </button>
            )}
          </div>

          <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
            Showing {filteredUsers.length} {statusFilter} user{filteredUsers.length === 1 ? "" : "s"}
          </span>
        </div>

        {loading ? (
          <p style={{ color: "var(--text-muted)" }}>Loading user accounts...</p>
        ) : filteredUsers.length === 0 ? (
          <div style={{ textAlign: "center", padding: "2.5rem", color: "var(--text-secondary)" }}>
            <p style={{ marginBottom: "1rem" }}>
              {searchQuery
                ? `No ${statusFilter} users matching "${searchQuery}".`
                : statusFilter === "deactivated"
                ? "No deactivated user accounts found."
                : "No active user accounts found."}
            </p>
            {searchQuery ? (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setSearchQuery("");
                }}
              >
                Clear Search
              </Button>
            ) : statusFilter === "deactivated" ? (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setStatusFilter("active")}
              >
                View Active Accounts
              </Button>
            ) : canCreate ? (
              <Button size="sm" onClick={() => setIsAddOpen(true)}>
                + Create First User
              </Button>
            ) : null}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-subtle)", color: "var(--text-muted)", fontSize: "0.8rem" }}>
                  <th
                    style={{ padding: "0.75rem 0", cursor: "pointer", userSelect: "none" }}
                    onClick={() => handleSort("user")}
                    title="Sort by User"
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                      USER {sortField === "user" ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}
                    </span>
                  </th>
                  <th
                    style={{ cursor: "pointer", userSelect: "none" }}
                    onClick={() => handleSort("role")}
                    title="Sort by Assigned Role"
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                      ASSIGNED ROLE {sortField === "role" ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}
                    </span>
                  </th>
                  <th
                    style={{ cursor: "pointer", userSelect: "none" }}
                    onClick={() => handleSort("privileges")}
                    title="Sort by Privileges"
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                      PRIVILEGES {sortField === "privileges" ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}
                    </span>
                  </th>
                  <th
                    style={{ cursor: "pointer", userSelect: "none" }}
                    onClick={() => handleSort("profile")}
                    title="Sort by Linked Profile"
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                      LINKED PROFILE {sortField === "profile" ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}
                    </span>
                  </th>
                  <th
                    style={{ cursor: "pointer", userSelect: "none" }}
                    onClick={() => handleSort("status")}
                    title="Sort by Status"
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                      STATUS {sortField === "status" ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}
                    </span>
                  </th>
                  
                  <th style={{ textAlign: "right" }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => {
                  const isDeactivated = !!u.deletedAt;
                  const initial = (u.name || u.email || "U").charAt(0).toUpperCase();
                  const linkedProfile = u.userProfile || (u as any).profile;
                  const profileId = u.profileId ?? linkedProfile?.id;

                  return (
                    <tr
                      key={u.id}
                      style={{
                        borderBottom: "1px solid var(--border-subtle)",
                        fontSize: "0.9rem",
                        backgroundColor: isDeactivated ? "rgba(244, 63, 94, 0.03)" : "transparent",
                        transition: "background-color var(--transition-fast)",
                      }}
                    >
                      {/* User Cell with Avatar & Deactivated Lock Indicator */}
                      <td style={{ padding: "0.75rem 0" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                          <div style={{ position: "relative", flexShrink: 0 }}>
                            <div
                              style={{
                                width: "36px",
                                height: "36px",
                                borderRadius: "50%",
                                background: isDeactivated
                                  ? "linear-gradient(135deg, #475569, #334155)"
                                  : u.isSuperAdmin
                                  ? "linear-gradient(135deg, #f59e0b, #ef4444)"
                                  : "linear-gradient(135deg, var(--primary), #818cf8)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontWeight: 700,
                                fontSize: "0.85rem",
                                color: isDeactivated ? "rgba(255,255,255,0.7)" : "#fff",
                                border: isDeactivated ? "1px solid rgba(244, 63, 94, 0.3)" : "1px solid var(--border-subtle)",
                                filter: isDeactivated ? "grayscale(40%)" : "none",
                              }}
                            >
                              {initial}
                            </div>
                            {isDeactivated && (
                              <div
                                title="Account Deactivated"
                                style={{
                                  position: "absolute",
                                  bottom: "-2px",
                                  right: "-2px",
                                  width: "16px",
                                  height: "16px",
                                  borderRadius: "50%",
                                  backgroundColor: "var(--accent-rose)",
                                  border: "2px solid var(--bg-surface)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: "0.55rem",
                                  color: "#fff",
                                }}
                              >
                                🔒
                              </div>
                            )}
                          </div>
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                              <span
                                style={{
                                  fontWeight: 600,
                                  color: isDeactivated ? "var(--text-secondary)" : "var(--text-primary)",
                                }}
                              >
                                {u.name}
                              </span>
                              {isDeactivated && (
                                <span
                                  style={{
                                    fontSize: "0.65rem",
                                    fontWeight: 600,
                                    padding: "0.1rem 0.35rem",
                                    borderRadius: "var(--radius-sm)",
                                    backgroundColor: "rgba(244, 63, 94, 0.12)",
                                    color: "var(--accent-rose)",
                                    border: "1px solid rgba(244, 63, 94, 0.25)",
                                  }}
                                >
                                  Suspended
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{u.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Assigned Role */}
                      <td>
                        {u.role ? (
                          <Badge variant="info">
                            {u.role.roleName} ({u.role.roleAbbr})
                          </Badge>
                        ) : (
                          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>No Role</span>
                        )}
                      </td>

                      {/* Privileges */}
                      <td>
                        {u.isSuperAdmin ? (
                          <Badge variant="warning">Super Admin</Badge>
                        ) : (
                          <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Standard User</span>
                        )}
                      </td>

                      {/* Linked Profile - Clickable to view person data */}
                      <td>
                        {linkedProfile ? (
                          <button
                            type="button"
                            id={`view-profile-user-${u.id}-btn`}
                            onClick={() =>
                              setViewingProfile({
                                profileId: profileId ?? null,
                                initialProfile: linkedProfile,
                                userName: u.name,
                                userEmail: u.email,
                              })
                            }
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.45rem",
                              padding: "0.25rem 0.6rem",
                              borderRadius: "var(--radius-sm)",
                              backgroundColor: "rgba(99, 102, 241, 0.08)",
                              border: "1px solid rgba(99, 102, 241, 0.25)",
                              color: "var(--primary)",
                              fontWeight: 600,
                              fontSize: "0.85rem",
                              cursor: "pointer",
                              transition: "all var(--transition-fast)",
                              textAlign: "left",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = "rgba(99, 102, 241, 0.18)";
                              e.currentTarget.style.borderColor = "var(--primary)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = "rgba(99, 102, 241, 0.08)";
                              e.currentTarget.style.borderColor = "rgba(99, 102, 241, 0.25)";
                            }}
                            title="Click to view person details"
                          >
                            <span style={{ fontSize: "0.95rem" }}>{linkedProfile.isCompany ? "🏢" : "👤"}</span>
                            <span
                              style={{
                                textDecoration: "underline",
                                textDecorationStyle: "dotted",
                                textUnderlineOffset: "3px",
                              }}
                            >
                              {linkedProfile.firstName} {linkedProfile.lastName || ""}
                            </span>
                            <span style={{ fontSize: "0.7rem", opacity: 0.75 }}>🔍</span>
                          </button>
                        ) : profileId ? (
                          <button
                            type="button"
                            id={`view-profile-user-${u.id}-btn`}
                            onClick={() =>
                              setViewingProfile({
                                profileId,
                                userName: u.name,
                                userEmail: u.email,
                              })
                            }
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.4rem",
                              padding: "0.25rem 0.55rem",
                              borderRadius: "var(--radius-sm)",
                              backgroundColor: "rgba(99, 102, 241, 0.08)",
                              border: "1px solid rgba(99, 102, 241, 0.25)",
                              color: "var(--primary)",
                              fontWeight: 600,
                              fontSize: "0.85rem",
                              cursor: "pointer",
                            }}
                            title="Click to view person data"
                          >
                            <span>👤 Profile #{profileId}</span>
                            <span style={{ fontSize: "0.7rem", opacity: 0.75 }}>🔍</span>
                          </button>
                        ) : (
                          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>—</span>
                        )}
                      </td>

                      {/* Status with Deactivated Timestamp */}
                      <td>
                        {isDeactivated ? (
                          <div>
                            <Badge variant="danger">Deactivated</Badge>
                            {u.deletedAt && (
                              <div
                                style={{
                                  fontSize: "0.7rem",
                                  color: "var(--text-muted)",
                                  marginTop: "0.25rem",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                Since {new Date(u.deletedAt).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        ) : (
                          <Badge variant="success">Active</Badge>
                        )}
                      </td>

                      

                      {/* Actions */}
                      <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                        <Button
                          id={`edit-user-${u.id}-btn`}
                          size="sm"
                          variant="secondary"
                          onClick={() => setEditingUser(u)}
                          style={{ fontSize: "0.75rem", padding: "0.25rem 0.65rem", marginRight: "0.5rem" }}
                        >
                          ✏️ Edit
                        </Button>
                        <Button
                          id={`toggle-user-${u.id}-btn`}
                          size="sm"
                          variant={isDeactivated ? "secondary" : "ghost"}
                          onClick={() => setTogglingUser(u)}
                          style={{
                            fontSize: "0.75rem",
                            padding: "0.25rem 0.65rem",
                            color: isDeactivated ? "var(--accent-emerald)" : "var(--accent-rose)",
                            borderColor: isDeactivated ? "rgba(16, 185, 129, 0.3)" : undefined,
                            backgroundColor: isDeactivated ? "rgba(16, 185, 129, 0.08)" : undefined,
                          }}
                          title={isDeactivated ? "Reactivate user account" : "Deactivate user account"}
                        >
                          {isDeactivated ? "🔄 Reactivate" : "🚫 Deactivate"}
                        </Button>
                        {isDeactivated && (
                          <Button
                            id={`delete-user-${u.id}-btn`}
                            size="sm"
                            variant="danger"
                            onClick={() => setDeletingUser(u)}
                            style={{
                              fontSize: "0.75rem",
                              padding: "0.25rem 0.65rem",
                              marginLeft: "0.5rem",
                              backgroundColor: "rgba(239, 68, 68, 0.15)",
                              color: "var(--accent-rose)",
                              border: "1px solid rgba(239, 68, 68, 0.4)",
                            }}
                            title="Delete user account"
                          >
                            🗑️ Delete
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <AddUserModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onUserCreated={() => loadUsers()}
        existingUsers={users}
      />

      <EditUserModal
        isOpen={!!editingUser}
        user={editingUser}
        onClose={() => setEditingUser(null)}
        onUserUpdated={() => loadUsers()}
        existingUsers={users}
      />

      <DeactivateUserModal
        isOpen={!!togglingUser}
        user={togglingUser}
        onClose={() => setTogglingUser(null)}
        onStatusChanged={() => {
          setTogglingUser(null);
          loadUsers();
        }}
      />

      <DeleteUserModal
        isOpen={!!deletingUser}
        user={deletingUser}
        onClose={() => setDeletingUser(null)}
        onUserDeleted={() => {
          setDeletingUser(null);
          loadUsers();
        }}
      />

      <ViewProfileModal
        isOpen={!!viewingProfile}
        profileId={viewingProfile?.profileId}
        initialProfile={viewingProfile?.initialProfile}
        userName={viewingProfile?.userName}
        userEmail={viewingProfile?.userEmail}
        onClose={() => setViewingProfile(null)}
        onProfileUpdated={() => loadUsers()}
      />
    </div>
  );
}


