"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PersonPicker } from "@/components/common/PersonPicker";
import { vendorApi } from "@/lib/api";
import { VENDOR_GROUPS, type VendorRecord, type ProfileRecord } from "@pz/shared";

interface AddVendorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVendorCreated: (vendor: VendorRecord) => void;
}

export function AddVendorModal({ isOpen, onClose, onVendorCreated }: AddVendorModalProps) {
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [selectedProfile, setSelectedProfile] = useState<ProfileRecord | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [address, setAddress] = useState("");
  const [vendorGroup, setVendorGroup] = useState<number>(1);
  const [isCompany, setIsCompany] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === "existing") {
      if (!selectedProfile) {
        setError("Please search and select an existing person/company first.");
        return;
      }
    } else {
      if (!firstName.trim() || firstName.trim().length < 2) {
        setError("First name / company name must be at least 2 characters.");
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
              vendorgroup: Number(vendorGroup) || 1,
            }
          : {
              firstName: firstName.trim(),
              lastName: lastName.trim() || undefined,
              phoneNumber: phoneNumber.trim() || undefined,
              address: address.trim() || undefined,
              vendorgroup: Number(vendorGroup) || 1,
              isCompany,
            };

      const res = await vendorApi.createVendor(payload);

      if (res && res.data) {
        onVendorCreated(res.data);
        onClose();
        // Reset form
        setSelectedProfile(null);
        setFirstName("");
        setLastName("");
        setPhoneNumber("");
        setAddress("");
        setVendorGroup(1);
        setIsCompany(true);
      }
    } catch (err: any) {
      console.error("Failed to create vendor", err);
      setError(err?.message || "Failed to create vendor record.");
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
              <h2 style={{ fontSize: "1.25rem", fontWeight: 700 }}>Add Vendor</h2>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
                Add existing person or register a new supplier/partner profile
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
              id="vendor-mode-existing-tab"
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
              id="vendor-mode-new-tab"
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
                    id="vendor-first-name-input"
                    label="Vendor / Company Name *"
                    placeholder="e.g. PT Maju Jaya"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    autoFocus
                  />
                  <Input
                    id="vendor-last-name-input"
                    label="PIC / Contact Name"
                    placeholder="e.g. Hendra"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>

                <Input
                  id="vendor-phone-input"
                  label="Phone Number"
                  placeholder="e.g. +62812345678"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />

                <Input
                  id="vendor-address-input"
                  label="Office / Warehouse Address"
                  placeholder="e.g. Kawasan Industri MM2100, Cikarang"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />

                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.25rem" }}>
                  <input
                    type="checkbox"
                    id="vendor-is-company-checkbox"
                    checked={isCompany}
                    onChange={(e) => setIsCompany(e.target.checked)}
                    style={{ width: "16px", height: "16px", cursor: "pointer" }}
                  />
                  <label htmlFor="vendor-is-company-checkbox" style={{ fontSize: "0.85rem", color: "var(--text-secondary)", cursor: "pointer" }}>
                    This vendor is an organization / registered company
                  </label>
                </div>
              </>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <label style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--text-secondary)" }}>
                Vendor Tier / Group
              </label>
              <select
                id="vendor-group-select"
                value={vendorGroup}
                onChange={(e) => setVendorGroup(Number(e.target.value))}
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
{VENDOR_GROUPS.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1rem" }}>
              <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
              <Button id="save-vendor-submit-btn" type="submit" disabled={loading}>
                {loading ? "Saving..." : "Save Vendor"}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
