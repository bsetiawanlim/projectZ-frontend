"use client";

import React, { useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

interface ReactivateAccountModalProps {
  isOpen: boolean;
  title: string;
  accountType: "Customer" | "Vendor";
  accountId: number;
  displayName: string;
  detailSubtitle?: string;
  departReason?: string | null;
  deactivatedAt?: string | Date | null;
  loading: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ReactivateAccountModal({
  isOpen,
  title,
  accountType,
  accountId,
  displayName,
  detailSubtitle,
  departReason,
  deactivatedAt,
  loading,
  onConfirm,
  onClose,
}: ReactivateAccountModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !loading) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, loading]);

  if (!isOpen) return null;

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
          maxWidth: "500px",
          backgroundColor: "var(--bg-surface)",
          border: "1px solid rgba(16, 185, 129, 0.35)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "0 24px 48px -12px rgba(0, 0, 0, 0.65), 0 0 24px -6px rgba(16, 185, 129, 0.2)",
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
              backgroundColor: "rgba(16, 185, 129, 0.12)",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.5rem",
              flexShrink: 0,
              color: "var(--accent-emerald)",
            }}
          >
            ↺
          </div>

          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-primary)" }}>
              {title}
            </h3>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
              Restore #{accountId} back to active operational status
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

        {/* Account Identity Card */}
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
              <div style={{ fontWeight: 700, fontSize: "1rem", color: "var(--text-primary)" }}>
                {displayName}
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                {accountType} ID: #{accountId} {detailSubtitle ? "• " + detailSubtitle : ""}
              </div>
            </div>
            <Badge variant="danger">Currently Deactivated</Badge>
          </div>

          {departReason && (
            <div
              style={{
                marginTop: "0.75rem",
                paddingTop: "0.75rem",
                borderTop: "1px solid var(--border-subtle)",
                fontSize: "0.8rem",
              }}
            >
              <span style={{ color: "var(--text-muted)" }}>Reason archived: </span>
              <span style={{ color: "var(--text-secondary)", fontStyle: "italic" }}>
                "{departReason}"
              </span>
              {deactivatedAt && (
                <span style={{ color: "var(--text-muted)", marginLeft: "0.5rem" }}>
                  ({new Date(deactivatedAt).toLocaleDateString()})
                </span>
              )}
            </div>
          )}
        </div>

        {/* Notice of Action */}
        <div
          style={{
            padding: "0.85rem 1rem",
            borderRadius: "var(--radius-md)",
            backgroundColor: "rgba(16, 185, 129, 0.08)",
            border: "1px solid rgba(16, 185, 129, 0.25)",
            marginBottom: "1.5rem",
            fontSize: "0.825rem",
            color: "var(--text-primary)",
            lineHeight: 1.45,
          }}
        >
          <strong style={{ color: "var(--accent-emerald)" }}>What happens upon reactivation:</strong>
          <ul
            style={{
              paddingLeft: "1.2rem",
              marginTop: "0.35rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.2rem",
              color: "var(--text-secondary)",
            }}
          >
            <li>The account immediately returns to the active {accountType.toLowerCase()} registry.</li>
            <li>Available immediately in transactions, orders, and selection menus.</li>
            <li>All previous records, addresses, documents, and history remain intact.</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
          <Button variant="secondary" onClick={onClose} disabled={loading} type="button">
            Cancel
          </Button>
          <Button
            id="confirm-reactivate-btn"
            type="button"
            disabled={loading}
            onClick={onConfirm}
            style={{
              backgroundColor: "var(--accent-emerald)",
              color: "#ffffff",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              boxShadow: "0 4px 14px rgba(16, 185, 129, 0.3)",
              border: "none",
            }}
          >
            <span>↺</span>
            <span>{loading ? "Reactivating..." : "Reactivate " + accountType}</span>
          </Button>
        </div>
      </Card>
    </div>
  );
}
