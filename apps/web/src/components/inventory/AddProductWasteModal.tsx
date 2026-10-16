"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { productApi } from "@/lib/api";
import { formatIDR } from "@pz/shared";
import type {
  ProductItem,
  FacilityRecord,
  WasteReason,
} from "@pz/shared";

interface AddProductWasteModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: ProductItem[];
  facilities: FacilityRecord[];
  initialProduct?: ProductItem | null;
  initialFacilityId?: string;
  onWasteCreated: () => void;
}

const REASON_OPTIONS: Array<{ value: WasteReason; label: string; desc: string; icon: string }> = [
  { value: "EXPIRED", label: "Expired", desc: "Past shelf-life / best-before date", icon: "⌛" },
  { value: "SPOILED", label: "Spoiled / Degraded", desc: "Rotten, sour, thawed, or stale food/drink", icon: "🥀" },
  { value: "LOST", label: "Lost / Missing", desc: "Missing during count, unaccounted shrinkage", icon: "🔍" },
  { value: "DAMAGED", label: "Damaged / Broken", desc: "Dropped, cracked packaging, contaminated", icon: "💥" },
  { value: "SCRAP", label: "Preparation Scrap", desc: "Trimmings, burnt/failed batch, kitchen waste", icon: "🗑️" },
  { value: "OTHER", label: "Other Disposal", desc: "Miscellaneous disposal reason", icon: "📋" },
];

export function AddProductWasteModal({
  isOpen,
  onClose,
  products,
  facilities,
  initialProduct,
  initialFacilityId,
  onWasteCreated,
}: AddProductWasteModalProps) {
  const [selectedProductId, setSelectedProductId] = useState<number>(
    initialProduct?.id || (products[0]?.id ?? 0)
  );
  const [facilityId, setFacilityId] = useState<number | undefined>(
    initialFacilityId && initialFacilityId !== "ALL" ? Number(initialFacilityId) : undefined
  );
  const [sectionId, setSectionId] = useState<number | undefined>(undefined);
  const [reason, setReason] = useState<WasteReason>("EXPIRED");
  const [quantity, setQuantity] = useState<number>(1);
  const [unitCost, setUnitCost] = useState<number | "">("");
  const [notes, setNotes] = useState("");
  const [wasteDate, setWasteDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentProduct = products.find((p) => p.id === selectedProductId) || initialProduct || products[0];

  const currentFacility = facilities.find((f) => f.id === facilityId);
  const facilitySections = currentFacility?.sections || [];

  // Calculate current stock in selected facility or global
  let currentStock = currentProduct?.currentStock ?? 0;
  if (facilityId && currentProduct?.storageStocks) {
    const matchingStorage = currentProduct.storageStocks.filter(
      (s: any) => s.facilityId === facilityId && (!sectionId || s.sectionId === sectionId)
    );
    currentStock = matchingStorage.reduce((sum: number, s: any) => sum + Number(s.stock), 0);
  }

  // Fallback estimated cost
  const defaultCost = Number(
    currentProduct?.vendorProducts?.[0]?.vendorPrice ??
    currentProduct?.retailPrice ??
    0
  );
  const effectiveUnitCost = unitCost === "" ? defaultCost : Number(unitCost);
  const estimatedTotalLoss = effectiveUnitCost * (quantity || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProduct) {
      setError("Please select a product.");
      return;
    }
    if (!quantity || quantity <= 0) {
      setError("Quantity must be greater than 0.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await productApi.createWaste({
        productId: currentProduct.id,
        facilityId: facilityId || null,
        sectionId: sectionId || null,
        quantity: Number(quantity),
        reason,
        unitCost: effectiveUnitCost > 0 ? effectiveUnitCost : undefined,
        notes: notes.trim() || undefined,
        wasteDate: wasteDate ? new Date(wasteDate).toISOString() : undefined,
      });

      onWasteCreated();
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to record product write-off.");
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
        zIndex: 9999,
        padding: "1rem",
      }}
    >
      <Card
        style={{
          width: "100%",
          maxWidth: "580px",
          maxHeight: "90vh",
          overflowY: "auto",
          backgroundColor: "var(--bg-surface)",
          border: "1px solid rgba(239, 68, 68, 0.35)",
          borderRadius: "var(--radius-lg)",
          padding: "1.75rem",
          boxShadow: "0 20px 40px rgba(0,0,0,0.6)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "1.3rem" }}>🗑️</span>
              <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--text-primary)" }}>
                Record Lost / Spoiled / Expired
              </h3>
            </div>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
              Write off damaged, missing, or expired stock and track financial loss.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
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

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
          {/* Target Product */}
          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.4rem" }}>
              Product To Write Off *
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(Number(e.target.value))}
              required
              style={{
                width: "100%",
                padding: "0.6rem 0.85rem",
                backgroundColor: "var(--bg-surface-elevated)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-md)",
                color: "var(--text-primary)",
                fontSize: "0.9rem",
                outline: "none",
              }}
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.productName} ({p.sku || `#${p.id}`}) — Stock: {p.currentStock ?? 0} {p.unitLabel || "units"}
                </option>
              ))}
            </select>
            {currentProduct && (
              <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.3rem" }}>
                Current Stock Balance:{" "}
                <strong style={{ color: currentStock <= 0 ? "var(--accent-rose)" : "var(--accent-cyan)" }}>
                  {currentStock} {currentProduct.unitLabel || "units"}
                </strong>
              </div>
            )}
          </div>

          {/* Reason Selector */}
          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.4rem" }}>
              Disposal Reason *
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
              {REASON_OPTIONS.map((opt) => {
                const isSelected = reason === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setReason(opt.value)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      padding: "0.55rem 0.75rem",
                      borderRadius: "var(--radius-md)",
                      border: isSelected ? "1.5px solid var(--accent-rose)" : "1px solid var(--border-subtle)",
                      backgroundColor: isSelected ? "rgba(239, 68, 68, 0.12)" : "var(--bg-surface-elevated)",
                      color: isSelected ? "var(--accent-rose)" : "var(--text-primary)",
                      textAlign: "left",
                      cursor: "pointer",
                      transition: "all var(--transition-fast)",
                    }}
                  >
                    <span style={{ fontSize: "1.1rem" }}>{opt.icon}</span>
                    <div>
                      <div style={{ fontSize: "0.85rem", fontWeight: 600 }}>{opt.label}</div>
                      <div style={{ fontSize: "0.7rem", opacity: 0.75 }}>{opt.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Facility & Section Location */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.4rem" }}>
                Source Facility
              </label>
              <select
                value={facilityId ?? ""}
                onChange={(e) => {
                  const val = e.target.value ? Number(e.target.value) : undefined;
                  setFacilityId(val);
                  setSectionId(undefined);
                }}
                style={{
                  width: "100%",
                  padding: "0.6rem 0.85rem",
                  backgroundColor: "var(--bg-surface-elevated)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-md)",
                  color: "var(--text-primary)",
                  fontSize: "0.85rem",
                  outline: "none",
                }}
              >
                <option value="">(Global / Unspecified)</option>
                {facilities.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.facilityName} ({f.type})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.4rem" }}>
                Section (Optional)
              </label>
              <select
                disabled={!facilityId || facilitySections.length === 0}
                value={sectionId ?? ""}
                onChange={(e) => setSectionId(e.target.value ? Number(e.target.value) : undefined)}
                style={{
                  width: "100%",
                  padding: "0.6rem 0.85rem",
                  backgroundColor: "var(--bg-surface-elevated)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-md)",
                  color: "var(--text-primary)",
                  fontSize: "0.85rem",
                  outline: "none",
                }}
              >
                <option value="">(Entire facility)</option>
                {facilitySections.map((sec) => (
                  <option key={sec.id} value={sec.id}>
                    {sec.sectionName} ({sec.sectionCode})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quantity & Unit Cost */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.4rem" }}>
                Quantity Lost / Expired * ({currentProduct?.unitLabel || "units"})
              </label>
              <Input
                id="waste-quantity-input"
                type="number"
                min="0.01"
                step="any"
                required
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.4rem" }}>
                Unit Cost (IDR)
              </label>
              <Input
                id="waste-unit-cost-input"
                type="number"
                min="0"
                step="any"
                placeholder={defaultCost > 0 ? String(defaultCost) : "0"}
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value === "" ? "" : Number(e.target.value))}
              />
            </div>
          </div>

          {/* Loss Summary Box */}
          <div
            style={{
              padding: "0.75rem 1rem",
              backgroundColor: "rgba(239, 68, 68, 0.08)",
              border: "1px dashed rgba(239, 68, 68, 0.3)",
              borderRadius: "var(--radius-md)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Estimated Value Written Off</div>
              <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                {quantity || 0} {currentProduct?.unitLabel || "units"} × {formatIDR(effectiveUnitCost)}
              </div>
            </div>
            <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--accent-rose)" }}>
              {formatIDR(estimatedTotalLoss)}
            </div>
          </div>

          {/* Disposal Date & Notes */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.4rem" }}>
                Incident / Disposal Date
              </label>
              <Input
                id="waste-date-input"
                type="date"
                value={wasteDate}
                onChange={(e) => setWasteDate(e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.4rem" }}>
                Notes / Explanation
              </label>
              <Input
                id="waste-notes-input"
                placeholder="e.g. Milk bottle curdled, dropped tray"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.5rem" }}>
            <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button
              id="submit-waste-btn"
              type="submit"
              variant="danger"
              isLoading={submitting}
              style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
            >
              <span>🗑️</span>
              <span>Confirm Write-Off</span>
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
