"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { vendorApi } from "@/lib/api";
import { getVendorGroupName, getVendorGroupBadgeVariant, type VendorRecord } from "@pz/shared";

interface DeactivateVendorModalProps {
  isOpen: boolean;
  vendor: VendorRecord | null;
  onClose: () => void;
  onVendorDeactivated: () => void;
}

const PRESET_REASONS = [
  "Ceased business operations / Insolvent",
  "Supplier agreement terminated",
  "Pricing dispute / Unfavorable terms",
  "Quality / Delivery timeline failure",
  "Switched to alternative vendor",
  "Account consolidation / Duplicate entry",
];

export function DeactivateVendorModal({
  isOpen,
  vendor,
  onClose,
  onVendorDeactivated,
}: DeactivateVendorModalProps) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !loading) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, loading]);

  useEffect(() => {
    if (isOpen) {
      setReason("");
      setError(null);
    }
  }, [isOpen, vendor]);

  if (!isOpen || !vendor) return null;

  const displayName = vendor.profile
    ? `${vendor.profile.firstName} ${vendor.profile.lastName || ""}`.trim()
    : `Vendor #${vendor.id}`;

  const prodCount = vendor.vendorProducts?.length ?? 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reason.trim() || reason.trim().length < 3) {
      setError("Please provide a reason why this vendor is being deactivated (minimum 3 characters).");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await vendorApi.deleteVendor(vendor.id, reason.trim());
      onVendorDeactivated();
      onClose();
    } catch (err: any) {
      console.error("Failed to deactivate vendor", err);
      setError(err?.message || "Failed to deactivate vendor account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.78)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "1rem",
        animation: "fadeIn 150ms ease-out",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <Card
        style={{
          width: "100%",
          maxWidth: "520px",
          backgroundColor: "var(--bg-surface)",
          border: "1px solid rgba(244, 63, 94, 0.4)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "0 24px 48px -12px rgba(0,0,0,0.65), 0 0 24px -6px rgba(244, 63, 94, 0.25)",
          padding: "1.75rem",
        }}
      >
        {/* Header with Visual Icon */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem", marginBottom: "1.25rem" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "var(--radius-md)",
              backgroundColor: "rgba(244, 63, 94, 0.15)",
              border: "1px solid rgba(244, 63, 94, 0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.5rem",
              flexShrink: 0,
            }}
          >
            🛑
          </div>

          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-primary)" }}>
              Deactivate Vendor / Supplier
            </h3>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
              Archive supplier #{vendor.id} and document reason for termination
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
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

        {/* Vendor Identity Preview */}
        <div
          style={{
            padding: "1rem",
            borderRadius: "var(--radius-md)",
            backgroundColor: "var(--bg-surface-elevated)",
            border: "1px solid var(--border-subtle)",
            marginBottom: "1.25rem",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ fontWeight: 700, fontSize: "1rem", color: "var(--text-primary)" }}>
                  {displayName}
                </span>
                {vendor.profile?.isCompany && <Badge variant="warning">Company</Badge>}
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                Vendor ID: #{vendor.id} {vendor.profile?.phoneNumber ? `• 📞 ${vendor.profile.phoneNumber}` : ""}
              </div>
              {prodCount > 0 && (
                <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
                  Supplies {prodCount} catalog product{prodCount !== 1 ? "s" : ""}
                </div>
              )}
            </div>
            <Badge variant={getVendorGroupBadgeVariant(vendor.vendorgroup)}>{getVendorGroupName(vendor.vendorgroup)}</Badge>
          </div>
        </div>

        {/* Warning / Impact Notice */}
        <div
          style={{
            padding: "0.85rem 1rem",
            borderRadius: "var(--radius-md)",
            backgroundColor: "rgba(244, 63, 94, 0.08)",
            border: "1px solid rgba(244, 63, 94, 0.25)",
            marginBottom: "1.25rem",
            fontSize: "0.825rem",
            color: "var(--accent-rose)",
            lineHeight: 1.45,
          }}
        >
          <strong>What happens when deactivated:</strong>
          <ul style={{ paddingLeft: "1.2rem", marginTop: "0.35rem", display: "flex", flexDirection: "column", gap: "0.2rem" }}>
            <li>This supplier will no longer appear in new purchase order pickers.</li>
            <li>Historical purchase orders, supply prices, and goods receipts remain preserved.</li>
            <li>The deactivation reason will be archived for supplier performance records.</li>
          </ul>
        </div>

        {error && (
          <div
            style={{
              padding: "0.75rem 1rem",
              borderRadius: "var(--radius-md)",
              backgroundColor: "rgba(244, 63, 94, 0.15)",
              border: "1px solid var(--accent-rose)",
              color: "var(--accent-rose)",
              fontSize: "0.85rem",
              marginBottom: "1.25rem",
            }}
          >
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label
              htmlFor="deactivate-vendor-reason-input"
              style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)", display: "block", marginBottom: "0.4rem" }}
            >
              Reason for Deactivation / Contract Termination *
            </label>
            <textarea
              id="deactivate-vendor-reason-input"
              rows={3}
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why this vendor or supplier is being deactivated..."
              style={{
                width: "100%",
                padding: "0.65rem 0.85rem",
                borderRadius: "var(--radius-md)",
                backgroundColor: "var(--bg-primary)",
                border: "1px solid var(--border-glow)",
                color: "var(--text-primary)",
                fontSize: "0.875rem",
                resize: "vertical",
                outline: "none",
                fontFamily: "inherit",
              }}
              autoFocus
            />

            {/* Quick preset chips */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginTop: "0.5rem" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", alignSelf: "center" }}>Quick presets:</span>
              {PRESET_REASONS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setReason(preset)}
                  style={{
                    fontSize: "0.75rem",
                    padding: "0.2rem 0.5rem",
                    borderRadius: "var(--radius-full)",
                    backgroundColor: reason === preset ? "rgba(244, 63, 94, 0.2)" : "var(--bg-surface-elevated)",
                    color: reason === preset ? "var(--accent-rose)" : "var(--text-secondary)",
                    border: reason === preset ? "1px solid var(--accent-rose)" : "1px solid var(--border-subtle)",
                    cursor: "pointer",
                    transition: "all var(--transition-fast)",
                  }}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.75rem" }}>
            <Button variant="secondary" onClick={onClose} disabled={loading} type="button">
              Cancel
            </Button>
            <Button
              id="confirm-deactivate-vendor-btn"
              type="submit"
              disabled={loading || !reason.trim()}
              style={{
                backgroundColor: "var(--accent-rose)",
                color: "#fff",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                boxShadow: "0 4px 14px rgba(244, 63, 94, 0.3)",
              }}
            >
              <span>🛑</span>
              <span>{loading ? "Deactivating..." : "Deactivate Vendor"}</span>
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
