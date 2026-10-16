"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { employeeApi, facilityApi, type FacilityRecord } from "@/lib/api";
import type { EmployeeRecord, PositionRecord, EmploymentType, PayrollFrequency } from "@pz/shared";

interface EditEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: EmployeeRecord | null;
  onEmployeeUpdated: () => void;
}

export function EditEmployeeModal({
  isOpen,
  onClose,
  employee,
  onEmployeeUpdated,
}: EditEmployeeModalProps) {
  const [positionId, setPositionId] = useState<number | "">("");
  const [employmentType, setEmploymentType] = useState<EmploymentType>("MONTHLY");
  const [salaryBasis, setSalaryBasis] = useState<PayrollFrequency>("monthly");
  const [payFrequency, setPayFrequency] = useState<PayrollFrequency>("monthly");
  const [monthlySalary, setMonthlySalary] = useState<number | "">("");
  const [biWeeklyRate, setBiWeeklyRate] = useState<number | "">("");
  const [weeklyRate, setWeeklyRate] = useState<number | "">("");
  const [dailyRate, setDailyRate] = useState<number | "">("");
  const [hourlyRate, setHourlyRate] = useState<number | "">("");
  const [contractRate, setContractRate] = useState<number | "">("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [departReason, setDepartReason] = useState("");
  const [facilityId, setFacilityId] = useState<number | "">("");
  const [facilities, setFacilities] = useState<FacilityRecord[]>([]);
  const [positions, setPositions] = useState<PositionRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      employeeApi
        .listPositions()
        .then((res) => setPositions(res.items || []))
        .catch((err) => console.error("Could not load positions", err));

      facilityApi
        .listFacilities({ limit: 100 })
        .then((res) => setFacilities(res.items || []))
        .catch((err) => console.error("Could not load facilities", err));
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && employee) {
      setPositionId(employee.positionId ?? "");
      setFacilityId(employee.facilityId ?? "");
      setEmploymentType(employee.employmentType || "MONTHLY");
      setSalaryBasis((employee.salaryBasis as PayrollFrequency) || "monthly");
      setPayFrequency((employee.payFrequency as PayrollFrequency) || "monthly");
      setMonthlySalary(employee.monthlySalary ? Number(employee.monthlySalary) : "");
      setBiWeeklyRate(employee.biWeeklyRate ? Number(employee.biWeeklyRate) : "");
      setWeeklyRate(employee.weeklyRate ? Number(employee.weeklyRate) : "");
      setDailyRate(employee.dailyRate ? Number(employee.dailyRate) : "");
      setHourlyRate(employee.hourlyRate ? Number(employee.hourlyRate) : "");
      setContractRate(employee.contractRate ? Number(employee.contractRate) : "");
      setStartDate(employee.startDate ? new Date(employee.startDate).toISOString().split("T")[0] || "" : "");
      setEndDate(employee.endDate ? new Date(employee.endDate).toISOString().split("T")[0] || "" : "");
      setDepartReason(employee.departReason || "");
      setError(null);
    }
  }, [isOpen, employee]);

  if (!isOpen || !employee) return null;

  const displayName = employee.profile
    ? `${employee.profile.firstName} ${employee.profile.lastName || ""}`.trim()
    : `Employee #${employee.id}`;

  const addressSummary = employee.profile
    ? [employee.profile.address, employee.profile.city, employee.profile.province]
        .filter(Boolean)
        .join(", ")
    : "";

  const currentPositionName =
    employee.position?.name || employee.position?.positionName || "General Staff";

  const selectedPosition = positions.find((p) => p.id === Number(positionId));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await employeeApi.updateEmployee({
        id: employee.id,
        positionId: positionId ? Number(positionId) : null,
        facilityId: facilityId ? Number(facilityId) : null,
        employmentType,
        salaryBasis,
        payFrequency,
        monthlySalary: monthlySalary !== "" ? Number(monthlySalary) : null,
        biWeeklyRate: biWeeklyRate !== "" ? Number(biWeeklyRate) : null,
        weeklyRate: weeklyRate !== "" ? Number(weeklyRate) : null,
        dailyRate: dailyRate !== "" ? Number(dailyRate) : null,
        hourlyRate: hourlyRate !== "" ? Number(hourlyRate) : null,
        contractRate: contractRate !== "" ? Number(contractRate) : null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        departReason: departReason.trim() || null,
      });

      onEmployeeUpdated();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to update employee");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
        padding: "1rem",
      }}
    >
      <Card
        style={{
          width: "100%",
          maxWidth: "600px",
          maxHeight: "90vh",
          overflowY: "auto",
          backgroundColor: "var(--bg-surface)",
          border: "1px solid var(--border-glow)",
          padding: "1.5rem",
          position: "relative",
          boxShadow: "var(--shadow-xl)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem" }}>
          <div>
            <h3 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-primary)" }}>
              Edit Employee #{employee.id}
            </h3>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
              Configure job position, salary calculation basis, and pay frequency
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

        {/* Read-Only Profile Card */}
        <div
          style={{
            backgroundColor: "var(--bg-surface-elevated)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            padding: "1rem",
            marginBottom: "1.25rem",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
            <div>
              <span style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--text-primary)" }}>
                {displayName}
              </span>
              <p style={{ fontSize: "0.825rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                📞 {employee.profile?.phoneNumber || "No phone registered"}
              </p>
              {addressSummary && (
                <p style={{ fontSize: "0.825rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                  📍 {addressSummary}
                </p>
              )}
            </div>
            <Badge variant="info">
              {currentPositionName}
            </Badge>
          </div>
          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.5rem", borderTop: "1px solid var(--border-subtle)", paddingTop: "0.5rem" }}>
            ℹ️ Personal details (name, phone, address) can be managed in the Person directory.
          </p>
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
              marginBottom: "1.25rem",
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div>
            <div>
              <label
                htmlFor="edit-emp-facility-select"
                style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)", display: "block", marginBottom: "0.4rem" }}
              >
                Assigned Store / Facility (Cabang / Gudang)
              </label>
              <select
                id="edit-emp-facility-select"
                value={facilityId}
                onChange={(e) => setFacilityId(e.target.value ? Number(e.target.value) : "")}
                style={{
                  width: "100%",
                  padding: "0.65rem 0.85rem",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "var(--bg-primary)",
                  border: "1px solid var(--border-glow)",
                  color: "var(--text-primary)",
                  fontSize: "0.9rem",
                  cursor: "pointer",
                }}
              >
                <option value="">-- No specific facility / HQ --</option>
                {facilities.map((fac) => (
                  <option key={fac.id} value={fac.id}>
                    🏬 {fac.facilityName} ({fac.facilityCode}) - {fac.type}
                  </option>
                ))}
              </select>
            </div>

            <label
              htmlFor="edit-emp-position-select"
              style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)", display: "block", marginBottom: "0.4rem" }}
            >
              Job Position
            </label>
            <select
              id="edit-emp-position-select"
              value={positionId}
              onChange={(e) => setPositionId(e.target.value ? Number(e.target.value) : "")}
              style={{
                width: "100%",
                padding: "0.65rem 0.85rem",
                borderRadius: "var(--radius-md)",
                backgroundColor: "var(--bg-primary)",
                border: "1px solid var(--border-glow)",
                color: "var(--text-primary)",
                fontSize: "0.9rem",
                cursor: "pointer",
              }}
            >
              <option value="">General Staff (No specific position)</option>
              {positions.map((pos) => {
                const posTitle = pos.name || pos.positionName || `Position #${pos.id}`;
                return (
                  <option key={pos.id} value={pos.id}>
                    {posTitle}
                  </option>
                );
              })}
            </select>
            {selectedPosition?.description && (
              <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.35rem" }}>
                ℹ️ {selectedPosition.description}
              </p>
            )}
          </div>

          {/* Dual Frequency Setup: Counted Based On & Paid By */}
          <div
            style={{
              padding: "1rem",
              borderRadius: "var(--radius-md)",
              backgroundColor: "var(--bg-surface-elevated)",
              border: "1px solid var(--border-subtle)",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
            }}
          >
            <div>
              <label style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)", display: "block", marginBottom: "0.2rem" }}>
                1. Salary Counted Based On (Calculation Basis)
              </label>
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
                Defines the wage rate unit (e.g. per month, 2-weeks, week, day, or hour worked).
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "0.35rem" }}>
                {(["monthly", "biWeekly", "weekly", "daily", "hourly"] as PayrollFrequency[]).map((b) => {
                  const labels: Record<PayrollFrequency, string> = {
                    monthly: "📅 Monthly",
                    biWeekly: "⏱️ Bi-Weekly",
                    weekly: "📆 Weekly",
                    daily: "☀️ Daily",
                    hourly: "⏰ Hourly",
                  };
                  const isSel = salaryBasis === b;
                  return (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setSalaryBasis(b)}
                      style={{
                        padding: "0.45rem 0.2rem",
                        fontSize: "0.75rem",
                        borderRadius: "var(--radius-sm)",
                        border: `1px solid ${isSel ? "var(--primary)" : "var(--border-subtle)"}`,
                        backgroundColor: isSel ? "rgba(212, 175, 55, 0.15)" : "var(--bg-primary)",
                        color: isSel ? "var(--primary)" : "var(--text-secondary)",
                        fontWeight: isSel ? 700 : 500,
                        cursor: "pointer",
                        textAlign: "center",
                      }}
                    >
                      {labels[b]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)", display: "block", marginBottom: "0.2rem" }}>
                2. Paid By (Default Payment Frequency)
              </label>
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
                Default payroll disbursement cycle for this employee.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "0.35rem" }}>
                {(["monthly", "biWeekly", "weekly", "daily", "hourly"] as PayrollFrequency[]).map((f) => {
                  const labels: Record<PayrollFrequency, string> = {
                    monthly: "📅 Monthly",
                    biWeekly: "⏱️ Bi-Weekly",
                    weekly: "📆 Weekly",
                    daily: "☀️ Daily",
                    hourly: "⏰ Hourly",
                  };
                  const isSel = payFrequency === f;
                  return (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setPayFrequency(f)}
                      style={{
                        padding: "0.45rem 0.2rem",
                        fontSize: "0.75rem",
                        borderRadius: "var(--radius-sm)",
                        border: `1px solid ${isSel ? "var(--primary)" : "var(--border-subtle)"}`,
                        backgroundColor: isSel ? "rgba(212, 175, 55, 0.15)" : "var(--bg-primary)",
                        color: isSel ? "var(--primary)" : "var(--text-secondary)",
                        fontWeight: isSel ? 700 : 500,
                        cursor: "pointer",
                        textAlign: "center",
                      }}
                    >
                      {labels[f]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Configured Rates */}
            <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "0.75rem" }}>
              <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
                Wage Rates (Fill relevant rates for this employee):
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
                <div>
                  <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)", display: "block", marginBottom: "0.2rem" }}>
                    Monthly Salary (IDR / Bulan)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="50000"
                    value={monthlySalary}
                    onChange={(e) => setMonthlySalary(e.target.value ? Number(e.target.value) : "")}
                    placeholder="e.g. 5000000"
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)", display: "block", marginBottom: "0.2rem" }}>
                    Bi-Weekly Rate (IDR / 2 Minggu)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="25000"
                    value={biWeeklyRate}
                    onChange={(e) => setBiWeeklyRate(e.target.value ? Number(e.target.value) : "")}
                    placeholder="e.g. 2500000"
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)", display: "block", marginBottom: "0.2rem" }}>
                    Weekly Rate (IDR / Minggu)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="25000"
                    value={weeklyRate}
                    onChange={(e) => setWeeklyRate(e.target.value ? Number(e.target.value) : "")}
                    placeholder="e.g. 1250000"
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)", display: "block", marginBottom: "0.2rem" }}>
                    Daily Rate (IDR / Hari)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="10000"
                    value={dailyRate}
                    onChange={(e) => setDailyRate(e.target.value ? Number(e.target.value) : "")}
                    placeholder="e.g. 200000"
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)", display: "block", marginBottom: "0.2rem" }}>
                    Hourly Rate (IDR / Jam)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="1000"
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(e.target.value ? Number(e.target.value) : "")}
                    placeholder="e.g. 35000"
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)", display: "block", marginBottom: "0.2rem" }}>
                    Contract Fee (IDR / Deliverable)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="50000"
                    value={contractRate}
                    onChange={(e) => setContractRate(e.target.value ? Number(e.target.value) : "")}
                    placeholder="e.g. 2500000"
                  />
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div>
              <label
                htmlFor="edit-emp-startDate"
                style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.25rem" }}
              >
                Start Date
              </label>
              <Input
                id="edit-emp-startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label
                htmlFor="edit-emp-endDate"
                style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.25rem" }}
              >
                End Date (if departed)
              </label>
              <Input
                id="edit-emp-endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="edit-emp-depart-reason"
              style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)", display: "block", marginBottom: "0.4rem" }}
            >
              Employment Notes / Departure Reason
            </label>
            <Input
              id="edit-emp-depart-reason"
              value={departReason}
              onChange={(e) => setDepartReason(e.target.value)}
              placeholder="e.g. Full-time cashier or reason if departed"
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.5rem" }}>
            <Button variant="secondary" onClick={onClose} disabled={loading} type="button">
              Cancel
            </Button>
            <Button id="submit-edit-emp-btn" variant="primary" type="submit" isLoading={loading}>
              Save Position & Rates
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
