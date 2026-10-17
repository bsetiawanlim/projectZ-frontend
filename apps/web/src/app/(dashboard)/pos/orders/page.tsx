"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { SortableTh } from "@/components/ui/SortableTh";
import { posApi, facilityApi, type FacilityRecord, type FacilityTableRecord } from "@/lib/api";
import { useDevice } from "@/lib/useDevice";
import { formatIDR, type SalesOrderRecord, type SalesOrderStatus } from "@pz/shared";

interface TableDropdownOption {
  tableNumber: string;
  barcode: string;
  label?: string | null;
  facilityId?: number;
  facilityName?: string;
}

export default function PosOrdersPage() {
  const device = useDevice();
  const [orders, setOrders] = useState<SalesOrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<SalesOrderStatus | "ALL">("ALL");
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>("ALL");
  const [selectedTable, setSelectedTable] = useState<string>("ALL");
  const [facilities, setFacilities] = useState<FacilityRecord[]>([]);
  const [availableTables, setAvailableTables] = useState<FacilityTableRecord[]>([]);
  const [tablesLoading, setTablesLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<SalesOrderRecord | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  type PosOrderSortField = "orderNumber" | "date" | "outlet" | "table" | "customer" | "total" | "status";
  const [sortField, setSortField] = useState<PosOrderSortField>("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const handleSort = (field: PosOrderSortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  // Load facilities on mount
  useEffect(() => {
    facilityApi
      .listFacilities({ limit: 100 })
      .then((res) => {
        const list = res?.items || (res as any)?.data || [];
        setFacilities(list);
      })
      .catch(() => setFacilities([]));
  }, []);

  // Fetch registered facility tables based on selected outlet
  useEffect(() => {
    let isMounted = true;
    setTablesLoading(true);

    const fetchTables = async () => {
      try {
        if (selectedFacilityId !== "ALL") {
          const res = await facilityApi.getTablesByFacility(Number(selectedFacilityId));
          const list = (res as any)?.data ?? (res as any)?.items ?? (Array.isArray(res) ? res : []);
          if (isMounted) setAvailableTables(list);
        } else if (facilities.length > 0) {
          const allRes = await Promise.all(
            facilities.map((f) =>
              facilityApi.getTablesByFacility(f.id).catch(() => ({ data: [] }))
            )
          );
          const combined: FacilityTableRecord[] = [];
          allRes.forEach((res, idx) => {
            const list = (res as any)?.data ?? (res as any)?.items ?? (Array.isArray(res) ? res : []);
            list.forEach((tbl: FacilityTableRecord) => {
              combined.push({ ...tbl, facility: facilities[idx] });
            });
          });
          if (isMounted) setAvailableTables(combined);
        } else {
          if (isMounted) setAvailableTables([]);
        }
      } catch (err) {
        console.error("Failed to load tables for filter", err);
        if (isMounted) setAvailableTables([]);
      } finally {
        if (isMounted) setTablesLoading(false);
      }
    };

    fetchTables();

    return () => {
      isMounted = false;
    };
  }, [selectedFacilityId, facilities]);

  // Aggregate table barcode dropdown options from facility tables and active order records
  const tableOptions = useMemo<TableDropdownOption[]>(() => {
    const map = new Map<string, TableDropdownOption>();

    availableTables.forEach((t) => {
      const key = t.tableNumber.trim();
      const facName = t.facility?.facilityName || facilities.find((f) => f.id === t.facilityId)?.facilityName;
      map.set(key, {
        tableNumber: t.tableNumber,
        barcode: t.qrCode || `TBL-${t.facilityId}-${t.tableNumber}`,
        label: t.label,
        facilityId: t.facilityId,
        facilityName: facName,
      });
    });

    // Also include any table numbers from orders not already in map
    orders.forEach((o) => {
      if (o.tableNumber && o.tableNumber.trim()) {
        const key = o.tableNumber.trim();
        if (!map.has(key)) {
          map.set(key, {
            tableNumber: key,
            barcode: `TBL-${key}`,
            label: "Order Table",
            facilityName: o.facility?.facilityName,
          });
        }
      }
    });

    return Array.from(map.values()).sort((a, b) =>
      a.tableNumber.localeCompare(b.tableNumber, undefined, { numeric: true })
    );
  }, [availableTables, orders, facilities]);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await posApi.listSalesOrders({
        status: selectedStatus === "ALL" ? undefined : selectedStatus,
        facilityId: selectedFacilityId !== "ALL" ? Number(selectedFacilityId) : undefined,
        tableNumber: selectedTable !== "ALL" ? selectedTable : undefined,
        limit: 50,
      });
      const items = Array.isArray(res?.items) ? res.items : Array.isArray((res as any)?.data) ? (res as any).data : [];
      setOrders(items);
    } catch (err) {
      console.error("Failed to load orders", err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [selectedStatus, selectedFacilityId, selectedTable]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const sortedOrders = useMemo(() => {
    if (!Array.isArray(orders)) return [];
    return [...orders].sort((a, b) => {
      let cmp = 0;
      if (sortField === "orderNumber") {
        cmp = (a.orderNumber || "").localeCompare(b.orderNumber || "");
      } else if (sortField === "date") {
        const dateA = new Date(a.orderDate || a.createdAt || 0).getTime();
        const dateB = new Date(b.orderDate || b.createdAt || 0).getTime();
        cmp = dateA - dateB;
      } else if (sortField === "outlet") {
        const outA = a.facility?.facilityName || "";
        const outB = b.facility?.facilityName || "";
        cmp = outA.localeCompare(outB);
      } else if (sortField === "table") {
        const tabA = a.tableNumber || "";
        const tabB = b.tableNumber || "";
        cmp = tabA.localeCompare(tabB);
      } else if (sortField === "customer") {
        const custA = (a as any).customer?.profile ? `${(a as any).customer.profile.firstName} ${(a as any).customer.profile.lastName || ""}` : (a.customerId ? `Customer #${a.customerId}` : "Walk-in");
        const custB = (b as any).customer?.profile ? `${(b as any).customer.profile.firstName} ${(b as any).customer.profile.lastName || ""}` : (b.customerId ? `Customer #${b.customerId}` : "Walk-in");
        cmp = custA.localeCompare(custB);
      } else if (sortField === "total") {
        cmp = (Number(a.grandTotal) || 0) - (Number(b.grandTotal) || 0);
      } else if (sortField === "status") {
        cmp = (a.status || "").localeCompare(b.status || "");
      }
      return sortOrder === "asc" ? cmp : -cmp;
    });
  }, [orders, sortField, sortOrder]);

  const handleVoidOrder = async (orderId: number) => {
    if (!confirm("Are you sure you want to void this draft order?")) return;
    setActionLoading(true);
    try {
      await posApi.voidSalesOrder(orderId, "Voided by operator");
      setActionMessage("Order successfully voided");
      loadOrders();
      setSelectedOrder(null);
    } catch (err: any) {
      alert(err?.message || "Failed to void order");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRefundOrder = async (orderId: number) => {
    const reason = prompt("Enter reason for refunding this order (restores product inventory):");
    if (!reason) return;
    setActionLoading(true);
    try {
      await posApi.refundSalesOrder(orderId, reason);
      setActionMessage("Order refunded and inventory returned to stock!");
      loadOrders();
      setSelectedOrder(null);
    } catch (err: any) {
      alert(err?.message || "Failed to refund order");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Header & Filter Controls */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h2 style={{ fontSize: device.isSmallScreen ? "1.15rem" : "1.3rem", fontWeight: 700 }}>Sales Orders & Transaction History</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
            Audit POS orders, inspect line items, process voids and inventory refunds
          </p>
        </div>

        {/* Filter Bar */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
          {/* Outlet Selector */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Outlet:</span>
            <select
              id="filter-order-facility-select"
              value={selectedFacilityId}
              onChange={(e) => {
                setSelectedFacilityId(e.target.value);
                setSelectedTable("ALL"); // Reset table filter on outlet switch
              }}
              style={{
                height: "32px",
                fontSize: "0.8rem",
                padding: "0 0.5rem",
                borderRadius: "var(--radius-sm)",
                backgroundColor: "var(--bg-surface-elevated)",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-primary)",
                outline: "none",
                cursor: "pointer",
              }}
            >
              <option value="ALL">All Outlets</option>
              {facilities.map((fac) => (
                <option key={fac.id} value={fac.id}>
                  {fac.type === "STORE" ? "🏪" : "🏭"} {fac.facilityName}
                </option>
              ))}
            </select>
          </div>

          {/* Table Barcode Dropdown Filter */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
              Table Barcode:
            </span>
            <select
              id="filter-order-table-select"
              value={selectedTable}
              onChange={(e) => setSelectedTable(e.target.value)}
              style={{
                height: "32px",
                fontSize: "0.8rem",
                padding: "0 0.5rem",
                borderRadius: "var(--radius-sm)",
                backgroundColor: "var(--bg-surface-elevated)",
                border: selectedTable !== "ALL" ? "1px solid var(--border-glow)" : "1px solid var(--border-subtle)",
                color: selectedTable !== "ALL" ? "var(--primary)" : "var(--text-primary)",
                outline: "none",
                cursor: "pointer",
                maxWidth: "240px",
              }}
            >
              <option value="ALL">
                {tablesLoading ? "⏳ Loading Tables..." : "All Tables / Barcodes"}
              </option>
              {tableOptions.map((tbl) => (
                <option key={`${tbl.facilityId || 0}-${tbl.tableNumber}`} value={tbl.tableNumber}>
                  🪑 Table {tbl.tableNumber} [{tbl.barcode}]{tbl.label ? ` — ${tbl.label}` : ""}{tbl.facilityName ? ` (${tbl.facilityName})` : ""}
                </option>
              ))}
            </select>
            {selectedTable !== "ALL" && (
              <button
                onClick={() => setSelectedTable("ALL")}
                title="Reset table filter"
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-muted)",
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  padding: "0.15rem 0.35rem",
                }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Filter Status Pills */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Status:</span>
            <select
              id="filter-order-status-select"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              style={{
                height: "32px",
                fontSize: "0.8rem",
                padding: "0 0.5rem",
                borderRadius: "var(--radius-sm)",
                backgroundColor: "var(--bg-surface-elevated)",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-primary)",
                outline: "none",
                cursor: "pointer",
              }}
            >
              <option value="ALL">All Statuses</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="DRAFT">DRAFT / PENDING</option>
              <option value="VOID">VOID</option>
              <option value="REFUNDED">REFUNDED</option>
            </select>
          </div>

          {/* Refresh Action */}
          <Button size="sm" variant="secondary" onClick={loadOrders} isLoading={loading}>
            🔄 Refresh
          </Button>
        </div>
      </div>

      {actionMessage && (
        <div
          style={{
            padding: "0.75rem 1rem",
            backgroundColor: "rgba(16, 185, 129, 0.15)",
            border: "1px solid rgba(16, 185, 129, 0.3)",
            borderRadius: "var(--radius-md)",
            color: "var(--accent-emerald)",
            fontSize: "0.85rem",
          }}
        >
          {actionMessage}
        </div>
      )}

      {/* Orders Table Container */}
      <Card style={{ overflow: "hidden", padding: 0 }}>
        {loading ? (
          <p style={{ color: "var(--text-muted)", padding: "2rem", textAlign: "center" }}>Loading sales orders...</p>
        ) : !Array.isArray(orders) || orders.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-secondary)" }}>
            <p>
              No orders found for status &quot;{selectedStatus}&quot;
              {selectedTable !== "ALL" ? ` and Table "${selectedTable}"` : ""}.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: "auto", width: "100%" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", minWidth: "750px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-subtle)", color: "var(--text-muted)", fontSize: "0.8rem", userSelect: "none" }}>
                  <th
                    style={{ padding: "0.85rem 1rem", cursor: "pointer" }}
                    onClick={() => handleSort("orderNumber")}
                    title="Sort by Order Number"
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                      ORDER NUMBER {sortField === "orderNumber" ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}
                    </span>
                  </th>
                  <th
                    style={{ cursor: "pointer" }}
                    onClick={() => handleSort("date")}
                    title="Sort by Date"
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                      DATE {sortField === "date" ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}
                    </span>
                  </th>
                  <th
                    style={{ cursor: "pointer" }}
                    onClick={() => handleSort("outlet")}
                    title="Sort by Outlet"
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                      STORE OUTLET {sortField === "outlet" ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}
                    </span>
                  </th>
                  <th
                    style={{ cursor: "pointer" }}
                    onClick={() => handleSort("table")}
                    title="Sort by Table Barcode"
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                      TABLE / BARCODE {sortField === "table" ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}
                    </span>
                  </th>
                  <th
                    style={{ cursor: "pointer" }}
                    onClick={() => handleSort("customer")}
                    title="Sort by Customer"
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                      CUSTOMER {sortField === "customer" ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}
                    </span>
                  </th>
                  <th
                    style={{ cursor: "pointer" }}
                    onClick={() => handleSort("total")}
                    title="Sort by Grand Total"
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                      GRAND TOTAL {sortField === "total" ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}
                    </span>
                  </th>
                  <th
                    style={{ cursor: "pointer" }}
                    onClick={() => handleSort("status")}
                    title="Sort by Status"
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                      STATUS {sortField === "status" ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}
                    </span>
                  </th>
                  <th style={{ textAlign: "right", paddingRight: "1rem" }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {sortedOrders.map((o) => {
                  const matchedTable = tableOptions.find((t) => t.tableNumber === o.tableNumber);
                  return (
                    <tr
                      key={o.id}
                      style={{
                        borderBottom: "1px solid var(--border-subtle)",
                        fontSize: "0.88rem",
                        cursor: "pointer",
                      }}
                      onClick={() => setSelectedOrder(o)}
                    >
                      <td style={{ padding: "0.85rem 1rem", fontWeight: 700, color: "var(--primary)" }}>
                        {o.orderNumber}
                      </td>
                      <td style={{ color: "var(--text-secondary)" }}>
                        {new Date(o.orderDate || o.createdAt || Date.now()).toLocaleDateString("id-ID")}
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                          <span>{o.facility?.type === "STORE" ? "🏪" : "🏭"}</span>
                          <span style={{ fontWeight: 500, fontSize: "0.82rem" }}>
                            {o.facility?.facilityName || "Main Outlet"}
                          </span>
                        </div>
                      </td>
                      <td>
                        {o.tableNumber ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.25rem",
                                padding: "0.15rem 0.5rem",
                                backgroundColor: "rgba(99, 102, 241, 0.12)",
                                color: "var(--primary)",
                                borderRadius: "var(--radius-sm)",
                                fontSize: "0.78rem",
                                fontWeight: 700,
                                width: "fit-content",
                              }}
                            >
                              🪑 Table {o.tableNumber}
                            </span>
                            {matchedTable?.barcode && (
                              <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                                📱 {matchedTable.barcode}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>—</span>
                        )}
                      </td>
                      <td style={{ color: "var(--text-primary)" }}>
                        {(o as any).customer?.profile
                          ? `${(o as any).customer.profile.firstName} ${(o as any).customer.profile.lastName || ""}`
                          : o.customerId
                          ? `Customer #${o.customerId}`
                          : "Walk-in"}
                      </td>
                      <td style={{ fontWeight: 700, color: "var(--accent-emerald)" }}>
                        {formatIDR(o.grandTotal)}
                      </td>
                      <td>
                        <Badge
                          variant={
                            o.status === "COMPLETED"
                              ? "success"
                              : o.status === "REFUNDED"
                              ? "warning"
                              : o.status === "VOID"
                              ? "danger"
                              : "default"
                          }
                        >
                          {o.status}
                        </Badge>
                      </td>
                      <td style={{ textAlign: "right", paddingRight: "1rem" }}>
                        <Button size="sm" variant="secondary" onClick={() => setSelectedOrder(o)}>
                          View Details
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 70,
            padding: "1rem",
          }}
        >
          <div style={{ width: "100%", maxWidth: "600px" }}>
            <Card glass style={{ padding: "1.75rem", backgroundColor: "var(--bg-surface)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                <div>
                  <h3 style={{ fontSize: "1.2rem", fontWeight: 700 }}>{selectedOrder.orderNumber}</h3>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    Placed on {new Date(selectedOrder.orderDate || Date.now()).toLocaleString("id-ID")}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  style={{ color: "var(--text-muted)", cursor: "pointer", fontSize: "1.2rem", background: "none", border: "none" }}
                >
                  ✕
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "0.75rem", marginBottom: "1rem" }}>
                <div>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>STATUS</span>
                  <div style={{ marginTop: "0.2rem" }}>
                    <Badge variant={selectedOrder.status === "COMPLETED" ? "success" : "default"}>
                      {selectedOrder.status}
                    </Badge>
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>TABLE / BARCODE</span>
                  <div style={{ fontWeight: 600, fontSize: "0.85rem", marginTop: "0.2rem" }}>
                    {selectedOrder.tableNumber ? `🪑 Table ${selectedOrder.tableNumber}` : "—"}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>OUTLET</span>
                  <div style={{ fontWeight: 600, fontSize: "0.85rem", marginTop: "0.2rem" }}>
                    {selectedOrder.facility?.facilityName || "Main Outlet"}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>CUSTOMER</span>
                  <div style={{ fontWeight: 600, fontSize: "0.85rem", marginTop: "0.2rem" }}>
                    {selectedOrder.customerId ? `Customer #${selectedOrder.customerId}` : "Walk-in"}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>TOTAL AMOUNT</span>
                  <div style={{ fontWeight: 700, color: "var(--accent-emerald)", fontSize: "0.95rem", marginTop: "0.2rem" }}>
                    {formatIDR(selectedOrder.grandTotal)}
                  </div>
                </div>
              </div>

              {/* Items List */}
              <div style={{ maxHeight: "200px", overflowY: "auto", marginBottom: "1.25rem", borderTop: "1px solid var(--border-subtle)", paddingTop: "0.75rem" }}>
                <h4 style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>ORDER ITEMS</h4>
                {selectedOrder.items && selectedOrder.items.length > 0 ? (
                  selectedOrder.items.map((it, idx) => (
                    <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "0.4rem" }}>
                      <span>{it.quantity}x {it.productName}</span>
                      <span style={{ fontWeight: 600 }}>{formatIDR(it.totalPrice)}</span>
                    </div>
                  ))
                ) : (
                  <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>No item details fetched</p>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", gap: "0.75rem" }}>
                {selectedOrder.status === "DRAFT" && (
                  <Button
                    variant="danger"
                    size="md"
                    isLoading={actionLoading}
                    onClick={() => handleVoidOrder(selectedOrder.id)}
                    style={{ flex: 1 }}
                  >
                    Void Order
                  </Button>
                )}

                {selectedOrder.status === "COMPLETED" && (
                  <Button
                    variant="danger"
                    size="md"
                    isLoading={actionLoading}
                    onClick={() => handleRefundOrder(selectedOrder.id)}
                    style={{ flex: 1 }}
                  >
                    Refund & Restore Stock ↺
                  </Button>
                )}

                <Button variant="secondary" size="md" onClick={() => setSelectedOrder(null)} style={{ flex: 1 }}>
                  Close
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}