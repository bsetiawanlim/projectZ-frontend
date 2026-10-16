"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { SortableTh } from "@/components/ui/SortableTh";
import { useAuth } from "@/lib/authContext";
import { orderApi, facilityApi } from "@/lib/api";
import type { FacilityRecord } from "@/lib/api";
import { formatIDR } from "@pz/shared";
import { AddPurchaseOrderModal } from "@/components/orders/AddPurchaseOrderModal";
import { ViewPurchaseOrderModal } from "@/components/orders/ViewPurchaseOrderModal";
import type { PurchaseOrderRecord, OrderStatus } from "@pz/shared";

type StatusFilterType = "ALL" | OrderStatus;

export default function PurchaseOrdersPage() {
  const { user, canAccess } = useAuth();
  const [orders, setOrders] = useState<PurchaseOrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>("ALL");
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>("ALL");
  const [facilities, setFacilities] = useState<FacilityRecord[]>([]);

  type PoSortField = "poNumber" | "title" | "vendor" | "destination" | "items" | "status" | "dueDate" | "total";
  const [sortField, setSortField] = useState<PoSortField>("poNumber");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const handleSort = (field: PoSortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };


  const [isAddOpen, setIsAddOpen] = useState(false);
  const [viewingOrder, setViewingOrder] = useState<PurchaseOrderRecord | null>(null);

  const canCreate = Boolean(
    user?.isSuperAdmin ||
      canAccess("purchase-order", "create") ||
      canAccess("purchase-order", "*")
  );

  const canManage = Boolean(
    user?.isSuperAdmin ||
      canAccess("purchase-order", "update") ||
      canAccess("purchase-order", "*")
  );

  const canDelete = Boolean(
    user?.isSuperAdmin ||
      canAccess("purchase-order", "delete") ||
      canAccess("purchase-order", "*")
  );

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { limit: 100 };
      if (selectedFacilityId !== "ALL") {
        params.destinationFacilityId = Number(selectedFacilityId);
      }
      const res = await orderApi.listPurchaseOrders(params);
      setOrders(res?.items || []);
    } catch (err) {
      console.error("Failed to load purchase orders", err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [selectedFacilityId]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    facilityApi
      .listFacilities({ limit: 100 })
      .then((res) => {
        const list = res?.items || (res as any)?.data || [];
        setFacilities(list);
      })
      .catch(() => setFacilities([]));
  }, []);

  const filteredOrders = useMemo(() => {
    let result = orders;

    if (statusFilter !== "ALL") {
      result = result.filter((o) => o.status === statusFilter);
    }

    if (selectedFacilityId !== "ALL") {
      result = result.filter((o) => o.destinationFacilityId === Number(selectedFacilityId));
    }

    if (!searchQuery.trim()) return result;
    const q = searchQuery.toLowerCase().trim();

    return result.filter((o) => {
      const num = (o.number || "").toLowerCase();
      const title = (o.title || "").toLowerCase();
      const notes = (o.notes || "").toLowerCase();
      const vObj = o.purchaseOrderVendor;
      const vProf = vObj?.profile || vObj?.vendorProfile;
      const vendorName = (vProf ? `${vProf.firstName} ${vProf.lastName || ""}` : "").toLowerCase();

      return num.includes(q) || title.includes(q) || notes.includes(q) || vendorName.includes(q);
    });
  }, [orders, statusFilter, searchQuery]);

  const totalValue = useMemo(
    () => orders.reduce((acc, o) => acc + (Number(o.totalAmount) || 0), 0),
    [orders]
  );
  const approvedCount = useMemo(
    () => orders.filter((o) => o.status === "APPROVED").length,
    [orders]
  );
  const pendingCount = useMemo(
    () => orders.filter((o) => o.status === "PENDING").length,
    [orders]
  );
  const draftCount = useMemo(
    () => orders.filter((o) => o.status === "DRAFT").length,
    [orders]
  );

  const handleQuickApprove = async (id: number) => {
    try {
      await orderApi.updatePurchaseOrder({ id, status: "APPROVED" });
      await loadOrders();
    } catch (err: any) {
      alert(err?.message || "Failed to approve purchase order.");
    }
  };

  const handleDelete = async (id: number, number: string) => {
    if (!confirm(`Are you sure you want to cancel and delete purchase order ${number}?`)) return;
    try {
      await orderApi.deletePurchaseOrder(id);
      await loadOrders();
    } catch (err: any) {
      alert(err?.message || "Failed to delete purchase order.");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <h2 style={{ fontSize: "1.3rem", fontWeight: 700 }}>Purchase Orders & Procurement</h2>
            <Badge variant="info">Procurement & Supply Chain</Badge>
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginTop: "0.2rem" }}>
            Manage supplier purchase contracts, delivery deadlines, and procurement expenditure
          </p>
        </div>
        {canCreate && (
          <Button
            id="issue-po-btn"
            size="md"
            onClick={() => setIsAddOpen(true)}
            style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
          >
            <span>📑</span>
            <span>+ Issue Purchase Order</span>
          </Button>
        )}
      </div>

      {/* KPI Overview Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "1rem",
        }}
      >
        <Card style={{ padding: "1rem 1.25rem" }}>
          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
            Total Orders
          </p>
          <p style={{ fontSize: "1.4rem", fontWeight: 700, marginTop: "0.25rem", color: "var(--text-primary)" }}>
            {loading ? "—" : orders.length}
          </p>
          <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>
            Lifetime procurement POs
          </span>
        </Card>

        <Card style={{ padding: "1rem 1.25rem" }}>
          <p style={{ fontSize: "0.75rem", color: "var(--accent-emerald)", textTransform: "uppercase" }}>
            Approved Commitments
          </p>
          <p style={{ fontSize: "1.4rem", fontWeight: 700, marginTop: "0.25rem", color: "var(--accent-emerald)" }}>
            {loading ? "—" : approvedCount}
          </p>
          <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>
            Active verified orders
          </span>
        </Card>

        <Card style={{ padding: "1rem 1.25rem" }}>
          <p style={{ fontSize: "0.75rem", color: "var(--accent-amber)", textTransform: "uppercase" }}>
            Pending Approval
          </p>
          <p style={{ fontSize: "1.4rem", fontWeight: 700, marginTop: "0.25rem", color: "var(--accent-amber)" }}>
            {loading ? "—" : pendingCount}
          </p>
          <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>
            Requires managerial review
          </span>
        </Card>

        <Card style={{ padding: "1rem 1.25rem" }}>
          <p style={{ fontSize: "0.75rem", color: "var(--accent-cyan)", textTransform: "uppercase" }}>
            Total Committed Value
          </p>
          <p style={{ fontSize: "1.2rem", fontWeight: 700, marginTop: "0.25rem", color: "var(--accent-cyan)" }}>
            {loading ? "—" : formatIDR(totalValue)}
          </p>
          <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>
            Total procurement spend
          </span>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card style={{ padding: "1rem 1.25rem" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          <div style={{ flex: "1 1 280px", maxWidth: "420px" }}>
            <Input
              id="search-po-input"
              placeholder="Search by PO number, title, vendor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
            {/* Facility Filter */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", marginRight: "0.5rem" }}>
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Location:</span>
              <select
                id="filter-po-facility-select"
                value={selectedFacilityId}
                onChange={(e) => setSelectedFacilityId(e.target.value)}
                style={{
                  padding: "0.35rem 0.65rem",
                  fontSize: "0.8rem",
                  borderRadius: "var(--radius-sm)",
                  backgroundColor: "var(--bg-surface-elevated)",
                  border: "1px solid var(--border-subtle)",
                  color: "var(--text-primary)",
                  outline: "none",
                }}
              >
                <option value="ALL">All Facilities</option>
                {facilities.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.type === "WAREHOUSE" ? "🏭" : f.type === "STORE" ? "🏪" : "📍"} {f.facilityName}
                  </option>
                ))}
              </select>
            </div>

            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginRight: "0.25rem" }}>
              Status:
            </span>
            <select
              id="filter-po-status-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilterType)}
              style={{
                padding: "0.35rem 0.65rem",
                fontSize: "0.8rem",
                borderRadius: "var(--radius-sm)",
                backgroundColor: "var(--bg-surface-elevated)",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-primary)",
                outline: "none",
                cursor: "pointer",
              }}
            >
              <option value="ALL">All Statuses ({orders.length})</option>
              <option value="APPROVED">✅ Approved ({approvedCount})</option>
              <option value="PENDING">⏳ Pending ({pendingCount})</option>
              <option value="DRAFT">📝 Draft ({draftCount})</option>
            </select>

            <Button
              id="refresh-po-btn"
              size="sm"
              variant="ghost"
              onClick={loadOrders}
              title="Refresh orders"
              style={{ marginLeft: "0.5rem" }}
            >
              🔄 Refresh
            </Button>
          </div>
        </div>
      </Card>

      {/* Orders Table */}
      <Card style={{ padding: "0", overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
            <p>Loading purchase orders...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3.5rem 1.5rem", color: "var(--text-secondary)" }}>
            <span style={{ fontSize: "2.5rem" }}>📑</span>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginTop: "1rem", color: "var(--text-primary)" }}>
              No Purchase Orders Found
            </h3>
            <p style={{ marginTop: "0.4rem", fontSize: "0.875rem", maxWidth: "400px", margin: "0.4rem auto 1.25rem auto" }}>
              {searchQuery || statusFilter !== "ALL"
                ? "No purchase orders match your active filter."
                : "No purchase orders have been issued to vendors yet."}
            </p>
            {canCreate && (
              <Button size="sm" onClick={() => setIsAddOpen(true)}>
                + Issue First Purchase Order
              </Button>
            )}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr
                  style={{
                    borderBottom: "1px solid var(--border-subtle)",
                    backgroundColor: "var(--bg-surface-elevated)",
                    color: "var(--text-muted)",
                    fontSize: "0.75rem",
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                    userSelect: "none",
                  }}
                >
                  <th
                    style={{ padding: "0.85rem 1.25rem", cursor: "pointer" }}
                    onClick={() => handleSort("poNumber")}
                    title="Sort by PO Number"
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                      PO Number {sortField === "poNumber" ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}
                    </span>
                  </th>
                  <th
                    style={{ padding: "0.85rem 1.25rem", cursor: "pointer" }}
                    onClick={() => handleSort("title")}
                    title="Sort by Order Title"
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                      Order Title {sortField === "title" ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}
                    </span>
                  </th>
                  <th
                    style={{ padding: "0.85rem 1.25rem", cursor: "pointer" }}
                    onClick={() => handleSort("vendor")}
                    title="Sort by Vendor Supplier"
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                      Vendor Supplier {sortField === "vendor" ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}
                    </span>
                  </th>
                  <th
                    style={{ padding: "0.85rem 1.25rem", cursor: "pointer" }}
                    onClick={() => handleSort("destination")}
                    title="Sort by Destination Location"
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                      Destination Location {sortField === "destination" ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}
                    </span>
                  </th>
                  <th
                    style={{ padding: "0.85rem 1.25rem", cursor: "pointer" }}
                    onClick={() => handleSort("items")}
                    title="Sort by Items Count"
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                      Items / Products {sortField === "items" ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}
                    </span>
                  </th>
                  <th
                    style={{ padding: "0.85rem 1.25rem", cursor: "pointer" }}
                    onClick={() => handleSort("status")}
                    title="Sort by Status"
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                      Status {sortField === "status" ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}
                    </span>
                  </th>
                  <th
                    style={{ padding: "0.85rem 1.25rem", cursor: "pointer" }}
                    onClick={() => handleSort("dueDate")}
                    title="Sort by Due Date"
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                      Due Date {sortField === "dueDate" ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}
                    </span>
                  </th>
                  <th
                    style={{ padding: "0.85rem 1.25rem", cursor: "pointer" }}
                    onClick={() => handleSort("total")}
                    title="Sort by Order Total"
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                      Order Total {sortField === "total" ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}
                    </span>
                  </th>
                  <th style={{ padding: "0.85rem 1.25rem", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((o) => {
                  const vObj = o.purchaseOrderVendor;
                  const vProf = vObj?.profile || vObj?.vendorProfile;
                  const vendorName = vProf ? `${vProf.firstName} ${vProf.lastName || ""}`.trim() : `Vendor #${o.vendorId}`;

                  const statusVariant =
                    o.status === "APPROVED"
                      ? "success"
                      : o.status === "PENDING"
                      ? "warning"
                      : o.status === "REJECTED"
                      ? "danger"
                      : "default";

                  return (
                    <tr
                      key={o.id}
                      style={{
                        borderBottom: "1px solid var(--border-subtle)",
                        fontSize: "0.875rem",
                        transition: "background-color var(--transition-fast)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "var(--bg-surface-elevated)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      {/* PO Number */}
                      <td style={{ padding: "0.9rem 1.25rem", fontFamily: "monospace", fontWeight: 600, color: "var(--text-primary)" }}>
                        {o.number}
                      </td>

                      {/* Title */}
                      <td style={{ padding: "0.9rem 1.25rem" }}>
                        <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{o.title}</div>
                        {o.notes && (
                          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", maxWidth: "220px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {o.notes}
                          </div>
                        )}
                      </td>

                      {/* Vendor */}
                      <td style={{ padding: "0.9rem 1.25rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                          <span>🏢</span>
                          <span style={{ fontWeight: 500, color: "var(--text-primary)" }}>{vendorName}</span>
                        </div>
                      </td>

                      {/* Destination Facility */}
                      <td style={{ padding: "0.9rem 1.25rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                          <span>{o.destinationFacility?.type === "STORE" ? "🏪" : "🏭"}</span>
                          <span style={{ fontWeight: 500, fontSize: "0.82rem", color: "var(--text-primary)" }}>
                            {o.destinationFacility?.facilityName || "Main Warehouse"}
                          </span>
                        </div>
                        {o.destinationFacility?.facilityCode && (
                          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontFamily: "monospace" }}>
                            {o.destinationFacility.facilityCode}
                          </div>
                        )}
                      </td>

                      {/* Line Items */}
                      <td style={{ padding: "0.9rem 1.25rem" }}>
                        {o.purchaseOrderProducts && o.purchaseOrderProducts.length > 0 ? (
                          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                            <Badge variant="info">
                              📦 {o.purchaseOrderProducts.length} Item{o.purchaseOrderProducts.length !== 1 ? "s" : ""}
                            </Badge>
                            {o.purchaseOrderProducts[0]?.purchaseOrderProduct && (
                              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                ({o.purchaseOrderProducts[0].purchaseOrderProduct.productName})
                              </span>
                            )}
                          </div>
                        ) : (
                          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>0 items</span>
                        )}
                      </td>

                      {/* Status */}
                      <td style={{ padding: "0.9rem 1.25rem" }}>
                        <Badge variant={statusVariant}>{o.status}</Badge>
                      </td>

                      {/* Due Date */}
                      <td style={{ padding: "0.9rem 1.25rem", color: "var(--text-secondary)", fontSize: "0.82rem" }}>
                        {o.dueDate ? new Date(o.dueDate).toLocaleDateString() : "—"}
                      </td>

                      {/* Total */}
                      <td style={{ padding: "0.9rem 1.25rem", fontWeight: 600, color: "var(--accent-emerald)" }}>
                        {formatIDR(o.totalAmount || 0)}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: "0.9rem 1.25rem", textAlign: "right" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                          <Button
                            id={`view-po-btn-${o.id}`}
                            size="sm"
                            variant="ghost"
                            onClick={() => setViewingOrder(o)}
                          >
                            👁️ Details
                          </Button>
                          {canManage && o.status === "PENDING" && (
                            <Button
                              id={`quick-approve-po-${o.id}`}
                              size="sm"
                              variant="secondary"
                              onClick={() => handleQuickApprove(o.id)}
                              title="Quick Approve"
                            >
                              ✓
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              id={`delete-po-${o.id}`}
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(o.id, o.number)}
                              style={{ color: "var(--accent-rose)" }}
                            >
                              🗑️
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

      {/* Add PO Modal */}
      <AddPurchaseOrderModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onOrderCreated={(newPO) => {
          loadOrders();
          setViewingOrder(newPO);
        }}
      />

      {/* View PO Modal */}
      <ViewPurchaseOrderModal
        isOpen={!!viewingOrder}
        onClose={() => setViewingOrder(null)}
        order={viewingOrder}
        canManage={canManage}
        onOrderUpdated={loadOrders}
      />
    </div>
  );
}
