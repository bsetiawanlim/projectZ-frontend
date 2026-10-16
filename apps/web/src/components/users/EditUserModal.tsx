"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PersonPicker } from "@/components/common/PersonPicker";
import { PersonDuplicateConfirmModal } from "./PersonDuplicateConfirmModal";
import { roleApi, profileApi, userApi } from "@/lib/api";
import type { RoleRecord, ProfileRecord, UserRecord } from "@pz/shared";

interface EditUserModalProps {
  isOpen: boolean;
  user: UserRecord | null;
  onClose: () => void;
  onUserUpdated: (user: UserRecord) => void;
  existingUsers?: UserRecord[];
}

export function EditUserModal({ isOpen, user, onClose, onUserUpdated, existingUsers }: EditUserModalProps) {
  // User Credentials & Account Info
  const [name, setName] = useState("");
  const [roleId, setRoleId] = useState<number | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  // Profile linking mode: "existing" (pick from DB / unlinked) or "new" (create person inline)
  const [profileMode, setProfileMode] = useState<"existing" | "new">("existing");
  const [selectedProfile, setSelectedProfile] = useState<ProfileRecord | null>(null);

  // Duplicate / Multi-link confirmation state
  const [allUsers, setAllUsers] = useState<UserRecord[]>(existingUsers || []);
  const [pendingProfile, setPendingProfile] = useState<ProfileRecord | null>(null);
  const [conflictUsers, setConflictUsers] = useState<UserRecord[]>([]);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmedProfileId, setConfirmedProfileId] = useState<number | null>(null);

  // Inline "Create Person" fields
  const [personFirstName, setPersonFirstName] = useState("");
  const [personLastName, setPersonLastName] = useState("");
  const [personPhoneNumber, setPersonPhoneNumber] = useState("");
  const [personWhatsapp, setPersonWhatsapp] = useState("");
  const [personAddress, setPersonAddress] = useState("");
  const [personIsCompany, setPersonIsCompany] = useState(false);
  const [creatingPerson, setCreatingPerson] = useState(false);
  const [createdPersonNotice, setCreatedPersonNotice] = useState<string | null>(null);

  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && user) {
      if (existingUsers && existingUsers.length > 0) {
        setAllUsers(existingUsers);
      } else {
        userApi
          .listUsers()
          .then((res) => setAllUsers(res.items || []))
          .catch(() => setAllUsers([]));
      }

      setName(user.name);
      setRoleId(user.roleId ?? null);
      setIsSuperAdmin(!!user.isSuperAdmin);
      setProfileMode("existing");
      setPendingProfile(null);
      setConflictUsers([]);
      setIsConfirmOpen(false);
      setConfirmedProfileId(user.profileId ?? null);
      setPersonFirstName("");
      setPersonLastName("");
      setPersonPhoneNumber("");
      setPersonWhatsapp("");
      setPersonAddress("");
      setPersonIsCompany(false);
      setCreatingPerson(false);
      setCreatedPersonNotice(null);
      setError(null);

      // Hydrate selectedProfile if user has linked profile
      if (user.userProfile && user.userProfile.id) {
        setSelectedProfile(user.userProfile as unknown as ProfileRecord);
      } else if (user.profileId) {
        profileApi
          .getProfile(user.profileId)
          .then((res: any) => {
            const p = res?.data ?? res;
            if (p) setSelectedProfile(p);
          })
          .catch(() => setSelectedProfile(null));
      } else {
        setSelectedProfile(null);
      }

      // Load roles for role selector
      roleApi
        .listRoles({ limit: 100 })
        .then((res) => setRoles(res.items || []))
        .catch(() => setRoles([]));
    }
  }, [isOpen, user, existingUsers]);

  if (!isOpen || !user) return null;

  // Helper to split user name and prefill person name fields
  const handleAutoFillPersonName = () => {
    if (!name.trim()) return;
    const parts = name.trim().split(/\s+/);
    setPersonFirstName(parts[0] || "");
    setPersonLastName(parts.slice(1).join(" ") || "");
  };

  // Immediate person creation from inside the modal
  const handleCreatePersonNow = async () => {
    if (!personFirstName.trim() || personFirstName.trim().length < 2) {
      setError("Person First Name must be at least 2 characters.");
      return;
    }

    setCreatingPerson(true);
    setError(null);

    try {
      const res = await profileApi.createProfile({
        firstName: personFirstName.trim(),
        lastName: personLastName.trim() || undefined,
        phoneNumber: personPhoneNumber.trim() || undefined,
        whatsapp: personWhatsapp.trim() || undefined,
        address: personAddress.trim() || undefined,
        isCompany: personIsCompany,
      });

      const newProfile = (res as any)?.data ?? res;
      if (newProfile && (newProfile.id || newProfile.firstName)) {
        setSelectedProfile(newProfile);
        setProfileMode("existing");
        setCreatedPersonNotice(
          `✓ Person profile #${newProfile.id} (${newProfile.firstName}${newProfile.lastName ? " " + newProfile.lastName : ""}) created and linked!`
        );
      }
    } catch (err: any) {
      setError(err?.message || "Failed to create person identity");
    } finally {
      setCreatingPerson(false);
    }
  };

  // Check if a profile is linked to any other users (excluding current user being edited)
  const getLinkedUsersForProfile = (profileId: number): UserRecord[] => {
    return allUsers.filter(
      (u) =>
        u.id !== user.id &&
        ((u.profileId !== null && u.profileId !== undefined && Number(u.profileId) === Number(profileId)) ||
        (u.userProfile && Number(u.userProfile.id) === Number(profileId)))
    );
  };

  // Handler when selecting a person from PersonPicker
  const handleSelectProfile = (profile: ProfileRecord | null) => {
    if (!profile) {
      setSelectedProfile(null);
      setConfirmedProfileId(null);
      setCreatedPersonNotice(null);
      setError(null);
      return;
    }

    const conflicts = getLinkedUsersForProfile(profile.id);
    if (conflicts.length > 0 && confirmedProfileId !== profile.id) {
      // Pop out confirmation box!
      setPendingProfile(profile);
      setConflictUsers(conflicts);
      setIsConfirmOpen(true);
    } else {
      setSelectedProfile(profile);
      setCreatedPersonNotice(null);
      setError(null);
    }
  };

  const handleConfirmDuplicateLink = () => {
    if (pendingProfile) {
      setSelectedProfile(pendingProfile);
      setConfirmedProfileId(pendingProfile.id);
      setCreatedPersonNotice(null);
      setError(null);
    }
    setIsConfirmOpen(false);
    setPendingProfile(null);
    setConflictUsers([]);
  };

  const handleCancelDuplicateLink = () => {
    setIsConfirmOpen(false);
    setPendingProfile(null);
    setConflictUsers([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("User name is required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let finalProfileId: number | null = null;

      if (profileMode === "existing") {
        if (selectedProfile) {
          const conflicts = getLinkedUsersForProfile(selectedProfile.id);
          if (conflicts.length > 0 && confirmedProfileId !== selectedProfile.id) {
            setPendingProfile(selectedProfile);
            setConflictUsers(conflicts);
            setIsConfirmOpen(true);
            setLoading(false);
            return;
          }
          finalProfileId = selectedProfile.id;
        } else {
          finalProfileId = null;
        }
      } else if (profileMode === "new") {
        // If in create person mode, validate and create person first
        if (!personFirstName.trim() || personFirstName.trim().length < 2) {
          setError(
            "Person First Name must be at least 2 characters. Or switch to 'Select Existing Person' tab if you do not want to create a profile."
          );
          setLoading(false);
          return;
        }

        const profileRes = await profileApi.createProfile({
          firstName: personFirstName.trim(),
          lastName: personLastName.trim() || undefined,
          phoneNumber: personPhoneNumber.trim() || undefined,
          whatsapp: personWhatsapp.trim() || undefined,
          address: personAddress.trim() || undefined,
          isCompany: personIsCompany,
        });

        const newProfile = (profileRes as any)?.data ?? profileRes;
        finalProfileId = newProfile?.id ?? null;
      }

      const updated = await userApi.updateUser({
        id: user.id,
        name: name.trim(),
        roleId: roleId !== null ? roleId : null,
        isSuperAdmin,
        profileId: finalProfileId,
      });

      onUserUpdated(updated);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to update user account");
    } finally {
      setLoading(false);
    }
  };

  const selectedConflicts = selectedProfile ? getLinkedUsersForProfile(selectedProfile.id) : [];

  return (
    <>
      <div
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(0, 0, 0, 0.75)",
          backdropFilter: "blur(6px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          padding: "1rem",
          overflowY: "auto",
        }}
      >
        <Card
          style={{
            width: "100%",
            maxWidth: "560px",
            maxHeight: "92vh",
            overflowY: "auto",
            backgroundColor: "var(--bg-surface)",
            border: "1px solid var(--border-glow)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
            padding: "1.75rem",
          }}
        >
          {/* Modal Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
            <div>
              <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--text-primary)" }}>
                Edit User Account
              </h3>
              <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
                Update access roles, profile links, and admin privileges
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} style={{ fontSize: "1rem", padding: "0.2rem 0.5rem" }}>
              ✕
            </Button>
          </div>

          {/* Error Notice */}
          {error && (
            <div
              style={{
                padding: "0.75rem",
                borderRadius: "var(--radius-md)",
                backgroundColor: "rgba(239, 68, 68, 0.15)",
                border: "1px solid var(--accent-rose)",
                color: "var(--accent-rose)",
                fontSize: "0.85rem",
                marginBottom: "1rem",
              }}
            >
              {error}
            </div>
          )}

          {/* Success Notice */}
          {createdPersonNotice && (
            <div
              style={{
                padding: "0.75rem",
                borderRadius: "var(--radius-md)",
                backgroundColor: "rgba(16, 185, 129, 0.15)",
                border: "1px solid var(--accent-emerald)",
                color: "var(--accent-emerald)",
                fontSize: "0.85rem",
                marginBottom: "1rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>{createdPersonNotice}</span>
              <button
                type="button"
                onClick={() => setCreatedPersonNotice(null)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--accent-emerald)",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                ✕
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {/* User Account Basics */}
            <div>
              <label
                style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.3rem", color: "var(--text-secondary)" }}
              >
                Email Address
              </label>
              <Input value={user.email} disabled style={{ opacity: 0.7 }} />
            </div>

            <div>
              <label
                htmlFor="edit-user-name"
                style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.3rem", color: "var(--text-secondary)" }}
              >
                Full Name *
              </label>
              <Input
                id="edit-user-name"
                placeholder="e.g. John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div>
              <label
                htmlFor="edit-user-role"
                style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.3rem", color: "var(--text-secondary)" }}
              >
                Assigned Role
              </label>
              <select
                id="edit-user-role"
                value={roleId ?? ""}
                onChange={(e) => setRoleId(e.target.value ? Number(e.target.value) : null)}
                style={{
                  width: "100%",
                  padding: "0.6rem 0.8rem",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "var(--bg-surface-elevated)",
                  border: "1px solid var(--border-subtle)",
                  color: "var(--text-primary)",
                  fontSize: "0.9rem",
                }}
              >
                <option value="">No Role (Default Limited)</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.roleName} ({r.roleAbbr})
                  </option>
                ))}
              </select>
            </div>

            {/* Personal Profile Section */}
            <div
              style={{
                padding: "0.9rem",
                borderRadius: "var(--radius-md)",
                backgroundColor: "var(--bg-surface-elevated)",
                border: "1px solid var(--border-subtle)",
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)" }}>
                    Personal Profile
                  </span>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginLeft: "0.4rem" }}>
                    (Optional)
                  </span>
                </div>
                {selectedProfile && (
                  <button
                    type="button"
                    id="edit-btn-unlink-person"
                    onClick={() => {
                      setSelectedProfile(null);
                      setConfirmedProfileId(null);
                      setCreatedPersonNotice(null);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--accent-rose)",
                      fontSize: "0.75rem",
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                  >
                    Unlink Profile ✕
                  </button>
                )}
              </div>

              {/* Mode Switcher Tabs */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  backgroundColor: "var(--bg-surface)",
                  padding: "0.2rem",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <button
                  type="button"
                  id="edit-user-profile-mode-existing-tab"
                  onClick={() => {
                    setProfileMode("existing");
                    setError(null);
                  }}
                  style={{
                    padding: "0.45rem",
                    borderRadius: "var(--radius-sm)",
                    fontSize: "0.825rem",
                    fontWeight: 600,
                    backgroundColor: profileMode === "existing" ? "var(--bg-surface-elevated)" : "transparent",
                    color: profileMode === "existing" ? "var(--primary)" : "var(--text-secondary)",
                    border: profileMode === "existing" ? "1px solid var(--border-glow)" : "1px solid transparent",
                    cursor: "pointer",
                    transition: "all var(--transition-fast)",
                  }}
                >
                  👤 Select Existing Person
                </button>
                <button
                  type="button"
                  id="edit-user-profile-mode-new-tab"
                  onClick={() => {
                    setProfileMode("new");
                    setError(null);
                    // Auto-fill person name from user name if empty
                    if (!personFirstName.trim() && name.trim()) {
                      const parts = name.trim().split(/\s+/);
                      setPersonFirstName(parts[0] || "");
                      setPersonLastName(parts.slice(1).join(" ") || "");
                    }
                  }}
                  style={{
                    padding: "0.45rem",
                    borderRadius: "var(--radius-sm)",
                    fontSize: "0.825rem",
                    fontWeight: 600,
                    backgroundColor: profileMode === "new" ? "var(--bg-surface-elevated)" : "transparent",
                    color: profileMode === "new" ? "var(--primary)" : "var(--text-secondary)",
                    border: profileMode === "new" ? "1px solid var(--border-glow)" : "1px solid transparent",
                    cursor: "pointer",
                    transition: "all var(--transition-fast)",
                  }}
                >
                  ➕ Create New Person
                </button>
              </div>

              {/* Tab 1: Existing Person */}
              {profileMode === "existing" && (
                <div>
                  {!selectedProfile && (
                    <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
                      No person profile linked (Account is independent). Search below to link an existing person:
                    </p>
                  )}
                  <PersonPicker
                    selectedProfile={selectedProfile}
                    onSelect={handleSelectProfile}
                  />

                  {/* Warning banner if selected person is linked to other users */}
                  {selectedProfile && selectedConflicts.length > 0 && (
                    <div
                      style={{
                        marginTop: "0.5rem",
                        padding: "0.45rem 0.75rem",
                        borderRadius: "var(--radius-sm)",
                        backgroundColor: "rgba(245, 158, 11, 0.12)",
                        border: "1px solid rgba(245, 158, 11, 0.35)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        fontSize: "0.775rem",
                        color: "var(--accent-amber)",
                      }}
                    >
                      <span>
                        ⚠️ Shared identity: Also linked to {selectedConflicts.length} other user account{selectedConflicts.length > 1 ? "s" : ""} ({selectedConflicts.map((u) => u.name).join(", ")})
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setPendingProfile(selectedProfile);
                          setConflictUsers(selectedConflicts);
                          setIsConfirmOpen(true);
                        }}
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--accent-amber)",
                          textDecoration: "underline",
                          cursor: "pointer",
                          fontWeight: 700,
                          fontSize: "0.75rem",
                          marginLeft: "0.5rem",
                        }}
                      >
                        Details
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Create New Person */}
              {profileMode === "new" && (
                <div
                  style={{
                    padding: "0.85rem",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: "var(--bg-surface)",
                    border: "1px solid var(--border-glow)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.75rem",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--primary)" }}>
                      New Person Profile Form
                    </span>
                    {name.trim() && (
                      <button
                        type="button"
                        id="edit-btn-autofill-person-name"
                        onClick={handleAutoFillPersonName}
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--primary)",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          cursor: "pointer",
                          textDecoration: "underline",
                        }}
                      >
                        ⚡ Auto-fill from User Name
                      </button>
                    )}
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
                    <Input
                      id="edit-new-person-first-name"
                      label="First Name *"
                      placeholder="e.g. John"
                      value={personFirstName}
                      onChange={(e) => setPersonFirstName(e.target.value)}
                      required
                    />
                    <Input
                      id="edit-new-person-last-name"
                      label="Last Name"
                      placeholder="e.g. Doe"
                      value={personLastName}
                      onChange={(e) => setPersonLastName(e.target.value)}
                    />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
                    <Input
                      id="edit-new-person-phone"
                      label="Phone Number"
                      placeholder="e.g. +62812345678"
                      value={personPhoneNumber}
                      onChange={(e) => setPersonPhoneNumber(e.target.value)}
                    />
                    <Input
                      id="edit-new-person-whatsapp"
                      label="WhatsApp"
                      placeholder="e.g. +62812345678"
                      value={personWhatsapp}
                      onChange={(e) => setPersonWhatsapp(e.target.value)}
                    />
                  </div>

                  <Input
                    id="edit-new-person-address"
                    label="Address"
                    placeholder="e.g. Jl. Sudirman No. 12, Jakarta"
                    value={personAddress}
                    onChange={(e) => setPersonAddress(e.target.value)}
                  />

                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <input
                      type="checkbox"
                      id="edit-new-person-is-company"
                      checked={personIsCompany}
                      onChange={(e) => setPersonIsCompany(e.target.checked)}
                      style={{ cursor: "pointer", width: "15px", height: "15px" }}
                    />
                    <label
                      htmlFor="edit-new-person-is-company"
                      style={{ fontSize: "0.8rem", color: "var(--text-secondary)", cursor: "pointer" }}
                    >
                      This is a corporate / business entity (Company)
                    </label>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginTop: "0.25rem",
                      paddingTop: "0.5rem",
                      borderTop: "1px solid var(--border-subtle)",
                    }}
                  >
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      Creates profile now or when saving user
                    </span>
                    <Button
                      type="button"
                      id="edit-btn-create-person-now"
                      variant="secondary"
                      size="sm"
                      disabled={creatingPerson || loading}
                      onClick={handleCreatePersonNow}
                      style={{ fontSize: "0.775rem" }}
                    >
                      {creatingPerson ? "Creating Person..." : "⚡ Create & Link Person Now"}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Super Admin Privileges */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.6rem",
                padding: "0.6rem 0.8rem",
                borderRadius: "var(--radius-md)",
                backgroundColor: "rgba(245, 158, 11, 0.08)",
                border: "1px solid rgba(245, 158, 11, 0.25)",
              }}
            >
              <input
                type="checkbox"
                id="edit-user-superadmin"
                checked={isSuperAdmin}
                onChange={(e) => setIsSuperAdmin(e.target.checked)}
                style={{ cursor: "pointer", width: "16px", height: "16px" }}
              />
              <label htmlFor="edit-user-superadmin" style={{ fontSize: "0.85rem", color: "var(--accent-amber)", fontWeight: 600, cursor: "pointer" }}>
                Super Admin Privileges (Bypasses RBAC restrictions)
              </label>
            </div>

            {/* Form Actions */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1rem" }}>
              <Button variant="secondary" type="button" onClick={onClose} disabled={loading || creatingPerson}>
                Cancel
              </Button>
              <Button id="submit-edit-user-btn" type="submit" disabled={loading || creatingPerson}>
                {loading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </Card>
      </div>

      {/* Confirmation Box when person is linked to more than one user */}
      <PersonDuplicateConfirmModal
        isOpen={isConfirmOpen}
        profile={pendingProfile}
        linkedUsers={conflictUsers}
        onConfirm={handleConfirmDuplicateLink}
        onCancel={handleCancelDuplicateLink}
      />
    </>
  );
}


