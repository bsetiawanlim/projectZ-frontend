"use client";

import Link from "next/link";
import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/lib/authContext";
import { profileApi } from "@/lib/api";
import { type ProfileRecord, type ProfileSocialMediaRecord, type ProfileCustomerSummary, type ProfileVendorSummary, type ProfileEmployeeSummary, formatAddress } from "@pz/shared";

export interface ViewProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profileId?: number | null;
  initialProfile?: {
    id?: number;
    title?: string | null;
    firstName: string;
    lastName?: string | null;
    gender?: string | null;
    dateOfBirth?: string | Date | null;
    isCompany?: boolean;
    phoneNumber?: string | null;
    phoneNumberVerified?: boolean | null;
    address?: string | null;
    city?: string | null;
    province?: string | null;
    postalCode?: string | null;
    country?: string | null;
    socialId?: string | null;
    taxId?: string | null;
    whatsapp?: string | null;
    whatsappVerified?: boolean | null;
    notes?: string | null;
    socialMedia?: ProfileSocialMediaRecord[] | null;
    customer?: ProfileCustomerSummary[] | null;
    vendor?: ProfileVendorSummary[] | null;
    employee?: ProfileEmployeeSummary[] | null;
    createdAt?: string;
    updatedAt?: string;
  } | null;
  userName?: string;
  userEmail?: string;
  canEdit?: boolean;
  canDelete?: boolean;
  onProfileUpdated?: (updated: ProfileRecord) => void;
  onProfileDeleted?: (deletedId: number) => void;
}

interface PlatformInfo {
  label: string;
  icon: string;
  color: string;
  bg: string;
  placeholder: string;
  buildUrl: (u: string) => string;
}

const DEFAULT_PLATFORM_CONFIG: PlatformInfo = {
  label: "Other Account",
  icon: "🔗",
  color: "#8B5CF6",
  bg: "rgba(139, 92, 246, 0.12)",
  placeholder: "https://...",
  buildUrl: (u: string) => (u.startsWith("http") ? u : `https://${u}`),
};

const PLATFORM_CONFIG: Record<string, PlatformInfo> = {
  instagram: {
    label: "Instagram",
    icon: "📸",
    color: "#E1306C",
    bg: "rgba(225, 48, 108, 0.12)",
    placeholder: "username or https://instagram.com/username",
    buildUrl: (u) => (u.startsWith("http") ? u : `https://instagram.com/${u.replace(/^@/, "")}`),
  },
  linkedin: {
    label: "LinkedIn",
    icon: "💼",
    color: "#0A66C2",
    bg: "rgba(10, 102, 194, 0.12)",
    placeholder: "in/username or https://linkedin.com/in/username",
    buildUrl: (u) => (u.startsWith("http") ? u : u.startsWith("in/") ? `https://linkedin.com/${u}` : `https://linkedin.com/in/${u}`),
  },
  github: {
    label: "GitHub",
    icon: "💻",
    color: "#A371F7",
    bg: "rgba(163, 113, 247, 0.12)",
    placeholder: "username or https://github.com/username",
    buildUrl: (u) => (u.startsWith("http") ? u : `https://github.com/${u}`),
  },
  twitter: {
    label: "X (Twitter)",
    icon: "𝕏",
    color: "#1DA1F2",
    bg: "rgba(29, 161, 242, 0.12)",
    placeholder: "@handle or https://x.com/handle",
    buildUrl: (u) => (u.startsWith("http") ? u : `https://x.com/${u.replace(/^@/, "")}`),
  },
  youtube: {
    label: "YouTube",
    icon: "▶️",
    color: "#FF0000",
    bg: "rgba(255, 0, 0, 0.12)",
    placeholder: "@channel or https://youtube.com/@channel",
    buildUrl: (u) => (u.startsWith("http") ? u : `https://youtube.com/@${u.replace(/^@/, "")}`),
  },
  tiktok: {
    label: "TikTok",
    icon: "🎵",
    color: "#00F2FE",
    bg: "rgba(0, 242, 254, 0.12)",
    placeholder: "@handle or https://tiktok.com/@handle",
    buildUrl: (u) => (u.startsWith("http") ? u : `https://tiktok.com/@${u.replace(/^@/, "")}`),
  },
  facebook: {
    label: "Facebook",
    icon: "📘",
    color: "#1877F2",
    bg: "rgba(24, 119, 242, 0.12)",
    placeholder: "username or https://facebook.com/username",
    buildUrl: (u) => (u.startsWith("http") ? u : `https://facebook.com/${u}`),
  },
  website: {
    label: "Website / Portfolio",
    icon: "🌐",
    color: "#10B981",
    bg: "rgba(16, 185, 129, 0.12)",
    placeholder: "https://yourwebsite.com",
    buildUrl: (u) => (u.startsWith("http") ? u : `https://${u}`),
  },
  other: DEFAULT_PLATFORM_CONFIG,
};

function getPlatformConfig(platform?: string | null): PlatformInfo {
  if (!platform) return DEFAULT_PLATFORM_CONFIG;
  return PLATFORM_CONFIG[platform.toLowerCase()] || DEFAULT_PLATFORM_CONFIG;
}

export function ViewProfileModal({
  isOpen,
  onClose,
  profileId,
  initialProfile,
  userName,
  userEmail,
  canEdit,
  canDelete,
  onProfileUpdated,
  onProfileDeleted,
}: ViewProfileModalProps) {
  const { user, canAccess } = useAuth();
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Edit Mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editGender, setEditGender] = useState("");
  const [editDateOfBirth, setEditDateOfBirth] = useState("");
  const [editIsCompany, setEditIsCompany] = useState(false);
  const [editPhoneNumber, setEditPhoneNumber] = useState("");
  const [editPhoneNumberVerified, setEditPhoneNumberVerified] = useState(false);
  const [editWhatsapp, setEditWhatsapp] = useState("");
  const [editWhatsappVerified, setEditWhatsappVerified] = useState(false);
  const [editAddress, setEditAddress] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editProvince, setEditProvince] = useState("");
  const [editPostalCode, setEditPostalCode] = useState("");
  const [editCountry, setEditCountry] = useState("Indonesia");
  const [editSocialId, setEditSocialId] = useState("");
  const [editTaxId, setEditTaxId] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // Delete Profile state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Social Media state
  const [socialMedias, setSocialMedias] = useState<ProfileSocialMediaRecord[]>([]);
  const [isAddingSocial, setIsAddingSocial] = useState(false);
  const [socialPlatform, setSocialPlatform] = useState("instagram");
  const [socialUsername, setSocialUsername] = useState("");
  const [socialUrl, setSocialUrl] = useState("");
  const [socialNotes, setSocialNotes] = useState("");
  const [socialLoading, setSocialLoading] = useState(false);
  const [socialError, setSocialError] = useState<string | null>(null);
  const [socialSuccess, setSocialSuccess] = useState<string | null>(null);

  // Edit individual social media state
  const [editingSocialId, setEditingSocialId] = useState<number | null>(null);
  const [editSocialUrl, setEditSocialUrl] = useState("");
  const [editSocialUsername, setEditSocialUsername] = useState("");
  const [editSocialNotes, setEditSocialNotes] = useState("");

  // Permissions
  const hasPermission =
    canEdit !== undefined
      ? canEdit
      : Boolean(user?.isSuperAdmin || canAccess("profile", "update") || canAccess("profile", "*"));

  const hasDeletePermission =
    canDelete !== undefined
      ? canDelete
      : Boolean(user?.isSuperAdmin || canAccess("profile", "delete") || canAccess("profile", "*"));

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isSaving && !isDeleting) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, isSaving, isDeleting]);

  useEffect(() => {
    if (!isOpen) {
      setProfile(null);
      setError(null);
      setIsEditing(false);
      setSaveError(null);
      setSaveSuccess(null);
      setShowDeleteConfirm(false);
      setDeleteError(null);
      setIsAddingSocial(false);
      setEditingSocialId(null);
      return;
    }

    if (initialProfile) {
      setProfile({
        id: initialProfile.id || profileId || 0,
        title: initialProfile.title,
        firstName: initialProfile.firstName,
        lastName: initialProfile.lastName,
        gender: initialProfile.gender,
        dateOfBirth: initialProfile.dateOfBirth,
        isCompany: !!initialProfile.isCompany,
        phoneNumber: initialProfile.phoneNumber,
        phoneNumberVerified: initialProfile.phoneNumberVerified,
        address: initialProfile.address,
        city: initialProfile.city,
        province: initialProfile.province,
        postalCode: initialProfile.postalCode,
        country: initialProfile.country,
        socialId: initialProfile.socialId,
        taxId: initialProfile.taxId,
        whatsapp: initialProfile.whatsapp,
        whatsappVerified: initialProfile.whatsappVerified,
        notes: initialProfile.notes,
        socialMedia: initialProfile.socialMedia || [],
        customer: initialProfile.customer || [],
        vendor: initialProfile.vendor || [],
        employee: initialProfile.employee || [],
        createdAt: initialProfile.createdAt,
        updatedAt: initialProfile.updatedAt,
      });
      setSocialMedias(initialProfile.socialMedia || []);
    }

    const targetId = profileId || initialProfile?.id;
    if (targetId) {
      setLoading(true);
      setError(null);
      profileApi
        .getProfile(targetId)
        .then((res: any) => {
          const profileData: ProfileRecord = res?.data ?? res;
          if (profileData && (profileData.firstName || profileData.id)) {
            setProfile(profileData);
            if (profileData.socialMedia) {
              setSocialMedias(profileData.socialMedia);
            }
          }
        })
        .catch((err: any) => {
          console.warn("Could not fetch full profile details from API, using cached data:", err);
          if (!initialProfile) {
            setError(err?.message || "Failed to load person profile details.");
          }
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [isOpen, profileId, initialProfile]);

  const handleCopy = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => {
      setCopiedField(null);
    }, 2000);
  };

  const startEditing = () => {
    const current = profile || initialProfile;
    setEditTitle(current?.title || "");
    setEditFirstName(current?.firstName || "");
    setEditLastName(current?.lastName || "");
    setEditGender(current?.gender || "");
    const dobFormatted = current?.dateOfBirth
      ? new Date(current.dateOfBirth).toISOString().split("T")[0] || ""
      : "";
    setEditDateOfBirth(dobFormatted);
    setEditIsCompany(!!current?.isCompany);
    setEditPhoneNumber(current?.phoneNumber || "");
    setEditPhoneNumberVerified(!!current?.phoneNumberVerified);
    setEditWhatsapp(current?.whatsapp || "");
    setEditWhatsappVerified(!!current?.whatsappVerified);
    setEditAddress(current?.address || "");
    setEditCity(current?.city || "");
    setEditProvince(current?.province || "");
    setEditPostalCode(current?.postalCode || "");
    setEditCountry(current?.country || "Indonesia");
    setEditSocialId(current?.socialId || "");
    setEditTaxId(current?.taxId || "");
    setEditNotes(current?.notes || "");
    setSaveError(null);
    setIsEditing(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFirstName.trim() || editFirstName.trim().length < 2) {
      setSaveError("First name / Entity name must be at least 2 characters.");
      return;
    }

    const targetId = profile?.id || initialProfile?.id || profileId;
    if (!targetId) {
      setSaveError("Missing profile identifier.");
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const res = await profileApi.updateProfile({
        id: targetId,
        title: editTitle.trim() || null,
        firstName: editFirstName.trim(),
        lastName: editLastName.trim() || null,
        gender: !editIsCompany && editGender ? editGender : null,
        dateOfBirth: editDateOfBirth ? new Date(editDateOfBirth).toISOString() : null,
        isCompany: editIsCompany,
        phoneNumber: editPhoneNumber.trim() || null,
        phoneNumberVerified: editPhoneNumberVerified,
        whatsapp: editWhatsapp.trim() || null,
        whatsappVerified: editWhatsappVerified,
        address: editAddress.trim() || null,
        city: editCity.trim() || null,
        province: editProvince.trim() || null,
        postalCode: editPostalCode.trim() || null,
        country: editCountry.trim() || null,
        socialId: editSocialId.trim() || null,
        taxId: editTaxId.trim() || null,
        notes: editNotes.trim() || null,
      });

      const updatedData: ProfileRecord = (res as any)?.data ?? res;
      setProfile(updatedData);
      setSaveSuccess("Profile updated successfully!");
      setTimeout(() => setSaveSuccess(null), 3000);
      setIsEditing(false);
      onProfileUpdated?.(updatedData);
    } catch (err: any) {
      setSaveError(err?.message || "Failed to update profile details.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProfile = async () => {
    const targetId = profile?.id || initialProfile?.id || profileId;
    if (!targetId) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await profileApi.deleteProfile(targetId);
      setShowDeleteConfirm(false);
      onProfileDeleted?.(targetId);
      onClose();
    } catch (err: any) {
      setDeleteError(err?.message || "Failed to delete profile. It may be linked to active user, customer, or employee records.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Social Media handlers
  const handleSocialPlatformChange = (p: string) => {
    setSocialPlatform(p);
    if (socialUsername) {
      const cfg = getPlatformConfig(p);
      setSocialUrl(cfg.buildUrl(socialUsername));
    }
  };

  const handleSocialUsernameChange = (u: string) => {
    setSocialUsername(u);
    const cfg = getPlatformConfig(socialPlatform);
    setSocialUrl(cfg.buildUrl(u));
  };

  const handleAddSocialMedia = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetId = profile?.id || initialProfile?.id || profileId;
    if (!targetId) return;

    if (!socialUrl.trim()) {
      setSocialError("Please enter a valid URL or handle.");
      return;
    }

    setSocialLoading(true);
    setSocialError(null);

    try {
      const res = await profileApi.addSocialMedia({
        profileId: targetId,
        platform: socialPlatform,
        username: socialUsername.trim() || null,
        url: socialUrl.trim(),
        notes: socialNotes.trim() || null,
      });

      const newSm: ProfileSocialMediaRecord = (res as any)?.data ?? res;
      setSocialMedias((prev) => [...prev, newSm]);
      // Keep form open with empty fields ready to immediately add another social media
      setIsAddingSocial(true);
      setSocialUsername("");
      setSocialUrl("");
      setSocialNotes("");
      setSocialPlatform("instagram");
      setSocialSuccess("Account added! Empty space ready below to add another, or click Done.");
      setTimeout(() => setSocialSuccess(null), 5000);
    } catch (err: any) {
      setSocialError(err?.message || "Failed to add social media account.");
    } finally {
      setSocialLoading(false);
    }
  };

  const startEditSocial = (sm: ProfileSocialMediaRecord) => {
    setEditingSocialId(sm.id);
    setEditSocialUrl(sm.url);
    setEditSocialUsername(sm.username || "");
    setEditSocialNotes(sm.notes || "");
  };

  const handleSaveEditSocial = async (id: number) => {
    if (!editSocialUrl.trim()) return;
    setSocialLoading(true);
    try {
      const res = await profileApi.updateSocialMedia({
        id,
        url: editSocialUrl.trim(),
        username: editSocialUsername.trim() || null,
        notes: editSocialNotes.trim() || null,
      });
      const updated: ProfileSocialMediaRecord = (res as any)?.data ?? res;
      setSocialMedias((prev) => prev.map((s) => (s.id === id ? { ...s, ...updated } : s)));
      setEditingSocialId(null);
    } catch (err: any) {
      setSocialError(err?.message || "Failed to update social media account.");
    } finally {
      setSocialLoading(false);
    }
  };

  const handleDeleteSocial = async (id: number) => {
    if (!confirm("Are you sure you want to remove this social media link?")) return;
    setSocialLoading(true);
    try {
      await profileApi.deleteSocialMedia(id);
      setSocialMedias((prev) => prev.filter((s) => s.id !== id));
    } catch (err: any) {
      setSocialError(err?.message || "Failed to delete social media account.");
    } finally {
      setSocialLoading(false);
    }
  };

  if (!isOpen) return null;

  const current = profile || initialProfile;
  const rawDisplayName = current
    ? `${current.firstName} ${current.lastName || ""}`.trim()
    : `Profile #${profileId ?? "—"}`;
  const displayNameWithTitle = current?.title ? `${current.title} ${rawDisplayName}` : rawDisplayName;

  const isCompany = current?.isCompany ?? false;
  const targetId = current?.id ?? profileId;

  const isCust = Boolean(current?.customer && current.customer.length > 0);
  const isVend = Boolean(current?.vendor && current.vendor.length > 0);
  const isEmp = Boolean(current?.employee && current.employee.length > 0);
  const empPosition = current?.employee?.[0]?.position?.name;

  let roleCount = 0;
  if (isCust) roleCount++;
  if (isVend) roleCount++;
  if (isEmp) roleCount++;
  const isMultiRole = roleCount >= 2;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "1rem",
        animation: "fadeIn 150ms ease-out",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSaving && !isDeleting) onClose();
      }}
    >
      <Card
        style={{
          width: "100%",
          maxWidth: "680px",
          backgroundColor: "var(--bg-surface)",
          border: "1px solid var(--border-glow)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "0 24px 48px -12px rgba(0,0,0,0.65), 0 0 24px -6px var(--primary-glow)",
          padding: "1.75rem",
          maxHeight: "92vh",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "1.25rem",
            paddingBottom: "1.25rem",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div
              style={{
                width: "52px",
                height: "52px",
                borderRadius: "var(--radius-md)",
                background: isCompany
                  ? "linear-gradient(135deg, #06b6d4, #3b82f6)"
                  : "linear-gradient(135deg, var(--primary), #a855f7)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.6rem",
                color: "#fff",
                boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                flexShrink: 0,
              }}
            >
              {isCompany ? "🏢" : "👤"}
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                <h3 style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--text-primary)" }}>
                  {isEditing ? "Update Profile Details" : displayNameWithTitle}
                </h3>
                {targetId && (
                  <Badge variant="default" style={{ fontSize: "0.75rem" }}>
                    ID #{targetId}
                  </Badge>
                )}
                {!isEditing && (
                  <>
                    <Badge variant={isCompany ? "warning" : "info"}>
                      {isCompany ? "Company / Entity" : "Individual Person"}
                    </Badge>
                    {isCust && (
                      <Badge variant="warning" style={{ fontSize: "0.72rem", backgroundColor: "rgba(245, 158, 11, 0.2)", color: "var(--accent-amber)" }}>
                        🛍️ Customer
                      </Badge>
                    )}
                    {isVend && (
                      <Badge variant="default" style={{ fontSize: "0.72rem", backgroundColor: "rgba(168, 85, 247, 0.2)", color: "#c084fc" }}>
                        🏭 Vendor
                      </Badge>
                    )}
                    {isEmp && (
                      <Badge variant="success" style={{ fontSize: "0.72rem", backgroundColor: "rgba(16, 185, 129, 0.2)", color: "var(--accent-emerald)" }}>
                        💼 Employee{empPosition ? ` (${empPosition})` : ""}
                      </Badge>
                    )}
                    {isMultiRole && (
                      <Badge variant="default" style={{ fontSize: "0.72rem", backgroundColor: "rgba(6, 182, 212, 0.2)", color: "var(--accent-cyan, #06b6d4)" }}>
                        ✨ Multi-Role
                      </Badge>
                    )}
                  </>
                )}
              </div>
              <p style={{ fontSize: "0.825rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                {isEditing
                  ? "Edit and save person or organization profile information"
                  : isCompany
                  ? "Corporate Partner / Entity Profile"
                  : "Personal Profile Identity Record"}
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            {!isEditing && hasPermission && (
              <Button
                id="header-edit-profile-btn"
                size="sm"
                variant="secondary"
                onClick={startEditing}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  fontSize: "0.8rem",
                  padding: "0.35rem 0.65rem",
                  borderColor: "rgba(99, 102, 241, 0.4)",
                  color: "var(--text-primary)",
                }}
              >
                <span>✏️</span>
                <span>Update</span>
              </Button>
            )}

            {!isEditing && hasDeletePermission && (
              <Button
                id="header-delete-profile-btn"
                size="sm"
                variant="ghost"
                onClick={() => {
                  setShowDeleteConfirm(true);
                  setDeleteError(null);
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  fontSize: "0.8rem",
                  padding: "0.35rem 0.65rem",
                  color: "var(--accent-rose)",
                  borderColor: "rgba(239, 68, 68, 0.3)",
                }}
                title="Delete Profile"
              >
                <span>🗑️</span>
                <span>Delete</span>
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={isSaving || isDeleting}
              style={{ fontSize: "1.1rem", padding: "0.25rem 0.5rem", color: "var(--text-muted)" }}
              aria-label="Close dialog"
            >
              ✕
            </Button>
          </div>
        </div>

        {/* Delete Confirmation Alert Banner */}
        {showDeleteConfirm && (
          <div
            style={{
              padding: "1rem 1.25rem",
              borderRadius: "var(--radius-md)",
              backgroundColor: "rgba(239, 68, 68, 0.12)",
              border: "1px solid var(--accent-rose)",
              marginBottom: "1.25rem",
              animation: "fadeIn 150ms ease-out",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem" }}>
              <span style={{ fontSize: "1.2rem" }}>⚠️</span>
              <span style={{ fontWeight: 700, color: "var(--accent-rose)", fontSize: "0.95rem" }}>
                Confirm Permanent Profile Deletion
              </span>
            </div>
            <p style={{ fontSize: "0.85rem", color: "var(--text-primary)", marginBottom: "0.75rem", lineHeight: 1.4 }}>
              Are you sure you want to delete profile #{targetId} (<strong>{displayNameWithTitle}</strong>)?
              This will remove this profile and all linked social media accounts. This action cannot be undone.
            </p>

            {deleteError && (
              <div
                style={{
                  padding: "0.5rem 0.75rem",
                  borderRadius: "var(--radius-sm)",
                  backgroundColor: "rgba(239, 68, 68, 0.25)",
                  color: "#ff8080",
                  fontSize: "0.82rem",
                  marginBottom: "0.75rem",
                  fontWeight: 600,
                }}
              >
                ❌ {deleteError}
              </div>
            )}

            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
              <Button
                size="sm"
                variant="ghost"
                disabled={isDeleting}
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteError(null);
                }}
              >
                Cancel
              </Button>
              <Button
                id="confirm-delete-profile-btn"
                size="sm"
                variant="primary"
                disabled={isDeleting}
                onClick={handleDeleteProfile}
                style={{
                  backgroundColor: "var(--accent-rose)",
                  borderColor: "var(--accent-rose)",
                  color: "#ffffff",
                }}
              >
                {isDeleting ? "Deleting..." : "Yes, Delete Profile"}
              </Button>
            </div>
          </div>
        )}

        {/* Success Alert Banner */}
        {saveSuccess && (
          <div
            style={{
              padding: "0.75rem 1rem",
              borderRadius: "var(--radius-md)",
              backgroundColor: "rgba(16, 185, 129, 0.15)",
              border: "1px solid var(--accent-emerald)",
              color: "var(--accent-emerald)",
              fontSize: "0.875rem",
              fontWeight: 600,
              marginBottom: "1.25rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <span>✓</span>
            <span>{saveSuccess}</span>
          </div>
        )}

        {/* Linked User Callout Banner */}
        {(userName || userEmail) && (
          <div
            style={{
              padding: "0.75rem 1rem",
              borderRadius: "var(--radius-md)",
              backgroundColor: "rgba(99, 102, 241, 0.08)",
              border: "1px solid rgba(99, 102, 241, 0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "0.75rem",
              marginBottom: "1.25rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <span style={{ fontSize: "1.1rem" }}>🔗</span>
              <div>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block" }}>
                  Linked System User Account
                </span>
                <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-primary)" }}>
                  {userName || userEmail} {userName && userEmail ? `(${userEmail})` : ""}
                </span>
              </div>
            </div>
            <Badge variant="default" style={{ fontSize: "0.7rem" }}>
              System Access Active
            </Badge>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div
            style={{
              padding: "0.75rem 1rem",
              borderRadius: "var(--radius-md)",
              backgroundColor: "rgba(239, 68, 68, 0.15)",
              border: "1px solid var(--accent-rose)",
              color: "var(--accent-rose)",
              fontSize: "0.875rem",
              marginBottom: "1.25rem",
            }}
          >
            {error}
          </div>
        )}

        {/* Loading Spinner */}
        {loading && !profile && (
          <div style={{ textAlign: "center", padding: "2.5rem 0", color: "var(--text-muted)" }}>
            <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>⏳</div>
            Loading person profile identity...
          </div>
        )}

        {/* Edit Form */}
        {isEditing ? (
          <form onSubmit={handleSaveProfile} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {saveError && (
              <div
                style={{
                  padding: "0.75rem 1rem",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "rgba(239, 68, 68, 0.15)",
                  border: "1px solid var(--accent-rose)",
                  color: "var(--accent-rose)",
                  fontSize: "0.875rem",
                }}
              >
                {saveError}
              </div>
            )}

            {/* Entity Classification */}
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.35rem", color: "var(--text-secondary)" }}>
                Entity Classification
              </label>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  type="button"
                  onClick={() => setEditIsCompany(false)}
                  style={{
                    flex: 1,
                    padding: "0.5rem",
                    borderRadius: "var(--radius-md)",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    backgroundColor: !editIsCompany ? "rgba(99, 102, 241, 0.2)" : "var(--bg-surface-elevated)",
                    border: !editIsCompany ? "1px solid var(--primary)" : "1px solid var(--border-subtle)",
                    color: !editIsCompany ? "#ffffff" : "var(--text-secondary)",
                    cursor: "pointer",
                  }}
                >
                  👤 Individual Person
                </button>
                <button
                  type="button"
                  onClick={() => setEditIsCompany(true)}
                  style={{
                    flex: 1,
                    padding: "0.5rem",
                    borderRadius: "var(--radius-md)",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    backgroundColor: editIsCompany ? "rgba(6, 182, 212, 0.2)" : "var(--bg-surface-elevated)",
                    border: editIsCompany ? "1px solid var(--accent-cyan, #06b6d4)" : "1px solid var(--border-subtle)",
                    color: editIsCompany ? "#ffffff" : "var(--text-secondary)",
                    cursor: "pointer",
                  }}
                >
                  🏢 Company / Entity
                </button>
              </div>
            </div>

            {/* Names */}
            <div style={{ display: "grid", gridTemplateColumns: editIsCompany ? "1fr" : "100px 1fr 1fr", gap: "0.75rem" }}>
              {!editIsCompany && (
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>
                    Title
                  </label>
                  <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Mr./Ms./Dr." />
                </div>
              )}
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>
                  {editIsCompany ? "Company / Entity Name *" : "First Name *"}
                </label>
                <Input value={editFirstName} onChange={(e) => setEditFirstName(e.target.value)} required />
              </div>
              {!editIsCompany && (
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>
                    Last Name
                  </label>
                  <Input value={editLastName} onChange={(e) => setEditLastName(e.target.value)} />
                </div>
              )}
            </div>

            {/* Gender & DOB for Individuals */}
            {!editIsCompany && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>
                    Gender
                  </label>
                  <select
                    value={editGender}
                    onChange={(e) => setEditGender(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.5rem 0.75rem",
                      borderRadius: "var(--radius-md)",
                      backgroundColor: "var(--bg-surface-elevated)",
                      border: "1px solid var(--border-subtle)",
                      color: "var(--text-primary)",
                      fontSize: "0.85rem",
                    }}
                  >
                    <option value="">Select Gender</option>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>
                    Date of Birth
                  </label>
                  <Input type="date" value={editDateOfBirth} onChange={(e) => setEditDateOfBirth(e.target.value)} />
                </div>
              </div>
            )}

            {/* Contacts */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>
                  Phone Number
                </label>
                <Input value={editPhoneNumber} onChange={(e) => setEditPhoneNumber(e.target.value)} placeholder="+62 8..." />
                <label style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.35rem", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={editPhoneNumberVerified}
                    onChange={(e) => setEditPhoneNumberVerified(e.target.checked)}
                  />
                  <span>Mark Phone Verified</span>
                </label>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>
                  WhatsApp Number
                </label>
                <Input value={editWhatsapp} onChange={(e) => setEditWhatsapp(e.target.value)} placeholder="+62 8..." />
                <label style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.35rem", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={editWhatsappVerified}
                    onChange={(e) => setEditWhatsappVerified(e.target.checked)}
                  />
                  <span>Mark WhatsApp Verified</span>
                </label>
              </div>
            </div>

            {/* Structured Address */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>
                  Street Address
                </label>
                <textarea
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  rows={2}
                  placeholder="Street name, building, unit number..."
                  style={{
                    width: "100%",
                    padding: "0.5rem 0.75rem",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: "var(--bg-surface-elevated)",
                    border: "1px solid var(--border-subtle)",
                    color: "var(--text-primary)",
                    fontSize: "0.85rem",
                    resize: "vertical",
                  }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>
                    City / Regency (Kota/Kabupaten)
                  </label>
                  <Input value={editCity} onChange={(e) => setEditCity(e.target.value)} placeholder="e.g. Jakarta Selatan, Bandung" />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>
                    Province / State (Provinsi)
                  </label>
                  <Input value={editProvince} onChange={(e) => setEditProvince(e.target.value)} placeholder="e.g. Jawa Barat, DKI Jakarta" />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>
                    Postal Code
                  </label>
                  <Input value={editPostalCode} onChange={(e) => setEditPostalCode(e.target.value)} placeholder="e.g. 40115" />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>
                    Country
                  </label>
                  <Input value={editCountry} onChange={(e) => setEditCountry(e.target.value)} placeholder="Indonesia" />
                </div>
              </div>
            </div>

            {/* IDs */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>
                  {editIsCompany ? "Company Registration / NIB" : "National ID / Social ID (NIK)"}
                </label>
                <Input value={editSocialId} onChange={(e) => setEditSocialId(e.target.value)} placeholder="16-digit ID / Registration" />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>
                  Tax ID (NPWP)
                </label>
                <Input value={editTaxId} onChange={(e) => setEditTaxId(e.target.value)} placeholder="15/16-digit NPWP" />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>
                Background Notes
              </label>
              <textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={2}
                placeholder="Internal remarks..."
                style={{
                  width: "100%",
                  padding: "0.5rem 0.75rem",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "var(--bg-surface-elevated)",
                  border: "1px solid var(--border-subtle)",
                  color: "var(--text-primary)",
                  fontSize: "0.85rem",
                  resize: "vertical",
                }}
              />
            </div>

            {/* Form actions */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.5rem" }}>
              <Button type="button" variant="secondary" onClick={() => setIsEditing(false)} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Profile Details"}
              </Button>
            </div>
          </form>
        ) : (
          /* View Mode */
          current && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              {/* Section 1: Core Identity Info */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: "0.75rem",
                }}
              >
                {/* Full Legal Name */}
                <div
                  style={{
                    backgroundColor: "var(--bg-surface-elevated)",
                    padding: "0.75rem",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block" }}>
                    Legal Name
                  </span>
                  <span style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--text-primary)", marginTop: "0.25rem", display: "block" }}>
                    {displayNameWithTitle}
                  </span>
                </div>

                {/* Gender */}
                {!isCompany && current?.gender && (
                  <div
                    style={{
                      backgroundColor: "var(--bg-surface-elevated)",
                      padding: "0.75rem",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--border-subtle)",
                    }}
                  >
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block" }}>
                      Gender
                    </span>
                    <span style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--text-primary)", marginTop: "0.25rem", display: "block" }}>
                      {current.gender === "MALE" ? "👨 Male" : current.gender === "FEMALE" ? "👩 Female" : current.gender}
                    </span>
                  </div>
                )}

                {/* Date of Birth / Incorporation */}
                {current?.dateOfBirth && (
                  <div
                    style={{
                      backgroundColor: "var(--bg-surface-elevated)",
                      padding: "0.75rem",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--border-subtle)",
                    }}
                  >
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block" }}>
                      {isCompany ? "Incorporation Date" : "Date of Birth"}
                    </span>
                    <span style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--text-primary)", marginTop: "0.25rem", display: "block" }}>
                      🎂 {new Date(current.dateOfBirth).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>

              {/* Section 1.5: Business Roles & Affiliations (Customer, Vendor, Employee) */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      color: "var(--text-secondary)",
                    }}
                  >
                    🏢 Business Roles & Affiliations
                  </span>
                  {isMultiRole && (
                    <Badge variant="default" style={{ backgroundColor: "rgba(6, 182, 212, 0.2)", color: "var(--accent-cyan, #06b6d4)", fontSize: "0.7rem" }}>
                      ✨ Active in ${roleCount} Roles
                    </Badge>
                  )}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.75rem" }}>
                  {/* Customer Card */}
                  <div
                    style={{
                      backgroundColor: "var(--bg-surface-elevated)",
                      padding: "0.85rem",
                      borderRadius: "var(--radius-md)",
                      border: isCust ? "1px solid rgba(245, 158, 11, 0.4)" : "1px solid var(--border-subtle)",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      gap: "0.5rem",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--accent-amber, #f59e0b)" }}>
                          🛍️ Customer
                        </span>
                        {isCust ? (
                          <Badge variant="warning" style={{ fontSize: "0.65rem", padding: "0.05rem 0.3rem" }}>
                            Active
                          </Badge>
                        ) : (
                          <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Inactive</span>
                        )}
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                        {isCust
                          ? `Customer ID #${current?.customer?.[0]?.id || "—"}`
                          : "Not registered as customer"}
                      </div>
                    </div>
                    <Link href="/customers" style={{ textDecoration: "none" }}>
                      <Button
                        size="sm"
                        variant={isCust ? "secondary" : "ghost"}
                        style={{ width: "100%", fontSize: "0.75rem", padding: "0.25rem 0.5rem" }}
                      >
                        {isCust ? "Go to Customers ↗" : "+ Register Customer ↗"}
                      </Button>
                    </Link>
                  </div>

                  {/* Vendor Card */}
                  <div
                    style={{
                      backgroundColor: "var(--bg-surface-elevated)",
                      padding: "0.85rem",
                      borderRadius: "var(--radius-md)",
                      border: isVend ? "1px solid rgba(168, 85, 247, 0.4)" : "1px solid var(--border-subtle)",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      gap: "0.5rem",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#c084fc" }}>
                          🏭 Vendor
                        </span>
                        {isVend ? (
                          <Badge variant="default" style={{ fontSize: "0.65rem", padding: "0.05rem 0.3rem", backgroundColor: "rgba(168, 85, 247, 0.2)", color: "#c084fc" }}>
                            Active
                          </Badge>
                        ) : (
                          <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Inactive</span>
                        )}
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                        {isVend
                          ? `Vendor ID #${current?.vendor?.[0]?.id || "—"}`
                          : "Not registered as vendor"}
                      </div>
                    </div>
                    <Link href="/vendors" style={{ textDecoration: "none" }}>
                      <Button
                        size="sm"
                        variant={isVend ? "secondary" : "ghost"}
                        style={{ width: "100%", fontSize: "0.75rem", padding: "0.25rem 0.5rem" }}
                      >
                        {isVend ? "Go to Vendors ↗" : "+ Register Vendor ↗"}
                      </Button>
                    </Link>
                  </div>

                  {/* Employee Card */}
                  <div
                    style={{
                      backgroundColor: "var(--bg-surface-elevated)",
                      padding: "0.85rem",
                      borderRadius: "var(--radius-md)",
                      border: isEmp ? "1px solid rgba(16, 185, 129, 0.4)" : "1px solid var(--border-subtle)",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      gap: "0.5rem",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--accent-emerald)" }}>
                          💼 Employee
                        </span>
                        {isEmp ? (
                          <Badge variant="success" style={{ fontSize: "0.65rem", padding: "0.05rem 0.3rem" }}>
                            Active
                          </Badge>
                        ) : (
                          <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Inactive</span>
                        )}
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                        {isEmp
                          ? `${empPosition || "Staff"} (ID #${current?.employee?.[0]?.id || "—"})`
                          : "Not registered as employee"}
                      </div>
                    </div>
                    <Link href="/employees" style={{ textDecoration: "none" }}>
                      <Button
                        size="sm"
                        variant={isEmp ? "secondary" : "ghost"}
                        style={{ width: "100%", fontSize: "0.75rem", padding: "0.25rem 0.5rem" }}
                      >
                        {isEmp ? "Go to Employees ↗" : "+ Register Employee ↗"}
                      </Button>
                    </Link>
                  </div>
                </div>

                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.4rem", fontStyle: "italic" }}>
                  ℹ️ Note: In PZ, a person can simultaneously be an employee, a customer, and a vendor.
                </div>
              </div>

              {/* Section 2: Contact Numbers */}
              <div>
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: "var(--text-secondary)",
                    display: "block",
                    marginBottom: "0.5rem",
                  }}
                >
                  📞 Direct Contact Information
                </span>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.75rem" }}>
                  {/* Phone */}
                  <div
                    style={{
                      backgroundColor: "var(--bg-surface-elevated)",
                      padding: "0.75rem",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--border-subtle)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Phone</span>
                      {current?.phoneNumberVerified && (
                        <span style={{ fontSize: "0.7rem", color: "var(--accent-emerald)", fontWeight: 700 }}>
                          ✓ Verified
                        </span>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "0.25rem" }}>
                      <span style={{ fontSize: "0.95rem", fontWeight: 600, color: current?.phoneNumber ? "var(--text-primary)" : "var(--text-muted)" }}>
                        {current?.phoneNumber || "—"}
                      </span>
                      {current?.phoneNumber && (
                        <button
                          type="button"
                          onClick={() => handleCopy(current.phoneNumber!, "phone")}
                          style={{
                            fontSize: "0.75rem",
                            color: copiedField === "phone" ? "var(--accent-emerald)" : "var(--text-secondary)",
                            backgroundColor: "rgba(255, 255, 255, 0.05)",
                            border: "1px solid var(--border-subtle)",
                            borderRadius: "var(--radius-sm)",
                            padding: "0.2rem 0.4rem",
                            cursor: "pointer",
                          }}
                        >
                          {copiedField === "phone" ? "✓ Copied" : "Copy"}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* WhatsApp */}
                  <div
                    style={{
                      backgroundColor: "var(--bg-surface-elevated)",
                      padding: "0.75rem",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--border-subtle)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>WhatsApp</span>
                      {current?.whatsappVerified && (
                        <span style={{ fontSize: "0.7rem", color: "var(--accent-emerald)", fontWeight: 700 }}>
                          ✓ Verified
                        </span>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "0.25rem" }}>
                      <span style={{ fontSize: "0.95rem", fontWeight: 600, color: current?.whatsapp ? "var(--accent-emerald)" : "var(--text-muted)" }}>
                        {current?.whatsapp || "—"}
                      </span>
                      {current?.whatsapp && (
                        <button
                          type="button"
                          onClick={() => handleCopy(current.whatsapp!, "wa")}
                          style={{
                            fontSize: "0.75rem",
                            color: copiedField === "wa" ? "var(--accent-emerald)" : "var(--text-secondary)",
                            backgroundColor: "rgba(255, 255, 255, 0.05)",
                            border: "1px solid var(--border-subtle)",
                            borderRadius: "var(--radius-sm)",
                            padding: "0.2rem 0.4rem",
                            cursor: "pointer",
                          }}
                        >
                          {copiedField === "wa" ? "✓ Copied" : "Copy"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: Social Media Accounts */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      color: "var(--text-secondary)",
                    }}
                  >
                    🌐 Social Media & Online Profiles ({socialMedias.length})
                  </span>

                  {hasPermission && !isAddingSocial && (
                    <Button
                      id="add-social-btn"
                      size="sm"
                      variant="ghost"
                      onClick={() => setIsAddingSocial(true)}
                      style={{
                        fontSize: "0.75rem",
                        padding: "0.2rem 0.5rem",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.25rem",
                        color: "var(--primary-light)",
                      }}
                    >
                      <span>+ Add Social Account</span>
                    </Button>
                  )}
                </div>

                {/* Add Social Form Inline */}
                {isAddingSocial && (
                  <form
                    onSubmit={handleAddSocialMedia}
                    style={{
                      backgroundColor: "var(--bg-surface-elevated)",
                      padding: "1rem",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid rgba(99, 102, 241, 0.3)",
                      marginBottom: "0.75rem",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.75rem",
                      animation: "fadeIn 150ms ease-out",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)" }}>
                        Add Social Media Account
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsAddingSocial(false)}
                        style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "0.9rem" }}
                      >
                        ✕
                      </button>
                    </div>

                    {socialError && (
                      <div style={{ fontSize: "0.8rem", color: "var(--accent-rose)", backgroundColor: "rgba(239, 68, 68, 0.15)", padding: "0.4rem 0.6rem", borderRadius: "var(--radius-sm)" }}>
                        {socialError}
                      </div>
                    )}

                    {socialSuccess && (
                      <div style={{ fontSize: "0.8rem", color: "var(--accent-emerald)", backgroundColor: "rgba(16, 185, 129, 0.15)", padding: "0.4rem 0.6rem", borderRadius: "var(--radius-sm)" }}>
                        ✓ {socialSuccess}
                      </div>
                    )}

                    <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: "0.5rem" }}>
                      <div>
                        <label style={{ display: "block", fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: "0.2rem" }}>
                          Platform
                        </label>
                        <select
                          value={socialPlatform}
                          onChange={(e) => handleSocialPlatformChange(e.target.value)}
                          style={{
                            width: "100%",
                            padding: "0.45rem 0.6rem",
                            borderRadius: "var(--radius-md)",
                            backgroundColor: "var(--bg-surface)",
                            border: "1px solid var(--border-subtle)",
                            color: "var(--text-primary)",
                            fontSize: "0.82rem",
                          }}
                        >
                          <option value="instagram">📸 Instagram</option>
                          <option value="linkedin">💼 LinkedIn</option>
                          <option value="github">💻 GitHub</option>
                          <option value="twitter">𝕏 X (Twitter)</option>
                          <option value="youtube">▶️ YouTube</option>
                          <option value="tiktok">🎵 TikTok</option>
                          <option value="facebook">📘 Facebook</option>
                          <option value="website">🌐 Website</option>
                          <option value="other">🔗 Other</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ display: "block", fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: "0.2rem" }}>
                          Handle / Username
                        </label>
                        <Input
                          value={socialUsername}
                          onChange={(e) => handleSocialUsernameChange(e.target.value)}
                          placeholder="e.g. johndoe"
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: "0.2rem" }}>
                        Profile URL *
                      </label>
                      <Input
                        value={socialUrl}
                        onChange={(e) => setSocialUrl(e.target.value)}
                        placeholder="https://..."
                        required
                      />
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: "0.2rem" }}>
                        Notes (Optional)
                      </label>
                      <Input
                        value={socialNotes}
                        onChange={(e) => setSocialNotes(e.target.value)}
                        placeholder="e.g. Official verified profile"
                      />
                    </div>

                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setIsAddingSocial(false);
                          setSocialSuccess(null);
                        }}
                        disabled={socialLoading}
                      >
                        Done
                      </Button>
                      <Button type="submit" size="sm" variant="primary" disabled={socialLoading}>
                        {socialLoading ? "Saving..." : "+ Add & Next"}
                      </Button>
                    </div>
                  </form>
                )}

                {/* Social media items list */}
                {socialMedias.length === 0 && !isAddingSocial ? (
                  <div
                    style={{
                      padding: "1rem",
                      borderRadius: "var(--radius-md)",
                      backgroundColor: "var(--bg-surface-elevated)",
                      border: "1px dashed var(--border-subtle)",
                      textAlign: "center",
                      color: "var(--text-muted)",
                      fontSize: "0.85rem",
                    }}
                  >
                    No social media accounts linked yet.
                    {hasPermission && (
                      <span style={{ marginLeft: "0.5rem" }}>
                        <button
                          type="button"
                          onClick={() => setIsAddingSocial(true)}
                          style={{
                            color: "var(--primary-light)",
                            background: "none",
                            border: "none",
                            textDecoration: "underline",
                            cursor: "pointer",
                            fontSize: "0.85rem",
                          }}
                        >
                          Add one now
                        </button>
                      </span>
                    )}
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {socialMedias.map((sm) => {
                      const cfg = getPlatformConfig(sm.platform);
                      const isEditingThis = editingSocialId === sm.id;

                      if (isEditingThis) {
                        return (
                          <div
                            key={sm.id}
                            style={{
                              backgroundColor: "var(--bg-surface-elevated)",
                              padding: "0.75rem",
                              borderRadius: "var(--radius-md)",
                              border: "1px solid var(--primary)",
                              display: "flex",
                              flexDirection: "column",
                              gap: "0.5rem",
                            }}
                          >
                            <div style={{ display: "flex", gap: "0.5rem" }}>
                              <Input
                                value={editSocialUsername}
                                onChange={(e) => setEditSocialUsername(e.target.value)}
                                placeholder="Username / Handle"
                                style={{ flex: 1 }}
                              />
                              <Input
                                value={editSocialUrl}
                                onChange={(e) => setEditSocialUrl(e.target.value)}
                                placeholder="URL"
                                style={{ flex: 2 }}
                              />
                            </div>
                            <Input
                              value={editSocialNotes}
                              onChange={(e) => setEditSocialNotes(e.target.value)}
                              placeholder="Notes (optional)"
                            />
                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                              <Button size="sm" variant="ghost" onClick={() => setEditingSocialId(null)} disabled={socialLoading}>
                                Cancel
                              </Button>
                              <Button size="sm" variant="primary" onClick={() => handleSaveEditSocial(sm.id)} disabled={socialLoading}>
                                Save
                              </Button>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={sm.id}
                          style={{
                            backgroundColor: "var(--bg-surface-elevated)",
                            padding: "0.65rem 0.85rem",
                            borderRadius: "var(--radius-md)",
                            border: "1px solid var(--border-subtle)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "0.75rem",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", minWidth: 0 }}>
                            <span
                              style={{
                                fontSize: "1.1rem",
                                width: "32px",
                                height: "32px",
                                borderRadius: "var(--radius-sm)",
                                backgroundColor: cfg.bg,
                                color: cfg.color,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                              }}
                            >
                              {cfg.icon}
                            </span>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
                                <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)" }}>
                                  {sm.username || cfg.label}
                                </span>
                                <span
                                  style={{
                                    fontSize: "0.68rem",
                                    padding: "0.1rem 0.35rem",
                                    borderRadius: "var(--radius-xs)",
                                    backgroundColor: cfg.bg,
                                    color: cfg.color,
                                    fontWeight: 700,
                                    textTransform: "uppercase",
                                  }}
                                >
                                  {cfg.label}
                                </span>
                              </div>
                              <a
                                href={sm.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  fontSize: "0.78rem",
                                  color: "var(--primary-light)",
                                  textDecoration: "none",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                  display: "block",
                                  maxWidth: "320px",
                                }}
                                title={sm.url}
                              >
                                {sm.url} ↗
                              </a>
                              {sm.notes && (
                                <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "block" }}>
                                  📝 {sm.notes}
                                </span>
                              )}
                            </div>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", flexShrink: 0 }}>
                            <button
                              type="button"
                              onClick={() => handleCopy(sm.url, `sm-${sm.id}`)}
                              style={{
                                fontSize: "0.75rem",
                                color: copiedField === `sm-${sm.id}` ? "var(--accent-emerald)" : "var(--text-secondary)",
                                backgroundColor: "rgba(255, 255, 255, 0.05)",
                                border: "1px solid var(--border-subtle)",
                                borderRadius: "var(--radius-sm)",
                                padding: "0.2rem 0.4rem",
                                cursor: "pointer",
                              }}
                            >
                              {copiedField === `sm-${sm.id}` ? "✓ Copied" : "Copy"}
                            </button>

                            {hasPermission && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => startEditSocial(sm)}
                                  style={{
                                    fontSize: "0.75rem",
                                    color: "var(--text-secondary)",
                                    backgroundColor: "transparent",
                                    border: "none",
                                    cursor: "pointer",
                                    padding: "0.2rem",
                                  }}
                                  title="Edit"
                                >
                                  ✏️
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteSocial(sm.id)}
                                  style={{
                                    fontSize: "0.75rem",
                                    color: "var(--accent-rose)",
                                    backgroundColor: "transparent",
                                    border: "none",
                                    cursor: "pointer",
                                    padding: "0.2rem",
                                  }}
                                  title="Delete link"
                                >
                                  🗑️
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Section 4: Address Details */}
              {(current?.address || current?.city || current?.province || current?.country || current?.postalCode) && (
                <div>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      color: "var(--text-secondary)",
                      display: "block",
                      marginBottom: "0.5rem",
                    }}
                  >
                    📍 Registered Geographic Address
                  </span>
                  <div
                    style={{
                      backgroundColor: "var(--bg-surface-elevated)",
                      padding: "0.85rem 1rem",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--border-subtle)",
                    }}
                  >
                    {current?.address && (
                      <div style={{ fontSize: "0.95rem", color: "var(--text-primary)", fontWeight: 500, marginBottom: "0.35rem" }}>
                        {current.address}
                      </div>
                    )}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                      {current?.city && <span>🏙️ {current.city}</span>}
                      {current?.province && <span>• 🗺️ {current.province}</span>}
                      {current?.postalCode && <span>• 📮 {current.postalCode}</span>}
                      {current?.country && <span>• 🌐 {current.country}</span>}
                    </div>
                  </div>
                </div>
              )}

              {/* Section 5: Official Identification Numbers */}
              <div>
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: "var(--text-secondary)",
                    display: "block",
                    marginBottom: "0.5rem",
                  }}
                >
                  🪪 Identity & Tax Credentials
                </span>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.75rem" }}>
                  {/* Social ID */}
                  <div
                    style={{
                      backgroundColor: "var(--bg-surface-elevated)",
                      padding: "0.75rem",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--border-subtle)",
                    }}
                  >
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block" }}>
                      {isCompany ? "Company Registration / NIB" : "National ID / Social ID (NIK)"}
                    </span>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "0.25rem" }}>
                      <span style={{ fontSize: "0.95rem", fontFamily: "monospace", fontWeight: 600, color: current?.socialId ? "var(--text-primary)" : "var(--text-muted)" }}>
                        {current?.socialId || "—"}
                      </span>
                      {current?.socialId && (
                        <button
                          type="button"
                          onClick={() => handleCopy(current.socialId!, "socialId")}
                          style={{
                            fontSize: "0.75rem",
                            color: copiedField === "socialId" ? "var(--accent-emerald)" : "var(--text-secondary)",
                            backgroundColor: "rgba(255, 255, 255, 0.05)",
                            border: "1px solid var(--border-subtle)",
                            borderRadius: "var(--radius-sm)",
                            padding: "0.2rem 0.4rem",
                            cursor: "pointer",
                          }}
                        >
                          {copiedField === "socialId" ? "✓ Copied" : "Copy"}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Tax ID */}
                  <div
                    style={{
                      backgroundColor: "var(--bg-surface-elevated)",
                      padding: "0.75rem",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--border-subtle)",
                    }}
                  >
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block" }}>
                      Tax ID (NPWP)
                    </span>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "0.25rem" }}>
                      <span style={{ fontSize: "0.95rem", fontFamily: "monospace", fontWeight: 600, color: current?.taxId ? "var(--text-primary)" : "var(--text-muted)" }}>
                        {current?.taxId || "—"}
                      </span>
                      {current?.taxId && (
                        <button
                          type="button"
                          onClick={() => handleCopy(current.taxId!, "taxId")}
                          style={{
                            fontSize: "0.75rem",
                            color: copiedField === "taxId" ? "var(--accent-emerald)" : "var(--text-secondary)",
                            backgroundColor: "rgba(255, 255, 255, 0.05)",
                            border: "1px solid var(--border-subtle)",
                            borderRadius: "var(--radius-sm)",
                            padding: "0.2rem 0.4rem",
                            cursor: "pointer",
                          }}
                        >
                          {copiedField === "taxId" ? "✓ Copied" : "Copy"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 6: Background Notes */}
              {current?.notes && (
                <div
                  style={{
                    backgroundColor: "rgba(99, 102, 241, 0.06)",
                    padding: "0.85rem 1rem",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid rgba(99, 102, 241, 0.2)",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      color: "var(--primary-light)",
                      display: "block",
                      marginBottom: "0.35rem",
                    }}
                  >
                    📝 Background Notes & Internal Remarks
                  </span>
                  <p style={{ fontSize: "0.875rem", color: "var(--text-primary)", lineHeight: 1.5, whiteSpace: "pre-wrap", margin: 0 }}>
                    {current.notes}
                  </p>
                </div>
              )}

              {/* Section 7: System Dates */}
              {(current?.createdAt || current?.updatedAt) && (
                <div
                  style={{
                    display: "flex",
                    gap: "1.5rem",
                    paddingTop: "0.5rem",
                    borderTop: "1px solid var(--border-subtle)",
                    fontSize: "0.75rem",
                    color: "var(--text-muted)",
                    flexWrap: "wrap",
                  }}
                >
                  {current?.createdAt && (
                    <div>
                      Registered:{" "}
                      <span style={{ color: "var(--text-secondary)" }}>
                        {new Date(current.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  {current?.updatedAt && (
                    <div>
                      Last Updated:{" "}
                      <span style={{ color: "var(--text-secondary)" }}>
                        {new Date(current.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        )}

        {/* Footer */}
        {!isEditing && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: "1.5rem",
              paddingTop: "1rem",
              borderTop: "1px solid var(--border-subtle)",
              flexWrap: "wrap",
              gap: "0.5rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              {hasPermission && (
                <Button
                  id="footer-edit-profile-btn"
                  variant="primary"
                  size="md"
                  onClick={startEditing}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.4rem",
                  }}
                >
                  <span>✏️</span>
                  <span>Update Profile</span>
                </Button>
              )}

              {hasDeletePermission && (
                <Button
                  id="footer-delete-profile-btn"
                  variant="ghost"
                  size="md"
                  onClick={() => {
                    setShowDeleteConfirm(true);
                    setDeleteError(null);
                  }}
                  style={{
                    color: "var(--accent-rose)",
                    borderColor: "rgba(239, 68, 68, 0.3)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.4rem",
                  }}
                >
                  <span>🗑️</span>
                  <span>Delete Profile</span>
                </Button>
              )}
            </div>

            <Button variant="secondary" size="md" onClick={onClose}>
              Close
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
