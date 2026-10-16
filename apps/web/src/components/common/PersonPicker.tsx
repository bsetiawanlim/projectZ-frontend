"use client";

import React, { useState, useEffect } from "react";
import { profileApi } from "@/lib/api";
import { type ProfileRecord, formatAddress } from "@pz/shared";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";

interface PersonPickerProps {
  selectedProfile: ProfileRecord | null;
  onSelect: (profile: ProfileRecord | null) => void;
  individualOnly?: boolean;
}

export function PersonPicker({ selectedProfile, onSelect, individualOnly = false }: PersonPickerProps) {
  const [search, setSearch] = useState("");
  const [profiles, setProfiles] = useState<ProfileRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    const timer = setTimeout(() => {
      profileApi
        .listProfiles({
          search: search.trim() || undefined,
          limit: 15,
          isCompany: individualOnly ? false : undefined,
        })
        .then((res) => {
          if (active) {
            const items = res.items || [];
            setProfiles(individualOnly ? items.filter((p) => !p.isCompany) : items);
          }
        })
        .catch((err) => {
          if (active) {
            console.error("Failed to fetch profiles", err);
            setError("Could not load person records.");
          }
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 200);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [search]);

  if (selectedProfile) {
    const isCompanyInvalid = individualOnly && selectedProfile.isCompany;
    const selectedDisplayName = `${selectedProfile.title ? `${selectedProfile.title} ` : ""}${selectedProfile.firstName} ${selectedProfile.lastName || ""}`.trim();

    return (
      <div
        style={{
          padding: "1rem",
          backgroundColor: isCompanyInvalid ? "rgba(244, 63, 94, 0.12)" : "rgba(99, 102, 241, 0.1)",
          border: isCompanyInvalid ? "1px solid var(--accent-rose)" : "1px solid var(--border-glow)",
          borderRadius: "var(--radius-md)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "1rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "var(--radius-full)",
              backgroundColor: "var(--bg-surface-elevated)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.2rem",
            }}
          >
            {selectedProfile.isCompany ? "🏢" : "👤"}
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text-primary)" }}>
                {selectedDisplayName}
              </span>
              <Badge variant={selectedProfile.isCompany ? "warning" : "default"}>
                {selectedProfile.isCompany ? "Company" : "Individual"}
              </Badge>
              {selectedProfile.gender && (
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  ({selectedProfile.gender === "MALE" ? "Male" : selectedProfile.gender === "FEMALE" ? "Female" : selectedProfile.gender})
                </span>
              )}
            </div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
              {selectedProfile.phoneNumber ? (
                <span>
                  📞 {selectedProfile.phoneNumber}
                  {selectedProfile.phoneNumberVerified ? " ✓" : ""}
                </span>
              ) : "No phone"}
              {formatAddress(selectedProfile) ? ` • 📍 ${formatAddress(selectedProfile)}` : ""}
              {selectedProfile.dateOfBirth ? ` • 🎂 ${new Date(selectedProfile.dateOfBirth).toLocaleDateString()}` : ""}
            </div>
            {isCompanyInvalid && (
              <p style={{ fontSize: "0.75rem", color: "var(--accent-rose)", marginTop: "0.3rem", fontWeight: 600 }}>
                ⚠️ Employees must be individuals. Please pick an individual person.
              </p>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => onSelect(null)}
          id="change-person-btn"
          style={{
            padding: "0.35rem 0.75rem",
            borderRadius: "var(--radius-sm)",
            backgroundColor: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
            color: "var(--text-secondary)",
            fontSize: "0.8rem",
            cursor: "pointer",
            fontWeight: 500,
          }}
        >
          Change
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <Input
        id="search-existing-person-input"
        placeholder={
          individualOnly
            ? "Search individual persons by name, title, phone, or address..."
            : "Type name, title, phone, or address to search existing persons / companies..."
        }
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        autoFocus
      />

      <div
        style={{
          maxHeight: "220px",
          overflowY: "auto",
          backgroundColor: "var(--bg-surface-elevated)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-md)",
          padding: "0.5rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.4rem",
        }}
      >
        {loading && profiles.length === 0 && (
          <div style={{ padding: "1rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem" }}>
            Searching database...
          </div>
        )}

        {error && (
          <div style={{ padding: "0.75rem", color: "var(--accent-rose)", fontSize: "0.85rem", textAlign: "center" }}>
            {error}
          </div>
        )}

        {!loading && profiles.length === 0 && (
          <div style={{ padding: "1.25rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem" }}>
            {individualOnly
              ? "No matching individual persons found. Use 'Create New Person' tab to register a new staff member."
              : "No matching persons found. Use 'Create New Person' tab to add someone new."}
          </div>
        )}

        {profiles.map((p) => {
          const isCompanyDisallowed = individualOnly && p.isCompany;
          const itemFullName = `${p.title ? `${p.title} ` : ""}${p.firstName} ${p.lastName || ""}`.trim();

          return (
            <button
              key={p.id}
              type="button"
              id={`select-person-item-${p.id}`}
              disabled={isCompanyDisallowed}
              onClick={() => onSelect(p)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0.6rem 0.75rem",
                borderRadius: "var(--radius-sm)",
                backgroundColor: "var(--bg-surface)",
                border: "1px solid var(--border-subtle)",
                cursor: isCompanyDisallowed ? "not-allowed" : "pointer",
                opacity: isCompanyDisallowed ? 0.5 : 1,
                textAlign: "left",
                transition: "all var(--transition-fast)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <span style={{ fontSize: "1.1rem" }}>{p.isCompany ? "🏢" : "👤"}</span>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-primary)" }}>
                      {itemFullName}
                    </span>
                    <Badge variant={p.isCompany ? "warning" : "default"}>
                      {p.isCompany ? "Company" : "Individual"}
                    </Badge>
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
                    {p.phoneNumber ? `📞 ${p.phoneNumber}${p.phoneNumberVerified ? " ✓" : ""}` : "No phone"}
                    {formatAddress(p) ? ` • 📍 ${formatAddress(p)}` : ""}
                    {p.dateOfBirth ? ` • 🎂 ${new Date(p.dateOfBirth).toLocaleDateString()}` : ""}
                  </div>
                </div>
              </div>

              <span
                style={{
                  fontSize: "0.75rem",
                  color: isCompanyDisallowed ? "var(--text-muted)" : "var(--primary)",
                  fontWeight: 600,
                }}
              >
                {isCompanyDisallowed ? "Company (Invalid)" : "Select →"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
