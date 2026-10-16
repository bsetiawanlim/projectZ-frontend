"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/lib/authContext";
import { roleApi } from "@/lib/api";
import { AddRoleModal } from "@/components/roles/AddRoleModal";
import { EditRoleModal } from "@/components/roles/EditRoleModal";
import type { RoleRecord } from "@pz/shared";

type SortField = "id" | "name" | "abbr" | "description";
type SortOrder = "asc" | "desc";

export default function RolesPage() {
  const { user, canAccess } = useAuth();
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleRecord | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("id");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  const canCreate = Boolean(
    user?.isSuperAdmin || canAccess("role", "create") || canAccess("role", "*")
  );

  const loadRoles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await roleApi.listRoles({ limit: 50 });
      setRoles(res.items || []);
    } catch (err) {
      console.error("Failed to load roles", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.isSuperAdmin) {
      loadRoles();
    } else {
      setLoading(false);
    }
  }, [user, loadRoles]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const filteredRoles = useMemo(() => {
    let result = roles;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((r) => {
        const name = (r.roleName || "").toLowerCase();
        const abbr = (r.roleAbbr || "").toLowerCase();
        const desc = (r.description || "").toLowerCase();
        const idStr = String(r.id);
        return name.includes(q) || abbr.includes(q) || desc.includes(q) || idStr.includes(q);
      });
    }

    return [...result].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "id":
          comparison = a.id - b.id;
          break;
        case "name":
          comparison = (a.roleName || "").localeCompare(b.roleName || "");
          break;
        case "abbr":
          comparison = (a.roleAbbr || "").localeCompare(b.roleAbbr || "");
          break;
        case "description":
          comparison = (a.description || "").localeCompare(b.description || "");
          break;
        
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });
  }, [roles, searchQuery, sortField, sortOrder]);

  const handleDeleteRole = async (id: number) => {
    if (!confirm("Are you sure you want to delete this role?")) return;
    setDeletingId(id);
    try {
      await roleApi.deleteRole(id);
      loadRoles();
    } catch (err: any) {
      alert(err?.message || "Failed to delete role");
    } finally {
      setDeletingId(null);
    }
  };

  if (!user?.isSuperAdmin) {
    return (
      <Card style={{ textAlign: "center", padding: "3rem" }}>
        <span style={{ fontSize: "2.5rem" }}>🔒</span>
        <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginTop: "1rem", color: "var(--accent-rose)" }}>
          Access Restricted
        </h2>
        <p style={{ color: "var(--text-secondary)", marginTop: "0.5rem" }}>
          Role management and permission matrix configurations are restricted to Super Administrators only.
        </p>
      </Card>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <h2 style={{ fontSize: "1.3rem", fontWeight: 700 }}>Role & Permission Management</h2>
            <Badge variant="warning">Super Admin</Badge>
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginTop: "0.2rem" }}>
            Manage organizational roles and configure role-based access control (RBAC) permissions
          </p>
        </div>
        {canCreate && (
          <Button id="create-role-btn" size="md" onClick={() => setIsModalOpen(true)}>
            + Create Role
          </Button>
        )}
      </div>

      {/* Search and Filters toolbar */}
      <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 250px", maxWidth: "400px" }}>
          <Input
            placeholder="Search roles by name, abbreviation, description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <Card>
        {loading ? (
          <p style={{ color: "var(--text-muted)" }}>Loading configured roles...</p>
        ) : filteredRoles.length === 0 ? (
          <div style={{ textAlign: "center", padding: "2.5rem", color: "var(--text-secondary)" }}>
            <p style={{ marginBottom: canCreate ? "1rem" : 0 }}>
              {searchQuery ? `No roles matching "${searchQuery}".` : "No custom roles registered yet."}
            </p>
            {searchQuery ? (
              <Button size="sm" variant="secondary" onClick={() => setSearchQuery("")}>
                Clear Search
              </Button>
            ) : canCreate ? (
              <Button size="sm" onClick={() => setIsModalOpen(true)}>
                + Create First Role
              </Button>
            ) : null}
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-subtle)", color: "var(--text-muted)", fontSize: "0.8rem" }}>
                <th
                  style={{ padding: "0.75rem 0", cursor: "pointer", userSelect: "none" }}
                  onClick={() => handleSort("id")}
                  title="Sort by ID"
                >
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                    ID {sortField === "id" ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}
                  </span>
                </th>
                <th
                  style={{ cursor: "pointer", userSelect: "none" }}
                  onClick={() => handleSort("name")}
                  title="Sort by Role Name"
                >
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                    ROLE NAME {sortField === "name" ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}
                  </span>
                </th>
                <th
                  style={{ cursor: "pointer", userSelect: "none" }}
                  onClick={() => handleSort("abbr")}
                  title="Sort by Abbreviation"
                >
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                    ABBR {sortField === "abbr" ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}
                  </span>
                </th>
                <th
                  style={{ cursor: "pointer", userSelect: "none" }}
                  onClick={() => handleSort("description")}
                  title="Sort by Description"
                >
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                    DESCRIPTION {sortField === "description" ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}
                  </span>
                </th>
                
                <th style={{ textAlign: "right" }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredRoles.map((r) => (
                <tr key={r.id} style={{ borderBottom: "1px solid var(--border-subtle)", fontSize: "0.9rem" }}>
                  <td style={{ padding: "0.75rem 0", color: "var(--text-secondary)" }}>#{r.id}</td>
                  <td style={{ fontWeight: 600 }}>{r.roleName}</td>
                  <td>
                    <Badge variant="info">{r.roleAbbr}</Badge>
                  </td>
                  <td style={{ color: "var(--text-muted)", maxWidth: "250px" }}>
                    {r.description || "—"}
                  </td>
                  
                  <td style={{ textAlign: "right" }}>
                    <Button
                      id={`edit-role-${r.id}-btn`}
                      size="sm"
                      variant="secondary"
                      onClick={() => setEditingRole(r)}
                      style={{ fontSize: "0.75rem", padding: "0.25rem 0.65rem", marginRight: "0.5rem" }}
                    >
                      ✏️ Edit
                    </Button>
                    <Button
                      id={`delete-role-${r.id}-btn`}
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteRole(r.id)}
                      disabled={deletingId === r.id}
                      style={{ color: "var(--accent-rose)", fontSize: "0.75rem" }}
                    >
                      {deletingId === r.id ? "Deleting..." : "Delete"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <AddRoleModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onRoleCreated={() => {
          loadRoles();
        }}
      />

      <EditRoleModal
        isOpen={!!editingRole}
        role={editingRole}
        onClose={() => setEditingRole(null)}
        onRoleUpdated={() => {
          setEditingRole(null);
          loadRoles();
        }}
      />
    </div>
  );
}
