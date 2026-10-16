"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { customerApi } from "@/lib/api";
import {
  CUSTOMER_GROUPS,
  getCustomerGroupName,
  getCustomerGroupBadgeVariant,
  type CustomerRecord,
} from "@pz/shared";

interface EditCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: CustomerRecord | null;
  onCustomerUpdated: () => void;
}

export function EditCustomerModal({
  isOpen,
  onClose,
  customer,
  onCustomerUpdated,
}: EditCustomerModalProps) {
  const [customerGroup, setCustomerGroup] = useState<number>(1);
  const [departReason, setDepartReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && customer) {
      setCustomerGroup(customer.customergroup ?? 1);
      setDepartReason(customer.departReason || "");
      setError(null);
    }
  }, [isOpen, customer]);

  if (!isOpen || !customer) return null;

  const selectedGroupInfo = CUSTOMER_GROUPS.find((g) => g.id === customerGroup);
  const displayName = customer.profile
    ? `${customer.profile.firstName} ${customer.profile.lastName || ""}`.trim()
    : `Customer #${customer.id}`;

  const addressSummary = customer.profile
    ? [customer.profile.address, customer.profile.city, customer.profile.province]
        .filter(Boolean)
        .join(", ")
    : "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await customerApi.updateCustomer({
        id: customer.id,
        customergroup: Number(customerGroup) || 1,
        departReason: departReason.trim() || undefined,
      });

      onCustomerUpdated();
      onClose();
    } catch (err: any) {
      console.error("Failed to update customer group", err);
      setError(err?.message || "Failed to update customer.");
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
        zIndex: 9999,
        padding: "1rem",
        overflowY: "auto",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <Card
        style={{
          width: "100%",
          maxWidth: "520px",
          backgroundColor: "var(--bg-surface)",
          border: "1px solid var(--border-glow)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
          padding: "1.75rem",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <div>
            <h3 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-primary)" }}>
              Edit Customer #{customer.id}
            </h3>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
              Configure customer group tier & account classification
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
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--text-primary)" }}>
                  {displayName}
                </span>
                {customer.profile?.isCompany && (
                  <Badge variant="info">Corporate</Badge>
                )}
              </div>
              <p style={{ fontSize: "0.825rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                📞 {customer.profile?.phoneNumber || "No phone registered"}
              </p>
              {addressSummary && (
                <p style={{ fontSize: "0.825rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                  📍 {addressSummary}
                </p>
              )}
            </div>
            <Badge variant={getCustomerGroupBadgeVariant(customer.customergroup)}>
              Current: {getCustomerGroupName(customer.customergroup)}
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

        {/* Form to set Customer Group */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div>
            <label
              htmlFor="edit-customer-group-select"
              style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)", display: "block", marginBottom: "0.4rem" }}
            >
              Customer Group *
            </label>
            <select
              id="edit-customer-group-select"
              value={customerGroup}
              onChange={(e) => setCustomerGroup(Number(e.target.value))}
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
              {CUSTOMER_GROUPS.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name} (Tier {group.id})
                </option>
              ))}
            </select>

            {selectedGroupInfo && (
              <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.35rem" }}>
                💡 {selectedGroupInfo.description}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="edit-cust-depart-reason"
              style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)", display: "block", marginBottom: "0.4rem" }}
            >
              Account Notes / Status
            </label>
            <Input
              id="edit-cust-depart-reason"
              value={departReason}
              onChange={(e) => setDepartReason(e.target.value)}
              placeholder="e.g. Preferred delivery schedule or account notes"
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.5rem" }}>
            <Button variant="secondary" onClick={onClose} disabled={loading} type="button">
              Cancel
            </Button>
            <Button id="submit-edit-cust-btn" variant="primary" type="submit" isLoading={loading}>
              Save Group Setting
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
