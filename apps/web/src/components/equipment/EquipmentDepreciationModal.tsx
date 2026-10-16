"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import {
  formatIDR,
  calculateEquipmentDepreciation,
  type EquipmentEntityRecord,
  type DepreciationCalculationResult,
} from "@pz/shared";
import { equipmentApi } from "@/lib/api";

interface EquipmentDepreciationModalProps {
  isOpen: boolean;
  onClose: () => void;
  equipment: EquipmentEntityRecord | null;
  onEquipmentUpdated?: (equipment: EquipmentEntityRecord) => void;
}

export function EquipmentDepreciationModal({
  isOpen,
  onClose,
  equipment,
  onEquipmentUpdated,
}: EquipmentDepreciationModalProps) {
  const [method, setMethod] = useState<"STRAIGHT_LINE" | "DOUBLE_DECLINING">("STRAIGHT_LINE");
  const [usefulLifeYears, setUsefulLifeYears] = useState<number>(5);
  const [salvageValue, setSalvageValue] = useState<number>(0);
  const [asOfDate, setAsOfDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize or reset when opened
  useEffect(() => {
    if (isOpen && equipment) {
      setMethod((equipment.depreciationMethod as any) || "STRAIGHT_LINE");
      setUsefulLifeYears(equipment.usefulLifeYears ?? 5);
      setSalvageValue(Number(equipment.salvageValue ?? 0));
      setAsOfDate(new Date().toISOString().slice(0, 10));
      setError(null);
      setSaveSuccess(false);
    }
  }, [isOpen, equipment]);

  const cost = Number(equipment?.unitPrice ?? 0);
  const acqDate = equipment?.acquisitionDate
    ? new Date(equipment.acquisitionDate)
    : equipment?.createdAt
    ? new Date(equipment.createdAt)
    : new Date();

  // Dynamic real-time calculation
  const calculation: DepreciationCalculationResult = useMemo(() => {
    return calculateEquipmentDepreciation(
      cost,
      salvageValue,
      usefulLifeYears,
      method,
      acqDate,
      asOfDate ? new Date(asOfDate) : new Date()
    );
  }, [cost, salvageValue, usefulLifeYears, method, acqDate, asOfDate]);

  if (!isOpen || !equipment) return null;

  const currentYearIndex = Math.min(
    usefulLifeYears,
    Math.max(1, Math.floor(calculation.ageMonths / 12) + 1)
  );

  const handleSavePolicy = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await equipmentApi.updateEquipment({
        id: equipment.id,
        salvageValue,
        usefulLifeYears,
        depreciationMethod: method,
      });
      const updated = (res as any)?.data ?? res;
      if (updated && onEquipmentUpdated) {
        onEquipmentUpdated(updated);
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      console.error("Failed to save depreciation policy", err);
      setError(err?.message || "Failed to update depreciation policy.");
    } finally {
      setSaving(false);
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
        overflowY: "auto",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <Card
        style={{
          width: "100%",
          maxWidth: "880px",
          maxHeight: "92vh",
          overflowY: "auto",
          backgroundColor: "var(--bg-surface)",
          border: "1px solid var(--border-glow)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "0 24px 60px rgba(0,0,0,0.7)",
          padding: "1.75rem",
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "var(--radius-md)",
                backgroundColor: "rgba(245, 158, 11, 0.15)",
                border: "1px solid rgba(245, 158, 11, 0.35)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.6rem",
              }}
            >
              📉
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <h3 style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--text-primary)" }}>
                  {equipment.name}
                </h3>
                <Badge variant={calculation.isFullyDepreciated ? "danger" : "warning"}>
                  {calculation.isFullyDepreciated ? "Fully Depreciated" : "Active Asset"}
                </Badge>
              </div>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                Tag: <strong style={{ color: "var(--text-secondary)" }}>{equipment.code || `Asset #${equipment.id}`}</strong>
                {" • "}
                Acquired on {acqDate.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                {" • "}
                Age: {Math.floor(calculation.ageMonths / 12)}y {calculation.ageMonths % 12}m
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              fontSize: "1.3rem",
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
              fontSize: "0.85rem",
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {saveSuccess && (
          <div
            style={{
              padding: "0.75rem 1rem",
              backgroundColor: "rgba(16, 185, 129, 0.15)",
              border: "1px solid var(--accent-emerald)",
              borderRadius: "var(--radius-md)",
              color: "var(--accent-emerald)",
              fontSize: "0.85rem",
            }}
          >
            ✓ Depreciation policy updated and saved successfully!
          </div>
        )}

        {/* Top KPI Metrics Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "0.85rem",
          }}
        >
          <div
            style={{
              backgroundColor: "var(--bg-surface-elevated)",
              padding: "1rem",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
              Initial Cost (Valuation)
            </span>
            <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--text-primary)", marginTop: "0.25rem" }}>
              {formatIDR(calculation.cost)}
            </div>
            <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>
              Historical capital basis
            </span>
          </div>

          <div
            style={{
              backgroundColor: "rgba(16, 185, 129, 0.08)",
              padding: "1rem",
              borderRadius: "var(--radius-md)",
              border: "1px solid rgba(16, 185, 129, 0.3)",
            }}
          >
            <span style={{ fontSize: "0.72rem", color: "var(--accent-emerald)", textTransform: "uppercase", fontWeight: 600 }}>
              Current Net Book Value
            </span>
            <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--accent-emerald)", marginTop: "0.25rem" }}>
              {formatIDR(calculation.currentBookValue)}
            </div>
            <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>
              Remaining asset equity
            </span>
          </div>

          <div
            style={{
              backgroundColor: "rgba(239, 68, 68, 0.08)",
              padding: "1rem",
              borderRadius: "var(--radius-md)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
            }}
          >
            <span style={{ fontSize: "0.72rem", color: "var(--accent-rose)", textTransform: "uppercase", fontWeight: 600 }}>
              Accumulated Depreciation
            </span>
            <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--accent-rose)", marginTop: "0.25rem" }}>
              {formatIDR(calculation.accumulatedDepreciation)}
            </div>
            <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>
              {calculation.percentDepreciated}% of depreciable base
            </span>
          </div>

          <div
            style={{
              backgroundColor: "var(--bg-surface-elevated)",
              padding: "1rem",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <span style={{ fontSize: "0.72rem", color: "var(--accent-amber)", textTransform: "uppercase", fontWeight: 600 }}>
              Expense Breakdown
            </span>
            <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", marginTop: "0.25rem" }}>
              {formatIDR(calculation.monthlyDepreciation)} <span style={{ fontSize: "0.75rem", fontWeight: 400, color: "var(--text-muted)" }}>/ mo</span>
            </div>
            <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>
              {formatIDR(calculation.annualDepreciation)} / yr
            </span>
          </div>
        </div>

        {/* Progress Bar & Life Remaining */}
        <div
          style={{
            backgroundColor: "var(--bg-surface-elevated)",
            padding: "0.85rem 1.15rem",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-primary)" }}>
              Depreciation Lifecycle Progress
            </span>
            <span style={{ fontSize: "0.8rem", fontWeight: 600, color: calculation.percentDepreciated >= 100 ? "var(--accent-rose)" : "var(--accent-amber)" }}>
              {calculation.percentDepreciated}% Depreciated ({Math.floor(calculation.remainingLifeMonths / 12)}y {calculation.remainingLifeMonths % 12}m life remaining)
            </span>
          </div>
          <div
            style={{
              width: "100%",
              height: "8px",
              backgroundColor: "rgba(255, 255, 255, 0.1)",
              borderRadius: "4px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${Math.min(100, calculation.percentDepreciated)}%`,
                height: "100%",
                background: calculation.percentDepreciated >= 90
                  ? "linear-gradient(90deg, var(--accent-amber), var(--accent-rose))"
                  : "linear-gradient(90deg, var(--accent-emerald), var(--accent-amber))",
                transition: "width 0.3s ease",
              }}
            />
          </div>
        </div>

        {/* Interactive Controls & Policy Tuning */}
        <div
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.02)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            padding: "1rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--accent-amber)" }}>
              ⚙️ Depreciation Parameters & Simulation
            </span>
            <Button
              size="sm"
              variant="secondary"
              onClick={handleSavePolicy}
              isLoading={saving}
              style={{ borderColor: "rgba(245, 158, 11, 0.4)", color: "var(--accent-amber)" }}
            >
              💾 Save Policy to Equipment
            </Button>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "0.75rem",
            }}
          >
            <div>
              <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>
                Method
              </label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as any)}
                style={{
                  width: "100%",
                  padding: "0.5rem 0.75rem",
                  backgroundColor: "var(--bg-surface)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-md)",
                  color: "var(--text-primary)",
                  fontSize: "0.85rem",
                  outline: "none",
                }}
              >
                <option value="STRAIGHT_LINE">Straight-Line (Equal annual expense)</option>
                <option value="DOUBLE_DECLINING">Double Declining Balance (Accelerated)</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>
                Useful Life (Years)
              </label>
              <Input
                type="number"
                min="1"
                max="50"
                value={usefulLifeYears || ""}
                onChange={(e) => setUsefulLifeYears(Number(e.target.value))}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>
                Salvage Value (IDR)
              </label>
              <Input
                type="number"
                min="0"
                step="1000"
                value={salvageValue || ""}
                onChange={(e) => setSalvageValue(Number(e.target.value))}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>
                As-Of Simulation Date
              </label>
              <input
                type="date"
                value={asOfDate}
                onChange={(e) => setAsOfDate(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.45rem 0.75rem",
                  backgroundColor: "var(--bg-surface)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-md)",
                  color: "var(--text-primary)",
                  fontSize: "0.85rem",
                  outline: "none",
                }}
              />
            </div>
          </div>
        </div>

        {/* Amortization Schedule Table */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <h4 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)" }}>
              📅 Year-by-Year Amortization Schedule
            </h4>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              Salvage Floor: <strong>{formatIDR(salvageValue)}</strong>
            </span>
          </div>

          <div
            style={{
              overflowX: "auto",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "0.85rem",
                textAlign: "left",
              }}
            >
              <thead>
                <tr style={{ backgroundColor: "var(--bg-surface-elevated)", borderBottom: "1px solid var(--border-subtle)" }}>
                  <th style={{ padding: "0.75rem 1rem", fontWeight: 600, color: "var(--text-muted)" }}>Period</th>
                  <th style={{ padding: "0.75rem 1rem", fontWeight: 600, color: "var(--text-muted)" }}>Beginning Book Value</th>
                  <th style={{ padding: "0.75rem 1rem", fontWeight: 600, color: "var(--accent-rose)" }}>Annual Depreciation</th>
                  <th style={{ padding: "0.75rem 1rem", fontWeight: 600, color: "var(--text-muted)" }}>Accumulated Dep.</th>
                  <th style={{ padding: "0.75rem 1rem", fontWeight: 600, color: "var(--accent-emerald)" }}>Ending Book Value</th>
                  <th style={{ padding: "0.75rem 1rem", fontWeight: 600, color: "var(--text-muted)", textAlign: "center" }}>% Depreciated</th>
                </tr>
              </thead>
              <tbody>
                {calculation.schedule.map((row) => {
                  const isCurrentRow = row.year === currentYearIndex;
                  return (
                    <tr
                      key={row.year}
                      style={{
                        borderBottom: "1px solid var(--border-subtle)",
                        backgroundColor: isCurrentRow
                          ? "rgba(245, 158, 11, 0.08)"
                          : "transparent",
                      }}
                    >
                      <td style={{ padding: "0.75rem 1rem", fontWeight: 600 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                          <span>Year {row.year}</span>
                          {isCurrentRow && (
                            <Badge variant="warning">
                              Current
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: "0.75rem 1rem", color: "var(--text-secondary)" }}>
                        {formatIDR(row.beginningBookValue)}
                      </td>
                      <td style={{ padding: "0.75rem 1rem", color: "var(--accent-rose)", fontWeight: 600 }}>
                        - {formatIDR(row.depreciationExpense)}
                      </td>
                      <td style={{ padding: "0.75rem 1rem", color: "var(--text-muted)" }}>
                        {formatIDR(row.accumulatedDepreciation)}
                      </td>
                      <td style={{ padding: "0.75rem 1rem", color: "var(--accent-emerald)", fontWeight: 600 }}>
                        {formatIDR(row.endingBookValue)}
                      </td>
                      <td style={{ padding: "0.75rem 1rem", textAlign: "center" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "0.2rem 0.5rem",
                            borderRadius: "var(--radius-sm)",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            backgroundColor: row.percentDepreciated >= 100
                              ? "rgba(239, 68, 68, 0.15)"
                              : "rgba(255, 255, 255, 0.05)",
                            color: row.percentDepreciated >= 100
                              ? "var(--accent-rose)"
                              : "var(--text-primary)",
                          }}
                        >
                          {row.percentDepreciated}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Footer */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.5rem" }}>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </Card>
    </div>
  );
}
