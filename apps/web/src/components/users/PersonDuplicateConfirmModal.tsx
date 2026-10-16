"use client";

import React, { useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type { ProfileRecord, UserRecord } from "@pz/shared";

interface PersonDuplicateConfirmModalProps {
  isOpen: boolean;
  profile: ProfileRecord | null;
  linkedUsers: UserRecord[];
  onConfirm: () => void;
  onCancel: () => void;
}

export function PersonDuplicateConfirmModal({
  isOpen,
  profile,
  linkedUsers,
  onConfirm,
  onCancel,
}: PersonDuplicateConfirmModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") {
        onCancel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen || !profile) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10001, // Higher than AddUserModal / EditUserModal (9999)
        padding: "1rem",
      }}
    >
      <Card
        style={{
          width: "100%",
          maxWidth: "480px",
          backgroundColor: "var(--bg-surface)",
          border: "1px solid var(--accent-amber)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 30px rgba(245, 158, 11, 0.2)",
          padding: "1.5rem",
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem",
        }}
      >
        {/* Header with Warning Icon */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: "0.85rem" }}>
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "var(--radius-full)",
              backgroundColor: "rgba(245, 158, 11, 0.15)",
              border: "1px solid rgba(245, 158, 11, 0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.35rem",
              flexShrink: 0,
            }}
          >
            ⚠️
          </div>
          <div>
            <h3 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--text-primary)" }}>
              Person Profile Already Linked
            </h3>
            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
              This personal identity is already associated with other user accounts
            </p>
          </div>
        </div>

        {/* Target Profile Card */}
        <div
          style={{
            padding: "0.75rem 1rem",
            borderRadius: "var(--radius-md)",
            backgroundColor: "var(--bg-surface-elevated)",
            border: "1px solid var(--border-subtle)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <span style={{ fontSize: "1.1rem" }}>{profile.isCompany ? "🏢" : "👤"}</span>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-primary)" }}>
                  {profile.firstName} {profile.lastName || ""}
                </span>
                <Badge variant={profile.isCompany ? "warning" : "default"}>
                  {profile.isCompany ? "Company" : "Individual"}
                </Badge>
              </div>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                Profile #{profile.id} {profile.phoneNumber ? `• ${profile.phoneNumber}` : ""}
              </span>
            </div>
          </div>
        </div>

        {/* Conflicting Linked Users List */}
        <div>
          <div
            style={{
              fontSize: "0.8rem",
              fontWeight: 600,
              color: "var(--accent-amber)",
              marginBottom: "0.5rem",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
            }}
          >
            Currently linked to {linkedUsers.length} user account{linkedUsers.length > 1 ? "s" : ""}:
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.4rem",
              maxHeight: "150px",
              overflowY: "auto",
              paddingRight: "0.2rem",
            }}
          >
            {linkedUsers.map((u) => (
              <div
                key={u.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0.5rem 0.75rem",
                  borderRadius: "var(--radius-sm)",
                  backgroundColor: "rgba(245, 158, 11, 0.06)",
                  border: "1px solid rgba(245, 158, 11, 0.2)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ fontSize: "0.9rem" }}>👤</span>
                  <div>
                    <div style={{ fontSize: "0.825rem", fontWeight: 600, color: "var(--text-primary)" }}>
                      {u.name}
                    </div>
                    <div style={{ fontSize: "0.725rem", color: "var(--text-muted)" }}>
                      {u.email}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  {u.isSuperAdmin ? (
                    <Badge variant="warning">Super Admin</Badge>
                  ) : u.role ? (
                    <Badge variant="default">{u.role.roleName}</Badge>
                  ) : null}
                  {u.deletedAt && <Badge variant="danger">Deactivated</Badge>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Warning text */}
        <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
          Linking this person will cause this personal identity to be shared across multiple user accounts. Are you sure you want to proceed?
        </p>

        {/* Actions */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
          <Button
            type="button"
            id="confirm-link-cancel-btn"
            variant="secondary"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            type="button"
            id="confirm-link-proceed-btn"
            onClick={onConfirm}
            style={{
              backgroundColor: "var(--accent-amber)",
              color: "#000",
              fontWeight: 700,
            }}
          >
            Yes, Link Person
          </Button>
        </div>
      </Card>
    </div>
  );
}
