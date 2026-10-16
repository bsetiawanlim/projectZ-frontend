"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatIDR, getCustomerGroupName } from "@pz/shared";
import type { EquipmentEntityRecord } from "@pz/shared";


interface ViewEquipmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  equipment: EquipmentEntityRecord | null;
  onOpenDepreciation?: (equipment: EquipmentEntityRecord) => void;
}

export function ViewEquipmentModal({ isOpen, onClose, equipment, onOpenDepreciation }: ViewEquipmentModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !equipment) return null;

  const handleCopyCode = () => {
    if (equipment.code) {
      navigator.clipboard.writeText(equipment.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const depreciation = equipment.depreciation;
  const unitPrice = Number(equipment.unitPrice) || 0;
  const salvageValue = Number(equipment.salvageValue ?? 0);
  const usefulLifeYears = equipment.usefulLifeYears ?? 5;
  const currentNBV = depreciation?.currentBookValue ?? Math.max(salvageValue, unitPrice);
  const accumulatedDep = depreciation?.accumulatedDepreciation ?? 0;

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
    >
      <Card
        style={{
          width: "100%",
          maxWidth: "580px",
          maxHeight: "90vh",
          overflowY: "auto",
          backgroundColor: "var(--bg-surface)",
          border: "1px solid var(--border-glow)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
          padding: "1.75rem",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "var(--radius-md)",
                backgroundColor: "rgba(245, 158, 11, 0.15)",
                border: "1px solid rgba(245, 158, 11, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.5rem",
              }}
            >
              🚜
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <h3 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-primary)" }}>
                  {equipment.name}
                </h3>
                <Badge variant="warning">Asset #{equipment.id}</Badge>
              </div>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
                {equipment.brand?.name || "Standard Equipment"} {equipment.model?.name ? `• ${equipment.model.name}` : ""}
              </p>
            </div>
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

        {/* Specifications Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "1rem",
            backgroundColor: "var(--bg-surface-elevated)",
            padding: "1.25rem",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border-subtle)",
            marginBottom: "1.25rem",
          }}
        >
          <div>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
              Asset Code
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginTop: "0.2rem" }}>
              <span style={{ fontFamily: "monospace", fontWeight: 600, color: "var(--text-primary)" }}>
                {equipment.code || "NOT ASSIGNED"}
              </span>
              {equipment.code && (
                <button
                  type="button"
                  onClick={handleCopyCode}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "0.8rem",
                    color: copied ? "var(--accent-emerald)" : "var(--text-muted)",
                  }}
                  title="Copy Code"
                >
                  {copied ? "✓" : "📋"}
                </button>
              )}
            </div>
          </div>

          <div>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
              Acquisition Cost
            </span>
            <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--accent-emerald)", marginTop: "0.2rem" }}>
              {formatIDR(equipment.unitPrice)}
            </div>
          </div>

          <div>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
              Manufacturer Brand
            </span>
            <div style={{ fontWeight: 600, color: "var(--text-primary)", marginTop: "0.2rem" }}>
              {equipment.brand?.name || "—"}
            </div>
          </div>

          <div>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
              Model & Series
            </span>
            <div style={{ fontWeight: 600, color: "var(--text-primary)", marginTop: "0.2rem" }}>
              {equipment.model?.name || "—"}
            </div>
          </div>
        </div>

        {/* Depreciation Metrics Card */}
        <div
          style={{
            backgroundColor: "rgba(245, 158, 11, 0.05)",
            border: "1px solid rgba(245, 158, 11, 0.2)",
            borderRadius: "var(--radius-md)",
            padding: "1rem",
            marginBottom: "1.25rem",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--accent-amber)" }}>
              📉 Depreciation & Book Value
            </span>
            <Badge variant="warning">
              {equipment.depreciationMethod === "DOUBLE_DECLINING" ? "Double Declining" : "Straight-Line"}
            </Badge>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
            <div>
              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
                Current Net Book Value
              </span>
              <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--accent-emerald)", marginTop: "0.15rem" }}>
                {formatIDR(currentNBV)}
              </div>
            </div>

            <div>
              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
                Accumulated Depreciation
              </span>
              <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--accent-rose)", marginTop: "0.15rem" }}>
                {formatIDR(accumulatedDep)}
              </div>
            </div>

            <div>
              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
                Salvage Value
              </span>
              <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)", marginTop: "0.15rem" }}>
                {formatIDR(salvageValue)}
              </div>
            </div>

            <div>
              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
                Useful Life
              </span>
              <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)", marginTop: "0.15rem" }}>
                {usefulLifeYears} Years {equipment.acquisitionDate ? `(Acquired ${new Date(equipment.acquisitionDate).toLocaleDateString()})` : ""}
              </div>
            </div>
          </div>

          {onOpenDepreciation && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                onClose();
                onOpenDepreciation(equipment);
              }}
              style={{
                width: "100%",
                borderColor: "rgba(245, 158, 11, 0.4)",
                color: "var(--accent-amber)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.4rem",
              }}
            >
              <span>📊 View Full Amortization Schedule</span>
            </Button>
          )}
        </div>

        {/* Description / Notes */}
        <div style={{ marginBottom: "1.25rem" }}>
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", display: "block", marginBottom: "0.35rem" }}>
            Operational Notes & Specs
          </span>
          <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: 1.5, backgroundColor: "var(--bg-primary)", padding: "0.85rem 1rem", borderRadius: "var(--radius-md)" }}>
            {equipment.description || "No specific technical instructions or maintenance notes recorded."}
          </p>
        </div>

        {/* Price Rates (if loaded with prices) */}
        {equipment.prices && equipment.prices.length > 0 && (
          <div style={{ marginBottom: "1.5rem" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", display: "block", marginBottom: "0.35rem" }}>
              Active Sale / Lease Price Points
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {equipment.prices.map((p) => (
                <div
                  key={p.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    backgroundColor: "var(--bg-primary)",
                    padding: "0.6rem 0.85rem",
                    borderRadius: "var(--radius-md)",
                    fontSize: "0.85rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <Badge variant={p.priceType === "SALE" ? "success" : "info"}>
                      {p.priceType.replace("_", " ")}
                    </Badge>
                    {p.customerGroup ? (
                      <Badge variant="warning">{getCustomerGroupName(p.customerGroup)}</Badge>
                    ) : (
                      <Badge variant="default">All Customers</Badge>
                    )}
                    <span style={{ color: "var(--text-secondary)", fontSize: "0.75rem" }}>
                      from {new Date(p.startDate).toLocaleDateString()}
                    </span>
                  </div>
                  <strong style={{ color: "var(--accent-emerald)" }}>{formatIDR(p.amount)}</strong>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </Card>
    </div>
  );
}
