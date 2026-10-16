"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { customerApi } from "@/lib/api";
import { AddCustomerModal } from "@/components/customers/AddCustomerModal";
import { EditCustomerModal } from "@/components/customers/EditCustomerModal";
import { DeactivateCustomerModal } from "@/components/customers/DeactivateCustomerModal";
import { ReactivateAccountModal } from "@/components/common/ReactivateAccountModal";
import { useAuth } from "@/lib/authContext";
import {
  getCustomerGroupName,
  getCustomerGroupBadgeVariant,
  type CustomerRecord,
} from "@pz/shared";

type StatusFilterType = "active" | "deactivated";

export default function CustomersPage() {
  const { user, canAccess } = useAuth();
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>("active");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<"id" | "name" | "contact" | "group" | "status">("id");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCustomerForEdit, setSelectedCustomerForEdit] = useState<CustomerRecord | null>(null);
  const [selectedCustomerForDeactivate, setSelectedCustomerForDeactivate] = useState<CustomerRecord | null>(null);
  const [selectedCustomerForRestore, setSelectedCustomerForRestore] = useState<CustomerRecord | null>(null);
  const [restoringId, setRestoringId] = useState<number | null>(null);

  const canCreate = Boolean(
    user?.isSuperAdmin || canAccess("customer", "create") || canAccess("customer", "*")
  );

  const canEdit = Boolean(
    user?.isSuperAdmin || canAccess("customer", "update") || canAccess("customer", "*")
  );

  const canDelete = Boolean(
    user?.isSuperAdmin || canAccess("customer", "delete") || canAccess("customer", "*")
  );

  const canRestore = Boolean(
    user?.isSuperAdmin || canAccess("customer", "restore") || canAccess("customer", "update") || canAccess("customer", "*")
  );

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await customerApi.listCustomers({ limit: 50, status: statusFilter });
      setCustomers(res.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);


  const handleConfirmRestore = async () => {
    if (!selectedCustomerForRestore) return;
    setRestoringId(selectedCustomerForRestore.id);
    try {
      await customerApi.restoreCustomer(selectedCustomerForRestore.id);
      setSelectedCustomerForRestore(null);
      await loadCustomers();
    } catch (err: any) {
      alert(err?.message || "Failed to restore customer.");
    } finally {
      setRestoringId(null);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const handleSort = (field: "id" | "name" | "contact" | "group" | "status") => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const filteredCustomers = useMemo(() => {
    let result = [...customers];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((c) => {
        const fullName = c.profile ? `${c.profile.firstName} ${c.profile.lastName || ""}`.toLowerCase() : "";
        const phone = (c.profile?.phoneNumber || "").toLowerCase();
        const address = (c.profile?.address || "").toLowerCase();
        const groupName = getCustomerGroupName(c.customergroup).toLowerCase();
        const reason = (c.departReason || "").toLowerCase();
        const idStr = String(c.id);

        return (
          idStr.includes(q) ||
          fullName.includes(q) ||
          phone.includes(q) ||
          address.includes(q) ||
          groupName.includes(q) ||
          reason.includes(q)
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
      } else if (sortField === "group") {
        const groupA = getCustomerGroupName(a.customergroup).toLowerCase();
        const groupB = getCustomerGroupName(b.customergroup).toLowerCase();
        cmp = groupA.localeCompare(groupB);
      } else if (sortField === "status") {
        const statA = (a.departReason || (a.deletedAt ? "Deactivated" : "Active")).toLowerCase();
        const statB = (b.departReason || (b.deletedAt ? "Deactivated" : "Active")).toLowerCase();
        cmp = statA.localeCompare(statB);
      }
      return sortOrder === "asc" ? cmp : -cmp;
    });

    return result;
  }, [customers, searchQuery, sortField, sortOrder]);


  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Page Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h2 style={{ fontSize: "1.3rem", fontWeight: 700 }}>Customer Accounts</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
            Customer directory, loyalty profiles, and account status
          </p>
        </div>
        {canCreate && (
          <Button id="add-customer-btn" size="md" onClick={() => setIsModalOpen(true)}>
            + Add Customer
          </Button>
        )}
      </div>

      {/* Search & Filter Bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
        <div style={{ flex: "1 1 280px", maxWidth: "420px" }}>
          <Input
            id="search-customers-input"
            placeholder="Search by name, phone, address, group..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.825rem", color: "var(--text-muted)" }}>Status:</span>
            <select
              id="filter-customers-status-select"
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
              <option value="active">🟢 Active Accounts</option>
              <option value="deactivated">🔴 Archived / Inactive</option>
            </select>
          </div>

          <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
            Showing {filteredCustomers.length} of {customers.length} {statusFilter} customer{customers.length === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      {/* Main Table Card */}
      <Card>
        {loading ? (
          <p style={{ color: "var(--text-muted)", padding: "1.5rem", textAlign: "center" }}>
            Loading customer records...
          </p>
        ) : filteredCustomers.length === 0 ? (
          <div style={{ textAlign: "center", padding: "2.5rem", color: "var(--text-secondary)" }}>
            <p style={{ marginBottom: "0.5rem" }}>
              {statusFilter === "deactivated"
                ? "No deactivated customers on record."
                : "No active customers registered yet."}
            </p>
            {statusFilter === "deactivated" ? (
              <Button size="sm" variant="secondary" onClick={() => setStatusFilter("active")}>
                View Active Accounts
              </Button>
            ) : canCreate ? (
              <Button size="sm" onClick={() => setIsModalOpen(true)}>
                + Add First Customer
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
                    title="Sort by Name"
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                      NAME / BUSINESS {sortField === "name" ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}
                    </span>
                  </th>
                  <th
                    style={{ cursor: "pointer" }}
                    onClick={() => handleSort("contact")}
                    title="Sort by Contact / Address"
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                      CONTACT & ADDRESS {sortField === "contact" ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}
                    </span>
                  </th>
                  <th
                    style={{ cursor: "pointer" }}
                    onClick={() => handleSort("group")}
                    title="Sort by Group"
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                      TIER / GROUP {sortField === "group" ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}
                    </span>
                  </th>
                  {statusFilter === "deactivated" ? (
                    <th
                      style={{ cursor: "pointer" }}
                      onClick={() => handleSort("status")}
                      title="Sort by Deactivation Reason"
                    >
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                        DEACTIVATION REASON {sortField === "status" ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}
                      </span>
                    </th>
                  ) : (
                    <th
                      style={{ cursor: "pointer" }}
                      onClick={() => handleSort("status")}
                      title="Sort by Status"
                    >
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                        STATUS {sortField === "status" ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}
                      </span>
                    </th>
                  )}
                  <th style={{ textAlign: "right", paddingRight: "0.5rem" }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((c) => {
                  const isDeactivated = Boolean(c.deletedAt);
                  return (
                    <tr
                      key={c.id}
                      style={{
                        borderBottom: "1px solid var(--border-subtle)",
                        fontSize: "0.9rem",
                        backgroundColor: isDeactivated ? "rgba(244, 63, 94, 0.03)" : "transparent",
                      }}
                    >
                      <td style={{ padding: "0.75rem 0", color: "var(--text-secondary)" }}>#{c.id}</td>
                      <td style={{ fontWeight: 600 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                          <span>{c.profile ? `${c.profile.firstName} ${c.profile.lastName || ""}` : "Unnamed"}</span>
                          {c.profile?.isCompany && <Badge variant="warning">Company</Badge>}
                        </div>
                      </td>
                      <td style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                        <div>{c.profile?.phoneNumber ? `📞 ${c.profile.phoneNumber}` : "No phone"}</div>
                        <div style={{ color: "var(--text-secondary)", fontSize: "0.78rem" }}>{c.profile?.address || "—"}</div>
                      </td>
                      <td>
                        <Badge variant={getCustomerGroupBadgeVariant(c.customergroup)}>
                          {getCustomerGroupName(c.customergroup)}
                        </Badge>
                      </td>

                      {statusFilter === "deactivated" ? (
                        <td>
                          <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                              <Badge variant="danger">Deactivated</Badge>
                              {c.deletedAt && (
                                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                                  {new Date(c.deletedAt).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontStyle: c.departReason ? "italic" : "normal" }}>
                              {c.departReason ? `"${c.departReason}"` : "No reason specified"}
                            </span>
                          </div>
                        </td>
                      ) : (
                        <td>
                          <Badge variant="success">Active</Badge>
                        </td>
                      )}

                      <td style={{ textAlign: "right", paddingRight: "0.5rem", whiteSpace: "nowrap" }}>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.4rem" }}>
                          {canEdit && !isDeactivated && (
                            <Button
                              id={`edit-customer-btn-${c.id}`}
                              size="sm"
                              variant="secondary"
                              onClick={() => setSelectedCustomerForEdit(c)}
                              title="Edit customer group"
                              style={{ padding: "0.25rem 0.6rem", fontSize: "0.8rem" }}
                            >
                              ✏️ Edit
                            </Button>
                          )}
                          {canDelete && !isDeactivated && (
                            <Button
                              id={`deactivate-customer-btn-${c.id}`}
                              size="sm"
                              variant="ghost"
                              onClick={() => setSelectedCustomerForDeactivate(c)}
                              title="Deactivate customer account"
                              style={{
                                padding: "0.25rem 0.6rem",
                                fontSize: "0.8rem",
                                color: "var(--accent-rose)",
                                backgroundColor: "rgba(244, 63, 94, 0.08)",
                                border: "1px solid rgba(244, 63, 94, 0.25)",
                              }}
                            >
                              🗑️ Deactivate
                            </Button>
                          )}
                          {isDeactivated && canRestore && (
                            <Button
                              id={`restore-customer-btn-${c.id}`}
                              size="sm"
                              variant="secondary"
                              onClick={() => setSelectedCustomerForRestore(c)}
                              title="Reactivate this customer account"
                              style={{
                                padding: "0.3rem 0.75rem",
                                fontSize: "0.8rem",
                                fontWeight: 600,
                                color: "var(--accent-emerald)",
                                backgroundColor: "rgba(16, 185, 129, 0.1)",
                                border: "1px solid rgba(16, 185, 129, 0.35)",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.35rem",
                                borderRadius: "var(--radius-md)",
                                transition: "all var(--transition-fast)",
                              }}
                            >
                              <span>↺</span>
                              <span>Reactivate</span>
                            </Button>
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

      <AddCustomerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCustomerCreated={() => {
          loadCustomers();
        }}
      />

      <EditCustomerModal
        isOpen={Boolean(selectedCustomerForEdit)}
        customer={selectedCustomerForEdit}
        onClose={() => setSelectedCustomerForEdit(null)}
        onCustomerUpdated={() => {
          loadCustomers();
        }}
      />

      <DeactivateCustomerModal
        isOpen={Boolean(selectedCustomerForDeactivate)}
        customer={selectedCustomerForDeactivate}
        onClose={() => setSelectedCustomerForDeactivate(null)}
        onCustomerDeactivated={() => {
          loadCustomers();
        }}
      />

      <ReactivateAccountModal
        isOpen={Boolean(selectedCustomerForRestore)}
        title="Reactivate Customer Account"
        accountType="Customer"
        accountId={selectedCustomerForRestore?.id ?? 0}
        displayName={
          selectedCustomerForRestore?.profile
            ? `${selectedCustomerForRestore.profile.firstName} ${selectedCustomerForRestore.profile.lastName || ""}`.trim()
            : `Customer #${selectedCustomerForRestore?.id}`
        }
        detailSubtitle={selectedCustomerForRestore?.profile?.phoneNumber ? `📞 ${selectedCustomerForRestore.profile.phoneNumber}` : undefined}
        departReason={selectedCustomerForRestore?.departReason}
        deactivatedAt={selectedCustomerForRestore?.deletedAt}
        loading={restoringId === selectedCustomerForRestore?.id}
        onConfirm={handleConfirmRestore}
        onClose={() => setSelectedCustomerForRestore(null)}
      />
    </div>
  );
}
