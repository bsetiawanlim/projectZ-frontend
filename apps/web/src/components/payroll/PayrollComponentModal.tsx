"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { payrollApi } from "@/lib/api";
import type { PayrollComponentRecord, PayrollStructureType, PayrollCalculationType } from "@pz/shared";

interface ComponentModalProps {
  isOpen: boolean;
  onClose: () => void;
  component?: PayrollComponentRecord | null;
  onSuccess: () => void;
}

export function PayrollComponentModal({ isOpen, onClose, component, onSuccess }: ComponentModalProps) {
  const isEdit = Boolean(component?.id);
  const [name, setName] = useState(component?.name || "");
  const [type, setType] = useState<PayrollStructureType>(component?.type || "allowance");
  const [calculationType, setCalculationType] = useState<PayrollCalculationType>(component?.calculationType || "fixedAmount");
  const [defaultAmount, setDefaultAmount] = useState<number>(Number(component?.defaultAmount || 0));
  const [isTaxable, setIsTaxable] = useState(component?.isTaxable ?? true);
  const [description, setDescription] = useState(component?.description || "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (component) {
      setName(component.name);
      setType(component.type);
      setCalculationType(component.calculationType);
      setDefaultAmount(Number(component.defaultAmount || 0));
      setIsTaxable(component.isTaxable ?? true);
      setDescription(component.description || "");
    } else {
      setName("");
      setType("allowance");
      setCalculationType("fixedAmount");
      setDefaultAmount(0);
      setIsTaxable(true);
      setDescription("");
    }
  }, [component, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      setError("Component Name is required.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payloadDescription = description.trim() ? description.trim() : null;
      if (isEdit && component?.id) {
        await payrollApi.updateComponent({
          id: component.id,
          name: name.trim(),
          type,
          calculationType,
          defaultAmount: Number(defaultAmount) || 0,
          isTaxable,
          description: payloadDescription,
        });
      } else {
        await payrollApi.createComponent({
          name: name.trim(),
          type,
          calculationType,
          defaultAmount: Number(defaultAmount) || 0,
          isTaxable,
          description: payloadDescription,
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to save payroll component.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "1rem",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "500px",
          borderRadius: "var(--radius-lg)",
          backgroundColor: "var(--bg-surface)",
          border: "1px solid var(--border-glow)",
          boxShadow: "var(--shadow-xl)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: "1.25rem 1.5rem",
            borderBottom: "1px solid var(--border-subtle)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            backgroundColor: "var(--bg-surface-elevated)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "1.25rem" }}>🏷️</span>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
              {isEdit ? "Edit Salary Component" : "Create Salary Component"}
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-muted)",
              fontSize: "1.2rem",
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          {error && (
            <div
              style={{
                padding: "0.75rem",
                borderRadius: "var(--radius-md)",
                backgroundColor: "rgba(239, 68, 68, 0.15)",
                color: "var(--accent-red)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                fontSize: "0.85rem",
              }}
            >
              ⚠️ {error}
            </div>
          )}

          <div>
            <label style={{ display: "block", fontSize: "0.825rem", fontWeight: 600, marginBottom: "0.35rem", color: "var(--text-secondary)" }}>
              Component Name <span style={{ color: "var(--accent-red)" }}>*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Transport Allowance, Health BPJS, Overtime"
              style={{
                width: "100%",
                padding: "0.55rem 0.75rem",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-subtle)",
                backgroundColor: "var(--bg-primary)",
                color: "var(--text-primary)",
                fontSize: "0.9rem",
              }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.825rem", fontWeight: 600, marginBottom: "0.35rem", color: "var(--text-secondary)" }}>
                Component Type <span style={{ color: "var(--accent-red)" }}>*</span>
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as PayrollStructureType)}
                style={{
                  width: "100%",
                  padding: "0.55rem 0.75rem",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-subtle)",
                  backgroundColor: "var(--bg-primary)",
                  color: "var(--text-primary)",
                  fontSize: "0.9rem",
                }}
              >
                <option value="basic">Basic Salary</option>
                <option value="allowance">Allowance (Tunjangan)</option>
                <option value="deduction">Deduction (Potongan)</option>
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.825rem", fontWeight: 600, marginBottom: "0.35rem", color: "var(--text-secondary)" }}>
                Calculation Type <span style={{ color: "var(--accent-red)" }}>*</span>
              </label>
              <select
                value={calculationType}
                onChange={(e) => setCalculationType(e.target.value as PayrollCalculationType)}
                style={{
                  width: "100%",
                  padding: "0.55rem 0.75rem",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-subtle)",
                  backgroundColor: "var(--bg-primary)",
                  color: "var(--text-primary)",
                  fontSize: "0.9rem",
                }}
              >
                <option value="fixedAmount">Fixed Amount (IDR)</option>
                <option value="percentage">Percentage (%) of Basic</option>
                <option value="perDay">📅 Per Day (Kehadiran / Absensi per Hari)</option>
                <option value="perHour">⏱️ Per Hour (Kehadiran / Jam Kerja)</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.825rem", fontWeight: 600, marginBottom: "0.35rem", color: "var(--text-secondary)" }}>
              Default Rate ({calculationType === "percentage" ? "%" : calculationType === "perDay" ? "IDR / Day" : calculationType === "perHour" ? "IDR / Hour" : "IDR"})
            </label>
            <input
              type="number"
              min="0"
              step={calculationType === "percentage" ? "0.1" : "1000"}
              value={defaultAmount}
              onChange={(e) => setDefaultAmount(Math.max(0, Number(e.target.value)))}
              placeholder="e.g. 500000 or 5"
              style={{
                width: "100%",
                padding: "0.55rem 0.75rem",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-subtle)",
                backgroundColor: "var(--bg-primary)",
                color: "var(--text-primary)",
                fontSize: "0.9rem",
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.6rem",
                cursor: "pointer",
                fontSize: "0.85rem",
                color: "var(--text-primary)",
              }}
            >
              <input
                type="checkbox"
                checked={isTaxable}
                onChange={(e) => setIsTaxable(e.target.checked)}
                style={{ width: "16px", height: "16px", cursor: "pointer", accentColor: "var(--primary)" }}
              />
              <span>Subject to income tax withholding (PPh 21 taxable)</span>
            </label>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.825rem", fontWeight: 600, marginBottom: "0.35rem", color: "var(--text-secondary)" }}>
              Description / Notes (Optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Monthly transport and meal support"
              style={{
                width: "100%",
                padding: "0.55rem 0.75rem",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-subtle)",
                backgroundColor: "var(--bg-primary)",
                color: "var(--text-primary)",
                fontSize: "0.85rem",
              }}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.5rem" }}>
            <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              style={{
                backgroundColor: "var(--primary)",
                color: "#000",
                fontWeight: 700,
              }}
            >
              {submitting ? "Saving..." : isEdit ? "Update Component" : "Create Component"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
