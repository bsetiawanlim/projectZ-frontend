"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { payrollApi, employeeApi } from "@/lib/api";
import {
  formatIDR,
  calculateBaseSalary,
  type EmployeeRecord,
  type PayrollPeriodRecord,
  type PayrollComponentRecord,
  type PayrollCalculationType,
  type EmploymentType,
  type PayrollFrequency,
} from "@pz/shared";

interface SetEmployeePayrollModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: EmployeeRecord | null;
  onSuccess?: () => void;
}

export function SetEmployeePayrollModal({
  isOpen,
  onClose,
  employee,
  onSuccess,
}: SetEmployeePayrollModalProps) {
  const [periods, setPeriods] = useState<PayrollPeriodRecord[]>([]);
  const [components, setComponents] = useState<PayrollComponentRecord[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<number | "">("");

  // Pay Model / Employment Type
  const [wageType, setWageType] = useState<EmploymentType>("MONTHLY");

  // Dual Frequencies: Counted Based On & Paid By
  const [salaryBasis, setSalaryBasis] = useState<PayrollFrequency>("monthly");
  const [payFrequency, setPayFrequency] = useState<PayrollFrequency>("monthly");

  // Wage Rates
  const [monthlyBase, setMonthlyBase] = useState<number>(5000000);
  const [biWeeklyRate, setBiWeeklyRate] = useState<number>(2500000);
  const [weeklyRate, setWeeklyRate] = useState<number>(1250000);
  const [dailyRate, setDailyRate] = useState<number>(200000);
  const [hourlyRate, setHourlyRate] = useState<number>(35000);
  const [contractRate, setContractRate] = useState<number>(2500000);
  const [contractUnits, setContractUnits] = useState<number>(1);

  // Attendance metrics
  const [attendanceCount, setAttendanceCount] = useState<number>(0);
  const [absenceCount, setAbsenceCount] = useState<number>(0);
  const [attendanceHours, setAttendanceHours] = useState<number>(0);
  const [absenceHours, setAbsenceHours] = useState<number>(0);
  const [allAttendanceRecords, setAllAttendanceRecords] = useState<any[]>([]);

  // Selected component values: map of componentId -> amount
  const [componentValues, setComponentValues] = useState<Record<number, number>>({});
  // Selected components checkboxes: map of componentId -> boolean
  const [selectedComponents, setSelectedComponents] = useState<Record<number, boolean>>({});

  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Quick Inline Add Component State
  const [quickAddType, setQuickAddType] = useState<"allowance" | "deduction" | null>(null);
  const [quickName, setQuickName] = useState("");
  const [quickCalculationType, setQuickCalculationType] = useState<PayrollCalculationType>("fixedAmount");
  const [quickAmount, setQuickAmount] = useState<number>(0);
  const [creatingComponent, setCreatingComponent] = useState(false);
  const [quickError, setQuickError] = useState<string | null>(null);

  const handleQuickCreateComponent = async () => {
    if (!quickAddType) return;
    if (!quickName.trim()) {
      setQuickError("Please enter a name for the " + (quickAddType === "allowance" ? "allowance" : "deduction") + ".");
      return;
    }

    setCreatingComponent(true);
    setQuickError(null);

    try {
      const res = await payrollApi.createComponent({
        name: quickName.trim(),
        type: quickAddType,
        calculationType: quickCalculationType,
        defaultAmount: Number(quickAmount) || 0,
        isTaxable: true,
        description: null,
      });

      const newComp = res.data;
      if (newComp) {
        setComponents((prev) => [...prev, newComp]);
        setSelectedComponents((prev) => ({
          ...prev,
          [newComp.id]: true,
        }));
        setComponentValues((prev) => ({
          ...prev,
          [newComp.id]: Number(quickAmount) || 0,
        }));
      }

      setQuickAddType(null);
      setQuickName("");
      setQuickCalculationType("fixedAmount");
      setQuickAmount(0);
    } catch (err: any) {
      console.error(err);
      setQuickError(err?.message || "Failed to add component.");
    } finally {
      setCreatingComponent(false);
    }
  };

  const handleDeleteComponent = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete component "${name}"? This will remove it from the system.`)) return;
    try {
      await payrollApi.deleteComponent(id);
      setComponents((prev) => prev.filter((c) => c.id !== id));
      setSelectedComponents((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setComponentValues((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Failed to delete component");
    }
  };

  // Load active periods, components, and attendance summary
  useEffect(() => {
    if (!isOpen || !employee) return;

    let isMounted = true;
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    const empType = employee.employmentType || "MONTHLY";
    setWageType(empType);
    setSalaryBasis((employee.salaryBasis as PayrollFrequency) || "monthly");
    setPayFrequency((employee.payFrequency as PayrollFrequency) || "monthly");

    if (employee.monthlySalary) setMonthlyBase(Number(employee.monthlySalary));
    if (employee.biWeeklyRate) setBiWeeklyRate(Number(employee.biWeeklyRate));
    if (employee.weeklyRate) setWeeklyRate(Number(employee.weeklyRate));
    if (employee.dailyRate) setDailyRate(Number(employee.dailyRate));
    if (employee.hourlyRate) setHourlyRate(Number(employee.hourlyRate));
    if (employee.contractRate) setContractRate(Number(employee.contractRate));

    Promise.all([
      payrollApi.listPeriods({ limit: 50 }),
      payrollApi.listComponents({ limit: 100 }),
      employeeApi.listAttendance({ employeeId: employee.id, limit: 200 }),
    ])
      .then(async ([periodRes, compRes, attRes]) => {
        if (!isMounted) return;

        const periodList = periodRes.items || [];
        setPeriods(periodList);

        const activePeriod = periodList.find((p) => p.status === "DRAFT" || p.status === "PROCESSING") || periodList[0];
        if (activePeriod) {
          setSelectedPeriodId(activePeriod.id);
          if (activePeriod.frequency) {
            setPayFrequency(activePeriod.frequency);
          }
        }

        let compList = compRes.items || [];
        if (!compList.some((c) => c.type === "basic")) {
          try {
            const autoCompRes = await payrollApi.createComponent({
              name: "Gaji Pokok (Basic Salary)",
              type: "basic",
              calculationType: "fixedAmount",
              defaultAmount: 0,
              isTaxable: true,
              description: "System standard basic salary component",
            });
            if (autoCompRes.data) {
              compList = [...compList, autoCompRes.data];
            }
          } catch (autoErr) {
            console.error("Failed to auto-provision basic component:", autoErr);
          }
        }
        setComponents(compList);

        const initialVals: Record<number, number> = {};
        const initialSelected: Record<number, boolean> = {};

        compList.forEach((c) => {
          const defaultAmt = Number(c.defaultAmount || 0);
          initialVals[c.id] = defaultAmt;
          if (c.type !== "basic") {
            initialSelected[c.id] = defaultAmt > 0;
          }
        });

        setComponentValues(initialVals);
        setSelectedComponents(initialSelected);

        const attList = attRes.items || [];
        setAllAttendanceRecords(attList);
      })
      .catch((err: any) => {
        if (isMounted) setError(err?.message || "Failed to load payroll configuration.");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, employee]);

  // Sync payFrequency when selectedPeriodId changes
  useEffect(() => {
    if (!selectedPeriodId || periods.length === 0) return;
    const currentPeriod = periods.find((p) => p.id === Number(selectedPeriodId));
    if (currentPeriod?.frequency) {
      setPayFrequency(currentPeriod.frequency);
    }
  }, [selectedPeriodId, periods]);

  // Recalculate attendance stats within period
  useEffect(() => {
    if (!selectedPeriodId || periods.length === 0) return;
    const currentPeriod = periods.find((p) => p.id === Number(selectedPeriodId));
    if (!currentPeriod) return;

    const pStart = new Date(currentPeriod.startDate);
    const pEnd = new Date(currentPeriod.endDate);
    pEnd.setHours(23, 59, 59, 999);

    const inPeriodAttendance = allAttendanceRecords.filter((a) => {
      const aDate = new Date(a.date);
      return aDate >= pStart && aDate <= pEnd && (a.status === "PRESENT" || a.status === "LATE");
    });

    const attendedDays = new Set(inPeriodAttendance.map((a: any) => new Date(a.date).toISOString().split("T")[0])).size;
    setAttendanceCount(attendedDays);

    const explicitAbsent = allAttendanceRecords.filter((a) => {
      const aDate = new Date(a.date);
      return aDate >= pStart && aDate <= pEnd && a.status === "ABSENT";
    }).length;

    let totalWorkingDaysInPeriod = 0;
    const curDate = new Date(pStart);
    while (curDate <= pEnd) {
      const dayOfWeek = curDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        totalWorkingDaysInPeriod++;
      }
      curDate.setDate(curDate.getDate() + 1);
    }

    const estimatedAbsentDays = Math.max(explicitAbsent, Math.max(0, totalWorkingDaysInPeriod - attendedDays));
    setAbsenceCount(estimatedAbsentDays);
    setAbsenceHours(estimatedAbsentDays * 8);

    const totalMinutes = inPeriodAttendance.reduce((sum, a) => sum + (a.workDurationMinutes || 480), 0);
    const calcHours = Math.round(totalMinutes / 60);
    setAttendanceHours(calcHours);
  }, [selectedPeriodId, periods, allAttendanceRecords]);

  // Separate components by type
  const basicComponent = useMemo(() => components.find((c) => c.type === "basic"), [components]);
  const allowances = useMemo(() => components.filter((c) => c.type === "allowance"), [components]);
  const deductions = useMemo(() => components.filter((c) => c.type === "deduction"), [components]);

  // Base wage calculation using dual frequency (Counted Based On + Paid By)
  const baseWageCalculation = useMemo(() => {
    if (wageType === "CONTRACT") {
      const total = Math.max(0, contractRate * contractUnits);
      return {
        baseSalary: total,
        resolvedRate: contractRate,
        unitsApplied: contractUnits,
        unitLabel: "deliverables",
        formulaText: `${contractUnits} deliverables × ${formatIDR(contractRate)}`,
      };
    }

    const result = calculateBaseSalary({
      salaryBasis,
      payFrequency,
      rates: {
        hourlyRate,
        dailyRate,
        weeklyRate,
        biWeeklyRate,
        monthlySalary: monthlyBase,
      },
      attendance: {
        attendedDays: attendanceCount,
        loggedHours: attendanceHours,
      },
    });

    let formulaText = "";
    if (salaryBasis === "hourly") {
      formulaText = `Attendance log: ${result.unitsApplied} hours × ${formatIDR(result.resolvedRate)}/hr`;
    } else if (salaryBasis === "daily") {
      if (payFrequency === "hourly") {
        formulaText = `Attendance log: ${result.unitsApplied} hours × ${formatIDR(result.resolvedRate)}/hr (daily rate ÷ 8)`;
      } else {
        formulaText = `Attendance log: ${result.unitsApplied} days attended × ${formatIDR(result.resolvedRate)}/day`;
      }
    } else if (salaryBasis === payFrequency) {
      formulaText = `Standard ${salaryBasis} rate: ${formatIDR(result.baseSalary)}`;
    } else if (salaryBasis === "monthly" && payFrequency === "biWeekly") {
      formulaText = `Monthly (${formatIDR(monthlyBase)}) ÷ 2.167 (bi-weekly cycle ratio)`;
    } else if (salaryBasis === "monthly" && payFrequency === "weekly") {
      formulaText = `Monthly (${formatIDR(monthlyBase)}) ÷ 4.333 (weekly cycle ratio)`;
    } else if (salaryBasis === "biWeekly" && payFrequency === "monthly") {
      formulaText = `Bi-Weekly (${formatIDR(biWeeklyRate)}) × 2.167 (monthly cycle ratio)`;
    } else if (salaryBasis === "weekly" && payFrequency === "monthly") {
      formulaText = `Weekly (${formatIDR(weeklyRate)}) × 4.333 (monthly cycle ratio)`;
    } else {
      formulaText = `Converted ${salaryBasis} (${formatIDR(result.resolvedRate)}) to ${payFrequency} payout`;
    }

    return {
      ...result,
      formulaText,
    };
  }, [
    wageType,
    contractRate,
    contractUnits,
    salaryBasis,
    payFrequency,
    hourlyRate,
    dailyRate,
    weeklyRate,
    biWeeklyRate,
    monthlyBase,
    attendanceCount,
    attendanceHours,
  ]);

  const computedBaseWage = baseWageCalculation.baseSalary;

  // Live calculation preview
  const calculations = useMemo(() => {
    const baseSalary = computedBaseWage;
    let totalAllowances = 0;
    let totalDeductions = 0;

    allowances.forEach((c) => {
      if (!selectedComponents[c.id]) return;
      const rawVal = componentValues[c.id] ?? Number(c.defaultAmount || 0);
      let calculatedVal = 0;
      if (c.calculationType === "percentage") {
        calculatedVal = (rawVal / 100) * baseSalary;
      } else if (c.calculationType === "perDay") {
        calculatedVal = rawVal * attendanceCount;
      } else if (c.calculationType === "perHour") {
        calculatedVal = rawVal * attendanceHours;
      } else {
        calculatedVal = rawVal;
      }
      totalAllowances += Math.max(0, calculatedVal);
    });

    deductions.forEach((c) => {
      if (!selectedComponents[c.id]) return;
      const rawVal = componentValues[c.id] ?? Number(c.defaultAmount || 0);
      let calculatedVal = 0;
      if (c.calculationType === "percentage") {
        calculatedVal = (rawVal / 100) * baseSalary;
      } else if (c.calculationType === "perDay") {
        calculatedVal = rawVal * absenceCount;
      } else if (c.calculationType === "perHour") {
        calculatedVal = rawVal * absenceHours;
      } else {
        calculatedVal = rawVal;
      }
      totalDeductions += Math.max(0, calculatedVal);
    });

    const netSalary = Math.max(0, baseSalary + totalAllowances - totalDeductions);

    return {
      baseSalary,
      totalAllowances,
      totalDeductions,
      netSalary,
    };
  }, [computedBaseWage, allowances, deductions, selectedComponents, componentValues, attendanceCount, attendanceHours, absenceCount, absenceHours]);

  if (!isOpen || !employee) return null;

  const empName = employee.profile
    ? `${employee.profile.firstName} ${employee.profile.lastName || ""}`.trim()
    : `Employee #${employee.id}`;
  const posName = employee.position?.name || employee.position?.positionName || "Staff Member";

  const handleToggleComponent = (id: number) => {
    setSelectedComponents((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleAmountChange = (id: number, val: number) => {
    setComponentValues((prev) => ({
      ...prev,
      [id]: val,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPeriodId) {
      setError("Please select an active payroll period.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      let resolvedBasic = basicComponent;
      if (!resolvedBasic) {
        try {
          const autoRes = await payrollApi.createComponent({
            name: "Gaji Pokok (Basic Salary)",
            type: "basic",
            calculationType: "fixedAmount",
            defaultAmount: 0,
            isTaxable: true,
            description: "System standard basic salary component",
          });
          resolvedBasic = autoRes.data || null;
          if (resolvedBasic) {
            const newComp = resolvedBasic;
            setComponents((prev) => [...prev, newComp]);
          }
        } catch (autoErr) {
          console.error("Failed to create basic component:", autoErr);
        }
      }

      const componentsPayload: Array<{ componentId: number; amount: number }> = [];
      if (resolvedBasic) {
        componentsPayload.push({
          componentId: resolvedBasic.id,
          amount: computedBaseWage,
        });
      }

      allowances.forEach((c) => {
        if (selectedComponents[c.id]) {
          const rawVal = componentValues[c.id] ?? Number(c.defaultAmount || 0);
          componentsPayload.push({
            componentId: c.id,
            amount: rawVal,
          });
        }
      });

      deductions.forEach((c) => {
        if (selectedComponents[c.id]) {
          const rawVal = componentValues[c.id] ?? Number(c.defaultAmount || 0);
          componentsPayload.push({
            componentId: c.id,
            amount: rawVal,
          });
        }
      });

      await payrollApi.generateSalaryRecord({
        periodId: Number(selectedPeriodId),
        employeeId: employee.id,
        salaryBasis,
        payFrequency,
        attendedDays: attendanceCount,
        loggedHours: attendanceHours,
        autoCalculateBase: true,
        components: componentsPayload,
        notes: notes.trim() || null,
      });

      setSuccessMsg("Salary record generated successfully!");
      if (onSuccess) onSuccess();
      setTimeout(() => {
        onClose();
      }, 900);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to generate salary record.");
    } finally {
      setSubmitting(false);
    }
  };

  const frequencyLabels: Record<PayrollFrequency, string> = {
    monthly: "📅 Monthly",
    biWeekly: "⏱️ Bi-Weekly",
    weekly: "📆 Weekly",
    daily: "☀️ Daily",
    hourly: "⏰ Hourly",
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(5px)",
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
          maxWidth: "800px",
          maxHeight: "92vh",
          overflowY: "auto",
          padding: "1.75rem",
          boxShadow: "var(--shadow-xl)",
          position: "relative",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <h2 style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--text-primary)" }}>
                Process & Generate Payroll
              </h2>
              <Badge variant="info">{posName}</Badge>
            </div>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
              Employee: <strong style={{ color: "var(--primary)" }}>{empName}</strong> (ID #{employee.id})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-muted)",
              cursor: "pointer",
              fontSize: "1.3rem",
            }}
          >
            ✕
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: "0.75rem 1rem",
              borderRadius: "var(--radius-md)",
              backgroundColor: "rgba(239, 68, 68, 0.12)",
              border: "1px solid var(--accent-red)",
              color: "var(--accent-red)",
              fontSize: "0.85rem",
              marginBottom: "1rem",
            }}
          >
            {error}
          </div>
        )}

        {successMsg && (
          <div
            style={{
              padding: "0.75rem 1rem",
              borderRadius: "var(--radius-md)",
              backgroundColor: "rgba(34, 197, 94, 0.15)",
              border: "1px solid var(--accent-emerald)",
              color: "var(--accent-emerald)",
              fontSize: "0.85rem",
              marginBottom: "1rem",
            }}
          >
            ✓ {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Target Payroll Period */}
          <div
            style={{
              padding: "1rem",
              borderRadius: "var(--radius-md)",
              backgroundColor: "var(--bg-surface-elevated)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
              <label style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)" }}>
                Target Payroll Period <span style={{ color: "var(--accent-red)" }}>*</span>
              </label>
            </div>
            <select
              value={selectedPeriodId}
              onChange={(e) => setSelectedPeriodId(e.target.value ? Number(e.target.value) : "")}
              style={{
                width: "100%",
                padding: "0.55rem 0.75rem",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-glow)",
                backgroundColor: "var(--bg-primary)",
                color: "var(--text-primary)",
                fontSize: "0.9rem",
              }}
            >
              <option value="">-- Choose active payroll period --</option>
              {periods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.frequency ? p.frequency.toUpperCase() : "MONTHLY"}) [{p.startDate.slice(0, 10)} to {p.endDate.slice(0, 10)}] - {p.status}
                </option>
              ))}
            </select>
          </div>

          {/* DUAL FREQUENCY SELECTOR: Counted Based On & Paid By */}
          <div
            style={{
              padding: "1rem",
              borderRadius: "var(--radius-md)",
              backgroundColor: "var(--bg-surface-elevated)",
              border: "1px solid var(--border-subtle)",
              display: "flex",
              flexDirection: "column",
              gap: "0.85rem",
            }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              {/* Counted Based On */}
              <div>
                <label style={{ fontSize: "0.825rem", fontWeight: 700, color: "var(--text-primary)", display: "block", marginBottom: "0.2rem" }}>
                  1. Counted Based On (Salary Basis)
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "0.3rem" }}>
                  {(["monthly", "biWeekly", "weekly", "daily", "hourly"] as PayrollFrequency[]).map((b) => {
                    const isSel = salaryBasis === b;
                    return (
                      <button
                        key={b}
                        type="button"
                        onClick={() => setSalaryBasis(b)}
                        style={{
                          padding: "0.4rem 0.15rem",
                          fontSize: "0.72rem",
                          borderRadius: "var(--radius-sm)",
                          border: `1px solid ${isSel ? "var(--primary)" : "var(--border-subtle)"}`,
                          backgroundColor: isSel ? "rgba(212, 175, 55, 0.15)" : "var(--bg-primary)",
                          color: isSel ? "var(--primary)" : "var(--text-secondary)",
                          fontWeight: isSel ? 700 : 500,
                          cursor: "pointer",
                          textAlign: "center",
                        }}
                      >
                        {frequencyLabels[b]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Paid By */}
              <div>
                <label style={{ fontSize: "0.825rem", fontWeight: 700, color: "var(--text-primary)", display: "block", marginBottom: "0.2rem" }}>
                  2. Paid By (Payout Frequency)
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "0.3rem" }}>
                  {(["monthly", "biWeekly", "weekly", "daily", "hourly"] as PayrollFrequency[]).map((f) => {
                    const isSel = payFrequency === f;
                    return (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setPayFrequency(f)}
                        style={{
                          padding: "0.4rem 0.15rem",
                          fontSize: "0.72rem",
                          borderRadius: "var(--radius-sm)",
                          border: `1px solid ${isSel ? "var(--primary)" : "var(--border-subtle)"}`,
                          backgroundColor: isSel ? "rgba(212, 175, 55, 0.15)" : "var(--bg-primary)",
                          color: isSel ? "var(--primary)" : "var(--text-secondary)",
                          fontWeight: isSel ? 700 : 500,
                          cursor: "pointer",
                          textAlign: "center",
                        }}
                      >
                        {frequencyLabels[f]}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Live Formula & Conversion Banner */}
            <div
              style={{
                padding: "0.75rem 1rem",
                borderRadius: "var(--radius-md)",
                backgroundColor: "rgba(212, 175, 55, 0.08)",
                border: "1px dashed var(--border-glow)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-secondary)" }}>
                  Calculation & Conversion Engine
                </div>
                <div style={{ fontSize: "0.85rem", color: "var(--text-primary)", fontWeight: 600, marginTop: "0.15rem" }}>
                  {baseWageCalculation.formulaText}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Base Pay:</span>
                <div style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--primary)" }}>
                  {formatIDR(computedBaseWage)}
                </div>
              </div>
            </div>

            {/* Input rate editor for the selected basis */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", paddingTop: "0.25rem" }}>
              {salaryBasis === "monthly" && (
                <div>
                  <label style={{ fontSize: "0.78rem", color: "var(--text-secondary)", display: "block", marginBottom: "0.2rem" }}>
                    Monthly Salary (IDR)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="50000"
                    value={monthlyBase}
                    onChange={(e) => setMonthlyBase(Math.max(0, Number(e.target.value)))}
                    style={{
                      width: "100%",
                      padding: "0.45rem 0.6rem",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--border-subtle)",
                      backgroundColor: "var(--bg-primary)",
                      color: "var(--text-primary)",
                      fontSize: "0.85rem",
                    }}
                  />
                </div>
              )}

              {salaryBasis === "biWeekly" && (
                <div>
                  <label style={{ fontSize: "0.78rem", color: "var(--text-secondary)", display: "block", marginBottom: "0.2rem" }}>
                    Bi-Weekly Rate (IDR / 2 Minggu)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="25000"
                    value={biWeeklyRate}
                    onChange={(e) => setBiWeeklyRate(Math.max(0, Number(e.target.value)))}
                    style={{
                      width: "100%",
                      padding: "0.45rem 0.6rem",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--border-subtle)",
                      backgroundColor: "var(--bg-primary)",
                      color: "var(--text-primary)",
                      fontSize: "0.85rem",
                    }}
                  />
                </div>
              )}

              {salaryBasis === "weekly" && (
                <div>
                  <label style={{ fontSize: "0.78rem", color: "var(--text-secondary)", display: "block", marginBottom: "0.2rem" }}>
                    Weekly Rate (IDR / Minggu)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="25000"
                    value={weeklyRate}
                    onChange={(e) => setWeeklyRate(Math.max(0, Number(e.target.value)))}
                    style={{
                      width: "100%",
                      padding: "0.45rem 0.6rem",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--border-subtle)",
                      backgroundColor: "var(--bg-primary)",
                      color: "var(--text-primary)",
                      fontSize: "0.85rem",
                    }}
                  />
                </div>
              )}

              {salaryBasis === "daily" && (
                <>
                  <div>
                    <label style={{ fontSize: "0.78rem", color: "var(--text-secondary)", display: "block", marginBottom: "0.2rem" }}>
                      Daily Rate (IDR / Hari)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="10000"
                      value={dailyRate}
                      onChange={(e) => setDailyRate(Math.max(0, Number(e.target.value)))}
                      style={{
                        width: "100%",
                        padding: "0.45rem 0.6rem",
                        borderRadius: "var(--radius-sm)",
                        border: "1px solid var(--border-subtle)",
                        backgroundColor: "var(--bg-primary)",
                        color: "var(--text-primary)",
                        fontSize: "0.85rem",
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "0.78rem", color: "var(--text-secondary)", display: "block", marginBottom: "0.2rem" }}>
                      Attended Days in Period (Attendance Log)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={attendanceCount}
                      onChange={(e) => setAttendanceCount(Math.max(0, Number(e.target.value)))}
                      style={{
                        width: "100%",
                        padding: "0.45rem 0.6rem",
                        borderRadius: "var(--radius-sm)",
                        border: "1px solid var(--border-subtle)",
                        backgroundColor: "var(--bg-primary)",
                        color: "var(--text-primary)",
                        fontSize: "0.85rem",
                      }}
                    />
                  </div>
                </>
              )}

              {salaryBasis === "hourly" && (
                <>
                  <div>
                    <label style={{ fontSize: "0.78rem", color: "var(--text-secondary)", display: "block", marginBottom: "0.2rem" }}>
                      Hourly Rate (IDR / Jam)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      value={hourlyRate}
                      onChange={(e) => setHourlyRate(Math.max(0, Number(e.target.value)))}
                      style={{
                        width: "100%",
                        padding: "0.45rem 0.6rem",
                        borderRadius: "var(--radius-sm)",
                        border: "1px solid var(--border-subtle)",
                        backgroundColor: "var(--bg-primary)",
                        color: "var(--text-primary)",
                        fontSize: "0.85rem",
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "0.78rem", color: "var(--text-secondary)", display: "block", marginBottom: "0.2rem" }}>
                      Logged Hours in Period (Attendance Log)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={attendanceHours}
                      onChange={(e) => setAttendanceHours(Math.max(0, Number(e.target.value)))}
                      style={{
                        width: "100%",
                        padding: "0.45rem 0.6rem",
                        borderRadius: "var(--radius-sm)",
                        border: "1px solid var(--border-subtle)",
                        backgroundColor: "var(--bg-primary)",
                        color: "var(--text-primary)",
                        fontSize: "0.85rem",
                      }}
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Allowances Section */}
          <div
            style={{
              padding: "1rem",
              borderRadius: "var(--radius-md)",
              backgroundColor: "var(--bg-surface-elevated)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
              <div>
                <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)" }}>
                  Allowances (Tunjangan)
                </span>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginLeft: "0.5rem" }}>
                  Total: +{formatIDR(calculations.totalAllowances)}
                </span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setQuickAddType(quickAddType === "allowance" ? null : "allowance")}
                style={{ fontSize: "0.75rem", padding: "0.2rem 0.6rem" }}
              >
                {quickAddType === "allowance" ? "Cancel" : "+ Add Allowance"}
              </Button>
            </div>

            {quickAddType === "allowance" && (
              <div
                style={{
                  padding: "0.75rem",
                  marginBottom: "0.75rem",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "rgba(34, 197, 94, 0.08)",
                  border: "1px solid rgba(34, 197, 94, 0.3)",
                  display: "flex",
                  gap: "0.5rem",
                  alignItems: "center",
                }}
              >
                <input
                  type="text"
                  placeholder="Allowance name (e.g. Transport)"
                  value={quickName}
                  onChange={(e) => setQuickName(e.target.value)}
                  style={{
                    flex: 1,
                    padding: "0.4rem 0.6rem",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--border-subtle)",
                    backgroundColor: "var(--bg-primary)",
                    color: "var(--text-primary)",
                    fontSize: "0.8rem",
                  }}
                />
                <input
                  type="number"
                  placeholder="Amount / %"
                  value={quickAmount || ""}
                  onChange={(e) => setQuickAmount(Number(e.target.value))}
                  style={{
                    width: "120px",
                    padding: "0.4rem 0.6rem",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--border-subtle)",
                    backgroundColor: "var(--bg-primary)",
                    color: "var(--text-primary)",
                    fontSize: "0.8rem",
                  }}
                />
                <Button type="button" size="sm" onClick={handleQuickCreateComponent} disabled={creatingComponent}>
                  Add
                </Button>
              </div>
            )}

            <div className="custom-scrollbar" style={{ display: "flex", flexDirection: "column", gap: "0.4rem", maxHeight: "240px", overflowY: "auto", overscrollBehavior: "contain", paddingRight: "0.25rem" }}>
              {allowances.map((comp) => {
                const isChecked = Boolean(selectedComponents[comp.id]);
                const rawVal = componentValues[comp.id] ?? Number(comp.defaultAmount || 0);
                const computedVal =
                  comp.calculationType === "percentage"
                    ? (rawVal / 100) * computedBaseWage
                    : comp.calculationType === "perDay"
                    ? rawVal * attendanceCount
                    : comp.calculationType === "perHour"
                    ? rawVal * attendanceHours
                    : rawVal;

                return (
                  <div
                    key={comp.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "0.5rem 0.75rem",
                      borderRadius: "var(--radius-sm)",
                      backgroundColor: isChecked ? "rgba(34, 197, 94, 0.06)" : "var(--bg-primary)",
                      border: `1px solid ${isChecked ? "rgba(34, 197, 94, 0.3)" : "var(--border-subtle)"}`,
                    }}
                  >
                    <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", cursor: "pointer", flex: 1, fontSize: "0.85rem" }}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleComponent(comp.id)}
                        style={{ width: "16px", height: "16px" }}
                      />
                      <div>
                        <div style={{ fontWeight: 600 }}>{comp.name}</div>
                        <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                          {comp.calculationType === "percentage" ? "Percentage of Base" : comp.calculationType === "perDay" ? "Per attended day" : comp.calculationType === "perHour" ? "Per attended hour" : "Fixed Amount"}
                        </div>
                      </div>
                    </label>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <input
                        type="number"
                        min="0"
                        disabled={!isChecked}
                        value={rawVal}
                        onChange={(e) => handleAmountChange(comp.id, Math.max(0, Number(e.target.value)))}
                        style={{
                          width: "120px",
                          padding: "0.3rem 0.5rem",
                          borderRadius: "var(--radius-sm)",
                          border: "1px solid var(--border-subtle)",
                          backgroundColor: isChecked ? "var(--bg-surface)" : "var(--bg-surface-elevated)",
                          color: "var(--text-primary)",
                          fontSize: "0.825rem",
                          textAlign: "right",
                        }}
                      />
                      <span style={{ fontSize: "0.8rem", color: isChecked ? "var(--accent-emerald)" : "var(--text-muted)", width: "100px", textAlign: "right" }}>
                        = {formatIDR(computedVal)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteComponent(comp.id, comp.name)}
                        style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "0.2rem" }}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Deductions Section */}
          <div
            style={{
              padding: "1rem",
              borderRadius: "var(--radius-md)",
              backgroundColor: "var(--bg-surface-elevated)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
              <div>
                <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)" }}>
                  Deductions (Potongan)
                </span>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginLeft: "0.5rem" }}>
                  Total: -{formatIDR(calculations.totalDeductions)}
                </span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setQuickAddType(quickAddType === "deduction" ? null : "deduction")}
                style={{ fontSize: "0.75rem", padding: "0.2rem 0.6rem" }}
              >
                {quickAddType === "deduction" ? "Cancel" : "+ Add Deduction"}
              </Button>
            </div>

            {quickAddType === "deduction" && (
              <div
                style={{
                  padding: "0.75rem",
                  marginBottom: "0.75rem",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "rgba(239, 68, 68, 0.08)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  display: "flex",
                  gap: "0.5rem",
                  alignItems: "center",
                }}
              >
                <input
                  type="text"
                  placeholder="Deduction name (e.g. Late Penalty)"
                  value={quickName}
                  onChange={(e) => setQuickName(e.target.value)}
                  style={{
                    flex: 1,
                    padding: "0.4rem 0.6rem",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--border-subtle)",
                    backgroundColor: "var(--bg-primary)",
                    color: "var(--text-primary)",
                    fontSize: "0.8rem",
                  }}
                />
                <input
                  type="number"
                  placeholder="Amount / %"
                  value={quickAmount || ""}
                  onChange={(e) => setQuickAmount(Number(e.target.value))}
                  style={{
                    width: "120px",
                    padding: "0.4rem 0.6rem",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--border-subtle)",
                    backgroundColor: "var(--bg-primary)",
                    color: "var(--text-primary)",
                    fontSize: "0.8rem",
                  }}
                />
                <Button type="button" size="sm" onClick={handleQuickCreateComponent} disabled={creatingComponent}>
                  Add
                </Button>
              </div>
            )}

            <div className="custom-scrollbar" style={{ display: "flex", flexDirection: "column", gap: "0.4rem", maxHeight: "240px", overflowY: "auto", overscrollBehavior: "contain", paddingRight: "0.25rem" }}>
              {deductions.map((comp) => {
                const isChecked = Boolean(selectedComponents[comp.id]);
                const rawVal = componentValues[comp.id] ?? Number(comp.defaultAmount || 0);
                const computedVal =
                  comp.calculationType === "percentage"
                    ? (rawVal / 100) * computedBaseWage
                    : comp.calculationType === "perDay"
                    ? rawVal * absenceCount
                    : comp.calculationType === "perHour"
                    ? rawVal * absenceHours
                    : rawVal;

                return (
                  <div
                    key={comp.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "0.5rem 0.75rem",
                      borderRadius: "var(--radius-sm)",
                      backgroundColor: isChecked ? "rgba(239, 68, 68, 0.06)" : "var(--bg-primary)",
                      border: `1px solid ${isChecked ? "rgba(239, 68, 68, 0.3)" : "var(--border-subtle)"}`,
                    }}
                  >
                    <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", cursor: "pointer", flex: 1, fontSize: "0.85rem" }}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleComponent(comp.id)}
                        style={{ width: "16px", height: "16px" }}
                      />
                      <div>
                        <div style={{ fontWeight: 600 }}>{comp.name}</div>
                        <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                          {comp.calculationType === "percentage" ? "Percentage of Base" : comp.calculationType === "perDay" ? `Absence deduction (${absenceCount} days absent)` : comp.calculationType === "perHour" ? "Absence hours" : "Fixed Amount"}
                        </div>
                      </div>
                    </label>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <input
                        type="number"
                        min="0"
                        disabled={!isChecked}
                        value={rawVal}
                        onChange={(e) => handleAmountChange(comp.id, Math.max(0, Number(e.target.value)))}
                        style={{
                          width: "120px",
                          padding: "0.3rem 0.5rem",
                          borderRadius: "var(--radius-sm)",
                          border: "1px solid var(--border-subtle)",
                          backgroundColor: isChecked ? "var(--bg-surface)" : "var(--bg-surface-elevated)",
                          color: "var(--text-primary)",
                          fontSize: "0.825rem",
                          textAlign: "right",
                        }}
                      />
                      <span style={{ fontSize: "0.8rem", color: isChecked ? "var(--accent-red)" : "var(--text-muted)", width: "100px", textAlign: "right" }}>
                        = {formatIDR(computedVal)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteComponent(comp.id, comp.name)}
                        style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "0.2rem" }}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label style={{ display: "block", fontSize: "0.825rem", fontWeight: 600, marginBottom: "0.4rem", color: "var(--text-secondary)" }}>
              Calculation Remarks / Deliverable Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Attendance verified, overtime included"
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

          {/* Live Take-Home Pay Banner */}
          <div
            style={{
              padding: "1.1rem 1.25rem",
              borderRadius: "var(--radius-md)",
              backgroundColor: "rgba(212, 175, 55, 0.08)",
              border: "1px solid var(--border-glow)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Estimated Take-Home Pay (Gaji Bersih)
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
                Base ({salaryBasis} → {payFrequency}) {formatIDR(calculations.baseSalary)} + Allowances {formatIDR(calculations.totalAllowances)} - Deductions {formatIDR(calculations.totalDeductions)}
              </div>
            </div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--primary)" }}>
              {formatIDR(calculations.netSalary)}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", paddingTop: "0.5rem" }}>
            <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || !selectedPeriodId || computedBaseWage <= 0}
              style={{
                backgroundColor: "var(--primary)",
                color: "#000",
                fontWeight: 700,
                padding: "0.6rem 1.5rem",
              }}
            >
              {submitting ? "Saving & Generating..." : "⚡ Save & Generate Payroll"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
