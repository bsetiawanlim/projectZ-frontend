"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { employeeApi, payrollApi, facilityApi, type FacilityRecord } from "@/lib/api";
import { AddEmployeeModal } from "@/components/employees/AddEmployeeModal";
import { EditEmployeeModal } from "@/components/employees/EditEmployeeModal";
import { DeactivateEmployeeModal } from "@/components/employees/DeactivateEmployeeModal";
import { EmployeeAttendanceModal } from "@/components/employees/EmployeeAttendanceModal";
import { EmployeePayrollModal } from "@/components/employees/EmployeePayrollModal";
import { SetEmployeePayrollModal } from "@/components/payroll/SetEmployeePayrollModal";
import { useAuth } from "@/lib/authContext";
import { formatIDR, type EmployeeRecord, type SalaryRecordItem } from "@pz/shared";

type StatusFilterType = "active" | "deactivated";

export default function EmployeesPage() {
  const { user, canAccess } = useAuth();
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [salaryRecords, setSalaryRecords] = useState<SalaryRecordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>("active");
  const [selectedFacilityFilter, setSelectedFacilityFilter] = useState<string>("all");
  const [facilities, setFacilities] = useState<FacilityRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<"id" | "name" | "position" | "salary" | "earned" | "contact" | "dates" | "status">("id");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEmployeeForEdit, setSelectedEmployeeForEdit] = useState<EmployeeRecord | null>(null);
  const [selectedEmployeeForDeactivate, setSelectedEmployeeForDeactivate] = useState<EmployeeRecord | null>(null);
  const [selectedEmployeeForAttendance, setSelectedEmployeeForAttendance] = useState<EmployeeRecord | null>(null);
  const [selectedEmployeeForPayroll, setSelectedEmployeeForPayroll] = useState<EmployeeRecord | null>(null);
  const [selectedEmployeeForSetPayroll, setSelectedEmployeeForSetPayroll] = useState<EmployeeRecord | null>(null);

  const canCreate = Boolean(
    user?.isSuperAdmin || canAccess("employee", "create") || canAccess("employee", "*")
  );

  const canEdit = Boolean(
    user?.isSuperAdmin || canAccess("employee", "update") || canAccess("employee", "*")
  );

  const canDelete = Boolean(
    user?.isSuperAdmin || canAccess("employee", "delete") || canAccess("employee", "*")
  );

  const [fetchError, setFetchError] = useState<string | null>(null);

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    setFetchError(null);

    // Fetch employees independently so failure in secondary tables never blocks employees
    try {
      const empRes = await employeeApi.listEmployees({ limit: 100, status: statusFilter });
      const empItems = Array.isArray(empRes)
        ? empRes
        : (empRes as any)?.items || (empRes as any)?.data || (empRes as any)?.employees || [];
      setEmployees(empItems);
    } catch (err: any) {
      console.error("Failed to load employees:", err);
      setFetchError(err?.message || "Failed to load employees");
    }

    try {
      const salaryRes = await payrollApi.listSalaryRecords({ limit: 100 });
      const salItems = Array.isArray(salaryRes)
        ? salaryRes
        : (salaryRes as any)?.items || (salaryRes as any)?.data || (salaryRes as any)?.salaryRecords || [];
      setSalaryRecords(salItems);
    } catch (salErr) {
      console.warn("Could not load salary records for badge display:", salErr);
    }

    setLoading(false);
  }, [statusFilter]);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  useEffect(() => {
    facilityApi
      .listFacilities({ limit: 100 })
      .then((res) => setFacilities(res.items || []))
      .catch((err) => console.error("Failed to load facilities", err));
  }, []);

  const handleSort = (field: "id" | "name" | "position" | "salary" | "earned" | "contact" | "dates" | "status") => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const filteredEmployees = useMemo(() => {
    let result = [...employees];

    if (selectedFacilityFilter !== "all") {
      result = result.filter((emp) => String(emp.facilityId) === selectedFacilityFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((emp) => {
        const fullName = emp.profile ? `${emp.profile.firstName} ${emp.profile.lastName || ""}`.toLowerCase() : "";
        const pos = (emp.position?.name || emp.position?.positionName || "").toLowerCase();
        const phone = (emp.profile?.phoneNumber || "").toLowerCase();
        const address = (emp.profile?.address || "").toLowerCase();
        const reason = (emp.departReason || "").toLowerCase();
        const facName = (emp.facility?.facilityName || "").toLowerCase();
        const facCode = (emp.facility?.facilityCode || "").toLowerCase();
        const idStr = String(emp.id);

        return (
          idStr.includes(q) ||
          fullName.includes(q) ||
          pos.includes(q) ||
          phone.includes(q) ||
          address.includes(q) ||
          reason.includes(q) ||
          facName.includes(q) ||
          facCode.includes(q)
        );
      });
    }

    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === "id") {
        cmp = a.id - b.id;
      } else if (sortField === "name") {
        const nameA = a.profile ? `${a.profile.firstName} ${a.profile.lastName || ""}`.trim().toLowerCase() : "";
        const nameB = b.profile ? `${b.profile.firstName} ${b.profile.lastName || ""}`.trim().toLowerCase() : "";
        cmp = nameA.localeCompare(nameB);
      } else if (sortField === "position") {
        const posA = (a.position?.name || a.position?.positionName || "").toLowerCase();
        const posB = (b.position?.name || b.position?.positionName || "").toLowerCase();
        cmp = posA.localeCompare(posB);
      } else if (sortField === "contact") {
        const contactA = (a.profile?.phoneNumber || a.profile?.address || "").toLowerCase();
        const contactB = (b.profile?.phoneNumber || b.profile?.address || "").toLowerCase();
        cmp = contactA.localeCompare(contactB);
      } else if (sortField === "dates") {
        const dateA = a.startDate ? new Date(a.startDate).getTime() : 0;
        const dateB = b.startDate ? new Date(b.startDate).getTime() : 0;
        cmp = dateA - dateB;
      } else if (sortField === "status") {
        const statA = (a.departReason || (a.deletedAt ? "Deactivated" : "Active")).toLowerCase();
        const statB = (b.departReason || (b.deletedAt ? "Deactivated" : "Active")).toLowerCase();
        cmp = statA.localeCompare(statB);
      }
      return sortOrder === "asc" ? cmp : -cmp;
    });

    return result;
  }, [employees, searchQuery, sortField, sortOrder, salaryRecords]);


  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h2 style={{ fontSize: "1.3rem", fontWeight: 700 }}>Employee Directory</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
            Internal staff records, positions, and operational status
          </p>
        </div>
        {canCreate && (
          <Button id="add-employee-btn" size="md" onClick={() => setIsModalOpen(true)}>
            + Add Employee
          </Button>
        )}
      </div>

      {/* Search & Filter Bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
        <div style={{ flex: "1 1 280px", maxWidth: "420px" }}>
          <Input
            id="search-employees-input"
            placeholder="Search by name, position, phone, address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
          {/* Facility Filter */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <span style={{ fontSize: "0.825rem", color: "var(--text-muted)" }}>Facility:</span>
            <select
              id="filter-employees-facility"
              value={selectedFacilityFilter}
              onChange={(e) => setSelectedFacilityFilter(e.target.value)}
              style={{
                padding: "0.45rem 0.75rem",
                borderRadius: "var(--radius-md)",
                backgroundColor: "var(--bg-surface-elevated)",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-primary)",
                fontSize: "0.825rem",
                cursor: "pointer",
              }}
            >
              <option value="all">🏢 All Facilities / Stores ({facilities.length})</option>
              {facilities.map((fac) => (
                <option key={fac.id} value={String(fac.id)}>
                  {fac.facilityName} ({fac.facilityCode})
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.825rem", color: "var(--text-muted)" }}>Status:</span>
            <select
              id="filter-employees-status-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilterType)}
              style={{
                padding: "0.45rem 0.85rem",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-subtle)",
                backgroundColor: "var(--surface, var(--bg-surface-elevated))",
                color: "var(--text-primary)",
                fontSize: "0.85rem",
                cursor: "pointer",
                outline: "none",
              }}
            >
              <option value="active">🟢 Active Staff</option>
              <option value="deactivated">🔴 Archived / Inactive</option>
            </select>
          </div>

          <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
            Showing {filteredEmployees.length} of {employees.length} {statusFilter} staff member{employees.length === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      {fetchError && (
        <div
          style={{
            padding: "0.85rem 1.25rem",
            borderRadius: "var(--radius-md)",
            backgroundColor: "rgba(239, 68, 68, 0.15)",
            border: "1px solid rgba(239, 68, 68, 0.35)",
            color: "var(--accent-red)",
            fontSize: "0.875rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>⚠️ {fetchError}</span>
          <Button size="sm" variant="ghost" onClick={loadEmployees}>
            Retry
          </Button>
        </div>
      )}

      {/* Main Table Card */}
      <Card>
        {loading ? (
          <p style={{ color: "var(--text-muted)", padding: "1.5rem", textAlign: "center" }}>
            Loading employee directory...
          </p>
        ) : filteredEmployees.length === 0 ? (
          <div style={{ textAlign: "center", padding: "2.5rem", color: "var(--text-secondary)" }}>
            <p style={{ marginBottom: "0.5rem" }}>
              {statusFilter === "deactivated"
                ? "No departed or deactivated staff on record."
                : "No active employees registered yet."}
            </p>
            {statusFilter === "deactivated" ? (
              <Button size="sm" variant="secondary" onClick={() => setStatusFilter("active")}>
                View Active Staff
              </Button>
            ) : canCreate ? (
              <Button size="sm" onClick={() => setIsModalOpen(true)}>
                + Add First Employee
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="custom-scrollbar" style={{ overflowX: "auto", overflowY: "auto", maxHeight: "calc(100vh - 350px)", minHeight: "360px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-subtle)", color: "var(--text-muted)", fontSize: "0.8rem", userSelect: "none", position: "sticky", top: 0, backgroundColor: "var(--bg-surface)", zIndex: 2 }}>
                  <th
                    style={{ padding: "0.75rem 0", cursor: "pointer" }}
                    onClick={() => handleSort("id")}
                    title="Sort by ID"
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                      ID {sortField === "id" ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}
                    </span>
                  </th>
                  <th
                    style={{ cursor: "pointer" }}
                    onClick={() => handleSort("name")}
                    title="Sort by Name"
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                      NAME {sortField === "name" ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}
                    </span>
                  </th>
                  <th
                    style={{ cursor: "pointer" }}
                    onClick={() => handleSort("position")}
                    title="Sort by Position"
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                      POSITION {sortField === "position" ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}
                    </span>
                  </th>
                  <th>COMPENSATION</th>
                  <th>EARNED TO DATE</th>
                  <th
                    style={{ cursor: "pointer" }}
                    onClick={() => handleSort("contact")}
                    title="Sort by Contact / Address"
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                      CONTACT / PHONE {sortField === "contact" ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}
                    </span>
                  </th>
                  <th
                    style={{ cursor: "pointer" }}
                    onClick={() => handleSort("dates")}
                    title="Sort by Employment Timeline"
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                      EMPLOYMENT TIMELINE {sortField === "dates" ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}
                    </span>
                  </th>
                  {statusFilter === "deactivated" ? (
                    <th
                      style={{ cursor: "pointer" }}
                      onClick={() => handleSort("status")}
                      title="Sort by Departure Reason"
                    >
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                        DEPARTURE REASON {sortField === "status" ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}
                      </span>
                    </th>
                  ) : (
                    <th
                      style={{ cursor: "pointer" }}
                      onClick={() => handleSort("status")}
                      title="Sort by Status"
                    >
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                        STATUS {sortField === "status" ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}
                      </span>
                    </th>
                  )}
                  <th style={{ textAlign: "right", paddingRight: "0.5rem" }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((emp) => {
                  const isDeactivated = Boolean(emp.deletedAt || emp.endDate);
                  const posName = emp.position?.name || emp.position?.positionName || "Staff Member";

                  return (
                    <tr
                      key={emp.id}
                      style={{
                        borderBottom: "1px solid var(--border-subtle)",
                        fontSize: "0.9rem",
                        backgroundColor: isDeactivated ? "rgba(244, 63, 94, 0.03)" : "transparent",
                      }}
                    >
                      <td style={{ padding: "0.75rem 0", color: "var(--text-secondary)" }}>#{emp.id}</td>
                      <td style={{ fontWeight: 600 }}>
                        {emp.profile ? `${emp.profile.firstName} ${emp.profile.lastName || ""}` : "Unnamed"}
                      </td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", alignItems: "flex-start" }}>
                          <Badge variant="info">
                            {posName}
                          </Badge>
                          {emp.facility ? (
                            <span
                              style={{
                                fontSize: "0.75rem",
                                padding: "0.15rem 0.45rem",
                                borderRadius: "var(--radius-sm)",
                                backgroundColor: "rgba(16, 185, 129, 0.12)",
                                color: "var(--accent-emerald)",
                                border: "1px solid rgba(16, 185, 129, 0.25)",
                                fontWeight: 500,
                              }}
                              title={emp.facility.facilityCode}
                            >
                              🏬 {emp.facility.facilityName}
                            </span>
                          ) : (
                            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                              HQ / Unassigned
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        {emp.employmentType === "DAILY" && (
                          <div>
                            <Badge variant="warning">☀️ Daily</Badge>
                            <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
                              {emp.dailyRate ? `${Number(emp.dailyRate).toLocaleString("id-ID")} / day` : "Rate not set"}
                            </div>
                          </div>
                        )}
                        {emp.employmentType === "WEEKLY" && (
                          <div>
                            <Badge variant="info">📅 Weekly</Badge>
                            <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
                              {emp.weeklyRate ? `${Number(emp.weeklyRate).toLocaleString("id-ID")} / week` : "Rate not set"}
                            </div>
                          </div>
                        )}
                        {emp.employmentType === "HOURLY" && (
                          <div>
                            <Badge variant="warning">⏱️ Hourly</Badge>
                            <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
                              {emp.hourlyRate ? `${Number(emp.hourlyRate).toLocaleString("id-ID")} / hr` : "Rate not set"}
                            </div>
                          </div>
                        )}
                        {emp.employmentType === "CONTRACT" && (
                          <div>
                            <Badge variant="default">📑 Contract</Badge>
                            <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
                              {emp.contractRate ? `${Number(emp.contractRate).toLocaleString("id-ID")} / unit` : "Per project"}
                            </div>
                          </div>
                        )}
                        {(!emp.employmentType || emp.employmentType === "MONTHLY") && (
                          <div>
                            <Badge variant="success">🗓️ Monthly</Badge>
                            <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
                              {emp.monthlySalary ? `${Number(emp.monthlySalary).toLocaleString("id-ID")}` : "Fixed base"}
                            </div>
                          </div>
                        )}
                      </td>
                      <td>
                        {(() => {
                          const empRecords = salaryRecords.filter((r) => r.employeeId === emp.id);
                          const totalEarned = empRecords
                            .filter((r) => r.status === "PAID" || r.status === "APPROVED")
                            .reduce((sum, r) => sum + Number(r.netSalary || 0), 0);
                          const paidOut = empRecords
                            .filter((r) => r.status === "PAID")
                            .reduce((sum, r) => sum + Number(r.netSalary || 0), 0);

                          return (
                            <div>
                              <div style={{ fontWeight: 700, color: totalEarned > 0 ? "var(--accent-emerald)" : "var(--text-muted)", fontSize: "0.9rem" }}>
                                {totalEarned > 0 ? formatIDR(totalEarned) : "Rp 0"}
                              </div>
                              <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.15rem" }}>
                                {empRecords.length > 0 ? (
                                  <span>{empRecords.length} pay cycle{empRecords.length > 1 ? "s" : ""}</span>
                                ) : (
                                  <span>No payslips</span>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </td>
                      <td style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                        <div>{emp.profile?.phoneNumber ? `📞 ${emp.profile.phoneNumber}` : "No phone"}</div>
                        <div style={{ color: "var(--text-secondary)", fontSize: "0.78rem" }}>{emp.profile?.address || "—"}</div>
                      </td>
                      <td style={{ color: "var(--text-secondary)", fontSize: "0.825rem" }}>
                        <div>Started: {emp.startDate ? new Date(emp.startDate).toLocaleDateString() : "—"}</div>
                        {emp.endDate && (
                          <div style={{ color: "var(--accent-rose)", fontSize: "0.78rem" }}>
                            Ended: {new Date(emp.endDate).toLocaleDateString()}
                          </div>
                        )}
                      </td>

                      {statusFilter === "deactivated" ? (
                        <td>
                          <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                            <span style={{ fontSize: "0.85rem", color: "var(--accent-rose)", fontWeight: 500 }}>
                              {emp.departReason || "No departure reason recorded"}
                            </span>
                            {emp.deletedAt && (
                              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                                Deactivated {new Date(emp.deletedAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </td>
                      ) : (
                        <td>
                          <Badge variant="success">Active</Badge>
                        </td>
                      )}

                      <td style={{ textAlign: "right", paddingRight: "0.5rem", whiteSpace: "nowrap" }}>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.4rem", flexWrap: "wrap" }}>
                          <Button
                            id={`attendance-employee-btn-${emp.id}`}
                            size="sm"
                            variant="secondary"
                            onClick={() => setSelectedEmployeeForAttendance(emp)}
                            title="View attendance records and clock in/out"
                            style={{
                              padding: "0.25rem 0.55rem",
                              fontSize: "0.78rem",
                              color: "var(--accent-indigo)",
                              borderColor: "rgba(99, 102, 241, 0.35)",
                            }}
                          >
                            📅 Attendance
                          </Button>
                          <Button
                            id={`payroll-employee-btn-${emp.id}`}
                            size="sm"
                            variant="secondary"
                            onClick={() => setSelectedEmployeeForPayroll(emp)}
                            title="View payroll history and salary breakdown"
                            style={{
                              padding: "0.25rem 0.55rem",
                              fontSize: "0.78rem",
                              color: "var(--accent-emerald)",
                              borderColor: "rgba(16, 185, 129, 0.35)",
                            }}
                          >
                            💰 Payslips
                          </Button>
                          <Button
                            id={`set-payroll-employee-btn-${emp.id}`}
                            size="sm"
                            variant="secondary"
                            onClick={() => setSelectedEmployeeForSetPayroll(emp)}
                            title="Configure salary structure and generate payroll"
                            style={{
                              padding: "0.25rem 0.55rem",
                              fontSize: "0.78rem",
                              color: "var(--primary)",
                              borderColor: "rgba(212, 175, 55, 0.4)",
                            }}
                          >
                            ⚙️ Set Payroll
                          </Button>
                          {canEdit && !isDeactivated && (
                            <Button
                              id={`edit-employee-btn-${emp.id}`}
                              size="sm"
                              variant="secondary"
                              onClick={() => setSelectedEmployeeForEdit(emp)}
                              title="Edit employee position and dates"
                              style={{ padding: "0.25rem 0.55rem", fontSize: "0.78rem" }}
                            >
                              ✏️ Edit
                            </Button>
                          )}
                          {canDelete && !isDeactivated && (
                            <Button
                              id={`deactivate-employee-btn-${emp.id}`}
                              size="sm"
                              variant="ghost"
                              onClick={() => setSelectedEmployeeForDeactivate(emp)}
                              title="Deactivate employee / end employment"
                              style={{
                                padding: "0.25rem 0.6rem",
                                fontSize: "0.8rem",
                                color: "var(--accent-rose)",
                                backgroundColor: "rgba(244, 63, 94, 0.08)",
                                border: "1px solid rgba(244, 63, 94, 0.25)",
                              }}
                            >
                              🗑️ Deactivate
                            </Button>
                          )}
                          {isDeactivated && (
                            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", padding: "0.25rem 0.5rem" }}>
                              Departed
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <AddEmployeeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onEmployeeCreated={() => {
          loadEmployees();
        }}
      />

      <EditEmployeeModal
        isOpen={Boolean(selectedEmployeeForEdit)}
        employee={selectedEmployeeForEdit}
        onClose={() => setSelectedEmployeeForEdit(null)}
        onEmployeeUpdated={() => {
          loadEmployees();
        }}
      />

      <DeactivateEmployeeModal
        isOpen={Boolean(selectedEmployeeForDeactivate)}
        employee={selectedEmployeeForDeactivate}
        onClose={() => setSelectedEmployeeForDeactivate(null)}
        onEmployeeDeactivated={() => {
          loadEmployees();
        }}
      />

      <EmployeeAttendanceModal
        isOpen={Boolean(selectedEmployeeForAttendance)}
        employee={selectedEmployeeForAttendance}
        onClose={() => setSelectedEmployeeForAttendance(null)}
      />

      <EmployeePayrollModal
        isOpen={Boolean(selectedEmployeeForPayroll)}
        employee={selectedEmployeeForPayroll}
        onClose={() => setSelectedEmployeeForPayroll(null)}
      />

      <SetEmployeePayrollModal
        isOpen={Boolean(selectedEmployeeForSetPayroll)}
        employee={selectedEmployeeForSetPayroll}
        onClose={() => setSelectedEmployeeForSetPayroll(null)}
        onSuccess={loadEmployees}
      />
    </div>
  );
}
