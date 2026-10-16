"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { userApi, type CheckUserDeleteResult } from "@/lib/api";
import { useAuth } from "@/lib/authContext";
import type { UserRecord } from "@pz/shared";

export interface DeleteUserModalProps {
  isOpen: boolean;
  user: UserRecord | null;
  onClose: () => void;
  onUserDeleted: () => void;
}

export function DeleteUserModal({
  isOpen,
  user,
  onClose,
  onUserDeleted,
}: DeleteUserModalProps) {
  const { user: currentUser } = useAuth();
  const [checking, setChecking] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkResult, setCheckResult] = useState<CheckUserDeleteResult | null>(null);

  // Close on Escape key if not busy
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !deleting) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, deleting]);

  // Check relations on open
  useEffect(() => {
    if (isOpen && user) {
      setError(null);
      setCheckResult(null);
      setChecking(true);

      userApi
        .checkCanDelete(user.id)
        .then((res) => {
          setCheckResult(res);
        })
        .catch((err: any) => {
          console.error("Failed to check user relations", err);
          setError(err?.message || "Failed to inspect user relations.");
        })
        .finally(() => {
          setChecking(false);
        });
    }
  }, [isOpen, user]);

  if (!isOpen || !user) return null;

  const isSelf = user.id === currentUser?.id;
  const initial = (user.name || user.email || "U").charAt(0).toUpperCase();
  const linkedProfile = user.userProfile || (user as any).profile;

  const canDelete = !checking && !isSelf && checkResult?.canDelete === true;
  const hasRelatedRecords = (checkResult?.relatedRecords?.length ?? 0) > 0;

  const handleDelete = async () => {
    if (!canDelete) return;

    setDeleting(true);
    setError(null);

    try {
      await userApi.deleteUser(user.id);
      onUserDeleted();
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to delete user account.");
    } finally {
      setDeleting(false);
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
        if (e.target === e.currentTarget && !deleting) onClose();
      }}
    >
      <Card
        style={{
          width: "100%",
          maxWidth: "540px",
          backgroundColor: "var(--bg-surface)",
          border: "1px solid rgba(244, 63, 94, 0.4)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "0 24px 48px -12px rgba(0,0,0,0.65), 0 0 24px -6px rgba(244, 63, 94, 0.25)",
          padding: "1.75rem",
          maxHeight: "90vh",
          overflowY: "auto",
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
              border: "1px solid rgba(244, 63, 94, 0.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.5rem",
              flexShrink: 0,
            }}
          >
            🗑️
          </div>

          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-primary)" }}>
              Permanent User Deletion
            </h3>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
              Permanently erase this account and its credentials from the database.
            </p>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={deleting}
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
                  : "linear-gradient(135deg, #475569, #334155)",
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
              <Badge variant="danger">Deactivated</Badge>
            </div>
          </div>

          {/* Details */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "1.25rem",
              marginTop: "0.85rem",
              paddingTop: "0.75rem",
              borderTop: "1px solid var(--border-subtle)",
              fontSize: "0.78rem",
            }}
          >
            <div>
              <span style={{ color: "var(--text-muted)" }}>Role: </span>
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
            {user.deletedAt && (
              <div>
                <span style={{ color: "var(--text-muted)" }}>Deactivated Since: </span>
                <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>
                  {new Date(user.deletedAt).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Status / Relation Check Notice */}
        {checking ? (
          <div
            style={{
              padding: "1.25rem",
              borderRadius: "var(--radius-md)",
              backgroundColor: "rgba(99, 102, 241, 0.08)",
              border: "1px solid rgba(99, 102, 241, 0.25)",
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              marginBottom: "1.25rem",
            }}
          >
            <span style={{ fontSize: "1.2rem", animation: "spin 1s linear infinite" }}>🔄</span>
            <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              Scanning organizational records and audit trails for dependencies...
            </div>
          </div>
        ) : isSelf ? (
          <div
            style={{
              padding: "1rem 1.25rem",
              borderRadius: "var(--radius-md)",
              backgroundColor: "rgba(244, 63, 94, 0.1)",
              border: "1px solid rgba(244, 63, 94, 0.3)",
              marginBottom: "1.25rem",
            }}
          >
            <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--accent-rose)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span>⛔</span> Cannot Delete Current Account
            </div>
            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.35rem" }}>
              You are currently logged in as this user. You cannot delete your own account.
            </p>
          </div>
        ) : hasRelatedRecords ? (
          <div
            style={{
              padding: "1.1rem 1.25rem",
              borderRadius: "var(--radius-md)",
              backgroundColor: "rgba(244, 63, 94, 0.08)",
              border: "1px solid rgba(244, 63, 94, 0.35)",
              marginBottom: "1.25rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 700, fontSize: "0.9rem", color: "var(--accent-rose)" }}>
              <span style={{ fontSize: "1.1rem" }}>⛔</span>
              <span>Deletion Blocked: Related Records Found</span>
            </div>

            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.4rem" }}>
              This user cannot be deleted because the following records reference this account in the system:
            </p>

            {/* List of related records */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "0.45rem",
                marginTop: "0.75rem",
                marginBottom: "0.75rem",
                maxHeight: "140px",
                overflowY: "auto",
                padding: "0.25rem",
              }}
            >
              {checkResult?.relatedRecords.map((r, i) => (
                <span
                  key={i}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.35rem",
                    padding: "0.25rem 0.6rem",
                    borderRadius: "var(--radius-sm)",
                    backgroundColor: "rgba(244, 63, 94, 0.15)",
                    border: "1px solid rgba(244, 63, 94, 0.35)",
                    color: "var(--accent-rose)",
                    fontWeight: 600,
                    fontSize: "0.78rem",
                  }}
                >
                  📌 {r}
                </span>
              ))}
            </div>

            <p style={{ fontSize: "0.76rem", color: "var(--text-muted)", marginTop: "0.5rem", fontStyle: "italic" }}>
              🛡️ To protect audit compliance, transactions, and relational data integrity, users with linked data cannot be deleted. The account remains deactivated, preventing sign-in.
            </p>
          </div>
        ) : (
          <div
            style={{
              padding: "1rem 1.25rem",
              borderRadius: "var(--radius-md)",
              backgroundColor: "rgba(245, 158, 11, 0.1)",
              border: "1px solid rgba(245, 158, 11, 0.3)",
              marginBottom: "1.25rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 700, fontSize: "0.9rem", color: "var(--accent-amber)" }}>
              <span>⚠️</span>
              <span>Confirm Permanent Deletion</span>
            </div>
            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.35rem" }}>
              No related operational records or profile links were found for this user. This account and credentials will be permanently erased.
            </p>
            <p style={{ fontSize: "0.76rem", color: "var(--accent-rose)", marginTop: "0.35rem", fontWeight: 600 }}>
              This action is irreversible!
            </p>
          </div>
        )}

        {/* Error message banner */}
        {error && (
          <div
            style={{
              padding: "0.75rem 1rem",
              borderRadius: "var(--radius-md)",
              backgroundColor: "rgba(244, 63, 94, 0.15)",
              border: "1px solid rgba(244, 63, 94, 0.35)",
              color: "var(--accent-rose)",
              fontSize: "0.82rem",
              marginBottom: "1.25rem",
              display: "flex",
              alignItems: "flex-start",
              gap: "0.5rem",
            }}
          >
            <span>⚠️</span>
            <div style={{ flex: 1 }}>{error}</div>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
          <Button
            id="cancel-delete-user-btn"
            variant="secondary"
            onClick={onClose}
            disabled={deleting}
          >
            {hasRelatedRecords ? "Understood" : "Cancel"}
          </Button>

          {canDelete && (
            <Button
              id="confirm-delete-user-btn"
              variant="danger"
              onClick={handleDelete}
              disabled={deleting || checking}
              style={{
                backgroundColor: "var(--accent-rose)",
                borderColor: "var(--accent-rose)",
                color: "#fff",
              }}
            >
              {deleting ? "Deleting..." : "🗑️ Delete Permanently"}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
