"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { userApi } from "@/lib/api";
import type { UserRecord } from "@pz/shared";

export interface DeactivateUserModalProps {
  isOpen: boolean;
  user: UserRecord | null;
  onClose: () => void;
  onStatusChanged: (updatedUser: UserRecord) => void;
}

export function DeactivateUserModal({
  isOpen,
  user,
  onClose,
  onStatusChanged,
}: DeactivateUserModalProps) {
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
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen || !user) return null;

  const isDeactivated = Boolean(user.deletedAt);
  const actionLabel = isDeactivated ? "Reactivate" : "Deactivate";
  const initial = (user.name || user.email || "U").charAt(0).toUpperCase();
  const linkedProfile = user.userProfile || (user as any).profile;

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);

    try {
      const updated = await userApi.toggleUserStatus(user.id);
      onStatusChanged(updated);
      onClose();
    } catch (err: any) {
      setError(err?.message || `Failed to ${actionLabel.toLowerCase()} user account.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
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
          border: isDeactivated
            ? "1px solid rgba(16, 185, 129, 0.4)"
            : "1px solid rgba(244, 63, 94, 0.4)",
          borderRadius: "var(--radius-lg)",
          boxShadow: isDeactivated
            ? "0 24px 48px -12px rgba(0,0,0,0.65), 0 0 24px -6px rgba(16, 185, 129, 0.25)"
            : "0 24px 48px -12px rgba(0,0,0,0.65), 0 0 24px -6px rgba(244, 63, 94, 0.25)",
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
              backgroundColor: isDeactivated ? "rgba(16, 185, 129, 0.15)" : "rgba(244, 63, 94, 0.15)",
              border: isDeactivated ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid rgba(244, 63, 94, 0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.5rem",
              flexShrink: 0,
            }}
          >
            {isDeactivated ? "🔄" : "🛑"}
          </div>

          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-primary)" }}>
              {isDeactivated ? "Reactivate User Account" : "Deactivate User Account"}
            </h3>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
              {isDeactivated
                ? "Restore account authentication privileges and access rights."
                : "Temporarily suspend user authentication and revoke system access."}
            </p>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={loading}
            style={{ fontSize: "1.1rem", padding: "0.2rem 0.4rem", color: "var(--text-muted)" }}
            aria-label="Close dialog"
          >
            ✕
          </Button>
        </div>

        {/* Target User Information Card */}
        <div
          style={{
            padding: "1rem",
            borderRadius: "var(--radius-md)",
            backgroundColor: "var(--bg-surface-elevated)",
            border: "1px solid var(--border-subtle)",
            marginBottom: "1.25rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "50%",
                background: user.isSuperAdmin
                  ? "linear-gradient(135deg, #f59e0b, #ef4444)"
                  : "linear-gradient(135deg, var(--primary), #818cf8)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: "1rem",
                color: "#fff",
                flexShrink: 0,
              }}
            >
              {initial}
            </div>

            <div style={{ flex: 1, overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span
                  style={{
                    fontWeight: 700,
                    fontSize: "0.95rem",
                    color: "var(--text-primary)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {user.name}
                </span>
                {user.isSuperAdmin && <Badge variant="warning">Super Admin</Badge>}
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{user.email}</div>
            </div>

            <div>
              <Badge variant={isDeactivated ? "danger" : "success"}>
                {isDeactivated ? "Currently Deactivated" : "Currently Active"}
              </Badge>
            </div>
          </div>

          {/* Additional details: role & linked profile */}
          <div
            style={{
              display: "flex",
              gap: "1.5rem",
              marginTop: "0.85rem",
              paddingTop: "0.75rem",
              borderTop: "1px solid var(--border-subtle)",
              fontSize: "0.78rem",
            }}
          >
            <div>
              <span style={{ color: "var(--text-muted)" }}>Assigned Role: </span>
              <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>
                {user.role ? `${user.role.roleName} (${user.role.roleAbbr})` : "Standard User"}
              </span>
            </div>
            {linkedProfile && (
              <div>
                <span style={{ color: "var(--text-muted)" }}>Linked Profile: </span>
                <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>
                  {linkedProfile.firstName} {linkedProfile.lastName || ""}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Warning or Impact Notice */}
        <div
          style={{
            padding: "0.9rem 1rem",
            borderRadius: "var(--radius-md)",
            backgroundColor: isDeactivated ? "rgba(16, 185, 129, 0.08)" : "rgba(244, 63, 94, 0.08)",
            border: isDeactivated ? "1px solid rgba(16, 185, 129, 0.25)" : "1px solid rgba(244, 63, 94, 0.25)",
            marginBottom: "1.25rem",
            fontSize: "0.825rem",
            lineHeight: 1.45,
          }}
        >
          {isDeactivated ? (
            <div style={{ color: "var(--accent-emerald)" }}>
              <strong>What happens upon reactivation:</strong>
              <ul style={{ paddingLeft: "1.2rem", marginTop: "0.35rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                <li>The user will immediately regain access to sign in to the platform.</li>
                <li>Their previous permissions, assigned role, and linked personal identity will be restored.</li>
              </ul>
            </div>
          ) : (
            <div style={{ color: "var(--accent-rose)" }}>
              <strong>What happens upon deactivation:</strong>
              <ul style={{ paddingLeft: "1.2rem", marginTop: "0.35rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                <li>The user will be immediately logged out and blocked from signing in.</li>
                <li>Access to POS registers, inventory catalog, and operational tools will be revoked.</li>
                <li>Historical transaction data, customer orders, and audit logs are safely preserved.</li>
                <li>You can reactivate this account at any time.</li>
              </ul>
            </div>
          )}
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

        {/* Actions */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>

          <Button
            id="confirm-toggle-user-status-btn"
            type="button"
            size="md"
            onClick={handleConfirm}
            disabled={loading}
            style={{
              backgroundColor: isDeactivated ? "var(--accent-emerald)" : "var(--accent-rose)",
              color: "#fff",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              boxShadow: isDeactivated
                ? "0 4px 14px rgba(16, 185, 129, 0.3)"
                : "0 4px 14px rgba(244, 63, 94, 0.3)",
            }}
          >
            <span>{isDeactivated ? "✓" : "🚫"}</span>
            <span>
              {loading
                ? isDeactivated
                  ? "Reactivating..."
                  : "Deactivating..."
                : isDeactivated
                ? "Reactivate Account"
                : "Deactivate Account"}
            </span>
          </Button>
        </div>
      </Card>
    </div>
  );
}
