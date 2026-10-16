"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { profileApi } from "@/lib/api";
import type { ProfileRecord } from "@pz/shared";

interface AddPersonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPersonCreated: (person: ProfileRecord) => void;
}

export interface SocialMediaEntry {
  id: string;
  platform: string;
  username: string;
  url: string;
}

export interface PlatformConfig {
  value: string;
  label: string;
  buildUrl: (u: string) => string;
  placeholder: string;
}

export const SOCIAL_PLATFORMS: PlatformConfig[] = [
  { value: "instagram", label: "📸 Instagram", buildUrl: (u: string) => (u.startsWith("http") ? u : `https://instagram.com/${u.replace(/^@/, "")}`), placeholder: "@handle or username" },
  { value: "linkedin", label: "💼 LinkedIn", buildUrl: (u: string) => (u.startsWith("http") ? u : u.startsWith("in/") ? `https://linkedin.com/${u}` : `https://linkedin.com/in/${u}`), placeholder: "in/username" },
  { value: "github", label: "💻 GitHub", buildUrl: (u: string) => (u.startsWith("http") ? u : `https://github.com/${u}`), placeholder: "username" },
  { value: "twitter", label: "𝕏 X (Twitter)", buildUrl: (u: string) => (u.startsWith("http") ? u : `https://x.com/${u.replace(/^@/, "")}`), placeholder: "@handle" },
  { value: "youtube", label: "▶️ YouTube", buildUrl: (u: string) => (u.startsWith("http") ? u : `https://youtube.com/@${u.replace(/^@/, "")}`), placeholder: "@channel" },
  { value: "tiktok", label: "🎵 TikTok", buildUrl: (u: string) => (u.startsWith("http") ? u : `https://tiktok.com/@${u.replace(/^@/, "")}`), placeholder: "@handle" },
  { value: "facebook", label: "📘 Facebook", buildUrl: (u: string) => (u.startsWith("http") ? u : `https://facebook.com/${u}`), placeholder: "username" },
  { value: "website", label: "🌐 Website", buildUrl: (u: string) => (u.startsWith("http") ? u : `https://${u}`), placeholder: "https://example.com" },
  { value: "other", label: "🔗 Other", buildUrl: (u: string) => (u.startsWith("http") ? u : `https://${u}`), placeholder: "https://..." },
];

export function getSocialPlatformConfig(platform: string): PlatformConfig {
  return SOCIAL_PLATFORMS.find((p) => p.value === platform) ?? SOCIAL_PLATFORMS[0]!;
}

export const createEmptySocialEntry = (): SocialMediaEntry => ({
  id: Math.random().toString(36).substring(2, 9),
  platform: "instagram",
  username: "",
  url: "",
});

export function AddPersonModal({ isOpen, onClose, onPersonCreated }: AddPersonModalProps) {
  const [title, setTitle] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gender, setGender] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneNumberVerified, setPhoneNumberVerified] = useState(false);
  const [whatsapp, setWhatsapp] = useState("");
  const [whatsappVerified, setWhatsappVerified] = useState(false);
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("Indonesia");
  const [taxId, setTaxId] = useState("");
  const [socialId, setSocialId] = useState("");
  const [notes, setNotes] = useState("");
  const [isCompany, setIsCompany] = useState(false);
  const [socialMediaEntries, setSocialMediaEntries] = useState<SocialMediaEntry[]>([createEmptySocialEntry()]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTitle("");
      setFirstName("");
      setLastName("");
      setGender("");
      setDateOfBirth("");
      setPhoneNumber("");
      setPhoneNumberVerified(false);
      setWhatsapp("");
      setWhatsappVerified(false);
      setAddress("");
      setCity("");
      setProvince("");
      setPostalCode("");
      setCountry("Indonesia");
      setTaxId("");
      setSocialId("");
      setNotes("");
      setIsCompany(false);
      setSocialMediaEntries([createEmptySocialEntry()]);
      setError(null);
    }
  }, [isOpen]);

  const handleUpdateSocialEntry = (
    id: string,
    field: "platform" | "username" | "url",
    value: string
  ) => {
    setSocialMediaEntries((prev) => {
      const next = prev.map((entry) => {
        if (entry.id !== id) return entry;
        const updated = { ...entry, [field]: value };
        if (field === "username") {
          const cfg = getSocialPlatformConfig(updated.platform);
          updated.url = value.trim() ? cfg.buildUrl(value.trim()) : "";
        } else if (field === "platform") {
          if (updated.username.trim()) {
            const cfg = getSocialPlatformConfig(value);
            updated.url = cfg.buildUrl(updated.username.trim());
          }
        }
        return updated;
      });

      // Automatically add another empty spaces to fill in social media if the last row is filled in
      const last = next[next.length - 1];
      if (last && (last.username.trim() || last.url.trim())) {
        next.push(createEmptySocialEntry());
      }

      return next;
    });
  };

  const handleRemoveSocialEntry = (id: string) => {
    setSocialMediaEntries((prev) => {
      const filtered = prev.filter((e) => e.id !== id);
      return filtered.length > 0 ? filtered : [createEmptySocialEntry()];
    });
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || firstName.trim().length < 2) {
      setError("First Name / Company Name must be at least 2 characters.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const socialMediaList: Array<{ platform: string; username?: string | null; url: string }> = [];
      socialMediaEntries.forEach((entry) => {
        const u = entry.username.trim();
        const url = entry.url.trim();
        if (url || u) {
          const cfg = getSocialPlatformConfig(entry.platform);
          const finalUrl = url || cfg.buildUrl(u);
          socialMediaList.push({
            platform: entry.platform,
            username: u || null,
            url: finalUrl,
          });
        }
      });

      const res = await profileApi.createProfile({
        title: title.trim() || undefined,
        firstName: firstName.trim(),
        lastName: lastName.trim() || undefined,
        gender: !isCompany && gender ? gender : undefined,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth).toISOString() : undefined,
        phoneNumber: phoneNumber.trim() || undefined,
        phoneNumberVerified,
        whatsapp: whatsapp.trim() || undefined,
        whatsappVerified,
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        province: province.trim() || undefined,
        postalCode: postalCode.trim() || undefined,
        country: country.trim() || undefined,
        taxId: taxId.trim() || undefined,
        socialId: socialId.trim() || undefined,
        notes: notes.trim() || undefined,
        isCompany,
        socialMedia: socialMediaList.length > 0 ? socialMediaList : undefined,
      });

      const newProfile = (res as any)?.data ?? res;
      if (newProfile) {
        onPersonCreated(newProfile);
        onClose();
      }
    } catch (err: any) {
      setError(err?.message || "Failed to create person record.");
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
          maxWidth: "600px",
          maxHeight: "92vh",
          overflowY: "auto",
          backgroundColor: "var(--bg-surface)",
          border: "1px solid var(--border-glow)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
          padding: "1.75rem",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <div>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--text-primary)" }}>
              Register Master Person Identity
            </h3>
            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
              Add a complete individual or corporate identity to the master database
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} style={{ fontSize: "1rem", padding: "0.2rem 0.5rem" }}>
            ✕
          </Button>
        </div>

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

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Classification Switcher */}
          <div>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.35rem", color: "var(--text-secondary)" }}>
              Identity Classification
            </label>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                type="button"
                id="person-type-individual-btn"
                onClick={() => setIsCompany(false)}
                style={{
                  flex: 1,
                  padding: "0.5rem 0.75rem",
                  borderRadius: "var(--radius-md)",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  backgroundColor: !isCompany ? "rgba(99, 102, 241, 0.2)" : "var(--bg-surface-elevated)",
                  border: !isCompany ? "1px solid var(--primary)" : "1px solid var(--border-subtle)",
                  color: !isCompany ? "#ffffff" : "var(--text-secondary)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.4rem",
                }}
              >
                <span>👤</span>
                <span>Individual Person</span>
              </button>
              <button
                type="button"
                id="person-type-company-btn"
                onClick={() => setIsCompany(true)}
                style={{
                  flex: 1,
                  padding: "0.5rem 0.75rem",
                  borderRadius: "var(--radius-md)",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  backgroundColor: isCompany ? "rgba(245, 158, 11, 0.2)" : "var(--bg-surface-elevated)",
                  border: isCompany ? "1px solid var(--accent-amber)" : "1px solid var(--border-subtle)",
                  color: isCompany ? "#ffffff" : "var(--text-secondary)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.4rem",
                }}
              >
                <span>🏢</span>
                <span>Corporate Entity / Company</span>
              </button>
            </div>
          </div>

          {/* Name & Title Section */}
          <div style={{ display: "grid", gridTemplateColumns: isCompany ? "1.2fr 2.8fr" : "1fr 2fr 2fr", gap: "0.75rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.35rem", color: "var(--text-secondary)" }}>
                {isCompany ? "Prefix" : "Title"}
              </label>
              <Input
                id="new-person-modal-title"
                placeholder={isCompany ? "e.g. PT, CV" : "e.g. Mr., Dr."}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.35rem", color: "var(--text-secondary)" }}>
                {isCompany ? "Company / Legal Entity Name *" : "First Name *"}
              </label>
              <Input
                id="new-person-modal-first-name"
                placeholder={isCompany ? "e.g. Global Logistik Nusantara" : "e.g. Budi"}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                autoFocus
              />
            </div>
            {!isCompany && (
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.35rem", color: "var(--text-secondary)" }}>
                  Last Name
                </label>
                <Input
                  id="new-person-modal-last-name"
                  placeholder="e.g. Santoso"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Demographic Section (Gender & Date of Birth / Incorporation) */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.35rem", color: "var(--text-secondary)" }}>
                {isCompany ? "Founding / Incorporation Date" : "Date of Birth"}
              </label>
              <Input
                id="new-person-modal-dob"
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
              />
            </div>

            {!isCompany ? (
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.35rem", color: "var(--text-secondary)" }}>
                  Gender
                </label>
                <select
                  id="new-person-modal-gender"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.6rem 0.85rem",
                    backgroundColor: "var(--bg-surface-elevated)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-md)",
                    color: "var(--text-primary)",
                    fontSize: "0.9rem",
                    outline: "none",
                  }}
                >
                  <option value="">— Select Gender —</option>
                  <option value="MALE">Male (Laki-laki)</option>
                  <option value="FEMALE">Female (Perempuan)</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            ) : (
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.35rem", color: "var(--text-secondary)" }}>
                  Corporate Structure
                </label>
                <div
                  style={{
                    padding: "0.6rem 0.85rem",
                    backgroundColor: "var(--bg-surface-elevated)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-md)",
                    color: "var(--text-muted)",
                    fontSize: "0.85rem",
                  }}
                >
                  Registered Business Entity
                </div>
              </div>
            )}
          </div>

          {/* Contact Details with Verification Checkboxes */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
                <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)" }}>
                  Phone Number
                </label>
                <label style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: "0.75rem", color: phoneNumberVerified ? "var(--accent-emerald)" : "var(--text-muted)", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={phoneNumberVerified}
                    onChange={(e) => setPhoneNumberVerified(e.target.checked)}
                    style={{ accentColor: "var(--accent-emerald)", cursor: "pointer" }}
                  />
                  <span>Verified</span>
                </label>
              </div>
              <Input
                id="new-person-modal-phone"
                placeholder="e.g. +62 812-3456-7890"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
                <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)" }}>
                  WhatsApp
                </label>
                <label style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: "0.75rem", color: whatsappVerified ? "var(--accent-emerald)" : "var(--text-muted)", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={whatsappVerified}
                    onChange={(e) => setWhatsappVerified(e.target.checked)}
                    style={{ accentColor: "var(--accent-emerald)", cursor: "pointer" }}
                  />
                  <span>Verified</span>
                </label>
              </div>
              <Input
                id="new-person-modal-whatsapp"
                placeholder="e.g. +62 812-3456-7890"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
              />
            </div>
          </div>

          {/* Structured Address */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.35rem", color: "var(--text-secondary)" }}>
                Street Address / Line 1
              </label>
              <Input
                id="new-person-modal-address"
                placeholder="e.g. Jl. Sudirman No. 45, RT 01 / RW 02"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.35rem", color: "var(--text-secondary)" }}>
                  City / Regency
                </label>
                <Input
                  id="new-person-modal-city"
                  placeholder="e.g. Jakarta Selatan"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.35rem", color: "var(--text-secondary)" }}>
                  Province / State
                </label>
                <Input
                  id="new-person-modal-province"
                  placeholder="e.g. DKI Jakarta"
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.35rem", color: "var(--text-secondary)" }}>
                  Postal Code
                </label>
                <Input
                  id="new-person-modal-postalcode"
                  placeholder="e.g. 12190"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.35rem", color: "var(--text-secondary)" }}>
                  Country
                </label>
                <Input
                  id="new-person-modal-country"
                  placeholder="e.g. Indonesia"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Legal / Tax Identifiers */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.35rem", color: "var(--text-secondary)" }}>
                Tax ID (NPWP)
              </label>
              <Input
                id="new-person-modal-taxid"
                placeholder="e.g. 01.234.567.8-901.000"
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.35rem", color: "var(--text-secondary)" }}>
                {isCompany ? "Company Registration / NIB" : "National ID (KTP / NIK)"}
              </label>
              <Input
                id="new-person-modal-socialid"
                placeholder={isCompany ? "e.g. NIB 1234567890123" : "e.g. 3171012345670001"}
                value={socialId}
                onChange={(e) => setSocialId(e.target.value)}
              />
            </div>
          </div>

          {/* Online & Social Media Profiles */}
          {/* Online & Social Media Profiles */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                🌐 Online & Social Media ({socialMediaEntries.filter((e) => e.username.trim() || e.url.trim()).length})
              </label>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setSocialMediaEntries((prev) => [...prev, createEmptySocialEntry()])}
                style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem", color: "var(--primary-light)" }}
              >
                + Add Space
              </Button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {socialMediaEntries.map((entry, index) => {
                const isOnlyRow = socialMediaEntries.length === 1;
                const cfg = getSocialPlatformConfig(entry.platform);
                return (
                  <div
                    key={entry.id}
                    style={{
                      display: "flex",
                      gap: "0.5rem",
                      alignItems: "center",
                      backgroundColor: "rgba(255, 255, 255, 0.02)",
                      padding: "0.4rem 0.5rem",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--border-subtle)",
                    }}
                  >
                    <select
                      value={entry.platform}
                      onChange={(e) => handleUpdateSocialEntry(entry.id, "platform", e.target.value)}
                      style={{
                        minWidth: "125px",
                        maxWidth: "135px",
                        padding: "0.45rem 0.5rem",
                        borderRadius: "var(--radius-md)",
                        backgroundColor: "var(--bg-surface)",
                        border: "1px solid var(--border-subtle)",
                        color: "var(--text-primary)",
                        fontSize: "0.8rem",
                      }}
                    >
                      {SOCIAL_PLATFORMS.map((p) => (
                        <option key={p.value} value={p.value}>
                          {p.label}
                        </option>
                      ))}
                    </select>

                    <div style={{ flex: 1 }}>
                      <Input
                        placeholder={cfg.placeholder}
                        value={entry.username}
                        onChange={(e) => handleUpdateSocialEntry(entry.id, "username", e.target.value)}
                        style={{ fontSize: "0.82rem" }}
                      />
                    </div>

                    <div style={{ flex: 1.2 }}>
                      <Input
                        placeholder="URL (auto-filled or custom)"
                        value={entry.url}
                        onChange={(e) => handleUpdateSocialEntry(entry.id, "url", e.target.value)}
                        style={{ fontSize: "0.82rem" }}
                      />
                    </div>

                    {!isOnlyRow && (
                      <button
                        type="button"
                        onClick={() => handleRemoveSocialEntry(entry.id)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--text-muted)",
                          cursor: "pointer",
                          fontSize: "0.85rem",
                          padding: "0.2rem 0.4rem",
                        }}
                        title="Remove row"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", margin: 0 }}>
              💡 Filling in a profile automatically creates another empty space for additional social accounts.
            </p>
          </div>

          {/* Profile Notes */}
          <div>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.35rem", color: "var(--text-secondary)" }}>
              Background Notes / Internal Remarks
            </label>
            <textarea
              id="new-person-modal-notes"
              rows={3}
              placeholder="Additional background context, business relationship notes, emergency contacts, or internal references..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{
                width: "100%",
                padding: "0.6rem 0.85rem",
                backgroundColor: "var(--bg-surface-elevated)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-md)",
                color: "var(--text-primary)",
                fontSize: "0.85rem",
                outline: "none",
                resize: "vertical",
                fontFamily: "inherit",
              }}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.5rem" }}>
            <Button variant="secondary" type="button" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button id="submit-create-person-btn" type="submit" disabled={loading}>
              {loading ? "Registering..." : "Register Person"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
