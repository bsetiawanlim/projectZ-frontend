"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { SortableTh } from "@/components/ui/SortableTh";
import { employeeApi, payrollApi } from "@/lib/api";
import {
  formatIDR,
  type EmployeeRecord,
  type PayrollPeriodRecord,
  type PayrollComponentRecord,
  type SalaryRecordItem,
} from "@pz/shared";
import { SetEmployeePayrollModal } from "@/components/payroll/SetEmployeePayrollModal";
import { PayrollPeriodModal } from "@/components/payroll/PayrollPeriodModal";
import { PayrollComponentModal } from "@/components/payroll/PayrollComponentModal";
import { EmployeePayrollModal } from "@/components/employees/EmployeePayrollModal";

type ActiveTab = "employees" | "records" | "periods" | "components";

export default function PayrollPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("employees");
  const [search, setSearch] = useState("");

  // Data State
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [salaryRecords, setSalaryRecords] = useState<SalaryRecordItem[]>([]);
  const [periods, setPeriods] = useState<PayrollPeriodRecord[]>([]);
  const [components, setComponents] = useState<PayrollComponentRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [selectedEmployeeForSetup, setSelectedEmployeeForSetup] = useState<EmployeeRecord | null>(null);
  const [selectedEmployeeForHistory, setSelectedEmployeeForHistory] = useState<EmployeeRecord | null>(null);
  const [periodModalOpen, setPeriodModalOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<PayrollPeriodRecord | null>(null);
  const [componentModalOpen, setComponentModalOpen] = useState(false);
  const [selectedComponent, setSelectedComponent] = useState<PayrollComponentRecord | null>(null);

  // Tab 1: Employee Sort
  type PayrollEmpSortField = "name" | "position" | "basis" | "earned" | "latestNet" | "lastPeriod";
  const [empSortField, setEmpSortField] = useState<PayrollEmpSortField>("name");
  const [empSortOrder, setEmpSortOrder] = useState<"asc" | "desc">("asc");

  const handleEmpSort = (field: PayrollEmpSortField) => {
    if (empSortField === field) {
      setEmpSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setEmpSortField(field);
      setEmpSortOrder("asc");
    }
  };

  // Tab 2: Records Sort
  type PayrollRecSortField = "period" | "employee" | "basic" | "allowance" | "deduction" | "net" | "status";
  const [recSortField, setRecSortField] = useState<PayrollRecSortField>("period");
  const [recSortOrder, setRecSortOrder] = useState<"asc" | "desc">("desc");

  const handleRecSort = (field: PayrollRecSortField) => {
    if (recSortField === field) {
      setRecSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setRecSortField(field);
      setRecSortOrder("desc");
    }
  };

  // Tab 3: Periods Sort
  type PayrollPeriodSortField = "name" | "cycle" | "disbursement" | "status" | "notes";
  const [periodSortField, setPeriodSortField] = useState<PayrollPeriodSortField>("cycle");
  const [periodSortOrder, setPeriodSortOrder] = useState<"asc" | "desc">("desc");

  const handlePeriodSort = (field: PayrollPeriodSortField) => {
    if (periodSortField === field) {
      setPeriodSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setPeriodSortField(field);
      setPeriodSortOrder("desc");
    }
  };

  // Tab 4: Components Sort
  type PayrollCompSortField = "name" | "type" | "rule" | "defaultVal" | "taxable";
  const [compSortField, setCompSortField] = useState<PayrollCompSortField>("name");
  const [compSortOrder, setCompSortOrder] = useState<"asc" | "desc">("asc");

  const handleCompSort = (field: PayrollCompSortField) => {
    if (compSortField === field) {
      setCompSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setCompSortField(field);
      setCompSortOrder("asc");
    }
  };


  // Fetch all necessary data
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [empRes, salaryRes, periodRes, compRes] = await Promise.all([
        employeeApi.listEmployees({ limit: 100 }),
        payrollApi.listSalaryRecords({ limit: 100 }),
        payrollApi.listPeriods({ limit: 50 }),
        payrollApi.listComponents({ limit: 100 }),
      ]);
      setEmployees(empRes.items || []);
      setSalaryRecords(salaryRes.items || []);
      setPeriods(periodRes.items || []);
      setComponents(compRes.items || []);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to load payroll data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Tab 1: Employee Payroll Mapping
  const filteredEmployees = useMemo(() => {
    const q = search.toLowerCase().trim();
    let list = employees;
    if (q) {
      list = employees.filter((emp) => {
        const name = `${emp.profile?.firstName || ""} ${emp.profile?.lastName || ""}`.toLowerCase();
        const pos = (emp.position?.name || emp.position?.positionName || "").toLowerCase();
        return name.includes(q) || pos.includes(q);
      });
    }

    return [...list].sort((a, b) => {
      let cmp = 0;
      if (empSortField === "name") {
        const nameA = `${a.profile?.firstName || ""} ${a.profile?.lastName || ""}`.trim();
        const nameB = `${b.profile?.firstName || ""} ${b.profile?.lastName || ""}`.trim();
        cmp = nameA.localeCompare(nameB);
      } else if (empSortField === "position") {
        const posA = a.position?.name || a.position?.positionName || "";
        const posB = b.position?.name || b.position?.positionName || "";
        cmp = posA.localeCompare(posB);
      } else if (empSortField === "basis") {
        const basisA = a.salaryBasis || "";
        const basisB = b.salaryBasis || "";
        cmp = basisA.localeCompare(basisB);
      } else if (empSortField === "earned") {
        const earnedA = salaryRecords.filter((r) => r.employeeId === a.id && r.status === "PAID").reduce((sum, r) => sum + Number(r.netSalary || 0), 0);
        const earnedB = salaryRecords.filter((r) => r.employeeId === b.id && r.status === "PAID").reduce((sum, r) => sum + Number(r.netSalary || 0), 0);
        cmp = earnedA - earnedB;
      } else if (empSortField === "latestNet") {
        const latestA = salaryRecords.find((r) => r.employeeId === a.id);
        const latestB = salaryRecords.find((r) => r.employeeId === b.id);
        cmp = (Number(latestA?.netSalary) || 0) - (Number(latestB?.netSalary) || 0);
      } else if (empSortField === "lastPeriod") {
        const pA = salaryRecords.find((r) => r.employeeId === a.id)?.period?.name || "";
        const pB = salaryRecords.find((r) => r.employeeId === b.id)?.period?.name || "";
        cmp = pA.localeCompare(pB);
      }
      return empSortOrder === "asc" ? cmp : -cmp;
    });
  }, [employees, search, salaryRecords, empSortField, empSortOrder]);

  // Tab 2: Salary Records List
  const filteredRecords = useMemo(() => {
    const q = search.toLowerCase().trim();
    let list = salaryRecords;
    if (q) {
      list = salaryRecords.filter((rec) => {
        const empName = `${rec.employee?.profile?.firstName || ""} ${rec.employee?.profile?.lastName || ""}`.toLowerCase();
        const pName = (rec.period?.name || "").toLowerCase();
        return empName.includes(q) || pName.includes(q);
      });
    }

    return [...list].sort((a, b) => {
      let cmp = 0;
      if (recSortField === "period") {
        cmp = (a.period?.name || "").localeCompare(b.period?.name || "");
      } else if (recSortField === "employee") {
        const nameA = `${a.employee?.profile?.firstName || ""} ${a.employee?.profile?.lastName || ""}`.trim();
        const nameB = `${b.employee?.profile?.firstName || ""} ${b.employee?.profile?.lastName || ""}`.trim();
        cmp = nameA.localeCompare(nameB);
      } else if (recSortField === "basic") {
        cmp = (Number(a.basicSalary) || 0) - (Number(b.basicSalary) || 0);
      } else if (recSortField === "allowance") {
        cmp = (Number(a.totalAllowances) || 0) - (Number(b.totalAllowances) || 0);
      } else if (recSortField === "deduction") {
        cmp = (Number(a.totalDeductions) || 0) - (Number(b.totalDeductions) || 0);
      } else if (recSortField === "net") {
        cmp = (Number(a.netSalary) || 0) - (Number(b.netSalary) || 0);
      } else if (recSortField === "status") {
        cmp = (a.status || "").localeCompare(b.status || "");
      }
      return recSortOrder === "asc" ? cmp : -cmp;
    });
  }, [salaryRecords, search, recSortField, recSortOrder]);

  // Tab 3: Periods
  const filteredPeriods = useMemo(() => {
    const q = search.toLowerCase().trim();
    let list = periods;
    if (q) {
      list = periods.filter((p) => p.name.toLowerCase().includes(q) || (p.notes || "").toLowerCase().includes(q));
    }

    return [...list].sort((a, b) => {
      let cmp = 0;
      if (periodSortField === "name") {
        cmp = (a.name || "").localeCompare(b.name || "");
      } else if (periodSortField === "cycle") {
        const startA = new Date(a.startDate || 0).getTime();
        const startB = new Date(b.startDate || 0).getTime();
        cmp = startA - startB;
      } else if (periodSortField === "disbursement") {
        const payA = new Date(a.paymentDate || 0).getTime();
        const payB = new Date(b.paymentDate || 0).getTime();
        cmp = payA - payB;
      } else if (periodSortField === "status") {
        cmp = (a.status || "").localeCompare(b.status || "");
      } else if (periodSortField === "notes") {
        cmp = (a.notes || "").localeCompare(b.notes || "");
      }
      return periodSortOrder === "asc" ? cmp : -cmp;
    });
  }, [periods, search, periodSortField, periodSortOrder]);

  // Tab 4: Components
  const filteredComponents = useMemo(() => {
    const q = search.toLowerCase().trim();
    let list = components;
    if (q) {
      list = components.filter((c) => c.name.toLowerCase().includes(q) || (c.description || "").toLowerCase().includes(q));
    }

    return [...list].sort((a, b) => {
      let cmp = 0;
      if (compSortField === "name") {
        cmp = (a.name || "").localeCompare(b.name || "");
      } else if (compSortField === "type") {
        cmp = (a.type || "").localeCompare(b.type || "");
      } else if (compSortField === "rule") {
        cmp = (a.calculationType || "").localeCompare(b.calculationType || "");
      } else if (compSortField === "defaultVal") {
        cmp = (Number(a.defaultAmount) || 0) - (Number(b.defaultAmount) || 0);
      } else if (compSortField === "taxable") {
        const taxA = a.isTaxable ? 1 : 0;
        const taxB = b.isTaxable ? 1 : 0;
        cmp = taxA - taxB;
      }
      return compSortOrder === "asc" ? cmp : -cmp;
    });
  }, [components, search, compSortField, compSortOrder]);

  // Summary Metrics
  const totalEmployeesCount = employees.length;
  const activePeriodsCount = periods.filter((p) => p.status === "PROCESSING" || p.status === "DRAFT").length;
  const totalPaidNet = salaryRecords
    .filter((r) => r.status === "PAID")
    .reduce((sum, r) => sum + Number(r.netSalary || 0), 0);
  const totalPendingNet = salaryRecords
    .filter((r) => r.status === "PENDING" || r.status === "APPROVED")
    .reduce((sum, r) => sum + Number(r.netSalary || 0), 0);

  const getRecordStatusBadge = (status: string) => {
    switch (status) {
      case "PAID":
        return <Badge variant="success">✓ Paid</Badge>;
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

  const getPeriodStatusBadge = (status: string) => {
    switch (status) {
      case "DRAFT":
        return <Badge variant="warning">Draft</Badge>;
      case "PROCESSING":
        return <Badge variant="info">Processing</Badge>;
      case "APPROVED":
        return <Badge variant="info">Approved</Badge>;
      case "PAID":
        return <Badge variant="success">Paid Out</Badge>;
      case "CANCELLED":
        return <Badge variant="danger">Cancelled</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  const handleUpdateRecordStatus = async (recordId: number, newStatus: any) => {
    try {
      await payrollApi.updateSalaryRecord({ id: recordId, status: newStatus });
      loadData();
    } catch (err: any) {
      alert(err?.message || "Failed to update record status");
    }
  };

  const handleDeletePeriod = async (id: number) => {
    if (!confirm("Are you sure you want to delete this payroll period?")) return;
    try {
      await payrollApi.deletePeriod(id);
      loadData();
    } catch (err: any) {
      alert(err?.message || "Failed to delete payroll period");
    }
  };

  const handleDeleteComponent = async (id: number) => {
    if (!confirm("Are you sure you want to delete this payroll component?")) return;
    try {
      await payrollApi.deleteComponent(id);
      loadData();
    } catch (err: any) {
      alert(err?.message || "Failed to delete component");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Page Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "1.75rem" }}>💵</span>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
              Payroll Management
            </h1>
          </div>
          <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.875rem", color: "var(--text-secondary)" }}>
            Configure employee compensation, allowances & deductions, run payroll periods, and generate payslips.
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.75rem" }}>
          <Button
            variant="ghost"
            onClick={loadData}
            disabled={loading}
            style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
          >
            🔄 Refresh
          </Button>

          {activeTab === "periods" && (
            <Button
              onClick={() => {
                setSelectedPeriod(null);
                setPeriodModalOpen(true);
              }}
              style={{ backgroundColor: "var(--primary)", color: "#000", fontWeight: 700 }}
            >
              ➕ New Period
            </Button>
          )}

          {activeTab === "components" && (
            <Button
              onClick={() => {
                setSelectedComponent(null);
                setComponentModalOpen(true);
              }}
              style={{ backgroundColor: "var(--primary)", color: "#000", fontWeight: 700 }}
            >
              ➕ New Component
            </Button>
          )}
        </div>
      </div>

      {/* Top Metric Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
        <Card style={{ padding: "1.25rem" }}>
          <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Total Employees
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--text-primary)", marginTop: "0.25rem" }}>
            {totalEmployeesCount}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
            Active on payroll roster
          </div>
        </Card>

        <Card style={{ padding: "1.25rem" }}>
          <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Open Periods
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--accent-amber)", marginTop: "0.25rem" }}>
            {activePeriodsCount}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
            Draft or Processing
          </div>
        </Card>

        <Card style={{ padding: "1.25rem" }}>
          <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Pending Salary Payouts
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--accent-blue)", marginTop: "0.25rem" }}>
            {formatIDR(totalPendingNet)}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
            Awaiting approval or disbursement
          </div>
        </Card>

        <Card style={{ padding: "1.25rem" }}>
          <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Disbursed (Paid Out)
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--accent-green)", marginTop: "0.25rem" }}>
            {formatIDR(totalPaidNet)}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
            Historical total paid
          </div>
        </Card>
      </div>

      {/* Navigation Tabs & Search Toolbar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
          borderBottom: "1px solid var(--border-subtle)",
          paddingBottom: "0.75rem",
        }}
      >
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            onClick={() => setActiveTab("employees")}
            style={{
              padding: "0.55rem 1rem",
              borderRadius: "var(--radius-md)",
              border: "none",
              backgroundColor: activeTab === "employees" ? "var(--bg-surface-elevated)" : "transparent",
              color: activeTab === "employees" ? "var(--primary)" : "var(--text-secondary)",
              fontWeight: activeTab === "employees" ? 700 : 500,
              fontSize: "0.9rem",
              cursor: "pointer",
              transition: "all var(--transition-fast)",
            }}
          >
            👥 Employees Setup ({employees.length})
          </button>

          <button
            onClick={() => setActiveTab("records")}
            style={{
              padding: "0.55rem 1rem",
              borderRadius: "var(--radius-md)",
              border: "none",
              backgroundColor: activeTab === "records" ? "var(--bg-surface-elevated)" : "transparent",
              color: activeTab === "records" ? "var(--primary)" : "var(--text-secondary)",
              fontWeight: activeTab === "records" ? 700 : 500,
              fontSize: "0.9rem",
              cursor: "pointer",
              transition: "all var(--transition-fast)",
            }}
          >
            📑 Payslip Records ({salaryRecords.length})
          </button>

          <button
            onClick={() => setActiveTab("periods")}
            style={{
              padding: "0.55rem 1rem",
              borderRadius: "var(--radius-md)",
              border: "none",
              backgroundColor: activeTab === "periods" ? "var(--bg-surface-elevated)" : "transparent",
              color: activeTab === "periods" ? "var(--primary)" : "var(--text-secondary)",
              fontWeight: activeTab === "periods" ? 700 : 500,
              fontSize: "0.9rem",
              cursor: "pointer",
              transition: "all var(--transition-fast)",
            }}
          >
            🗓️ Payroll Periods ({periods.length})
          </button>

          <button
            onClick={() => setActiveTab("components")}
            style={{
              padding: "0.55rem 1rem",
              borderRadius: "var(--radius-md)",
              border: "none",
              backgroundColor: activeTab === "components" ? "var(--bg-surface-elevated)" : "transparent",
              color: activeTab === "components" ? "var(--primary)" : "var(--text-secondary)",
              fontWeight: activeTab === "components" ? 700 : 500,
              fontSize: "0.9rem",
              cursor: "pointer",
              transition: "all var(--transition-fast)",
            }}
          >
            🏷️ Components & Formulas ({components.length})
          </button>
        </div>

        {/* Search */}
        <div style={{ minWidth: "260px" }}>
          <input
            type="text"
            placeholder="Search records, names, or codes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "0.5rem 0.85rem",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-subtle)",
              backgroundColor: "var(--bg-surface)",
              color: "var(--text-primary)",
              fontSize: "0.875rem",
            }}
          />
        </div>
      </div>

      {/* Error alert */}
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

      {/* TAB CONTENT */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "4rem", color: "var(--text-muted)" }}>
          Loading payroll data...
        </div>
      ) : (
        <>
          {/* TAB 1: EMPLOYEES SETUP */}
          {activeTab === "employees" && (
            <Card style={{ overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <div className="custom-scrollbar" style={{ overflowX: "auto", overflowY: "auto", maxHeight: "calc(100vh - 350px)", minHeight: "360px" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.875rem" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border-subtle)", backgroundColor: "var(--bg-surface-elevated)", color: "var(--text-secondary)", position: "sticky", top: 0, zIndex: 2 }}>
                      <SortableTh field="name" currentSortField={empSortField} currentSortOrder={empSortOrder} onSort={handleEmpSort} style={{ padding: "0.85rem 1rem" }}>
                        Employee Name
                      </SortableTh>
                      <SortableTh field="position" currentSortField={empSortField} currentSortOrder={empSortOrder} onSort={handleEmpSort} style={{ padding: "0.85rem 1rem" }}>
                        Position
                      </SortableTh>
                      <SortableTh field="basis" currentSortField={empSortField} currentSortOrder={empSortOrder} onSort={handleEmpSort} style={{ padding: "0.85rem 1rem" }}>
                        Pay Basis
                      </SortableTh>
                      <SortableTh field="earned" currentSortField={empSortField} currentSortOrder={empSortOrder} onSort={handleEmpSort} style={{ padding: "0.85rem 1rem" }}>
                        Total Earned So Far
                      </SortableTh>
                      <SortableTh field="latestNet" currentSortField={empSortField} currentSortOrder={empSortOrder} onSort={handleEmpSort} style={{ padding: "0.85rem 1rem" }}>
                        Latest Net Pay
                      </SortableTh>
                      <SortableTh field="lastPeriod" currentSortField={empSortField} currentSortOrder={empSortOrder} onSort={handleEmpSort} style={{ padding: "0.85rem 1rem" }}>
                        Last Period Paid
                      </SortableTh>
                      <th style={{ padding: "0.85rem 1rem", textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEmployees.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ padding: "2.5rem", textAlign: "center", color: "var(--text-muted)" }}>
                          No employees found.
                        </td>
                      </tr>
                    ) : (
                      filteredEmployees.map((emp) => {
                        const empName = emp.profile
                          ? `${emp.profile.firstName} ${emp.profile.lastName || ""}`.trim()
                          : `Employee #${emp.id}`;
                        const posName = emp.position?.name || emp.position?.positionName || "—";
                        
                        // Find latest salary record
                        const latestRec = salaryRecords.find((r) => r.employeeId === emp.id);

                        return (
                          <tr
                            key={emp.id}
                            style={{
                              borderBottom: "1px solid var(--border-subtle)",
                              transition: "background var(--transition-fast)",
                            }}
                          >
                            <td style={{ padding: "0.85rem 1rem" }}>
                              <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{empName}</div>
                              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>ID #{emp.id}</div>
                            </td>
                            <td style={{ padding: "0.85rem 1rem", color: "var(--text-secondary)" }}>
                              <Badge variant="default">{posName}</Badge>
                            </td>
                                                        <td style={{ padding: "0.85rem 1rem" }}>
                              <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                                <Badge variant="default">Basis: {(emp.salaryBasis || emp.employmentType || "monthly").toUpperCase()}</Badge>
                                <Badge variant="info">Paid: {(emp.payFrequency || "monthly").toUpperCase()}</Badge>
                              </div>
                            </td>
                            <td style={{ padding: "0.85rem 1rem" }}>
                              {(() => {
                                const empRecords = salaryRecords.filter((r) => r.employeeId === emp.id);
                                const totalEarned = empRecords
                                  .filter((r) => r.status === "PAID" || r.status === "APPROVED")
                                  .reduce((sum, r) => sum + Number(r.netSalary || 0), 0);

                                return (
                                  <div>
                                    <div style={{ fontWeight: 800, color: totalEarned > 0 ? "var(--accent-green)" : "var(--text-muted)", fontSize: "0.95rem" }}>
                                      {totalEarned > 0 ? formatIDR(totalEarned) : "Rp 0"}
                                    </div>
                                    <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.15rem" }}>
                                      {empRecords.length > 0 ? `${empRecords.length} payslips recorded` : "No payslips"}
                                    </div>
                                  </div>
                                );
                              })()}
                            </td>
                            <td style={{ padding: "0.85rem 1rem" }}>
                              {latestRec ? (
                                <span style={{ fontWeight: 700, color: "var(--primary)" }}>
                                  {formatIDR(latestRec.netSalary)}
                                </span>
                              ) : (
                                <span style={{ color: "var(--text-muted)" }}>Not calculated</span>
                              )}
                            </td>
                            <td style={{ padding: "0.85rem 1rem" }}>
                              {latestRec?.period ? (
                                <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                                  {latestRec.period.name} ({getRecordStatusBadge(latestRec.status)})
                                </div>
                              ) : (
                                <span style={{ color: "var(--text-muted)" }}>—</span>
                              )}
                            </td>
                            <td style={{ padding: "0.85rem 1rem", textAlign: "right" }}>
                              <div style={{ display: "inline-flex", gap: "0.5rem" }}>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setSelectedEmployeeForHistory(emp)}
                                  style={{ fontSize: "0.8rem" }}
                                >
                                  📜 History
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => setSelectedEmployeeForSetup(emp)}
                                  style={{
                                    backgroundColor: "var(--primary)",
                                    color: "#000",
                                    fontWeight: 700,
                                    fontSize: "0.8rem",
                                  }}
                                >
                                  ⚙️ Set Payroll
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* TAB 2: SALARY RECORDS */}
          {activeTab === "records" && (
            <Card style={{ overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <div className="custom-scrollbar" style={{ overflowX: "auto", overflowY: "auto", maxHeight: "calc(100vh - 350px)", minHeight: "360px" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.875rem" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border-subtle)", backgroundColor: "var(--bg-surface-elevated)", color: "var(--text-secondary)", position: "sticky", top: 0, zIndex: 2 }}>
                      <SortableTh field="period" currentSortField={recSortField} currentSortOrder={recSortOrder} onSort={handleRecSort} style={{ padding: "0.85rem 1rem" }}>
                        Period
                      </SortableTh>
                      <SortableTh field="employee" currentSortField={recSortField} currentSortOrder={recSortOrder} onSort={handleRecSort} style={{ padding: "0.85rem 1rem" }}>
                        Employee
                      </SortableTh>
                      <SortableTh field="basic" currentSortField={recSortField} currentSortOrder={recSortOrder} onSort={handleRecSort} style={{ padding: "0.85rem 1rem" }}>
                        Basic Salary
                      </SortableTh>
                      <SortableTh field="allowance" currentSortField={recSortField} currentSortOrder={recSortOrder} onSort={handleRecSort} style={{ padding: "0.85rem 1rem" }}>
                        Allowances
                      </SortableTh>
                      <SortableTh field="deduction" currentSortField={recSortField} currentSortOrder={recSortOrder} onSort={handleRecSort} style={{ padding: "0.85rem 1rem" }}>
                        Deductions
                      </SortableTh>
                      <SortableTh field="net" currentSortField={recSortField} currentSortOrder={recSortOrder} onSort={handleRecSort} style={{ padding: "0.85rem 1rem" }}>
                        Net Salary
                      </SortableTh>
                      <SortableTh field="status" currentSortField={recSortField} currentSortOrder={recSortOrder} onSort={handleRecSort} style={{ padding: "0.85rem 1rem" }}>
                        Status
                      </SortableTh>
                      <th style={{ padding: "0.85rem 1rem", textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ padding: "2.5rem", textAlign: "center", color: "var(--text-muted)" }}>
                          No salary records found. Configure employee payroll in the Employees tab first.
                        </td>
                      </tr>
                    ) : (
                      filteredRecords.map((r) => {
                        const empName = r.employee?.profile
                          ? `${r.employee.profile.firstName} ${r.employee.profile.lastName || ""}`.trim()
                          : `Employee #${r.employeeId}`;

                        return (
                          <tr key={r.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                            <td style={{ padding: "0.85rem 1rem" }}>
                              <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{r.period?.name || `Period #${r.periodId}`}</div>
                                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
                                  Basis: {(r.salaryBasis || 'monthly').toUpperCase()} → Paid: {(r.payFrequency || 'monthly').toUpperCase()}
                                </div>
                            </td>
                            <td style={{ padding: "0.85rem 1rem" }}>
                              <div style={{ fontWeight: 600 }}>{empName}</div>
                              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                                {r.employee?.position?.name || "Staff"}
                              </div>
                            </td>
                            <td style={{ padding: "0.85rem 1rem", color: "var(--text-secondary)" }}>
                              {formatIDR(r.basicSalary)}
                            </td>
                            <td style={{ padding: "0.85rem 1rem", color: "var(--accent-green)" }}>
                              +{formatIDR(r.totalAllowances)}
                            </td>
                            <td style={{ padding: "0.85rem 1rem", color: "var(--accent-red)" }}>
                              -{formatIDR(r.totalDeductions)}
                            </td>
                            <td style={{ padding: "0.85rem 1rem" }}>
                              <span style={{ fontWeight: 800, color: "var(--primary)", fontSize: "0.95rem" }}>
                                {formatIDR(r.netSalary)}
                              </span>
                            </td>
                            <td style={{ padding: "0.85rem 1rem" }}>
                              {getRecordStatusBadge(r.status)}
                            </td>
                            <td style={{ padding: "0.85rem 1rem", textAlign: "right" }}>
                              <div style={{ display: "inline-flex", gap: "0.4rem" }}>
                                {r.status === "PENDING" && (
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => handleUpdateRecordStatus(r.id, "APPROVED")}
                                    style={{ fontSize: "0.75rem", color: "var(--accent-blue)" }}
                                  >
                                    Approve
                                  </Button>
                                )}
                                {r.status === "APPROVED" && (
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => handleUpdateRecordStatus(r.id, "PAID")}
                                    style={{ fontSize: "0.75rem", color: "var(--accent-green)" }}
                                  >
                                    Mark Paid
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    const matchEmp = employees.find((e) => e.id === r.employeeId) || {
                                      id: r.employeeId,
                                      profileId: 0,
                                      profile: r.employee?.profile || null,
                                      position: r.employee?.position || null,
                                    };
                                    setSelectedEmployeeForHistory(matchEmp as any);
                                  }}
                                  style={{ fontSize: "0.75rem" }}
                                >
                                  👁️ Details
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* TAB 3: PERIODS */}
          {activeTab === "periods" && (
            <Card style={{ overflow: "hidden" }}>
              <div className="custom-scrollbar" style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.875rem" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border-subtle)", backgroundColor: "var(--bg-surface-elevated)", color: "var(--text-secondary)", position: "sticky", top: 0, zIndex: 2 }}>
                      <SortableTh field="name" currentSortField={periodSortField} currentSortOrder={periodSortOrder} onSort={handlePeriodSort} style={{ padding: "0.85rem 1rem" }}>
                        Period Name
                      </SortableTh>
                      <SortableTh field="cycle" currentSortField={periodSortField} currentSortOrder={periodSortOrder} onSort={handlePeriodSort} style={{ padding: "0.85rem 1rem" }}>
                        Cycle Dates
                      </SortableTh>
                      <SortableTh field="disbursement" currentSortField={periodSortField} currentSortOrder={periodSortOrder} onSort={handlePeriodSort} style={{ padding: "0.85rem 1rem" }}>
                        Disbursement Date
                      </SortableTh>
                      <SortableTh field="status" currentSortField={periodSortField} currentSortOrder={periodSortOrder} onSort={handlePeriodSort} style={{ padding: "0.85rem 1rem" }}>
                        Status
                      </SortableTh>
                      <SortableTh field="notes" currentSortField={periodSortField} currentSortOrder={periodSortOrder} onSort={handlePeriodSort} style={{ padding: "0.85rem 1rem" }}>
                        Notes
                      </SortableTh>
                      <th style={{ padding: "0.85rem 1rem", textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPeriods.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ padding: "2.5rem", textAlign: "center", color: "var(--text-muted)" }}>
                          No payroll periods defined. Click "➕ New Period" to set up your first cycle.
                        </td>
                      </tr>
                    ) : (
                      filteredPeriods.map((p) => (
                        <tr key={p.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                          <td style={{ padding: "0.85rem 1rem" }}>
                            <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>{p.name}</div>
                            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>ID #{p.id}</div>
                          </td>
                          <td style={{ padding: "0.85rem 1rem" }}>
                            <Badge variant="info">{(p.frequency || "monthly").toUpperCase()}</Badge>
                          </td>
                          <td style={{ padding: "0.85rem 1rem", color: "var(--text-secondary)" }}>
                            {p.startDate.slice(0, 10)} &rarr; {p.endDate.slice(0, 10)}
                          </td>
                          <td style={{ padding: "0.85rem 1rem", color: "var(--text-secondary)" }}>
                            {p.paymentDate ? p.paymentDate.slice(0, 10) : "—"}
                          </td>
                          <td style={{ padding: "0.85rem 1rem" }}>
                            {getPeriodStatusBadge(p.status)}
                          </td>
                          <td style={{ padding: "0.85rem 1rem", color: "var(--text-muted)", fontSize: "0.8rem", maxWidth: "200px" }}>
                            {p.notes || "—"}
                          </td>
                          <td style={{ padding: "0.85rem 1rem", textAlign: "right" }}>
                            <div style={{ display: "inline-flex", gap: "0.5rem" }}>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setSelectedPeriod(p);
                                  setPeriodModalOpen(true);
                                }}
                              >
                                ✏️ Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeletePeriod(p.id)}
                                style={{ color: "var(--accent-red)" }}
                              >
                                🗑️
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* TAB 4: COMPONENTS & STRUCTURE */}
          {activeTab === "components" && (
            <Card style={{ overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  padding: "1rem 1.25rem",
                  borderBottom: "1px solid var(--border-subtle)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  backgroundColor: "var(--bg-surface-elevated)",
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)" }}>
                    Salary Components (Allowances & Deductions)
                  </h3>
                  <p style={{ margin: "0.2rem 0 0 0", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    Define fixed or percentage allowances (tunjangan) and deductions (potongan)
                  </p>
                </div>
                <Button
                  onClick={() => {
                    setSelectedComponent(null);
                    setComponentModalOpen(true);
                  }}
                  style={{ backgroundColor: "var(--primary)", color: "#000", fontWeight: 700, fontSize: "0.85rem" }}
                >
                  ➕ Add Salary Component
                </Button>
              </div>
              <div className="custom-scrollbar" style={{ overflowX: "auto", overflowY: "auto", maxHeight: "calc(100vh - 400px)", minHeight: "360px" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.875rem" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border-subtle)", backgroundColor: "var(--bg-surface-elevated)", color: "var(--text-secondary)", position: "sticky", top: 0, zIndex: 2 }}>
                      <SortableTh field="name" currentSortField={compSortField} currentSortOrder={compSortOrder} onSort={handleCompSort} style={{ padding: "0.85rem 1rem" }}>
                        Component Name
                      </SortableTh>
                      <SortableTh field="type" currentSortField={compSortField} currentSortOrder={compSortOrder} onSort={handleCompSort} style={{ padding: "0.85rem 1rem" }}>
                        Structure Type
                      </SortableTh>
                      <SortableTh field="rule" currentSortField={compSortField} currentSortOrder={compSortOrder} onSort={handleCompSort} style={{ padding: "0.85rem 1rem" }}>
                        Calculation Rule
                      </SortableTh>
                      <SortableTh field="defaultVal" currentSortField={compSortField} currentSortOrder={compSortOrder} onSort={handleCompSort} style={{ padding: "0.85rem 1rem" }}>
                        Default Value
                      </SortableTh>
                      <SortableTh field="taxable" currentSortField={compSortField} currentSortOrder={compSortOrder} onSort={handleCompSort} style={{ padding: "0.85rem 1rem" }}>
                        Taxable
                      </SortableTh>
                      <th style={{ padding: "0.85rem 1rem", textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredComponents.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ padding: "2.5rem", textAlign: "center", color: "var(--text-muted)" }}>
                          No salary components configured. Click "➕ New Component" to create allowances or deductions.
                        </td>
                      </tr>
                    ) : (
                      filteredComponents.map((c) => (
                        <tr key={c.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                          <td style={{ padding: "0.85rem 1rem" }}>
                            <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>{c.name}</div>
                            {c.description && (
                              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{c.description}</div>
                            )}
                          </td>
                          <td style={{ padding: "0.85rem 1rem" }}>
                            {c.type === "basic" && <Badge variant="default">Basic Salary</Badge>}
                            {c.type === "allowance" && <Badge variant="success">➕ Allowance</Badge>}
                            {c.type === "deduction" && <Badge variant="danger">➖ Deduction</Badge>}
                          </td>
                          <td style={{ padding: "0.85rem 1rem", color: "var(--text-secondary)" }}>
                            {c.calculationType === "percentage"
                              ? "Percentage (% of Basic)"
                              : c.calculationType === "perDay"
                              ? "📅 Per Day (Hari)"
                              : c.calculationType === "perHour"
                              ? "⏱️ Per Hour (Jam)"
                              : "Fixed Amount (IDR)"}
                          </td>
                          <td style={{ padding: "0.85rem 1rem", fontWeight: 600 }}>
                            {c.calculationType === "percentage"
                              ? `${c.defaultAmount}%`
                              : c.calculationType === "perDay"
                              ? `${formatIDR(c.defaultAmount)} / day`
                              : c.calculationType === "perHour"
                              ? `${formatIDR(c.defaultAmount)} / hour`
                              : formatIDR(c.defaultAmount)}
                          </td>
                          <td style={{ padding: "0.85rem 1rem" }}>
                            {c.isTaxable ? (
                              <span style={{ color: "var(--accent-amber)", fontSize: "0.8rem" }}>Yes (PPh 21)</span>
                            ) : (
                              <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>Non-taxable</span>
                            )}
                          </td>
                          <td style={{ padding: "0.85rem 1rem", textAlign: "right" }}>
                            <div style={{ display: "inline-flex", gap: "0.5rem" }}>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setSelectedComponent(c);
                                  setComponentModalOpen(true);
                                }}
                              >
                                ✏️ Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteComponent(c.id)}
                                style={{ color: "var(--accent-red)" }}
                              >
                                🗑️
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}

      {/* MODALS */}
      {/* 1. Set Employee Payroll Modal */}
      <SetEmployeePayrollModal
        isOpen={Boolean(selectedEmployeeForSetup)}
        employee={selectedEmployeeForSetup}
        onClose={() => setSelectedEmployeeForSetup(null)}
        onSuccess={loadData}
      />

      {/* 2. Employee Payslip History & Breakdown Modal */}
      <EmployeePayrollModal
        isOpen={Boolean(selectedEmployeeForHistory)}
        employee={selectedEmployeeForHistory}
        onClose={() => setSelectedEmployeeForHistory(null)}
      />

      {/* 3. Payroll Period Create/Edit Modal */}
      <PayrollPeriodModal
        isOpen={periodModalOpen}
        period={selectedPeriod}
        onClose={() => {
          setPeriodModalOpen(false);
          setSelectedPeriod(null);
        }}
        onSuccess={loadData}
      />

      {/* 4. Payroll Component Create/Edit Modal */}
      <PayrollComponentModal
        isOpen={componentModalOpen}
        component={selectedComponent}
        onClose={() => {
          setComponentModalOpen(false);
          setSelectedComponent(null);
        }}
        onSuccess={loadData}
      />
    </div>
  );
}
