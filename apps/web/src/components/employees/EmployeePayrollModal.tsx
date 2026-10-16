"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { employeeApi, payrollApi } from "@/lib/api";
import {
  formatIDR,
  type EmployeeRecord,
  type SalaryRecordItem,
} from "@pz/shared";

interface EmployeePayrollModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: EmployeeRecord | null;
}

export function EmployeePayrollModal({
  isOpen,
  onClose,
  employee,
}: EmployeePayrollModalProps) {
  const [salaryRecords, setSalaryRecords] = useState<SalaryRecordItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRecordForDetail, setSelectedRecordForDetail] = useState<SalaryRecordItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [filterPeriodStatus, setFilterPeriodStatus] = useState<string>("ALL");

  const loadSalaryRecords = useCallback(async () => {
    if (!employee?.id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await employeeApi.listSalaryRecords({
        employeeId: employee.id,
        limit: 100,
      });
      setSalaryRecords(res.items || []);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to load employee payroll records.");
    } finally {
      setLoading(false);
    }
  }, [employee?.id]);

  useEffect(() => {
    if (isOpen && employee?.id) {
      loadSalaryRecords();
      setSelectedRecordForDetail(null);
      setError(null);
    }
  }, [isOpen, employee?.id, loadSalaryRecords]);

  // View individual detailed record breakdown
  const handleViewDetail = async (record: SalaryRecordItem) => {
    setDetailLoading(true);
    try {
      const res = await employeeApi.getSalaryRecord(record.id);
      setSelectedRecordForDetail(res.data?.salaryRecord || record);
    } catch {
      setSelectedRecordForDetail(record);
    } finally {
      setDetailLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PAID":
        return <Badge variant="success">✓ Paid Out</Badge>;
      case "APPROVED":
        return <Badge variant="info">✓ Approved</Badge>;
      case "PENDING":
        return <Badge variant="warning">⏳ Pending</Badge>;
      case "CANCELLED":
        return <Badge variant="danger">✕ Cancelled</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  // Lifetime Earnings & Aggregated Analytics
  const metrics = useMemo(() => {
    let totalEarnedNet = 0;       // All APPROVED or PAID
    let totalDisbursedPaid = 0;   // Strictly PAID
    let totalPendingDisbursement = 0; // PENDING or APPROVED
    let totalGrossBase = 0;
    let totalAllowances = 0;
    let totalDeductions = 0;

    salaryRecords.forEach((r) => {
      const net = Number(r.netSalary || 0);
      const base = Number(r.basicSalary || 0);
      const allow = Number(r.totalAllowances || 0);
      const deduct = Number(r.totalDeductions || 0);

      if (r.status === "PAID") {
        totalDisbursedPaid += net;
        totalEarnedNet += net;
        totalGrossBase += base;
        totalAllowances += allow;
        totalDeductions += deduct;
      } else if (r.status === "APPROVED") {
        totalPendingDisbursement += net;
        totalEarnedNet += net;
        totalGrossBase += base;
        totalAllowances += allow;
        totalDeductions += deduct;
      } else if (r.status === "PENDING") {
        totalPendingDisbursement += net;
      }
    });

    return {
      totalEarnedNet,
      totalDisbursedPaid,
      totalPendingDisbursement,
      totalGrossBase,
      totalAllowances,
      totalDeductions,
      recordCount: salaryRecords.length,
      paidCount: salaryRecords.filter((r) => r.status === "PAID").length,
    };
  }, [salaryRecords]);

  // Filtered records list
  const filteredRecords = useMemo(() => {
    if (filterPeriodStatus === "ALL") return salaryRecords;
    return salaryRecords.filter((r) => r.status === filterPeriodStatus);
  }, [salaryRecords, filterPeriodStatus]);

  if (!isOpen || !employee) return null;

  const empName = employee.profile
    ? `${employee.profile.firstName} ${employee.profile.lastName || ""}`.trim()
    : `Employee #${employee.id}`;
  const posName = employee.position?.name || employee.position?.positionName || "Staff Member";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        backdropFilter: "blur(6px)",
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
          maxWidth: "960px",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          borderRadius: "var(--radius-lg)",
          backgroundColor: "var(--bg-surface)",
          border: "1px solid var(--border-glow)",
          boxShadow: "var(--shadow-xl)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
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
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "1.4rem" }}>💰</span>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
                Earnings & Payroll Ledger — {empName}
              </h2>
            </div>
            <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              Position: <strong style={{ color: "var(--primary)" }}>{posName}</strong> • Employee ID #{employee.id}
              {employee.employmentType && (
                <span> • Basis: <strong>{employee.employmentType}</strong></span>
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-muted)",
              fontSize: "1.4rem",
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        {/* Modal Content */}
        <div style={{ padding: "1.5rem", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {error && (
            <div
              style={{
                padding: "0.75rem 1rem",
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

          {/* Current Salary Configuration Banner */}
          <div
            style={{
              padding: "1rem 1.25rem",
              borderRadius: "var(--radius-md)",
              backgroundColor: "rgba(212, 175, 55, 0.08)",
              border: "1px solid var(--border-glow)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "1rem",
            }}
          >
            <div>
              <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700 }}>
                Current Salary Agreement / Rate
              </span>
              <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)", marginTop: "0.2rem" }}>
                {employee.employmentType === "HOURLY" && (
                  <span>
                    ⏱️ Hourly Rate: <span style={{ color: "var(--primary)" }}>{employee.hourlyRate ? `${formatIDR(Number(employee.hourlyRate))}/hour` : "Not set"}</span>
                  </span>
                )}
                {employee.employmentType === "CONTRACT" && (
                  <span>
                    📑 Contract Rate: <span style={{ color: "var(--primary)" }}>{employee.contractRate ? `${formatIDR(Number(employee.contractRate))}/deliverable` : "Project-based"}</span>
                  </span>
                )}
                {(!employee.employmentType || employee.employmentType === "MONTHLY") && (
                  <span>
                    🗓️ Monthly Salary: <span style={{ color: "var(--primary)" }}>{employee.monthlySalary ? formatIDR(Number(employee.monthlySalary)) : "Standard Monthly"}</span>
                  </span>
                )}
              </div>
            </div>

            <div style={{ textAlign: "right" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", textTransform: "uppercase" }}>
                Employment Status
              </span>
              <div style={{ marginTop: "0.2rem" }}>
                <Badge variant={employee.deletedAt ? "danger" : "success"}>
                  {employee.deletedAt ? "Departed" : "Active Staff"}
                </Badge>
              </div>
            </div>
          </div>

          {/* TOTAL EARNED SO FAR - 4 METRIC CARDS */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.75rem" }}>
            {/* Total Earned So Far (Lifetime Cumulative) */}
            <div
              style={{
                padding: "1rem",
                borderRadius: "var(--radius-md)",
                backgroundColor: "rgba(16, 185, 129, 0.08)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
              }}
            >
              <div style={{ fontSize: "0.75rem", color: "var(--accent-green)", fontWeight: 700, textTransform: "uppercase" }}>
                🏆 Total Earned So Far
              </div>
              <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--accent-green)", marginTop: "0.3rem" }}>
                {formatIDR(metrics.totalEarnedNet)}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                Net earnings across all pay cycles
              </div>
            </div>

            {/* Total Paid Out (Disbursed) */}
            <div
              style={{
                padding: "1rem",
                borderRadius: "var(--radius-md)",
                backgroundColor: "var(--bg-surface-elevated)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 600, textTransform: "uppercase" }}>
                ✓ Disbursed (Paid Out)
              </div>
              <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--text-primary)", marginTop: "0.3rem" }}>
                {formatIDR(metrics.totalDisbursedPaid)}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                {metrics.paidCount} of {metrics.recordCount} payslips paid
              </div>
            </div>

            {/* Total Pending Payout */}
            <div
              style={{
                padding: "1rem",
                borderRadius: "var(--radius-md)",
                backgroundColor: "rgba(245, 158, 11, 0.08)",
                border: "1px solid rgba(245, 158, 11, 0.3)",
              }}
            >
              <div style={{ fontSize: "0.75rem", color: "var(--accent-amber)", fontWeight: 700, textTransform: "uppercase" }}>
                ⏳ Pending Payout
              </div>
              <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--accent-amber)", marginTop: "0.3rem" }}>
                {formatIDR(metrics.totalPendingDisbursement)}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                Pending approval or disbursement
              </div>
            </div>

            {/* Cumulative Allowances vs Deductions */}
            <div
              style={{
                padding: "1rem",
                borderRadius: "var(--radius-md)",
                backgroundColor: "var(--bg-surface-elevated)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 600, textTransform: "uppercase" }}>
                Allowances & Deductions
              </div>
              <div style={{ fontSize: "0.85rem", marginTop: "0.35rem", display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                <span style={{ color: "var(--accent-green)", fontWeight: 600 }}>
                  +{formatIDR(metrics.totalAllowances)} (Tunjangan)
                </span>
                <span style={{ color: "var(--accent-red)", fontWeight: 600 }}>
                  -{formatIDR(metrics.totalDeductions)} (Potongan)
                </span>
              </div>
            </div>
          </div>

          {/* Detailed Selected Payslip Breakdown (If clicked) */}
          {selectedRecordForDetail && (
            <div
              style={{
                padding: "1.25rem",
                borderRadius: "var(--radius-md)",
                backgroundColor: "rgba(99, 102, 241, 0.06)",
                border: "1px solid rgba(99, 102, 241, 0.35)",
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ fontSize: "1.1rem" }}>🧾</span>
                  <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--accent-indigo)" }}>
                    Payslip Breakdown — {selectedRecordForDetail.period?.name || `Period #${selectedRecordForDetail.periodId}`}
                  </span>
                  {getStatusBadge(selectedRecordForDetail.status)}
                </div>
                <button
                  onClick={() => setSelectedRecordForDetail(null)}
                  style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "0.9rem" }}
                >
                  ✕ Close
                </button>
              </div>

              {detailLoading ? (
                <div style={{ padding: "1rem", textAlign: "center", color: "var(--text-muted)" }}>
                  Loading payslip breakdown items...
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                    <div style={{ padding: "0.75rem", borderRadius: "var(--radius-sm)", backgroundColor: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}>
                      <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.4rem", fontWeight: 700 }}>
                        Base Salary & Remarks
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                        <span>Basic Salary:</span>
                        <strong style={{ color: "var(--text-primary)" }}>{formatIDR(selectedRecordForDetail.basicSalary)}</strong>
                      </div>
                      {selectedRecordForDetail.notes && (
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.4rem", fontStyle: "italic" }}>
                          📝 {selectedRecordForDetail.notes}
                        </div>
                      )}
                    </div>

                    <div style={{ padding: "0.75rem", borderRadius: "var(--radius-sm)", backgroundColor: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}>
                      <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.4rem", fontWeight: 700 }}>
                        Totals & Net Take-Home
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", color: "var(--accent-green)" }}>
                        <span>Total Allowances:</span>
                        <strong>+{formatIDR(selectedRecordForDetail.totalAllowances)}</strong>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", color: "var(--accent-red)", marginTop: "0.2rem" }}>
                        <span>Total Deductions:</span>
                        <strong>-{formatIDR(selectedRecordForDetail.totalDeductions)}</strong>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.95rem", fontWeight: 800, color: "var(--primary)", marginTop: "0.4rem", paddingTop: "0.4rem", borderTop: "1px dashed var(--border-subtle)" }}>
                        <span>Net Take-Home Pay:</span>
                        <span>{formatIDR(selectedRecordForDetail.netSalary)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Components details list if available */}
                  {selectedRecordForDetail.details && selectedRecordForDetail.details.length > 0 && (
                    <div style={{ marginTop: "0.5rem" }}>
                      <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "0.3rem" }}>
                        Applied Items & Formulas:
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.4rem" }}>
                        {selectedRecordForDetail.details.map((d) => (
                          <div
                            key={d.id}
                            style={{
                              padding: "0.4rem 0.6rem",
                              borderRadius: "var(--radius-sm)",
                              backgroundColor: "var(--bg-surface)",
                              border: "1px solid var(--border-subtle)",
                              display: "flex",
                              justifyContent: "space-between",
                              fontSize: "0.8rem",
                            }}
                          >
                            <span>{d.component?.name || `Item #${d.componentId}`}</span>
                            <strong style={{ color: d.component?.type === "deduction" ? "var(--accent-red)" : "var(--accent-green)" }}>
                              {d.component?.type === "deduction" ? "-" : "+"}{formatIDR(d.amount)}
                            </strong>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Payslip History Table Toolbar */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "0.5rem" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
              Historical Payslips & Salary Records ({filteredRecords.length})
            </h3>

            {/* Filter by status */}
            <div style={{ display: "flex", gap: "0.4rem" }}>
              {["ALL", "PAID", "APPROVED", "PENDING"].map((st) => (
                <button
                  key={st}
                  onClick={() => setFilterPeriodStatus(st)}
                  style={{
                    padding: "0.3rem 0.65rem",
                    borderRadius: "var(--radius-sm)",
                    border: "none",
                    backgroundColor: filterPeriodStatus === st ? "var(--bg-surface-elevated)" : "transparent",
                    color: filterPeriodStatus === st ? "var(--primary)" : "var(--text-secondary)",
                    fontWeight: filterPeriodStatus === st ? 700 : 500,
                    fontSize: "0.78rem",
                    cursor: "pointer",
                  }}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Payslips Table */}
          <Card style={{ overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.85rem" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-subtle)", backgroundColor: "var(--bg-surface-elevated)", color: "var(--text-secondary)" }}>
                    <th style={{ padding: "0.75rem 1rem" }}>Payroll Period</th>
                    <th style={{ padding: "0.75rem 1rem" }}>Basic Wage</th>
                    <th style={{ padding: "0.75rem 1rem" }}>Allowances</th>
                    <th style={{ padding: "0.75rem 1rem" }}>Deductions</th>
                    <th style={{ padding: "0.75rem 1rem" }}>Net Salary</th>
                    <th style={{ padding: "0.75rem 1rem" }}>Status</th>
                    <th style={{ padding: "0.75rem 1rem", textAlign: "right" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: "2.5rem", textAlign: "center", color: "var(--text-muted)" }}>
                        {loading ? "Loading salary records..." : "No payroll records found for this employee yet."}
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((r) => (
                      <tr
                        key={r.id}
                        style={{
                          borderBottom: "1px solid var(--border-subtle)",
                          backgroundColor: selectedRecordForDetail?.id === r.id ? "rgba(99, 102, 241, 0.05)" : "transparent",
                        }}
                      >
                        <td style={{ padding: "0.75rem 1rem" }}>
                          <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                            {r.period?.name || `Period #${r.periodId}`}
                          </div>
                          <div style={{ fontSize: "0.72rem", color: "var(--primary)", marginTop: "0.15rem" }}>
                            Basis: {(r.salaryBasis || employee.salaryBasis || employee.employmentType || "monthly").toUpperCase()} → Paid: {(r.payFrequency || r.period?.frequency || "monthly").toUpperCase()}
                          </div>
                          {r.period && (
                            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                              {r.period.startDate.slice(0, 10)} to {r.period.endDate.slice(0, 10)}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: "0.75rem 1rem", color: "var(--text-secondary)" }}>
                          {formatIDR(r.basicSalary)}
                        </td>
                        <td style={{ padding: "0.75rem 1rem", color: "var(--accent-green)" }}>
                          +{formatIDR(r.totalAllowances)}
                        </td>
                        <td style={{ padding: "0.75rem 1rem", color: "var(--accent-red)" }}>
                          -{formatIDR(r.totalDeductions)}
                        </td>
                        <td style={{ padding: "0.75rem 1rem" }}>
                          <span style={{ fontWeight: 800, color: "var(--primary)", fontSize: "0.95rem" }}>
                            {formatIDR(r.netSalary)}
                          </span>
                        </td>
                        <td style={{ padding: "0.75rem 1rem" }}>
                          {getStatusBadge(r.status)}
                        </td>
                        <td style={{ padding: "0.75rem 1rem", textAlign: "right" }}>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleViewDetail(r)}
                            style={{ fontSize: "0.75rem" }}
                          >
                            👁️ View Details
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "1rem 1.5rem",
            borderTop: "1px solid var(--border-subtle)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            backgroundColor: "var(--bg-surface-elevated)",
          }}
        >
          <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            Total Earned to Date: <strong style={{ color: "var(--accent-green)", fontSize: "1rem" }}>{formatIDR(metrics.totalEarnedNet)}</strong>
          </div>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
