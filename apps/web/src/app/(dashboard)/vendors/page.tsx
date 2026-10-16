"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { vendorApi } from "@/lib/api";
import { AddVendorModal } from "@/components/vendors/AddVendorModal";
import { ViewVendorModal } from "@/components/vendors/ViewVendorModal";
import { EditVendorModal } from "@/components/vendors/EditVendorModal";
import { DeactivateVendorModal } from "@/components/vendors/DeactivateVendorModal";
import { ReactivateAccountModal } from "@/components/common/ReactivateAccountModal";
import { useAuth } from "@/lib/authContext";
import { getVendorGroupName, getVendorGroupBadgeVariant, type VendorRecord } from "@pz/shared";

type StatusFilterType = "active" | "deactivated";
type VendorTypeFilter = "all" | "company" | "personal";
type VendorSortField = "id" | "name" | "contact";

export default function VendorsPage() {
  const { user, canAccess } = useAuth();
  const [vendors, setVendors] = useState<VendorRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>("active");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<VendorSortField>("id");
  const [groupFilter, setGroupFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<VendorTypeFilter>("all");
  const [hasProductsFilter, setHasProductsFilter] = useState<"all" | "with" | "without">("all");
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVendorForView, setSelectedVendorForView] = useState<VendorRecord | null>(null);
  const [selectedVendorForEdit, setSelectedVendorForEdit] = useState<VendorRecord | null>(null);
  const [selectedVendorForDeactivate, setSelectedVendorForDeactivate] = useState<VendorRecord | null>(null);
  const [selectedVendorForRestore, setSelectedVendorForRestore] = useState<VendorRecord | null>(null);
  const [restoringId, setRestoringId] = useState<number | null>(null);

  const canCreate = Boolean(
    user?.isSuperAdmin || canAccess("vendor", "create") || canAccess("vendor", "*")
  );

  const canEdit = Boolean(
    user?.isSuperAdmin || canAccess("vendor", "update") || canAccess("vendor", "*")
  );

  const canDelete = Boolean(
    user?.isSuperAdmin || canAccess("vendor", "delete") || canAccess("vendor", "*")
  );

  const canRestore = Boolean(
    user?.isSuperAdmin || canAccess("vendor", "restore") || canAccess("vendor", "update") || canAccess("vendor", "*")
  );

  const loadVendors = useCallback(async () => {
    setLoading(true);
    try {
      const res = await vendorApi.listVendors({ limit: 50, status: statusFilter });
      setVendors(res.items || []);
    } catch (err) {
      console.error("Failed to load vendors", err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);


  const handleConfirmRestore = async () => {
    if (!selectedVendorForRestore) return;
    setRestoringId(selectedVendorForRestore.id);
    try {
      await vendorApi.restoreVendor(selectedVendorForRestore.id);
      setSelectedVendorForRestore(null);
      await loadVendors();
    } catch (err: any) {
      alert(err?.message || "Failed to restore vendor.");
    } finally {
      setRestoringId(null);
    }
  };

  useEffect(() => {
    loadVendors();
  }, [loadVendors]);

  const handleSort = (field: VendorSortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

    const uniqueCities = useMemo(() => {
    const set = new Set<string>();
    vendors.forEach((v) => {
      if (v.profile?.city && v.profile.city.trim()) {
        set.add(v.profile.city.trim());
      }
    });
    return Array.from(set).sort();
  }, [vendors]);

  const filteredVendors = useMemo(() => {
    let result = [...vendors];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((v) => {
        const fullName = v.profile ? `${v.profile.firstName} ${v.profile.lastName || ""}`.toLowerCase() : "";
        const phone = (v.profile?.phoneNumber || "").toLowerCase();
        const address = (v.profile?.address || "").toLowerCase();
        const groupName = getVendorGroupName(v.vendorgroup).toLowerCase();
        const reason = (v.departReason || "").toLowerCase();
        const idStr = String(v.id);
        const prodMatch = (v.vendorProducts || []).some((vp) =>
          vp.product?.productName.toLowerCase().includes(q)
        );

        return (
          idStr.includes(q) ||
          fullName.includes(q) ||
          phone.includes(q) ||
          address.includes(q) ||
          groupName.includes(q) ||
          reason.includes(q) ||
          prodMatch
        );
      });
    }

    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === "id") {
        cmp = a.id - b.id;
      } else if (sortField === "name") {
        const nameA = a.profile ? `${a.profile.firstName} ${a.profile.lastName || ""}`.trim().toLowerCase() : "";
        const nameB = b.profile ? `${b.profile.firstName} ${b.profile.lastName || ""}`.trim().toLowerCase() : "";
        cmp = nameA.localeCompare(nameB);
      } else if (sortField === "contact") {
        const contactA = (a.profile?.phoneNumber || a.profile?.address || "").toLowerCase();
        const contactB = (b.profile?.phoneNumber || b.profile?.address || "").toLowerCase();
        cmp = contactA.localeCompare(contactB);
      }
      return sortOrder === "asc" ? cmp : -cmp;
    });

    return result;
  }, [vendors, searchQuery, sortField, sortOrder]);


  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h2 style={{ fontSize: "1.3rem", fontWeight: 700 }}>Vendor Accounts</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
            Supplier directory, procurement partners, and product catalogs
          </p>
        </div>
        {canCreate && (
          <Button id="add-vendor-btn" size="md" onClick={() => setIsModalOpen(true)}>
            + Add Vendor
          </Button>
        )}
      </div>

      {/* Search & Extended Filter Controls */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
          <div style={{ flex: "1 1 300px", maxWidth: "460px" }}>
            <Input
              id="search-vendors-input"
              placeholder="Search vendor name, phone, address, product, notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Status:</span>
              <select
                id="filter-vendors-status-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilterType)}
                style={{
                  padding: "0.45rem 0.75rem",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-subtle)",
                  backgroundColor: "var(--bg-surface-elevated)",
                  color: "var(--text-primary)",
                  fontSize: "0.825rem",
                  cursor: "pointer",
                  outline: "none",
                }}
              >
                <option value="active">🟢 Active Suppliers</option>
                <option value="deactivated">🔴 Archived / Inactive</option>
              </select>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Group / Tier:</span>
              <select
                id="filter-vendors-group-select"
                value={groupFilter}
                onChange={(e) => setGroupFilter(e.target.value)}
                style={{
                  padding: "0.45rem 0.75rem",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-subtle)",
                  backgroundColor: "var(--bg-surface-elevated)",
                  color: "var(--text-primary)",
                  fontSize: "0.825rem",
                  cursor: "pointer",
                  outline: "none",
                }}
              >
                <option value="all">All Tiers & Groups</option>
                <option value="1">Tier 1 (Primary Supplier)</option>
                <option value="2">Tier 2 (Secondary Supplier)</option>
                <option value="3">Tier 3 (Subcontractor / Logistics)</option>
                <option value="4">Wholesale Distributor</option>
                <option value="5">OEM / Manufacturer</option>
              </select>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Entity:</span>
              <select
                id="filter-vendors-type-select"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as VendorTypeFilter)}
                style={{
                  padding: "0.45rem 0.75rem",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-subtle)",
                  backgroundColor: "var(--bg-surface-elevated)",
                  color: "var(--text-primary)",
                  fontSize: "0.825rem",
                  cursor: "pointer",
                  outline: "none",
                }}
              >
                <option value="all">All Types</option>
                <option value="company">🏢 Company / Corporate</option>
                <option value="personal">👤 Individual Contractor</option>
              </select>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Catalog:</span>
              <select
                id="filter-vendors-catalog-select"
                value={hasProductsFilter}
                onChange={(e) => setHasProductsFilter(e.target.value as any)}
                style={{
                  padding: "0.45rem 0.75rem",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-subtle)",
                  backgroundColor: "var(--bg-surface-elevated)",
                  color: "var(--text-primary)",
                  fontSize: "0.825rem",
                  cursor: "pointer",
                  outline: "none",
                }}
              >
                <option value="all">All Catalogs</option>
                <option value="with">📦 Has Products Linked</option>
                <option value="without">⚠️ No Products Linked</option>
              </select>
            </div>

            {uniqueCities.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>City:</span>
                <select
                  id="filter-vendors-city-select"
                  value={cityFilter}
                  onChange={(e) => setCityFilter(e.target.value)}
                  style={{
                    padding: "0.45rem 0.75rem",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border-subtle)",
                    backgroundColor: "var(--bg-surface-elevated)",
                    color: "var(--text-primary)",
                    fontSize: "0.825rem",
                    cursor: "pointer",
                    outline: "none",
                  }}
                >
                  <option value="all">All Cities</option>
                  {uniqueCities.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            )}

            {(groupFilter !== "all" || typeFilter !== "all" || hasProductsFilter !== "all" || cityFilter !== "all" || searchQuery) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setGroupFilter("all");
                  setTypeFilter("all");
                  setHasProductsFilter("all");
                  setCityFilter("all");
                  setSearchQuery("");
                }}
                style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}
              >
                Reset Filters
              </Button>
            )}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <span style={{ fontSize: "0.825rem", color: "var(--text-muted)" }}>
            Showing {filteredVendors.length} of {vendors.length} {statusFilter} supplier{vendors.length === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      {/* Main Table Card */}
      <Card>
        {loading ? (
          <p style={{ color: "var(--text-muted)", padding: "1.5rem", textAlign: "center" }}>
            Loading vendor records...
          </p>
        ) : filteredVendors.length === 0 ? (
          <div style={{ textAlign: "center", padding: "2.5rem", color: "var(--text-secondary)" }}>
            <p style={{ marginBottom: "0.5rem" }}>
              {statusFilter === "deactivated"
                ? "No deactivated suppliers on record."
                : "No active vendors registered yet."}
            </p>
            {statusFilter === "deactivated" ? (
              <Button size="sm" variant="secondary" onClick={() => setStatusFilter("active")}>
                View Active Suppliers
              </Button>
            ) : canCreate ? (
              <Button size="sm" onClick={() => setIsModalOpen(true)}>
                + Add First Vendor
              </Button>
            ) : null}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-subtle)", color: "var(--text-muted)", fontSize: "0.8rem", userSelect: "none" }}>
                  <th
                    style={{ padding: "0.75rem 0", cursor: "pointer" }}
                    onClick={() => handleSort("id")}
                    title="Sort by ID"
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                      ID {sortField === "id" ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}
                    </span>
                  </th>
                  <th
                    style={{ cursor: "pointer" }}
                    onClick={() => handleSort("name")}
                    title="Sort by Vendor Name"
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                      VENDOR / COMPANY {sortField === "name" ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}
                    </span>
                  </th>
                  <th
                    style={{ cursor: "pointer" }}
                    onClick={() => handleSort("contact")}
                    title="Sort by Contact / Address"
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                      CONTACT / ADDRESS {sortField === "contact" ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}
                    </span>
                  </th>
                  <th style={{ textAlign: "right", paddingRight: "0.5rem" }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredVendors.map((v) => {
                  const isDeactivated = Boolean(v.deletedAt);

                  return (
                    <tr
                      key={v.id}
                      style={{
                        borderBottom: "1px solid var(--border-subtle)",
                        fontSize: "0.9rem",
                        backgroundColor: isDeactivated ? "rgba(244, 63, 94, 0.03)" : "transparent",
                      }}
                    >
                      <td style={{ padding: "0.75rem 0", color: "var(--text-secondary)" }}>#{v.id}</td>
                      <td style={{ fontWeight: 600 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <span>{v.profile ? `${v.profile.firstName} ${v.profile.lastName || ""}` : "Unnamed"}</span>
                          {v.profile?.isCompany && <Badge variant="warning">Company</Badge>}
                        </div>
                      </td>
                      <td style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                        <div>{v.profile?.phoneNumber ? `📞 ${v.profile.phoneNumber}` : "No phone"}</div>
                        <div style={{ color: "var(--text-secondary)", fontSize: "0.78rem" }}>{v.profile?.address || "—"}</div>
                      </td>
                      <td style={{ textAlign: "right", paddingRight: "0.5rem", whiteSpace: "nowrap" }}>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.4rem" }}>
                          <Button
                            id={`view-vendor-btn-${v.id}`}
                            size="sm"
                            variant="secondary"
                            onClick={() => setSelectedVendorForView(v)}
                            title="View what they sell and procurement history"
                            style={{ padding: "0.25rem 0.6rem", fontSize: "0.8rem" }}
                          >
                            👁 View
                          </Button>

                          {canEdit && !isDeactivated && (
                            <Button
                              id={`edit-vendor-btn-${v.id}`}
                              size="sm"
                              variant="secondary"
                              onClick={() => setSelectedVendorForEdit(v)}
                              style={{ padding: "0.25rem 0.6rem", fontSize: "0.8rem" }}
                            >
                              ✏️ Edit
                            </Button>
                          )}

                          {isDeactivated ? (
                            canRestore && (
                              <Button
                                id={`restore-vendor-btn-${v.id}`}
                                size="sm"
                                variant="secondary"
                                onClick={() => setSelectedVendorForRestore(v)}
                                isLoading={restoringId === v.id}
                                style={{
                                  padding: "0.25rem 0.6rem",
                                  fontSize: "0.8rem",
                                  borderColor: "var(--accent-emerald)",
                                  color: "var(--accent-emerald)",
                                }}
                              >
                                ♻️ Restore
                              </Button>
                            )
                          ) : (
                            canDelete && (
                              <Button
                                id={`deactivate-vendor-btn-${v.id}`}
                                size="sm"
                                variant="secondary"
                                onClick={() => setSelectedVendorForDeactivate(v)}
                                style={{
                                  padding: "0.25rem 0.6rem",
                                  fontSize: "0.8rem",
                                  color: "var(--accent-rose)",
                                  borderColor: "rgba(244, 63, 94, 0.3)",
                                }}
                              >
                                🛑 Deactivate
                              </Button>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <AddVendorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onVendorCreated={() => {
          loadVendors();
        }}
      />

      <ViewVendorModal
        isOpen={Boolean(selectedVendorForView)}
        vendor={selectedVendorForView}
        onClose={() => setSelectedVendorForView(null)}
        onVendorUpdated={() => {
          loadVendors();
        }}
      />

      <EditVendorModal
        isOpen={Boolean(selectedVendorForEdit)}
        vendor={selectedVendorForEdit}
        onClose={() => setSelectedVendorForEdit(null)}
        onVendorUpdated={() => {
          loadVendors();
        }}
      />

      <DeactivateVendorModal
        isOpen={Boolean(selectedVendorForDeactivate)}
        vendor={selectedVendorForDeactivate}
        onClose={() => setSelectedVendorForDeactivate(null)}
        onVendorDeactivated={() => {
          loadVendors();
        }}
      />

      <ReactivateAccountModal
        isOpen={Boolean(selectedVendorForRestore)}
        title="Reactivate Supplier Account"
        accountType="Vendor"
        accountId={selectedVendorForRestore?.id ?? 0}
        displayName={
          selectedVendorForRestore?.profile
            ? `${selectedVendorForRestore.profile.firstName} ${selectedVendorForRestore.profile.lastName || ""}`.trim()
            : `Vendor #${selectedVendorForRestore?.id}`
        }
        detailSubtitle={selectedVendorForRestore?.profile?.phoneNumber ? `📞 ${selectedVendorForRestore.profile.phoneNumber}` : undefined}
        departReason={selectedVendorForRestore?.departReason}
        deactivatedAt={selectedVendorForRestore?.deletedAt}
        loading={restoringId === selectedVendorForRestore?.id}
        onConfirm={handleConfirmRestore}
        onClose={() => setSelectedVendorForRestore(null)}
      />
    </div>
  );
}
