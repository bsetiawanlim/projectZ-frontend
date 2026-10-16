"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { employeeApi } from "@/lib/api";
import type { EmployeeRecord } from "@pz/shared";

interface DeactivateEmployeeModalProps {
  isOpen: boolean;
  employee: EmployeeRecord | null;
  onClose: () => void;
  onEmployeeDeactivated: () => void;
}

const PRESET_REASONS = [
  "Resignation / Voluntary departure",
  "End of employment contract",
  "Relocation / Personal circumstances",
  "Career change / Higher education",
  "Involuntary termination / Policy violation",
  "Retirement",
];

export function DeactivateEmployeeModal({
  isOpen,
  employee,
  onClose,
  onEmployeeDeactivated,
}: DeactivateEmployeeModalProps) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !loading) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, loading]);

  useEffect(() => {
    if (isOpen) {
      setReason("");
      setError(null);
    }
  }, [isOpen, employee]);

  if (!isOpen || !employee) return null;

  const displayName = employee.profile
    ? `${employee.profile.firstName} ${employee.profile.lastName || ""}`.trim()
    : `Employee #${employee.id}`;

  const positionName =
    employee.position?.name || employee.position?.positionName || "Staff Member";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reason.trim() || reason.trim().length < 3) {
      setError("Please provide a reason for departure / deactivation (minimum 3 characters).");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await employeeApi.deleteEmployee(employee.id, reason.trim());
      onEmployeeDeactivated();
      onClose();
    } catch (err: any) {
      console.error("Failed to deactivate employee", err);
      setError(err?.message || "Failed to deactivate employee.");
    } finally {
      setLoading(false);
    }
  };

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
        animation: "fadeIn 150ms ease-out",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <Card
        style={{
          width: "100%",
          maxWidth: "520px",
          backgroundColor: "var(--bg-surface)",
          border: "1px solid rgba(244, 63, 94, 0.4)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "0 24px 48px -12px rgba(0,0,0,0.65), 0 0 24px -6px rgba(244, 63, 94, 0.25)",
          padding: "1.75rem",
        }}
      >
        {/* Header with Visual Icon */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem", marginBottom: "1.25rem" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "var(--radius-md)",
              backgroundColor: "rgba(244, 63, 94, 0.15)",
              border: "1px solid rgba(244, 63, 94, 0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.5rem",
              flexShrink: 0,
            }}
          >
            🛑
          </div>

          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-primary)" }}>
              Deactivate Employee / End Employment
            </h3>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
              Archive employee #{employee.id} and document departure reason
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
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

        {/* Employee Identity Preview */}
        <div
          style={{
            padding: "1rem",
            borderRadius: "var(--radius-md)",
            backgroundColor: "var(--bg-surface-elevated)",
            border: "1px solid var(--border-subtle)",
            marginBottom: "1.25rem",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ fontWeight: 700, fontSize: "1rem", color: "var(--text-primary)" }}>
                  {displayName}
                </span>
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                Employee ID: #{employee.id} {employee.profile?.phoneNumber ? `• 📞 ${employee.profile.phoneNumber}` : ""}
              </div>
              {employee.startDate && (
                <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
                  Started: {new Date(employee.startDate).toLocaleDateString()}
                </div>
              )}
            </div>
            <Badge variant="info">{positionName}</Badge>
          </div>
        </div>

        {/* Warning / Impact Notice */}
        <div
          style={{
            padding: "0.85rem 1rem",
            borderRadius: "var(--radius-md)",
            backgroundColor: "rgba(244, 63, 94, 0.08)",
            border: "1px solid rgba(244, 63, 94, 0.25)",
            marginBottom: "1.25rem",
            fontSize: "0.825rem",
            color: "var(--accent-rose)",
            lineHeight: 1.45,
          }}
        >
          <strong>What happens when deactivated:</strong>
          <ul style={{ paddingLeft: "1.2rem", marginTop: "0.35rem", display: "flex", flexDirection: "column", gap: "0.2rem" }}>
            <li>Employment end date will be set to today and marked as departed.</li>
            <li>Cashier shift logs, register audits, and transactions remain safely preserved.</li>
            <li>The departure reason will be permanently archived in staff employment records.</li>
          </ul>
        </div>

        {error && (
          <div
            style={{
              padding: "0.75rem 1rem",
              borderRadius: "var(--radius-md)",
              backgroundColor: "rgba(244, 63, 94, 0.15)",
              border: "1px solid var(--accent-rose)",
              color: "var(--accent-rose)",
              fontSize: "0.85rem",
              marginBottom: "1.25rem",
            }}
          >
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label
              htmlFor="deactivate-employee-reason-input"
              style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)", display: "block", marginBottom: "0.4rem" }}
            >
              Reason for Departure / Deactivation *
            </label>
            <textarea
              id="deactivate-employee-reason-input"
              rows={3}
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why this employee is departing or being deactivated..."
              style={{
                width: "100%",
                padding: "0.65rem 0.85rem",
                borderRadius: "var(--radius-md)",
                backgroundColor: "var(--bg-primary)",
                border: "1px solid var(--border-glow)",
                color: "var(--text-primary)",
                fontSize: "0.875rem",
                resize: "vertical",
                outline: "none",
                fontFamily: "inherit",
              }}
              autoFocus
            />

            {/* Quick preset chips */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginTop: "0.5rem" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", alignSelf: "center" }}>Quick presets:</span>
              {PRESET_REASONS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setReason(preset)}
                  style={{
                    fontSize: "0.75rem",
                    padding: "0.2rem 0.5rem",
                    borderRadius: "var(--radius-full)",
                    backgroundColor: reason === preset ? "rgba(244, 63, 94, 0.2)" : "var(--bg-surface-elevated)",
                    color: reason === preset ? "var(--accent-rose)" : "var(--text-secondary)",
                    border: reason === preset ? "1px solid var(--accent-rose)" : "1px solid var(--border-subtle)",
                    cursor: "pointer",
                    transition: "all var(--transition-fast)",
                  }}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.75rem" }}>
            <Button variant="secondary" onClick={onClose} disabled={loading} type="button">
              Cancel
            </Button>
            <Button
              id="confirm-deactivate-employee-btn"
              type="submit"
              disabled={loading || !reason.trim()}
              style={{
                backgroundColor: "var(--accent-rose)",
                color: "#fff",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                boxShadow: "0 4px 14px rgba(244, 63, 94, 0.3)",
              }}
            >
              <span>🛑</span>
              <span>{loading ? "Deactivating..." : "Deactivate Employee"}</span>
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
