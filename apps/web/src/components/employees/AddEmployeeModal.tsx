"use client";

import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PersonPicker } from "@/components/common/PersonPicker";
import { employeeApi, facilityApi, type FacilityRecord } from "@/lib/api";
import type { EmployeeRecord, PositionRecord, ProfileRecord } from "@pz/shared";

interface AddEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEmployeeCreated: (employee: EmployeeRecord) => void;
}

export function AddEmployeeModal({ isOpen, onClose, onEmployeeCreated }: AddEmployeeModalProps) {
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [selectedProfile, setSelectedProfile] = useState<ProfileRecord | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [address, setAddress] = useState("");
  const [positionId, setPositionId] = useState<number | "">("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [salaryBasis, setSalaryBasis] = useState<"monthly" | "biWeekly" | "weekly" | "daily" | "hourly">("monthly");
  const [payFrequency, setPayFrequency] = useState<"monthly" | "biWeekly" | "weekly" | "daily" | "hourly">("monthly");
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

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === "existing") {
      if (!selectedProfile) {
        setError("Please search and select an existing person first.");
        return;
      }
      if (selectedProfile.isCompany) {
        setError("Employees must be individuals. Please select an individual person.");
        return;
      }
    } else {
      if (!firstName.trim() || firstName.trim().length < 2) {
        setError("First name must be at least 2 characters.");
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      const payload =
        mode === "existing" && selectedProfile
          ? {
              profileId: selectedProfile.id,
              positionId: positionId ? Number(positionId) : undefined,
              facilityId: facilityId ? Number(facilityId) : undefined,
              salaryBasis,
              payFrequency,
              startDate: startDate ? new Date(startDate) : undefined,
            }
          : {
              firstName: firstName.trim(),
              lastName: lastName.trim() || undefined,
              phoneNumber: phoneNumber.trim() || undefined,
              address: address.trim() || undefined,
              positionId: positionId ? Number(positionId) : undefined,
              facilityId: facilityId ? Number(facilityId) : undefined,
              salaryBasis,
              payFrequency,
              startDate: startDate ? new Date(startDate) : undefined,
            };

      const res = await employeeApi.createEmployee(payload);

      if (res && res.data) {
        onEmployeeCreated(res.data);
        onClose();
        // Reset form
        setSelectedProfile(null);
        setFirstName("");
        setLastName("");
        setPhoneNumber("");
        setAddress("");
        setPositionId("");
        setFacilityId("");
        setStartDate(new Date().toISOString().split("T")[0]);
      }
    } catch (err: any) {
      console.error("Failed to create employee", err);
      setError(err?.message || "Failed to create employee record.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 60,
        padding: "1rem",
      }}
    >
      <div style={{ width: "100%", maxWidth: "560px" }}>
        <Card glass style={{ padding: "1.75rem", backgroundColor: "var(--bg-surface)" }}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <div>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 700 }}>Add Employee</h2>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
                Add existing person or register a new individual
              </p>
            </div>
            <button
              onClick={onClose}
              disabled={loading}
              style={{
                background: "none",
                border: "none",
                color: "var(--text-muted)",
                fontSize: "1.25rem",
                cursor: "pointer",
              }}
            >
              ✕
            </button>
          </div>

          {/* Mode Switcher Tabs */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              backgroundColor: "var(--bg-surface-elevated)",
              padding: "0.25rem",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-subtle)",
              marginBottom: "1.25rem",
            }}
          >
            <button
              type="button"
              id="employee-mode-existing-tab"
              onClick={() => {
                setMode("existing");
                setError(null);
              }}
              style={{
                padding: "0.45rem",
                borderRadius: "var(--radius-sm)",
                fontSize: "0.85rem",
                fontWeight: 600,
                backgroundColor: mode === "existing" ? "var(--bg-surface)" : "transparent",
                color: mode === "existing" ? "var(--primary)" : "var(--text-secondary)",
                border: mode === "existing" ? "1px solid var(--border-glow)" : "1px solid transparent",
                cursor: "pointer",
                transition: "all var(--transition-fast)",
              }}
            >
              👤 Select Existing Person
            </button>
            <button
              type="button"
              id="employee-mode-new-tab"
              onClick={() => {
                setMode("new");
                setError(null);
              }}
              style={{
                padding: "0.45rem",
                borderRadius: "var(--radius-sm)",
                fontSize: "0.85rem",
                fontWeight: 600,
                backgroundColor: mode === "new" ? "var(--bg-surface)" : "transparent",
                color: mode === "new" ? "var(--primary)" : "var(--text-secondary)",
                border: mode === "new" ? "1px solid var(--border-glow)" : "1px solid transparent",
                cursor: "pointer",
                transition: "all var(--transition-fast)",
              }}
            >
              ➕ Create New Person
            </button>
          </div>

          {error && (
            <div
              style={{
                padding: "0.75rem",
                backgroundColor: "rgba(244, 63, 94, 0.15)",
                border: "1px solid rgba(244, 63, 94, 0.3)",
                borderRadius: "var(--radius-md)",
                color: "var(--accent-rose)",
                fontSize: "0.85rem",
                marginBottom: "1rem",
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {mode === "existing" ? (
              <PersonPicker
                selectedProfile={selectedProfile}
                onSelect={(p) => {
                  setSelectedProfile(p);
                  setError(null);
                }}
                individualOnly
              />
            ) : (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  <Input
                    id="employee-first-name-input"
                    label="First Name *"
                    placeholder="e.g. Sarah"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    autoFocus
                  />
                  <Input
                    id="employee-last-name-input"
                    label="Last Name"
                    placeholder="e.g. Jenkins"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  <Input
                    id="employee-phone-input"
                    label="Phone Number"
                    placeholder="e.g. +62812345678"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                  />
                  <Input
                    id="employee-address-input"
                    label="Address"
                    placeholder="e.g. Jakarta Pusat"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>
              </>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                <label style={{ fontSize: "0.825rem", fontWeight: 500, color: "var(--text-secondary)" }}>
                  Counted Based On (Salary Basis)
                </label>
                <select
                  value={salaryBasis}
                  onChange={(e) => setSalaryBasis(e.target.value as any)}
                  style={{
                    width: "100%",
                    padding: "0.6rem 0.9rem",
                    backgroundColor: "var(--bg-surface)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-md)",
                    color: "var(--text-primary)",
                    fontSize: "0.875rem",
                    outline: "none",
                  }}
                >
                  <option value="monthly">📅 Monthly</option>
                  <option value="biWeekly">⏱️ Bi-Weekly</option>
                  <option value="weekly">📆 Weekly</option>
                  <option value="daily">☀️ Daily</option>
                  <option value="hourly">⏰ Hourly</option>
                </select>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                <label style={{ fontSize: "0.825rem", fontWeight: 500, color: "var(--text-secondary)" }}>
                  Paid By (Pay Frequency)
                </label>
                <select
                  value={payFrequency}
                  onChange={(e) => setPayFrequency(e.target.value as any)}
                  style={{
                    width: "100%",
                    padding: "0.6rem 0.9rem",
                    backgroundColor: "var(--bg-surface)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-md)",
                    color: "var(--text-primary)",
                    fontSize: "0.875rem",
                    outline: "none",
                  }}
                >
                  <option value="monthly">📅 Monthly</option>
                  <option value="biWeekly">⏱️ Bi-Weekly</option>
                  <option value="weekly">📆 Weekly</option>
                  <option value="daily">☀️ Daily</option>
                  <option value="hourly">⏰ Hourly</option>
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  <label htmlFor="employee-position-select" style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--text-secondary)" }}>
                    Position / Role
                  </label>
                  <select
                    id="employee-position-select"
                    value={positionId}
                    onChange={(e) => setPositionId(e.target.value ? Number(e.target.value) : "")}
                    style={{
                      width: "100%",
                      padding: "0.6rem 0.9rem",
                      backgroundColor: "var(--bg-surface)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "var(--radius-md)",
                      color: "var(--text-primary)",
                      fontSize: "0.925rem",
                      outline: "none",
                    }}
                  >
                    <option value="">General Staff</option>
                    {positions.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name || p.positionName || `Position #${p.id}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  <label htmlFor="employee-facility-select" style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--text-secondary)" }}>
                    Facility / Branch Location
                  </label>
                  <select
                    id="employee-facility-select"
                    value={facilityId}
                    onChange={(e) => setFacilityId(e.target.value ? Number(e.target.value) : "")}
                    style={{
                      width: "100%",
                      padding: "0.6rem 0.9rem",
                      backgroundColor: "var(--bg-surface)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "var(--radius-md)",
                      color: "var(--text-primary)",
                      fontSize: "0.925rem",
                      outline: "none",
                    }}
                  >
                    <option value="">-- No Location Assigned --</option>
                    {facilities.map((fac) => (
                      <option key={fac.id} value={fac.id}>
                        {fac.facilityName} ({fac.facilityCode})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <Input
                id="employee-start-date-input"
                label="Start Date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            {/* Actions */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1rem" }}>
              <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
              <Button id="save-employee-submit-btn" type="submit" disabled={loading}>
                {loading ? "Saving..." : "Save Employee"}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
