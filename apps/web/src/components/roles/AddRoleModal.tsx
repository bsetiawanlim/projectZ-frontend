"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { roleApi, facilityApi } from "@/lib/api";
import { ALL_ROLE_MODULES } from "./roleModules";
import type {
  RoleRecord,
  ProtoPermission,
  RolePermissionItem,
  RoleFacilityPermissionInput,
  FacilityRecord,
} from "@pz/shared";

interface AddRoleModalProps {
  isOpen: boolean;
    onClose: () => void;
  onRoleCreated: (role: RoleRecord) => void;
}

const CATEGORIES = [
  "All",
  "POS & Sales",
  "Inventory & Catalog",
  "People & Associates",
  "Finance & Payroll",
  "Procurement",
  "Transport & Fleet",
  "Equipments",
  "Work & Projects",
  "Security & RBAC",
];

export function AddRoleModal({ isOpen, onClose, onRoleCreated }: AddRoleModalProps) {
  const [activeTab, setActiveTab] = useState<"modules" | "facilities">("modules");
  const [roleName, setRoleName] = useState("");
  const [roleAbbr, setRoleAbbr] = useState("");
  const [description, setDescription] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<ProtoPermission[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [filterQuery, setFilterQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Facility permissions state
  const [facilities, setFacilities] = useState<FacilityRecord[]>([]);
  const [facilityPermissionsMap, setFacilityPermissionsMap] = useState<Map<number, RoleFacilityPermissionInput>>(new Map());
  const [facilitySearch, setFacilitySearch] = useState("");

  const loadFacilities = useCallback(async () => {
    try {
      const res: any = await facilityApi.getFacilities({ limit: 100 });
      const items = res?.items ?? res?.data ?? (Array.isArray(res) ? res : []);
      setFacilities(items);
    } catch (err) {
      console.warn("Could not load facilities list", err);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setRoleName("");
      setRoleAbbr("");
      setDescription("");
      setSelectedPermissions([]);
      setFacilityPermissionsMap(new Map());
      setError(null);
      setActiveTab("modules");
      setFilterQuery("");
      setFacilitySearch("");
      loadFacilities();
    }
  }, [isOpen, loadFacilities]);

  const filteredModules = useMemo(() => {
    return ALL_ROLE_MODULES.filter((m) => {
      const matchCat = selectedCategory === "All" || m.category === selectedCategory;
      if (!matchCat) return false;
      if (!filterQuery.trim()) return true;
      const q = filterQuery.toLowerCase();
      const inLabel = m.label.toLowerCase().includes(q);
      const inTable = m.table.toLowerCase().includes(q);
      const inActions = m.actions.some((a) => a.toLowerCase().includes(q));
      return inLabel || inTable || inActions;
    });
  }, [selectedCategory, filterQuery]);

  const filteredFacilities = useMemo(() => {
    if (!facilitySearch.trim()) return facilities;
    const q = facilitySearch.toLowerCase().trim();
    return facilities.filter((f) => {
      const name = (f.facilityName || "").toLowerCase();
      const code = (f.facilityCode || "").toLowerCase();
      const city = (f.city || "").toLowerCase();
      return name.includes(q) || code.includes(q) || city.includes(q);
    });
  }, [facilities, facilitySearch]);

  if (!isOpen) return null;

  const isChecked = (table: string, action: string) => {
    return selectedPermissions.some((p) => p.tableName === table && p.actionName === action);
  };

  const togglePermission = (table: string, action: string) => {
    if (isChecked(table, action)) {
      setSelectedPermissions(selectedPermissions.filter((p) => !(p.tableName === table && p.actionName === action)));
    } else {
      setSelectedPermissions([...selectedPermissions, { tableName: table, actionName: action, status: true }]);
    }
  };

  const toggleAllInModule = (table: string, actions: string[]) => {
    const allSelected = actions.every((a) => isChecked(table, a));
    if (allSelected) {
      setSelectedPermissions(selectedPermissions.filter((p) => p.tableName !== table));
    } else {
      const remaining = actions
        .filter((a) => !isChecked(table, a))
        .map((a) => ({ tableName: table, actionName: a, status: true }));
      setSelectedPermissions([...selectedPermissions, ...remaining]);
    }
  };

  const selectAllFiltered = () => {
    const newItems: ProtoPermission[] = [];
    filteredModules.forEach((m) => {
      m.actions.forEach((a) => {
        if (!isChecked(m.table, a)) {
          newItems.push({ tableName: m.table, actionName: a, status: true });
        }
      });
    });
    setSelectedPermissions([...selectedPermissions, ...newItems]);
  };

  const selectReadOnlyFiltered = () => {
    const readActions = ["get", "get-all", "read", "list", "all", "report", "summary"];
    const newItems: ProtoPermission[] = [];
    filteredModules.forEach((m) => {
      m.actions.forEach((a) => {
        if (readActions.includes(a) && !isChecked(m.table, a)) {
          newItems.push({ tableName: m.table, actionName: a, status: true });
        }
      });
    });
    setSelectedPermissions([...selectedPermissions, ...newItems]);
  };

  const clearFiltered = () => {
    const filteredTables = new Set(filteredModules.map((m) => m.table));
    setSelectedPermissions(selectedPermissions.filter((p) => !filteredTables.has(p.tableName)));
  };

  // Facility Permission Matrix toggles
  const getFacilityPerm = (facilityId: number): RoleFacilityPermissionInput => {
    return (
      facilityPermissionsMap.get(facilityId) || {
        facilityId,
        canView: false,
        canManageStock: false,
        canTransact: false,
      }
    );
  };

  const updateFacilityPerm = (
    facilityId: number,
    field: "canView" | "canManageStock" | "canTransact",
    val: boolean
  ) => {
    const current = getFacilityPerm(facilityId);
    const updated = { ...current, [field]: val };
    // If canView is unchecked, also uncheck stock and transaction
    if (field === "canView" && !val) {
      updated.canManageStock = false;
      updated.canTransact = false;
    }
    // If canManageStock or canTransact is checked, automatically enable canView
    if ((field === "canManageStock" || field === "canTransact") && val) {
      updated.canView = true;
    }

    const next = new Map(facilityPermissionsMap);
    next.set(facilityId, updated);
    setFacilityPermissionsMap(next);
  };

  const grantAllFacilities = () => {
    const next = new Map(facilityPermissionsMap);
    facilities.forEach((f) => {
      next.set(f.id, {
        facilityId: f.id,
        canView: true,
        canManageStock: true,
        canTransact: true,
      });
    });
    setFacilityPermissionsMap(next);
  };

  const grantReadOnlyAllFacilities = () => {
    const next = new Map(facilityPermissionsMap);
    facilities.forEach((f) => {
      next.set(f.id, {
        facilityId: f.id,
        canView: true,
        canManageStock: false,
        canTransact: false,
      });
    });
    setFacilityPermissionsMap(next);
  };

  const revokeAllFacilities = () => {
    const next = new Map(facilityPermissionsMap);
    facilities.forEach((f) => {
      next.set(f.id, {
        facilityId: f.id,
        canView: false,
        canManageStock: false,
        canTransact: false,
      });
    });
    setFacilityPermissionsMap(next);
  };

  const accessibleFacilitiesCount = Array.from(facilityPermissionsMap.values()).filter((fp) => fp.canView).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleName.trim()) {
      setError("Role name is required.");
      return;
    }
    if (!roleAbbr.trim()) {
      setError("Role abbreviation is required.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const permissionsPayload = selectedPermissions.map((p) => ({
        tableName: p.tableName,
        actionName: p.actionName,
        status: true,
      }));
      const facilityPermissionsPayload = Array.from(facilityPermissionsMap.values());

      const res = await roleApi.createRole({
        roleName: roleName.trim(),
        roleAbbr: roleAbbr.trim().toUpperCase(),
        description: description.trim() || undefined,
        permissions: permissionsPayload.length > 0 ? permissionsPayload : undefined,
        facilityPermissions: facilityPermissionsPayload.length > 0 ? facilityPermissionsPayload : undefined,
      });

      if (res && res.data) {
        onRoleCreated(res.data);
        onClose();
      }
    } catch (err: any) {
      console.error("Failed to create role", err);
      setError(err?.message || "Failed to update role.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 60,
        padding: "1rem",
      }}
    >
      <div style={{ width: "100%", maxWidth: "860px", maxHeight: "92vh", display: "flex", flexDirection: "column" }}>
        <Card glass style={{ padding: "1.75rem", backgroundColor: "var(--bg-surface)", overflowY: "auto" }}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <h2 style={{ fontSize: "1.25rem", fontWeight: 700 }}>Create New Role & Permission Matrix</h2>
              </div>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
                Configure functional table permissions and physical facility access boundaries
              </p>
            </div>
            <button
              onClick={onClose}
              disabled={loading}
              style={{
                background: "none",
                border: "none",
                color: "var(--text-muted)",
                fontSize: "1.25rem",
                cursor: "pointer",
              }}
            >
              ✕
            </button>
          </div>

          {error && (
            <div
              style={{
                padding: "0.75rem",
                backgroundColor: "rgba(244, 63, 94, 0.15)",
                border: "1px solid rgba(244, 63, 94, 0.3)",
                borderRadius: "var(--radius-md)",
                color: "var(--accent-rose)",
                fontSize: "0.85rem",
                marginBottom: "1rem",
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {/* Basic Info */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 140px", gap: "0.75rem" }}>
              <Input
                id="edit-role-name-input"
                label="Role Name *"
                placeholder="e.g. Regional Store Manager"
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                required
              />
              <Input
                id="edit-role-abbr-input"
                label="Abbr Code *"
                placeholder="e.g. RSM"
                value={roleAbbr}
                onChange={(e) => setRoleAbbr(e.target.value)}
                required
              />
            </div>

            <Input
              id="edit-role-desc-input"
              label="Role Description"
              placeholder="e.g. Store manager overseeing assigned retail outlets and warehouse inventory"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            {/* Matrix Tab Switcher */}
            <div
              style={{
                display: "flex",
                gap: "0.5rem",
                borderBottom: "1px solid var(--border-subtle)",
                paddingBottom: "0.5rem",
              }}
            >
              <button
                type="button"
                onClick={() => setActiveTab("modules")}
                style={{
                  padding: "0.45rem 1rem",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "0.85rem",
                  fontWeight: activeTab === "modules" ? 700 : 500,
                  backgroundColor: activeTab === "modules" ? "var(--bg-surface-elevated)" : "transparent",
                  color: activeTab === "modules" ? "var(--primary)" : "var(--text-secondary)",
                  border: activeTab === "modules" ? "1px solid var(--border-glow)" : "1px solid transparent",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                }}
              >
                <span>🛡️ Module Action Permissions</span>
                <Badge variant="info">{selectedPermissions.length}</Badge>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("facilities")}
                style={{
                  padding: "0.45rem 1rem",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "0.85rem",
                  fontWeight: activeTab === "facilities" ? 700 : 500,
                  backgroundColor: activeTab === "facilities" ? "var(--bg-surface-elevated)" : "transparent",
                  color: activeTab === "facilities" ? "var(--accent-emerald)" : "var(--text-secondary)",
                  border: activeTab === "facilities" ? "1px solid var(--accent-emerald)" : "1px solid transparent",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                }}
              >
                <span>🏬 Facility Access Matrix</span>
                <Badge variant={accessibleFacilitiesCount > 0 ? "success" : "default"}>
                  {accessibleFacilitiesCount}/{facilities.length} Allowed
                </Badge>
              </button>
            </div>

            {/* TAB 1: MODULE PERMISSION MATRIX */}
            {activeTab === "modules" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem", flexWrap: "wrap", gap: "0.5rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>Table Permissions</span>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      ({selectedPermissions.length} actions granted)
                    </span>
                  </div>

                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                      type="button"
                      onClick={selectAllFiltered}
                      style={{ background: "none", border: "none", color: "var(--primary)", fontSize: "0.75rem", cursor: "pointer", fontWeight: 600 }}
                    >
                      Select All Visible
                    </button>
                    <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>•</span>
                    <button
                      type="button"
                      onClick={selectReadOnlyFiltered}
                      style={{ background: "none", border: "none", color: "var(--accent-indigo)", fontSize: "0.75rem", cursor: "pointer" }}
                    >
                      Read-Only
                    </button>
                    <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>•</span>
                    <button
                      type="button"
                      onClick={clearFiltered}
                      style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: "0.75rem", cursor: "pointer" }}
                    >
                      Clear Visible
                    </button>
                  </div>
                </div>

                {/* Category Pills Filter */}
                <div
                  style={{
                    display: "flex",
                    gap: "0.35rem",
                    overflowX: "auto",
                    paddingBottom: "0.4rem",
                    marginBottom: "0.5rem",
                    scrollbarWidth: "none",
                  }}
                >
                  {CATEGORIES.map((cat) => {
                    const active = selectedCategory === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSelectedCategory(cat)}
                        style={{
                          padding: "0.25rem 0.6rem",
                          borderRadius: "var(--radius-sm)",
                          fontSize: "0.75rem",
                          fontWeight: active ? 600 : 500,
                          backgroundColor: active ? "var(--bg-surface-elevated)" : "transparent",
                          color: active ? "var(--primary)" : "var(--text-secondary)",
                          border: active ? "1px solid var(--border-glow)" : "1px solid var(--border-subtle)",
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                          transition: "all var(--transition-fast)",
                        }}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>

                {/* Search Filter for Actions & Modules */}
                <div style={{ marginBottom: "0.6rem" }}>
                  <Input
                    id="edit-filter-permissions-input"
                    placeholder="Quick filter modules or actions (e.g. inventory, delete, complete, payment)..."
                    value={filterQuery}
                    onChange={(e) => setFilterQuery(e.target.value)}
                  />
                </div>

                {/* Modules & Actions List */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.65rem",
                    maxHeight: "330px",
                    overflowY: "auto",
                    padding: "0.75rem",
                    backgroundColor: "var(--bg-surface-elevated)",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  {filteredModules.length === 0 ? (
                    <div style={{ padding: "1.5rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                      No modules match filter criteria.
                    </div>
                  ) : (
                    filteredModules.map((mod) => {
                      const moduleCount = mod.actions.filter((a) => isChecked(mod.table, a)).length;

                      return (
                        <div
                          key={mod.table}
                          style={{
                            padding: "0.6rem 0.75rem",
                            backgroundColor: "var(--bg-surface)",
                            borderRadius: "var(--radius-sm)",
                            border: "1px solid var(--border-subtle)",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.45rem" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                              <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)" }}>
                                {mod.label}
                              </span>
                              <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontFamily: "monospace" }}>
                                ({mod.table})
                              </span>
                              {moduleCount > 0 && (
                                <span
                                  style={{
                                    fontSize: "0.7rem",
                                    backgroundColor: "rgba(99, 102, 241, 0.2)",
                                    color: "var(--primary)",
                                    padding: "0.1rem 0.4rem",
                                    borderRadius: "var(--radius-sm)",
                                    fontWeight: 600,
                                  }}
                                >
                                  {moduleCount}/{mod.actions.length}
                                </span>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => toggleAllInModule(mod.table, mod.actions)}
                              style={{ background: "none", border: "none", color: "var(--text-secondary)", fontSize: "0.75rem", cursor: "pointer" }}
                            >
                              {moduleCount === mod.actions.length ? "Deselect All" : "Select All"}
                            </button>
                          </div>

                          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                            {mod.actions.map((act) => {
                              const active = isChecked(mod.table, act);
                              const isDanger = act === "delete" || act === "void";

                              let activeBg = "var(--primary)";
                              let activeBorder = "var(--primary)";
                              if (active && isDanger) {
                                activeBg = "var(--accent-rose)";
                                activeBorder = "var(--accent-rose)";
                              }

                              return (
                                <button
                                  key={act}
                                  type="button"
                                  onClick={() => togglePermission(mod.table, act)}
                                  style={{
                                    padding: "0.22rem 0.5rem",
                                    borderRadius: "var(--radius-sm)",
                                    fontSize: "0.75rem",
                                    fontWeight: active ? 600 : 500,
                                    backgroundColor: active ? activeBg : "var(--bg-surface-elevated)",
                                    color: active ? "#fff" : "var(--text-secondary)",
                                    border: active ? `1px solid ${activeBorder}` : "1px solid var(--border-subtle)",
                                    cursor: "pointer",
                                    transition: "all var(--transition-fast)",
                                  }}
                                >
                                  {act}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: FACILITY ACCESS MATRIX */}
            {activeTab === "facilities" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem", flexWrap: "wrap", gap: "0.5rem" }}>
                  <div>
                    <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-primary)" }}>
                      Physical Facility Access Boundaries
                    </span>
                    <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.1rem" }}>
                      Choose which stores, outlets, or warehouses users in this role can view, transact, or manage stock in.
                    </p>
                  </div>

                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                      type="button"
                      onClick={grantAllFacilities}
                      style={{ background: "none", border: "none", color: "var(--accent-emerald)", fontSize: "0.75rem", cursor: "pointer", fontWeight: 600 }}
                    >
                      Grant Full Access to All
                    </button>
                    <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>•</span>
                    <button
                      type="button"
                      onClick={grantReadOnlyAllFacilities}
                      style={{ background: "none", border: "none", color: "var(--primary)", fontSize: "0.75rem", cursor: "pointer" }}
                    >
                      View-Only All
                    </button>
                    <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>•</span>
                    <button
                      type="button"
                      onClick={revokeAllFacilities}
                      style={{ background: "none", border: "none", color: "var(--accent-rose)", fontSize: "0.75rem", cursor: "pointer" }}
                    >
                      Revoke All
                    </button>
                  </div>
                </div>

                <div style={{ marginBottom: "0.6rem" }}>
                  <Input
                    placeholder="Search facilities by name, code, or city..."
                    value={facilitySearch}
                    onChange={(e) => setFacilitySearch(e.target.value)}
                  />
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.5rem",
                    maxHeight: "330px",
                    overflowY: "auto",
                    padding: "0.75rem",
                    backgroundColor: "var(--bg-surface-elevated)",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  {filteredFacilities.length === 0 ? (
                    <div style={{ padding: "1.5rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                      No facilities registered or matching search.
                    </div>
                  ) : (
                    filteredFacilities.map((fac) => {
                      const perm = getFacilityPerm(fac.id);

                      return (
                        <div
                          key={fac.id}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "0.65rem 0.85rem",
                            backgroundColor: perm.canView ? "var(--bg-surface)" : "rgba(255, 255, 255, 0.02)",
                            borderRadius: "var(--radius-sm)",
                            border: perm.canView ? "1px solid var(--border-glow)" : "1px solid var(--border-subtle)",
                            opacity: perm.canView ? 1 : 0.65,
                            transition: "all var(--transition-fast)",
                          }}
                        >
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                              <span style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--text-primary)" }}>
                                {fac.facilityName}
                              </span>
                              <Badge variant="default">{fac.facilityCode}</Badge>
                              <Badge variant="info">{fac.type}</Badge>
                            </div>
                            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
                              📍 {fac.city || "Indonesia"} {fac.address ? `• ${fac.address}` : ""}
                            </div>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                            <label style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.75rem", cursor: "pointer", color: "var(--text-primary)" }}>
                              <input
                                type="checkbox"
                                checked={perm.canView}
                                onChange={(e) => updateFacilityPerm(fac.id, "canView", e.target.checked)}
                              />
                              👁️ Can View / Access
                            </label>

                            <label style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.75rem", cursor: "pointer", color: "var(--text-primary)" }}>
                              <input
                                type="checkbox"
                                checked={perm.canManageStock}
                                onChange={(e) => updateFacilityPerm(fac.id, "canManageStock", e.target.checked)}
                              />
                              📦 Manage Stock
                            </label>

                            <label style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.75rem", cursor: "pointer", color: "var(--text-primary)" }}>
                              <input
                                type="checkbox"
                                checked={perm.canTransact}
                                onChange={(e) => updateFacilityPerm(fac.id, "canTransact", e.target.checked)}
                              />
                              🛒 Transact in POS
                            </label>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.5rem" }}>
              <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
              <Button id="create-role-submit-btn" type="submit" disabled={loading}>
                {loading
                  ? "Creating..."
                  : `Create Role (${selectedPermissions.length} perms, ${accessibleFacilitiesCount} facilities)`}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
