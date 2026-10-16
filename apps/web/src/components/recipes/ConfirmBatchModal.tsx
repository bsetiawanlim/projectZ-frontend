"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { productApi } from "@/lib/api";
import { formatIDR, type ProductionBatchRecord } from "@pz/shared";

interface ConfirmBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  batch: ProductionBatchRecord | null;
  onBatchConfirmed?: (batch: ProductionBatchRecord) => void;
}

export function ConfirmBatchModal({
  isOpen,
  onClose,
  batch,
  onBatchConfirmed,
}: ConfirmBatchModalProps) {
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !batch) return null;

  const picName = batch.personInCharge?.profile
    ? `${batch.personInCharge.profile.firstName || ""} ${batch.personInCharge.profile.lastName || ""}`.trim()
    : `Employee #${batch.personInChargeId || "N/A"}`;

  const handleConfirm = async () => {
    setSubmitting(true);
    setError(null);

    try {
      const res = await productApi.confirmProductionBatch({
        id: batch.id,
        notes: notes.trim() || undefined,
      });

      onBatchConfirmed?.(res.data);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to confirm production completion");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1060,
        padding: "1rem",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <Card
        style={{
          width: "100%",
          maxWidth: "680px",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem",
          padding: "1.75rem",
          backgroundColor: "var(--surface)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.7)",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "1.5rem" }}>✅</span>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-primary)" }}>
                Confirm Production Completion
              </h3>
            </div>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "0.25rem" }}>
              Batch <strong>{batch.batchNumber}</strong> — {batch.product?.productName}
            </p>
          </div>

          <Button size="sm" variant="ghost" onClick={onClose} disabled={submitting}>
            ✕
          </Button>
        </div>

        {error && (
          <div
            style={{
              padding: "0.75rem 1rem",
              borderRadius: "var(--radius-md)",
              backgroundColor: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              color: "var(--accent-rose, #ef4444)",
              fontSize: "0.85rem",
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {/* Batch Details Summary */}
        <div
          style={{
            padding: "1rem 1.25rem",
            borderRadius: "var(--radius-md)",
            backgroundColor: "rgba(16, 185, 129, 0.05)",
            border: "1px solid rgba(16, 185, 129, 0.2)",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "0.85rem",
            fontSize: "0.85rem",
          }}
        >
          <div>
            <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase" }}>Facility</span>
            <div style={{ fontWeight: 700, color: "var(--text-primary)", marginTop: "0.2rem" }}>
              {batch.facility?.facilityName || "N/A"} ({batch.facility?.facilityCode || ""})
            </div>
          </div>

          <div>
            <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase" }}>Person In Charge</span>
            <div style={{ fontWeight: 700, color: "var(--accent-purple, #a855f7)", marginTop: "0.2rem" }}>
              {picName}
            </div>
          </div>

          <div>
            <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase" }}>Quantity Produced</span>
            <div style={{ fontWeight: 700, color: "var(--accent-emerald)", marginTop: "0.2rem", fontSize: "1.05rem" }}>
              +{batch.quantity} {batch.unitLabel || "units"}
            </div>
          </div>

          <div>
            <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase" }}>Material COGS</span>
            <div style={{ fontWeight: 700, color: "var(--accent-amber)", marginTop: "0.2rem" }}>
              {formatIDR(batch.materialCost)}
            </div>
          </div>
        </div>

        {/* Raw materials deduction list */}
        {batch.items && batch.items.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase" }}>
              Ingredients to be deducted from {batch.facility?.facilityName || "Facility"}:
            </span>
            <div style={{ maxHeight: "160px", overflowY: "auto", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                <thead>
                  <tr style={{ backgroundColor: "rgba(255,255,255,0.02)", borderBottom: "1px solid var(--border-subtle)", color: "var(--text-muted)" }}>
                    <th style={{ padding: "0.4rem 0.75rem", textAlign: "left" }}>Ingredient</th>
                    <th style={{ padding: "0.4rem 0.75rem", textAlign: "right" }}>Consumed</th>
                    <th style={{ padding: "0.4rem 0.75rem", textAlign: "right" }}>Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {batch.items.map((it) => (
                    <tr key={it.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                      <td style={{ padding: "0.4rem 0.75rem" }}>
                        {it.ingredient?.productName || `Item #${it.ingredientProductId}`}
                      </td>
                      <td style={{ padding: "0.4rem 0.75rem", textAlign: "right", color: "var(--accent-rose)", fontWeight: 600 }}>
                        -{it.quantityConsumed} {it.unitLabel || ""}
                      </td>
                      <td style={{ padding: "0.4rem 0.75rem", textAlign: "right", color: "var(--text-secondary)" }}>
                        {formatIDR(it.lineCost)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Completion Notes */}
        <div>
          <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700, display: "block", marginBottom: "0.3rem" }}>
            Completion / Quality Check Notes (Optional)
          </label>
          <Input
            id="confirm-batch-notes-input"
            placeholder="e.g. Yield verified, all portions stored in counter chiller, quality approved..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={submitting}
          />
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: "0.75rem",
            borderTop: "1px solid var(--border-subtle)",
            marginTop: "0.5rem",
          }}
        >
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
            Adds {batch.quantity} {batch.unitLabel || "units"} to {batch.facility?.facilityName || "facility"} inventory.
          </span>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <Button variant="secondary" size="md" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button
              id="submit-confirm-batch-btn"
              variant="primary"
              size="md"
              onClick={handleConfirm}
              disabled={submitting}
              style={{
                backgroundColor: "var(--accent-emerald)",
                color: "#000",
                fontWeight: 700,
              }}
            >
              {submitting ? "Confirming & Adding to Inventory..." : "Confirm & Add to Inventory"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
