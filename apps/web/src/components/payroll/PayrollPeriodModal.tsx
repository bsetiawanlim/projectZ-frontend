"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { payrollApi } from "@/lib/api";
import type { PayrollPeriodRecord, PayrollPeriodStatus, PayrollFrequency } from "@pz/shared";

interface PeriodModalProps {
  isOpen: boolean;
  onClose: () => void;
  period?: PayrollPeriodRecord | null;
  onSuccess: () => void;
}

export function PayrollPeriodModal({ isOpen, onClose, period, onSuccess }: PeriodModalProps) {
  const isEdit = Boolean(period?.id);
  const [name, setName] = useState(period?.name || "");
  const [frequency, setFrequency] = useState<PayrollFrequency>(period?.frequency || "monthly");
  const [startDate, setStartDate] = useState(period?.startDate ? period.startDate.slice(0, 10) : "");
  const [endDate, setEndDate] = useState(period?.endDate ? period.endDate.slice(0, 10) : "");
  const [paymentDate, setPaymentDate] = useState(period?.paymentDate ? period.paymentDate.slice(0, 10) : "");
  const [status, setStatus] = useState<PayrollPeriodStatus>(period?.status || "DRAFT");
  const [notes, setNotes] = useState(period?.notes || "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync state if editing
  React.useEffect(() => {
    if (period) {
      setName(period.name);
      setFrequency(period.frequency || "monthly");
      setStartDate(period.startDate ? period.startDate.slice(0, 10) : "");
      setEndDate(period.endDate ? period.endDate.slice(0, 10) : "");
      setPaymentDate(period.paymentDate ? period.paymentDate.slice(0, 10) : "");
      setStatus(period.status);
      setNotes(period.notes || "");
    } else {
      setName("");
      setFrequency("monthly");
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, "0");
      setName(`Payroll Period ${m}/${y}`);
      setStartDate(`${y}-${m}-01`);
      // Last day of month
      const lastDay = new Date(y, now.getMonth() + 1, 0).getDate();
      setEndDate(`${y}-${m}-${lastDay}`);
      setPaymentDate(`${y}-${m}-${lastDay}`);
      setStatus("DRAFT");
      setNotes("");
    }
  }, [period, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !startDate || !endDate) {
      setError("Please fill in Period Name, Start Date, and End Date.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      if (isEdit && period?.id) {
        await payrollApi.updatePeriod({
          id: period.id,
          name,
          frequency,
          startDate: new Date(startDate).toISOString(),
          endDate: new Date(endDate).toISOString(),
          paymentDate: paymentDate ? new Date(paymentDate).toISOString() : null,
          status,
          notes: notes || null,
        });
      } else {
        await payrollApi.createPeriod({
          name,
          frequency,
          startDate: new Date(startDate).toISOString(),
          endDate: new Date(endDate).toISOString(),
          paymentDate: paymentDate ? new Date(paymentDate).toISOString() : null,
          status,
          notes: notes || null,
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to save payroll period.");
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
        zIndex: 50,
        padding: "1rem",
      }}
    >
      <div
        style={{
          backgroundColor: "var(--bg-surface)",
          border: "1px solid var(--border-glow)",
          borderRadius: "var(--radius-lg)",
          width: "100%",
          maxWidth: "520px",
          padding: "1.5rem",
          boxShadow: "var(--shadow-xl)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <h3 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--text-primary)" }}>
            {isEdit ? "Edit Payroll Period" : "Create New Payroll Period"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-muted)",
              cursor: "pointer",
              fontSize: "1.2rem",
            }}
          >
            ✕
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: "0.75rem",
              borderRadius: "var(--radius-md)",
              backgroundColor: "rgba(239, 68, 68, 0.1)",
              border: "1px solid var(--accent-red)",
              color: "var(--accent-red)",
              fontSize: "0.85rem",
              marginBottom: "1rem",
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
              <label style={{ fontSize: "0.825rem", fontWeight: 600, color: "var(--text-secondary)" }}>
                Period Name <span style={{ color: "var(--accent-red)" }}>*</span>
              </label>
              {/* Presets */}
              <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    const y = now.getFullYear();
                    const m = String(now.getMonth() + 1).padStart(2, "0");
                    const lastDay = new Date(y, now.getMonth() + 1, 0).getDate();
                    setName(`Monthly Payroll ${m}/${y}`);
                    setFrequency("monthly");
                    setStartDate(`${y}-${m}-01`);
                    setEndDate(`${y}-${m}-${lastDay}`);
                    setPaymentDate(`${y}-${m}-${lastDay}`);
                  }}
                  style={{
                    padding: "0.15rem 0.45rem",
                    fontSize: "0.7rem",
                    borderRadius: "var(--radius-sm)",
                    border: `1px solid ${frequency === "monthly" ? "var(--primary)" : "var(--border-subtle)"}`,
                    backgroundColor: frequency === "monthly" ? "rgba(212, 175, 55, 0.15)" : "var(--bg-surface-elevated)",
                    color: frequency === "monthly" ? "var(--primary)" : "var(--text-secondary)",
                    cursor: "pointer",
                  }}
                >
                  📅 Monthly
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    const startStr = now.toISOString().slice(0, 10);
                    const end = new Date(now);
                    end.setDate(end.getDate() + 13);
                    const endStr = end.toISOString().slice(0, 10);
                    setName(`Bi-Weekly Payroll (${startStr} - ${endStr})`);
                    setFrequency("biWeekly");
                    setStartDate(startStr);
                    setEndDate(endStr);
                    setPaymentDate(endStr);
                  }}
                  style={{
                    padding: "0.15rem 0.45rem",
                    fontSize: "0.7rem",
                    borderRadius: "var(--radius-sm)",
                    border: `1px solid ${frequency === "biWeekly" ? "var(--primary)" : "var(--border-subtle)"}`,
                    backgroundColor: frequency === "biWeekly" ? "rgba(212, 175, 55, 0.15)" : "var(--bg-surface-elevated)",
                    color: frequency === "biWeekly" ? "var(--primary)" : "var(--text-secondary)",
                    cursor: "pointer",
                  }}
                >
                  ⏱️ Bi-Weekly
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    const day = now.getDay();
                    const diffToMon = now.getDate() - day + (day === 0 ? -6 : 1);
                    const monday = new Date(now.setDate(diffToMon));
                    const sunday = new Date(new Date(monday).setDate(monday.getDate() + 6));
                    const monStr = monday.toISOString().slice(0, 10);
                    const sunStr = sunday.toISOString().slice(0, 10);
                    setName(`Weekly Payroll (${monStr} - ${sunStr})`);
                    setFrequency("weekly");
                    setStartDate(monStr);
                    setEndDate(sunStr);
                    setPaymentDate(sunStr);
                  }}
                  style={{
                    padding: "0.15rem 0.45rem",
                    fontSize: "0.7rem",
                    borderRadius: "var(--radius-sm)",
                    border: `1px solid ${frequency === "weekly" ? "var(--primary)" : "var(--border-subtle)"}`,
                    backgroundColor: frequency === "weekly" ? "rgba(212, 175, 55, 0.15)" : "var(--bg-surface-elevated)",
                    color: frequency === "weekly" ? "var(--primary)" : "var(--text-secondary)",
                    cursor: "pointer",
                  }}
                >
                  📆 Weekly
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const todayStr = new Date().toISOString().slice(0, 10);
                    setName(`Daily Payroll (${todayStr})`);
                    setFrequency("daily");
                    setStartDate(todayStr);
                    setEndDate(todayStr);
                    setPaymentDate(todayStr);
                  }}
                  style={{
                    padding: "0.15rem 0.45rem",
                    fontSize: "0.7rem",
                    borderRadius: "var(--radius-sm)",
                    border: `1px solid ${frequency === "daily" ? "var(--primary)" : "var(--border-subtle)"}`,
                    backgroundColor: frequency === "daily" ? "rgba(212, 175, 55, 0.15)" : "var(--bg-surface-elevated)",
                    color: frequency === "daily" ? "var(--primary)" : "var(--text-secondary)",
                    cursor: "pointer",
                  }}
                >
                  ☀️ Daily
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const todayStr = new Date().toISOString().slice(0, 10);
                    setName(`Hourly Payroll (${todayStr})`);
                    setFrequency("hourly");
                    setStartDate(todayStr);
                    setEndDate(todayStr);
                    setPaymentDate(todayStr);
                  }}
                  style={{
                    padding: "0.15rem 0.45rem",
                    fontSize: "0.7rem",
                    borderRadius: "var(--radius-sm)",
                    border: `1px solid ${frequency === "hourly" ? "var(--primary)" : "var(--border-subtle)"}`,
                    backgroundColor: frequency === "hourly" ? "rgba(212, 175, 55, 0.15)" : "var(--bg-surface-elevated)",
                    color: frequency === "hourly" ? "var(--primary)" : "var(--text-secondary)",
                    cursor: "pointer",
                  }}
                >
                  ⏰ Hourly
                </button>
              </div>
            </div>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. October 2026 Payroll"
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
                Payment Frequency (Payout Cycle) <span style={{ color: "var(--accent-red)" }}>*</span>
              </label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as PayrollFrequency)}
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
                <option value="monthly">Monthly (Once a Month)</option>
                <option value="biWeekly">Bi-Weekly (Every 2 Weeks)</option>
                <option value="weekly">Weekly (Every Week)</option>
                <option value="daily">Daily (Every Day)</option>
                <option value="hourly">Hourly (Per Shift / Hourly)</option>
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.825rem", fontWeight: 600, marginBottom: "0.35rem", color: "var(--text-secondary)" }}>
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as PayrollPeriodStatus)}
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
                <option value="DRAFT">DRAFT</option>
                <option value="PROCESSING">PROCESSING</option>
                <option value="APPROVED">APPROVED</option>
                <option value="PAID">PAID</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.825rem", fontWeight: 600, marginBottom: "0.35rem", color: "var(--text-secondary)" }}>
                Start Date <span style={{ color: "var(--accent-red)" }}>*</span>
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
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
              <label style={{ display: "block", fontSize: "0.825rem", fontWeight: 600, marginBottom: "0.35rem", color: "var(--text-secondary)" }}>
                End Date <span style={{ color: "var(--accent-red)" }}>*</span>
              </label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
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
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.825rem", fontWeight: 600, marginBottom: "0.35rem", color: "var(--text-secondary)" }}>
              Payment Date
            </label>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
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
            <label style={{ display: "block", fontSize: "0.825rem", fontWeight: 600, marginBottom: "0.35rem", color: "var(--text-secondary)" }}>
              Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Standard monthly cycle for operations and retail staff"
              style={{
                width: "100%",
                padding: "0.55rem 0.75rem",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-subtle)",
                backgroundColor: "var(--bg-primary)",
                color: "var(--text-primary)",
                fontSize: "0.85rem",
                resize: "vertical",
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
              {submitting ? "Saving..." : isEdit ? "Update Period" : "Create Period"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
