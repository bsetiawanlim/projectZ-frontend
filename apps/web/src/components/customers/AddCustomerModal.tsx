"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PersonPicker } from "@/components/common/PersonPicker";
import { customerApi } from "@/lib/api";
import {
  CUSTOMER_GROUPS,
  type CustomerRecord,
  type ProfileRecord,
} from "@pz/shared";

interface AddCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCustomerCreated: (customer: CustomerRecord) => void;
}

export function AddCustomerModal({ isOpen, onClose, onCustomerCreated }: AddCustomerModalProps) {
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [selectedProfile, setSelectedProfile] = useState<ProfileRecord | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [address, setAddress] = useState("");
  const [customerGroup, setCustomerGroup] = useState<number>(1);
  const [isCompany, setIsCompany] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === "existing") {
      if (!selectedProfile) {
        setError("Please search and select an existing person first.");
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
              customergroup: Number(customerGroup) || 1,
            }
          : {
              firstName: firstName.trim(),
              lastName: lastName.trim() || undefined,
              phoneNumber: phoneNumber.trim() || undefined,
              address: address.trim() || undefined,
              customergroup: Number(customerGroup) || 1,
              isCompany,
            };

      const res = await customerApi.createCustomer(payload);

      if (res && res.data) {
        onCustomerCreated(res.data);
        onClose();
        // Reset form
        setSelectedProfile(null);
        setFirstName("");
        setLastName("");
        setPhoneNumber("");
        setAddress("");
        setCustomerGroup(1);
        setIsCompany(false);
      }
    } catch (err: any) {
      console.error("Failed to create customer", err);
      setError(err?.message || "Failed to create customer record.");
    } finally {
      setLoading(false);
    }
  };

  const selectedGroupInfo = CUSTOMER_GROUPS.find((g) => g.id === customerGroup);

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
              <h2 style={{ fontSize: "1.25rem", fontWeight: 700 }}>Add Customer</h2>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
                Add existing person or register a new customer profile
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
              id="customer-mode-existing-tab"
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
              id="customer-mode-new-tab"
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
              />
            ) : (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  <Input
                    id="customer-first-name-input"
                    label="First Name *"
                    placeholder="e.g. Budi"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    autoFocus
                  />
                  <Input
                    id="customer-last-name-input"
                    label="Last Name"
                    placeholder="e.g. Santoso"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>

                <Input
                  id="customer-phone-input"
                  label="Phone Number"
                  placeholder="e.g. +62812345678"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />

                <Input
                  id="customer-address-input"
                  label="Address"
                  placeholder="e.g. Jl. Sudirman No. 45, Jakarta"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />

                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.25rem" }}>
                  <input
                    type="checkbox"
                    id="customer-is-company-checkbox"
                    checked={isCompany}
                    onChange={(e) => setIsCompany(e.target.checked)}
                    style={{ width: "16px", height: "16px", cursor: "pointer" }}
                  />
                  <label htmlFor="customer-is-company-checkbox" style={{ fontSize: "0.85rem", color: "var(--text-secondary)", cursor: "pointer" }}>
                    This is a corporate / business client (Company)
                  </label>
                </div>
              </>
            )}

            {/* Customer Group selection */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <label htmlFor="customer-group-select" style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--text-secondary)" }}>
                Customer Group
              </label>
              <select
                id="customer-group-select"
                value={customerGroup}
                onChange={(e) => setCustomerGroup(Number(e.target.value))}
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
                {CUSTOMER_GROUPS.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} (Tier {g.id})
                  </option>
                ))}
              </select>
              {selectedGroupInfo && (
                <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                  💡 {selectedGroupInfo.description}
                </span>
              )}
            </div>

            {/* Actions */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1rem" }}>
              <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
              <Button id="save-customer-submit-btn" type="submit" disabled={loading}>
                {loading ? "Saving..." : "Save Customer"}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
