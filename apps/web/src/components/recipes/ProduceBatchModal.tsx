"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { productApi, facilityApi, employeeApi } from "@/lib/api";
import {
  formatIDR,
  type ProductItem,
  type ProductionBatchPreviewResult,
  type ProductionBatchRecord,
  type FacilityRecord,
  type EmployeeRecord,
} from "@pz/shared";

interface ProduceBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: ProductItem | null;
  onBatchCreated?: (batch: ProductionBatchRecord) => void;
}

export function ProduceBatchModal({
  isOpen,
  onClose,
  product,
  onBatchCreated,
}: ProduceBatchModalProps) {
  const [quantity, setQuantity] = useState<number>(10);
  const [facilityId, setFacilityId] = useState<number | null>(null);
  const [personInChargeId, setPersonInChargeId] = useState<number | null>(null);
  const [notes, setNotes] = useState<string>("");
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ProductionBatchPreviewResult | null>(null);

  const [facilities, setFacilities] = useState<FacilityRecord[]>([]);
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);

  // 1. Load Facilities and Employees with resilient fallback parsing
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setLoadingMeta(true);
    setError(null);

    Promise.all([
      facilityApi.getFacilities({ limit: 100 }).catch((err) => {
        console.warn("Could not load facilities:", err);
        return { items: [] as FacilityRecord[] };
      }),
      employeeApi.listEmployees({ limit: 100 }).catch((err) => {
        console.warn("Could not load employees:", err);
        return { items: [] as EmployeeRecord[] };
      }),
    ])
      .then(([facRes, empRes]: [any, any]) => {
        if (!isMounted) return;

        // Extract facilities reliably
        const facList: FacilityRecord[] = Array.isArray(facRes?.items)
          ? facRes.items
          : Array.isArray(facRes?.data)
          ? facRes.data
          : Array.isArray(facRes)
          ? facRes
          : [];

        // Extract employees reliably
        const empList: EmployeeRecord[] = Array.isArray(empRes?.items)
          ? empRes.items
          : Array.isArray(empRes?.data)
          ? empRes.data
          : Array.isArray(empRes)
          ? empRes
          : [];

        setFacilities(facList);
        setEmployees(empList);

        // Pre-select first facility if not set
        setFacilityId((prev) => {
          if (prev && facList.some((f) => f.id === prev)) return prev;
          return facList[0]?.id ?? null;
        });
      })
      .finally(() => {
        if (isMounted) setLoadingMeta(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // 2. Filter employees: Only employees who have a linked app user account can be assigned
  const eligibleEmployees = useMemo(() => {
    const withUser = employees.filter((e) => {
      const users = (e as any).profile?.userProfile;
      return Array.isArray(users) && users.length > 0;
    });
    if (!facilityId) return withUser;
    const matched = withUser.filter((e) => !e.facilityId || e.facilityId === facilityId);
    return matched.length > 0 ? matched : withUser;
  }, [employees, facilityId]);

  // Sync personInChargeId when eligibleEmployees or facility changes
  useEffect(() => {
    if (eligibleEmployees.length > 0) {
      setPersonInChargeId((prev) => {
        if (prev && eligibleEmployees.some((e) => e.id === prev)) return prev;
        return eligibleEmployees[0]?.id ?? null;
      });
    } else {
      setPersonInChargeId(null);
    }
  }, [eligibleEmployees]);

  // 3. Reset fields on opening for new product
  useEffect(() => {
    if (isOpen && product) {
      setQuantity(10);
      setNotes("");
      setError(null);
    }
  }, [isOpen, product]);

  // 4. Load preview whenever quantity, product, or facility changes
  useEffect(() => {
    if (!isOpen || !product || !quantity || quantity <= 0) {
      setPreview(null);
      return;
    }

    let isCancelled = false;
    setLoadingPreview(true);
    setError(null);

    const timer = setTimeout(() => {
      productApi
        .previewProductionBatch({
          productId: product.id,
          quantity,
          facilityId: facilityId || undefined,
        })
        .then((res: any) => {
          if (!isCancelled) {
            const data = res?.data || res;
            setPreview(data);
          }
        })
        .catch((err: any) => {
          if (!isCancelled) {
            setError(err?.message || "Failed to load batch preview");
            setPreview(null);
          }
        })
        .finally(() => {
          if (!isCancelled) setLoadingPreview(false);
        });
    }, 250);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [isOpen, product, quantity, facilityId]);

  // 5. Submit handler: Schedule production work order
  const handlePlanBatch = async () => {
    if (!product || !quantity || quantity <= 0) return;
    if (!facilityId) {
      setError("Please select the target production facility.");
      return;
    }
    if (!personInChargeId) {
      setError("Please assign a person in charge (chef / employee) for this production.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await productApi.createProductionBatch({
        productId: product.id,
        quantity,
        facilityId,
        personInChargeId,
        notes: notes.trim() || undefined,
      });

      const batch = (res as any)?.data || res;
      onBatchCreated?.(batch);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to schedule production work order");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !product) return null;

  const quickMultipliers = [1, 5, 10, 20, 50, 100];
  const canSubmit = Boolean(
    preview &&
    preview.canProduce &&
    facilityId &&
    personInChargeId &&
    !submitting &&
    !loadingPreview &&
    !loadingMeta
  );

  const selectedFacilityObj = facilities.find((f) => f.id === facilityId);
  const selectedEmployeeObj = eligibleEmployees.find((e) => e.id === personInChargeId);

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
        zIndex: 1050,
        padding: "1rem",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <Card
        style={{
          width: "100%",
          maxWidth: "880px",
          maxHeight: "92vh",
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
              <span style={{ fontSize: "1.5rem" }}>📋</span>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-primary)" }}>
                Schedule Production Work Order: {product.productName}
              </h3>
              <Badge variant="warning">PLANNED WORK ORDER</Badge>
            </div>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "0.25rem" }}>
              The manager sets the production facility and assigns the person in charge. Once production is completed,
              the person in charge confirms completion to deduct raw ingredients and deposit finished items into facility inventory.
            </p>
          </div>

          <Button size="sm" variant="ghost" onClick={onClose} disabled={submitting} style={{ fontSize: "1.2rem", padding: "0.2rem 0.5rem" }}>
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

        {/* Facility & Person In Charge Assignment (Manager Control) */}
        <div
          style={{
            padding: "1.1rem 1.25rem",
            borderRadius: "var(--radius-md)",
            backgroundColor: "rgba(99, 102, 241, 0.05)",
            border: "1px solid rgba(99, 102, 241, 0.25)",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "1.25rem",
          }}
        >
          {/* Facility Selection */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
              <label style={{ fontSize: "0.75rem", color: "var(--accent-purple, #a855f7)", textTransform: "uppercase", fontWeight: 700 }}>
                🏢 1. Production Facility (Location) *
              </label>
              {loadingMeta && <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Loading facilities...</span>}
            </div>
            <select
              id="batch-facility-select"
              value={facilityId || ""}
              onChange={(e) => setFacilityId(Number(e.target.value) || null)}
              disabled={submitting || loadingMeta}
              style={{
                width: "100%",
                padding: "0.6rem 0.85rem",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-subtle)",
                backgroundColor: "var(--surface)",
                color: "var(--text-primary)",
                fontSize: "0.9rem",
                fontWeight: 600,
                outline: "none",
              }}
            >
              {facilities.length === 0 && <option value="">No facilities found</option>}
              {facilities.map((fac) => (
                <option key={fac.id} value={fac.id}>
                  {fac.facilityName} ({fac.facilityCode})
                </option>
              ))}
            </select>
            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.25rem", display: "block" }}>
              Raw ingredients will be checked and consumed from this facility inventory.
            </span>
          </div>

          {/* Person In Charge (PIC) Selection */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
              <label style={{ fontSize: "0.75rem", color: "var(--accent-purple, #a855f7)", textTransform: "uppercase", fontWeight: 700 }}>
                👤 2. Person In Charge (Chef / Supervisor) *
              </label>
              {loadingMeta && <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Loading staff...</span>}
            </div>
            <select
              id="batch-pic-select"
              value={personInChargeId || ""}
              onChange={(e) => setPersonInChargeId(Number(e.target.value) || null)}
              disabled={submitting || loadingMeta || eligibleEmployees.length === 0}
              style={{
                width: "100%",
                padding: "0.6rem 0.85rem",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-subtle)",
                backgroundColor: "var(--surface)",
                color: "var(--text-primary)",
                fontSize: "0.9rem",
                fontWeight: 600,
                outline: "none",
              }}
            >
              {eligibleEmployees.length === 0 && <option value="">No employees with an app user account found</option>}
              {eligibleEmployees.map((emp) => {
                const name = emp.profile
                  ? `${emp.profile.firstName || ""} ${emp.profile.lastName || ""}`.trim()
                  : `Employee #${emp.id}`;
                const pos = emp.position?.name ? ` • ${emp.position.name}` : "";
                const userEmail = (emp as any).profile?.userProfile?.[0]?.email ? ` (@${(emp as any).profile.userProfile[0].email})` : "";
                return (
                  <option key={emp.id} value={emp.id}>
                    {name}{pos}{userEmail}
                  </option>
                );
              })}
            </select>
            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.25rem", display: "block" }}>
              Only employees with an app user account can be assigned so they can log in to confirm completion.
            </span>
          </div>
        </div>

        {/* Batch Target Input & Quick Multipliers */}
        <div
          style={{
            padding: "1rem 1.25rem",
            borderRadius: "var(--radius-md)",
            backgroundColor: "var(--bg-surface-elevated, rgba(255,255,255,0.02))",
            border: "1px solid var(--border-subtle)",
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
            <div>
              <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>
                Batch Production Output Target ({product.unitLabel || "units"})
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.25rem" }}>
                <Input
                  id="batch-quantity-input"
                  type="number"
                  min="1"
                  step="1"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  style={{ width: "140px", fontSize: "1.1rem", fontWeight: 700 }}
                  disabled={submitting}
                />
                <span style={{ fontSize: "0.95rem", color: "var(--text-secondary)", fontWeight: 600 }}>
                  {product.unitLabel || "units"}
                </span>
              </div>
            </div>

            {/* Quick Multiplier Buttons */}
            <div>
              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", display: "block", marginBottom: "0.25rem" }}>
                Quick Batch Presets:
              </span>
              <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                {quickMultipliers.map((mult) => (
                  <Button
                    key={mult}
                    size="sm"
                    variant={quantity === mult ? "primary" : "secondary"}
                    onClick={() => setQuantity(mult)}
                    disabled={submitting}
                    style={{ fontSize: "0.8rem", padding: "0.25rem 0.6rem" }}
                  >
                    {mult} {product.unitLabel || "unit"}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Cost & Stock Readiness Summary Cards */}
        {preview && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "0.75rem",
            }}
          >
            <div
              style={{
                padding: "0.75rem 1rem",
                borderRadius: "var(--radius-md)",
                backgroundColor: "rgba(6, 182, 212, 0.08)",
                border: "1px solid rgba(6, 182, 212, 0.25)",
              }}
            >
              <span style={{ fontSize: "0.72rem", color: "var(--accent-cyan)", textTransform: "uppercase" }}>
                Materials COGS
              </span>
              <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--accent-cyan)", marginTop: "0.15rem" }}>
                {formatIDR(preview.costBreakdown.materialCost)}
              </div>
              <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                {formatIDR(quantity > 0 ? preview.costBreakdown.materialCost / quantity : 0)} / unit
              </span>
            </div>

            <div
              style={{
                padding: "0.75rem 1rem",
                borderRadius: "var(--radius-md)",
                backgroundColor: "rgba(99, 102, 241, 0.08)",
                border: "1px solid rgba(99, 102, 241, 0.25)",
              }}
            >
              <span style={{ fontSize: "0.72rem", color: "var(--accent-purple, #a855f7)", textTransform: "uppercase" }}>
                Estimated Labor & Mach.
              </span>
              <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--accent-purple, #a855f7)", marginTop: "0.15rem" }}>
                {formatIDR(preview.costBreakdown.laborCost + preview.costBreakdown.equipmentCost)}
              </div>
              <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Allocated overhead</span>
            </div>

            <div
              style={{
                padding: "0.75rem 1rem",
                borderRadius: "var(--radius-md)",
                backgroundColor: "rgba(245, 158, 11, 0.08)",
                border: "1px solid rgba(245, 158, 11, 0.25)",
              }}
            >
              <span style={{ fontSize: "0.72rem", color: "var(--accent-amber)", textTransform: "uppercase" }}>
                Total Batch COGS
              </span>
              <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--accent-amber)", marginTop: "0.15rem" }}>
                {formatIDR(preview.costBreakdown.totalCost)}
              </div>
              <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                {formatIDR(preview.costBreakdown.unitCost)} / unit
              </span>
            </div>

            <div
              style={{
                padding: "0.75rem 1rem",
                borderRadius: "var(--radius-md)",
                backgroundColor: preview.canProduce ? "rgba(16, 185, 129, 0.08)" : "rgba(239, 68, 68, 0.08)",
                border: "1px solid " + (preview.canProduce ? "rgba(16, 185, 129, 0.25)" : "rgba(239, 68, 68, 0.25)"),
              }}
            >
              <span style={{ fontSize: "0.72rem", color: preview.canProduce ? "var(--accent-emerald)" : "var(--accent-rose)", textTransform: "uppercase" }}>
                Facility Stock Readiness
              </span>
              <div style={{ fontSize: "1.2rem", fontWeight: 700, color: preview.canProduce ? "var(--accent-emerald)" : "var(--accent-rose)", marginTop: "0.15rem" }}>
                {preview.canProduce ? "✓ Ready to Produce" : "⚠️ Stock Shortage"}
              </div>
              <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                {preview.canProduce ? "All ingredients present at facility" : "Insufficient ingredients at facility"}
              </span>
            </div>
          </div>
        )}

        {/* Required Raw Materials Ledger Table */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h4 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)" }}>
              Ingredients to be Consumed from {selectedFacilityObj?.facilityName || "Facility"} ({preview?.items?.length || 0})
            </h4>
            {loadingPreview && <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Verifying recipe & stock...</span>}
          </div>

          {preview && preview.items.length > 0 ? (
            <div style={{ overflowX: "auto", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.85rem" }}>
                <thead>
                  <tr style={{ backgroundColor: "rgba(255, 255, 255, 0.02)", borderBottom: "1px solid var(--border-subtle)", color: "var(--text-muted)", fontSize: "0.75rem" }}>
                    <th style={{ padding: "0.6rem 0.85rem" }}>INGREDIENT</th>
                    <th style={{ padding: "0.6rem 0.85rem" }}>PER UNIT</th>
                    <th style={{ padding: "0.6rem 0.85rem" }}>TOTAL REQUIRED</th>
                    <th style={{ padding: "0.6rem 0.85rem" }}>FACILITY STOCK</th>
                    <th style={{ padding: "0.6rem 0.85rem" }}>TOTAL COGS</th>
                    <th style={{ padding: "0.6rem 0.85rem", textAlign: "right" }}>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.items.map((item) => (
                    <tr key={item.ingredientProductId} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                      <td style={{ padding: "0.65rem 0.85rem" }}>
                        <strong style={{ color: "var(--text-primary)" }}>{item.productName}</strong>
                        {item.sku && (
                          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "monospace" }}>
                            {item.sku}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "0.65rem 0.85rem", color: "var(--text-secondary)" }}>
                        {item.qtyPerUnit} {item.unitLabel || ""}
                      </td>
                      <td style={{ padding: "0.65rem 0.85rem", fontWeight: 700, color: "var(--accent-cyan)" }}>
                        {item.qtyNeeded} {item.unitLabel || ""}
                      </td>
                      <td style={{ padding: "0.65rem 0.85rem" }}>
                        {item.currentStock} {item.unitLabel || ""}
                      </td>
                      <td style={{ padding: "0.65rem 0.85rem", fontWeight: 600, color: "var(--accent-amber)" }}>
                        {formatIDR(item.lineCost)}
                      </td>
                      <td style={{ padding: "0.65rem 0.85rem", textAlign: "right" }}>
                        <Badge variant={item.hasEnoughStock ? "success" : "danger"}>
                          {item.hasEnoughStock ? "Available" : `Short ${item.shortage} ${item.unitLabel || ""}`}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>No recipe ingredients found.</p>
          )}
        </div>

        {/* Optional Notes */}
        <div>
          <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700, display: "block", marginBottom: "0.3rem" }}>
            Production Batch Notes / Kitchen Shift Instructions
          </label>
          <Input
            id="batch-notes-input"
            placeholder="e.g. Special order prep, morning bake shift, store opening..."
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
          <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              Schedules order as <strong>PLANNED</strong>.
            </span>
            {selectedEmployeeObj && selectedFacilityObj && (
              <span style={{ fontSize: "0.72rem", color: "var(--accent-purple, #a855f7)", fontWeight: 600 }}>
                Assigned to: {selectedEmployeeObj.profile?.firstName} {selectedEmployeeObj.profile?.lastName} @ {selectedFacilityObj.facilityName}
              </span>
            )}
          </div>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <Button variant="secondary" size="md" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button
              id="confirm-produce-batch-btn"
              variant="primary"
              size="md"
              onClick={handlePlanBatch}
              disabled={!canSubmit}
              style={{
                backgroundColor: canSubmit ? "var(--accent-emerald)" : undefined,
                color: canSubmit ? "#000" : undefined,
                fontWeight: 700,
              }}
            >
              {submitting ? "Scheduling Order..." : `Schedule Production (${quantity} ${product.unitLabel || "Units"})`}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
