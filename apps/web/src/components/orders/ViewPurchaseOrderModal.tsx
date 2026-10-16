"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatIDR } from "@pz/shared";
import { orderApi } from "@/lib/api";
import type { PurchaseOrderRecord, OrderStatus } from "@pz/shared";

interface ViewPurchaseOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: PurchaseOrderRecord | null;
  canManage?: boolean;
  onOrderUpdated?: () => void;
}

export function ViewPurchaseOrderModal({
  isOpen,
  onClose,
  order,
  canManage = false,
  onOrderUpdated,
}: ViewPurchaseOrderModalProps) {
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !order) return null;

  const vendorObj = order.purchaseOrderVendor;
  const vendorProfile = vendorObj?.profile || vendorObj?.vendorProfile;
  const vendorName = vendorProfile
    ? `${vendorProfile.firstName} ${vendorProfile.lastName || ""}`.trim()
    : `Vendor #${order.vendorId}`;

  const statusVariant =
    order.status === "APPROVED"
      ? "success"
      : order.status === "PENDING"
      ? "warning"
      : order.status === "REJECTED"
      ? "danger"
      : "default";

  const handleStatusChange = async (newStatus: OrderStatus) => {
    setUpdating(true);
    setError(null);
    try {
      await orderApi.updatePurchaseOrder({
        id: order.id,
        status: newStatus,
      });
      if (onOrderUpdated) onOrderUpdated();
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to update order status.");
    } finally {
      setUpdating(false);
    }
  };

  const products = order.purchaseOrderProducts || [];
  const totalAmountNum = Number(order.totalAmount || 0);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.78)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "1rem",
        overflowY: "auto",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !updating) onClose();
      }}
    >
      <Card
        style={{
          width: "100%",
          maxWidth: "760px",
          maxHeight: "92vh",
          overflowY: "auto",
          backgroundColor: "var(--bg-surface)",
          border: "1px solid var(--border-glow)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "0 24px 48px -12px rgba(0,0,0,0.65)",
          padding: "1.75rem",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <h3 style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--text-primary)" }}>
                {order.title}
              </h3>
              <Badge variant={statusVariant}>{order.status}</Badge>
            </div>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
              PO Reference: <strong style={{ color: "var(--text-secondary)", fontFamily: "monospace" }}>{order.number}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={updating}
            style={{
              background: "transparent",
              border: "none",
              fontSize: "1.25rem",
              color: "var(--text-muted)",
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: "0.75rem 1rem",
              backgroundColor: "rgba(239, 68, 68, 0.15)",
              border: "1px solid var(--accent-rose)",
              borderRadius: "var(--radius-md)",
              color: "var(--accent-rose)",
              fontSize: "0.875rem",
              marginBottom: "1rem",
            }}
          >
            {error}
          </div>
        )}

        {/* Details Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.2fr 1fr",
            gap: "1rem",
            backgroundColor: "var(--bg-surface-elevated)",
            padding: "1.25rem",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border-subtle)",
            marginBottom: "1.25rem",
          }}
        >
          <div>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Vendor Supplier
            </span>
            <div style={{ fontWeight: 600, color: "var(--text-primary)", marginTop: "0.25rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <span>🏢</span>
              <span>{vendorName}</span>
              {vendorProfile?.isCompany && <Badge variant="warning">Company</Badge>}
            </div>
            <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
              {vendorProfile?.phoneNumber ? `📞 ${vendorProfile.phoneNumber}` : "No phone listed"}
              {vendorProfile?.address ? ` • 📍 ${vendorProfile.address}` : ""}
            </div>
          </div>

          <div>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Total Order Value
            </span>
            <div style={{ fontSize: "1.35rem", fontWeight: 700, color: "var(--accent-emerald)", marginTop: "0.2rem" }}>
              {formatIDR(totalAmountNum)}
            </div>
            <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
              {products.length} line item{products.length === 1 ? "" : "s"}
            </div>
          </div>

          <div>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Date Issued
            </span>
            <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
              {order.date ? new Date(order.date).toLocaleDateString() : "—"}
            </div>
          </div>

          <div>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Expected Delivery Date
            </span>
            <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--accent-cyan)", marginTop: "0.2rem" }}>
              {order.dueDate ? new Date(order.dueDate).toLocaleDateString() : "—"}
            </div>
          </div>

          <div style={{ gridColumn: "span 2", borderTop: "1px dashed var(--border-subtle)", paddingTop: "0.6rem" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Destination Location / Facility
            </span>
            <div style={{ fontWeight: 600, color: "var(--accent-emerald)", marginTop: "0.2rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <span>{order.destinationFacility?.type === "STORE" ? "🏪" : "🏭"}</span>
              <span>{order.destinationFacility ? `${order.destinationFacility.facilityName} (${order.destinationFacility.facilityCode})` : "General / Central Warehouse"}</span>
            </div>
          </div>
        </div>

        {/* ── Product Line Items Table ── */}
        <div style={{ marginBottom: "1.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              📦 Order Line Items ({products.length})
            </span>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              Procured products & quantities
            </span>
          </div>

          {products.length === 0 ? (
            <div
              style={{
                padding: "1.25rem",
                borderRadius: "var(--radius-md)",
                backgroundColor: "var(--bg-primary)",
                border: "1px dashed var(--border-subtle)",
                textAlign: "center",
                color: "var(--text-muted)",
                fontSize: "0.85rem",
              }}
            >
              No specific product line items attached to this purchase order.
            </div>
          ) : (
            <div
              style={{
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-md)",
                overflow: "hidden",
                backgroundColor: "var(--bg-primary)",
              }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.85rem" }}>
                <thead>
                  <tr
                    style={{
                      borderBottom: "1px solid var(--border-subtle)",
                      backgroundColor: "var(--bg-surface-elevated)",
                      color: "var(--text-muted)",
                      fontSize: "0.75rem",
                      textTransform: "uppercase",
                    }}
                  >
                    <th style={{ padding: "0.65rem 0.85rem" }}>#</th>
                    <th style={{ padding: "0.65rem 0.85rem" }}>Product Name / SKU</th>
                    <th style={{ padding: "0.65rem 0.85rem", textAlign: "right" }}>Quantity</th>
                    <th style={{ padding: "0.65rem 0.85rem", textAlign: "right" }}>Unit Price</th>
                    <th style={{ padding: "0.65rem 0.85rem", textAlign: "right" }}>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((item, idx) => {
                    const prodName = item.purchaseOrderProduct?.productName || `Product #${item.productId}`;
                    const sku = item.purchaseOrderProduct?.sku;
                    const unitName = item.unit?.symbol || item.unit?.name || item.purchaseOrderProduct?.unitLabel || "pcs";
                    const qty = Number(item.quantity) || 0;
                    const price = Number(item.price ?? item.unitPrice ?? 0);
                    const subtotal = qty * price;

                    return (
                      <tr
                        key={item.id || idx}
                        style={{
                          borderBottom: idx < products.length - 1 ? "1px solid var(--border-subtle)" : "none",
                        }}
                      >
                        <td style={{ padding: "0.65rem 0.85rem", color: "var(--text-muted)" }}>
                          {idx + 1}
                        </td>
                        <td style={{ padding: "0.65rem 0.85rem" }}>
                          <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{prodName}</div>
                          {sku && (
                            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "monospace" }}>
                              SKU: {sku}
                            </span>
                          )}
                          {item.notes && (
                            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontStyle: "italic", marginTop: "0.15rem" }}>
                              {item.notes}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: "0.65rem 0.85rem", textAlign: "right", color: "var(--text-primary)" }}>
                          {qty} <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{unitName}</span>
                        </td>
                        <td style={{ padding: "0.65rem 0.85rem", textAlign: "right", color: "var(--text-secondary)" }}>
                          {formatIDR(price)}
                        </td>
                        <td style={{ padding: "0.65rem 0.85rem", textAlign: "right", fontWeight: 600, color: "var(--accent-emerald)" }}>
                          {formatIDR(subtotal)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: "1px solid var(--border-subtle)", backgroundColor: "var(--bg-surface-elevated)" }}>
                    <td colSpan={4} style={{ padding: "0.65rem 0.85rem", textAlign: "right", fontWeight: 700, color: "var(--text-secondary)" }}>
                      Grand Total:
                    </td>
                    <td style={{ padding: "0.65rem 0.85rem", textAlign: "right", fontWeight: 700, fontSize: "0.95rem", color: "var(--accent-emerald)" }}>
                      {formatIDR(totalAmountNum)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* Notes */}
        {order.notes && (
          <div style={{ marginBottom: "1.25rem" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", display: "block", marginBottom: "0.25rem" }}>
              Procurement Terms / Notes
            </span>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", backgroundColor: "var(--bg-primary)", padding: "0.75rem 1rem", borderRadius: "var(--radius-md)" }}>
              {order.notes}
            </p>
          </div>
        )}

        {/* Footer Actions */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem", marginTop: "1rem" }}>
          {canManage && order.status !== "APPROVED" ? (
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <Button
                id="approve-po-modal-btn"
                size="sm"
                variant="primary"
                isLoading={updating}
                onClick={() => handleStatusChange("APPROVED")}
              >
                ✅ Approve Order
              </Button>
              {order.status !== "REJECTED" && (
                <Button
                  id="reject-po-modal-btn"
                  size="sm"
                  variant="danger"
                  isLoading={updating}
                  onClick={() => handleStatusChange("REJECTED")}
                >
                  ✕ Reject
                </Button>
              )}
            </div>
          ) : (
            <div />
          )}

          <Button variant="secondary" onClick={onClose} disabled={updating}>
            Close
          </Button>
        </div>
      </Card>
    </div>
  );
}
