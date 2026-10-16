"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { employeeApi } from "@/lib/api";
import type { EmployeeRecord, AttendanceRecord, AttendanceStatus } from "@pz/shared";

interface EmployeeAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: EmployeeRecord | null;
}

export function EmployeeAttendanceModal({
  isOpen,
  onClose,
  employee,
}: EmployeeAttendanceModalProps) {
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Quick Clock state
  const [clockLoading, setClockLoading] = useState(false);
  const [clockLocation, setClockLocation] = useState("");
  const [clockNotes, setClockNotes] = useState("");

  // Manual record form toggle & state
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualDate, setManualDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [manualClockIn, setManualClockIn] = useState("09:00");
  const [manualClockOut, setManualClockOut] = useState("17:00");
  const [manualStatus, setManualStatus] = useState<AttendanceStatus>("PRESENT");
  const [manualNotes, setManualNotes] = useState("");
  const [savingManual, setSavingManual] = useState(false);

  const loadAttendance = useCallback(async () => {
    if (!employee?.id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await employeeApi.listAttendance({
        employeeId: employee.id,
        limit: 50,
      });
      setAttendances(res.items || []);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to load attendance records.");
    } finally {
      setLoading(false);
    }
  }, [employee?.id]);

  useEffect(() => {
    if (isOpen && employee?.id) {
      loadAttendance();
      setShowManualForm(false);
      setClockLocation("");
      setClockNotes("");
      setError(null);
      setActionSuccess(null);
    }
  }, [isOpen, employee?.id, loadAttendance]);

  if (!isOpen || !employee) return null;

  const empName = employee.profile
    ? `${employee.profile.firstName} ${employee.profile.lastName || ""}`.trim()
    : `Employee #${employee.id}`;
  const posName = employee.position?.name || employee.position?.positionName || "Staff Member";

  // Check today's records (an employee can clock in/out multiple times a day for shifts/breaks)
  const todayStr = new Date().toISOString().split("T")[0];
  const todayRecords = attendances.filter((a) => {
    const aDateStr = new Date(a.date).toISOString().split("T")[0];
    return aDateStr === todayStr;
  });

  // An active session is one that is clocked in but not clocked out yet
  const activeSession = todayRecords.find((a) => Boolean(a.clockIn) && !a.clockOut);
  const hasActiveSession = Boolean(activeSession);
  const completedTodaySessionsCount = todayRecords.filter((a) => Boolean(a.clockIn && a.clockOut)).length;

  const handleQuickClockIn = async () => {
    setClockLoading(true);
    setError(null);
    try {
      await employeeApi.clockIn({
        employeeId: employee.id,
        clockInLocation: clockLocation.trim() || undefined,
        notes: clockNotes.trim() || undefined,
      });
      setActionSuccess("Clock-in recorded successfully for today!");
      setTimeout(() => setActionSuccess(null), 4000);
      setClockLocation("");
      setClockNotes("");
      loadAttendance();
    } catch (err: any) {
      setError(err?.message || "Failed to record clock-in.");
    } finally {
      setClockLoading(false);
    }
  };

  const handleQuickClockOut = async () => {
    setClockLoading(true);
    setError(null);
    try {
      await employeeApi.clockOut({
        employeeId: employee.id,
        clockOutLocation: clockLocation.trim() || undefined,
        notes: clockNotes.trim() || undefined,
      });
      setActionSuccess("Clock-out recorded successfully!");
      setTimeout(() => setActionSuccess(null), 4000);
      setClockLocation("");
      setClockNotes("");
      loadAttendance();
    } catch (err: any) {
      setError(err?.message || "Failed to record clock-out.");
    } finally {
      setClockLoading(false);
    }
  };

  const handleSaveManualRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualDate) {
      setError("Please specify attendance date.");
      return;
    }
    setSavingManual(true);
    setError(null);

    try {
      const clockInIso = manualClockIn
        ? new Date(`${manualDate}T${manualClockIn}:00`).toISOString()
        : undefined;
      const clockOutIso = manualClockOut
        ? new Date(`${manualDate}T${manualClockOut}:00`).toISOString()
        : undefined;

      await employeeApi.createAttendance({
        employeeId: employee.id,
        date: manualDate,
        clockIn: clockInIso,
        clockOut: clockOutIso,
        status: manualStatus,
        notes: manualNotes.trim() || undefined,
      });

      setActionSuccess("Manual attendance record created.");
      setTimeout(() => setActionSuccess(null), 4000);
      setShowManualForm(false);
      setManualNotes("");
      loadAttendance();
    } catch (err: any) {
      setError(err?.message || "Failed to create manual attendance record.");
    } finally {
      setSavingManual(false);
    }
  };

  const handleDeleteRecord = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this attendance record?")) return;
    try {
      await employeeApi.deleteAttendance(id);
      loadAttendance();
    } catch (err: any) {
      setError(err?.message || "Failed to delete record.");
    }
  };

  const getStatusBadge = (status: AttendanceStatus) => {
    switch (status) {
      case "PRESENT":
        return <Badge variant="success">✓ Present</Badge>;
      case "LATE":
        return <Badge variant="warning">⚠️ Late</Badge>;
      case "SICK":
        return <Badge variant="default">🤒 Sick</Badge>;
      case "ON_LEAVE":
        return <Badge variant="info">🏖️ On Leave</Badge>;
      case "PERMISSION":
        return <Badge variant="info">📄 Permission</Badge>;
      case "ABSENT":
        return <Badge variant="danger">✕ Absent</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  const formatTime = (isoString?: string | null) => {
    if (!isoString) return "—";
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDuration = (mins?: number | null) => {
    if (!mins && mins !== 0) return "—";
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m}m`;
    return `${h}h ${m}m`;
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
      <Card
        style={{
          width: "100%",
          maxWidth: "850px",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
          overflow: "hidden",
          padding: "1.5rem",
        }}
      >
        {/* Modal Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "1.25rem" }}>📅</span>
              <h3 style={{ fontSize: "1.2rem", fontWeight: 700, margin: 0 }}>
                Attendance Tracker — {empName}
              </h3>
            </div>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "0.25rem" }}>
              Position: <strong style={{ color: "var(--text-primary)" }}>{posName}</strong> • Employee ID #{employee.id}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "var(--text-muted)",
              cursor: "pointer",
              fontSize: "1.25rem",
            }}
          >
            ✕
          </button>
        </div>

        {error && (
          <div
            style={{
              fontSize: "0.85rem",
              color: "var(--accent-rose)",
              backgroundColor: "rgba(239, 68, 68, 0.12)",
              padding: "0.6rem 0.8rem",
              borderRadius: "var(--radius-md)",
            }}
          >
            {error}
          </div>
        )}

        {actionSuccess && (
          <div
            style={{
              fontSize: "0.85rem",
              color: "var(--accent-emerald)",
              backgroundColor: "rgba(16, 185, 129, 0.12)",
              padding: "0.6rem 0.8rem",
              borderRadius: "var(--radius-md)",
            }}
          >
            ✓ {actionSuccess}
          </div>
        )}

        {/* Quick Today's Attendance Widget */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "1rem",
            padding: "0.85rem 1rem",
            backgroundColor: "rgba(99, 102, 241, 0.05)",
            border: "1px solid rgba(99, 102, 241, 0.2)",
            borderRadius: "var(--radius-md)",
          }}
        >
          <div>
            <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 700, color: "var(--accent-indigo)" }}>
              Today's Status ({new Date().toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })})
            </span>
            <div style={{ fontSize: "0.95rem", fontWeight: 600, marginTop: "0.2rem" }}>
              {hasActiveSession ? (
                <span style={{ color: "var(--accent-indigo)" }}>
                  🟢 Currently Clocked In at {formatTime(activeSession!.clockIn)} (Session #{completedTodaySessionsCount + 1})
                </span>
              ) : completedTodaySessionsCount > 0 ? (
                <span style={{ color: "var(--accent-emerald)" }}>
                  ✓ {completedTodaySessionsCount} Session{completedTodaySessionsCount > 1 ? "s" : ""} Completed Today (Ready to Clock In again)
                </span>
              ) : (
                <span style={{ color: "var(--text-muted)" }}>Not Clocked In Today</span>
              )}
            </div>
          </div>

          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            {!hasActiveSession ? (
              <Button
                size="sm"
                variant="primary"
                onClick={handleQuickClockIn}
                disabled={clockLoading}
                style={{ backgroundColor: "var(--accent-emerald)", borderColor: "var(--accent-emerald)" }}
              >
                {clockLoading ? "Recording..." : completedTodaySessionsCount > 0 ? "🟢 Clock In Next Shift" : "🟢 Clock In Today"}
              </Button>
            ) : (
              <Button
                size="sm"
                variant="primary"
                onClick={handleQuickClockOut}
                disabled={clockLoading}
                style={{ backgroundColor: "var(--accent-rose)", borderColor: "var(--accent-rose)" }}
              >
                {clockLoading ? "Recording..." : "🔴 Clock Out Current Shift"}
              </Button>
            )}

            <Button
              size="sm"
              variant="secondary"
              onClick={() => setShowManualForm(!showManualForm)}
            >
              {showManualForm ? "Cancel Form" : "➕ Manual Entry"}
            </Button>
          </div>
        </div>

        {/* Manual Record Form (Dropdown toggle) */}
        {showManualForm && (
          <form
            onSubmit={handleSaveManualRecord}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
              padding: "1rem",
              backgroundColor: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-md)",
            }}
          >
            <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>Log Manual Attendance / Leave</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "0.5rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: "0.2rem" }}>
                  Date
                </label>
                <Input
                  type="date"
                  value={manualDate}
                  onChange={(e) => setManualDate(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: "0.2rem" }}>
                  Status
                </label>
                <select
                  value={manualStatus}
                  onChange={(e) => setManualStatus(e.target.value as AttendanceStatus)}
                  style={{
                    width: "100%",
                    padding: "0.45rem 0.6rem",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: "var(--bg-surface-elevated)",
                    border: "1px solid var(--border-subtle)",
                    color: "var(--text-primary)",
                    fontSize: "0.82rem",
                  }}
                >
                  <option value="PRESENT">Present</option>
                  <option value="LATE">Late</option>
                  <option value="SICK">Sick</option>
                  <option value="ON_LEAVE">On Leave</option>
                  <option value="PERMISSION">Permission</option>
                  <option value="ABSENT">Absent</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: "0.2rem" }}>
                  Clock In Time
                </label>
                <Input
                  type="time"
                  value={manualClockIn}
                  onChange={(e) => setManualClockIn(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: "0.2rem" }}>
                  Clock Out Time
                </label>
                <Input
                  type="time"
                  value={manualClockOut}
                  onChange={(e) => setManualClockOut(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: "0.5rem" }}>
              <div style={{ flex: 1 }}>
                <Input
                  placeholder="Notes / Remarks (e.g. Doctor's note submitted, Approved annual leave)"
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                />
              </div>
              <Button type="submit" size="sm" variant="primary" disabled={savingManual}>
                {savingManual ? "Saving..." : "Save Record"}
              </Button>
            </div>
          </form>
        )}

        {/* Attendance Records Table */}
        <div style={{ flex: 1, overflowY: "auto", minHeight: "220px" }}>
          {loading ? (
            <p style={{ color: "var(--text-muted)", textAlign: "center", padding: "2rem" }}>
              Loading attendance logs...
            </p>
          ) : attendances.length === 0 ? (
            <div style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--text-secondary)" }}>
              <span style={{ fontSize: "2rem", display: "block", marginBottom: "0.5rem" }}>📅</span>
              <p style={{ margin: 0 }}>No attendance records logged for {empName} yet.</p>
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                Use "Clock In Today" or "Manual Entry" above to record their attendance.
              </p>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.875rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-subtle)", color: "var(--text-muted)", fontSize: "0.75rem" }}>
                  <th style={{ padding: "0.5rem 0" }}>DATE</th>
                  <th>STATUS</th>
                  <th>CLOCK IN</th>
                  <th>CLOCK OUT</th>
                  <th>WORK DURATION</th>
                  <th>NOTES</th>
                  <th style={{ textAlign: "right", paddingRight: "0.5rem" }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {attendances.map((rec) => {
                  const dateStr = new Date(rec.date).toLocaleDateString(undefined, {
                    weekday: "short",
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  });

                  return (
                    <tr key={rec.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                      <td style={{ padding: "0.6rem 0", fontWeight: 500 }}>{dateStr}</td>
                      <td>{getStatusBadge(rec.status)}</td>
                      <td style={{ color: "var(--accent-indigo)", fontWeight: 500 }}>
                        {formatTime(rec.clockIn)}
                      </td>
                      <td style={{ color: "var(--text-secondary)" }}>
                        {formatTime(rec.clockOut)}
                      </td>
                      <td>{formatDuration(rec.workDurationMinutes)}</td>
                      <td style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
                        {rec.notes || "—"}
                      </td>
                      <td style={{ textAlign: "right", paddingRight: "0.5rem" }}>
                        <button
                          onClick={() => handleDeleteRecord(rec.id)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "var(--accent-rose)",
                            cursor: "pointer",
                            fontSize: "0.8rem",
                            padding: "0.2rem 0.4rem",
                          }}
                          title="Delete record"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Modal Footer */}
        <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: "0.5rem", borderTop: "1px solid var(--border-subtle)" }}>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </Card>
    </div>
  );
}
