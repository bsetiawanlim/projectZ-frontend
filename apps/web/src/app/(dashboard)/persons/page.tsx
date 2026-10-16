"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { SortableTh } from "@/components/ui/SortableTh";
import { useAuth } from "@/lib/authContext";
import { profileApi } from "@/lib/api";
import { AddPersonModal } from "@/components/persons/AddPersonModal";
import { ViewProfileModal } from "@/components/users/ViewProfileModal";
import type { ProfileRecord } from "@pz/shared";

type EntityFilterType = "all" | "individual" | "company" | "customer" | "vendor" | "employee" | "multirole";

export default function PersonsPage() {
  const { user, canAccess } = useAuth();
  const [profiles, setProfiles] = useState<ProfileRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [entityFilter, setEntityFilter] = useState<EntityFilterType>("all");

  type PersonSortField = "name" | "roles" | "contact" | "tax" | "address";
  const [sortField, setSortField] = useState<PersonSortField>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const handleSort = (field: PersonSortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };


  const [isAddOpen, setIsAddOpen] = useState(false);
  const [viewingProfile, setViewingProfile] = useState<ProfileRecord | null>(null);

  // Delete state
  const [deletingProfile, setDeletingProfile] = useState<ProfileRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const canCreate = Boolean(
    user?.isSuperAdmin ||
      canAccess("profile", "create") ||
      canAccess("profile", "*") ||
      canAccess("customer", "*") ||
      canAccess("employee", "*") ||
      canAccess("user", "*")
  );

  const canEdit = Boolean(
    user?.isSuperAdmin ||
      canAccess("profile", "update") ||
      canAccess("profile", "*") ||
      canAccess("user", "*")
  );

  const canDelete = Boolean(
    user?.isSuperAdmin ||
      canAccess("profile", "delete") ||
      canAccess("profile", "*")
  );

  const loadProfiles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await profileApi.listProfiles({ limit: 100 });
      setProfiles(res.items || []);
    } catch (err) {
      console.error("Failed to load profiles", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  // Derived association counts
  const individualCount = useMemo(() => profiles.filter((p) => !p.isCompany).length, [profiles]);
  const companyCount = useMemo(() => profiles.filter((p) => !!p.isCompany).length, [profiles]);
  
  // Customers, Vendors, Employees counts (can overlap simultaneously)
  const customerCount = useMemo(
    () => profiles.filter((p) => p.customer && p.customer.length > 0).length,
    [profiles]
  );
  const vendorCount = useMemo(
    () => profiles.filter((p) => p.vendor && p.vendor.length > 0).length,
    [profiles]
  );
  const employeeCount = useMemo(
    () => profiles.filter((p) => p.employee && p.employee.length > 0).length,
    [profiles]
  );
  const multiRoleCount = useMemo(
    () =>
      profiles.filter((p) => {
        let count = 0;
        if (p.customer && p.customer.length > 0) count++;
        if (p.vendor && p.vendor.length > 0) count++;
        if (p.employee && p.employee.length > 0) count++;
        return count >= 2;
      }).length,
    [profiles]
  );
  const withSocialCount = useMemo(
    () => profiles.filter((p) => p.socialMedia && p.socialMedia.length > 0).length,
    [profiles]
  );

  const filteredProfiles = useMemo(() => {
    let result = profiles;

    // Filter by entity type or role affiliation
    if (entityFilter === "individual") {
      result = result.filter((p) => !p.isCompany);
    } else if (entityFilter === "company") {
      result = result.filter((p) => !!p.isCompany);
    } else if (entityFilter === "customer") {
      result = result.filter((p) => p.customer && p.customer.length > 0);
    } else if (entityFilter === "vendor") {
      result = result.filter((p) => p.vendor && p.vendor.length > 0);
    } else if (entityFilter === "employee") {
      result = result.filter((p) => p.employee && p.employee.length > 0);
    } else if (entityFilter === "multirole") {
      result = result.filter((p) => {
        let count = 0;
        if (p.customer && p.customer.length > 0) count++;
        if (p.vendor && p.vendor.length > 0) count++;
        if (p.employee && p.employee.length > 0) count++;
        return count >= 2;
      });
    }

    // Filter by search query
    if (!searchQuery.trim()) return result;
    const q = searchQuery.toLowerCase().trim();

    return result.filter((p) => {
      const title = (p.title || "").toLowerCase();
      const first = (p.firstName || "").toLowerCase();
      const last = (p.lastName || "").toLowerCase();
      const fullName = `${title} ${first} ${last}`.trim();
      const phone = (p.phoneNumber || "").toLowerCase();
      const wa = (p.whatsapp || "").toLowerCase();
      const tax = (p.taxId || "").toLowerCase();
      const social = (p.socialId || "").toLowerCase();
      const addr = (p.address || "").toLowerCase();
      const city = (p.city || "").toLowerCase();
      const prov = (p.province || "").toLowerCase();
      const country = (p.country || "").toLowerCase();
      const notes = (p.notes || "").toLowerCase();
      const gender = (p.gender || "").toLowerCase();

      // Search inside social media usernames & URLs
      const socialMatch = p.socialMedia?.some((sm) => {
        const u = (sm.username || "").toLowerCase();
        const url = (sm.url || "").toLowerCase();
        const plat = (sm.platform || "").toLowerCase();
        return u.includes(q) || url.includes(q) || plat.includes(q);
      });

      // Search by role keywords
      const isCust = p.customer && p.customer.length > 0;
      const isVend = p.vendor && p.vendor.length > 0;
      const isEmp = p.employee && p.employee.length > 0;
      const empPos = p.employee?.[0]?.position?.name?.toLowerCase() || "";

      const roleMatch =
        (q.includes("customer") && isCust) ||
        (q.includes("vendor") && isVend) ||
        (q.includes("employee") && isEmp) ||
        empPos.includes(q);

      return (
        fullName.includes(q) ||
        phone.includes(q) ||
        wa.includes(q) ||
        tax.includes(q) ||
        social.includes(q) ||
        addr.includes(q) ||
        city.includes(q) ||
        prov.includes(q) ||
        country.includes(q) ||
        notes.includes(q) ||
        gender.includes(q) ||
        roleMatch ||
        !!socialMatch
      );
    });
  }, [profiles, entityFilter, searchQuery]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "1.75rem",
              fontWeight: 800,
              letterSpacing: "-0.03em",
              background: "linear-gradient(135deg, var(--text-primary) 30%, var(--primary-light))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Person & Profile Directory
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginTop: "0.25rem" }}>
            Master directory of all identities — individuals, companies, customers, vendors, and employees
          </p>
        </div>

        {/* Action Buttons: Shortcuts & Registration */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
          {/* Quick-links to associated directories */}
          <Link href="/customers" style={{ textDecoration: "none" }}>
            <Button
              id="goto-customers-btn"
              variant="secondary"
              size="sm"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                borderColor: "rgba(245, 158, 11, 0.4)",
                color: "var(--accent-amber, #f59e0b)",
              }}
              title="Open Customers Directory"
            >
              <span>🛍️</span>
              <span>Customers ({customerCount})</span>
            </Button>
          </Link>

          <Link href="/vendors" style={{ textDecoration: "none" }}>
            <Button
              id="goto-vendors-btn"
              variant="secondary"
              size="sm"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                borderColor: "rgba(168, 85, 247, 0.4)",
                color: "#c084fc",
              }}
              title="Open Vendors Directory"
            >
              <span>🏭</span>
              <span>Vendors ({vendorCount})</span>
            </Button>
          </Link>

          <Link href="/employees" style={{ textDecoration: "none" }}>
            <Button
              id="goto-employees-btn"
              variant="secondary"
              size="sm"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                borderColor: "rgba(16, 185, 129, 0.4)",
                color: "var(--accent-emerald, #10b981)",
              }}
              title="Open Employees Directory"
            >
              <span>💼</span>
              <span>Employees ({employeeCount})</span>
            </Button>
          </Link>

          {canCreate && (
            <Button
              id="register-person-btn"
              variant="primary"
              size="sm"
              onClick={() => setIsAddOpen(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                boxShadow: "0 4px 14px rgba(99, 102, 241, 0.4)",
              }}
            >
              <span>➕</span>
              <span>Register Person</span>
            </Button>
          )}
        </div>
      </div>

      {/* Metrics Row (Interactive: Click to filter!) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
          gap: "0.85rem",
        }}
      >
        {/* Total Records */}
        <Card
          onClick={() => setEntityFilter("all")}
          style={{
            padding: "0.9rem 1.1rem",
            display: "flex",
            alignItems: "center",
            gap: "0.85rem",
            borderLeft: entityFilter === "all" ? "4px solid var(--primary)" : "4px solid transparent",
            backgroundColor: entityFilter === "all" ? "rgba(99, 102, 241, 0.12)" : "var(--bg-surface)",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
          title="Click to show all records"
        >
          <div
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "var(--radius-md)",
              backgroundColor: "rgba(99, 102, 241, 0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.2rem",
            }}
          >
            👥
          </div>
          <div>
            <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", textTransform: "uppercase", fontWeight: 700 }}>
              All Profiles
            </div>
            <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--text-primary)" }}>
              {profiles.length}
            </div>
          </div>
        </Card>

        {/* Customers */}
        <Card
          id="metric-customers-card"
          onClick={() => setEntityFilter("customer")}
          style={{
            padding: "0.9rem 1.1rem",
            display: "flex",
            alignItems: "center",
            gap: "0.85rem",
            borderLeft: entityFilter === "customer" ? "4px solid var(--accent-amber, #f59e0b)" : "4px solid transparent",
            backgroundColor: entityFilter === "customer" ? "rgba(245, 158, 11, 0.12)" : "var(--bg-surface)",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
          title="Click to show customers only"
        >
          <div
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "var(--radius-md)",
              backgroundColor: "rgba(245, 158, 11, 0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.2rem",
            }}
          >
            🛍️
          </div>
          <div>
            <div style={{ fontSize: "0.7rem", color: "var(--accent-amber, #f59e0b)", textTransform: "uppercase", fontWeight: 700 }}>
              Customers
            </div>
            <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--text-primary)" }}>
              {customerCount}
            </div>
          </div>
        </Card>

        {/* Vendors */}
        <Card
          id="metric-vendors-card"
          onClick={() => setEntityFilter("vendor")}
          style={{
            padding: "0.9rem 1.1rem",
            display: "flex",
            alignItems: "center",
            gap: "0.85rem",
            borderLeft: entityFilter === "vendor" ? "4px solid #a855f7" : "4px solid transparent",
            backgroundColor: entityFilter === "vendor" ? "rgba(168, 85, 247, 0.12)" : "var(--bg-surface)",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
          title="Click to show vendors only"
        >
          <div
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "var(--radius-md)",
              backgroundColor: "rgba(168, 85, 247, 0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.2rem",
            }}
          >
            🏭
          </div>
          <div>
            <div style={{ fontSize: "0.7rem", color: "#c084fc", textTransform: "uppercase", fontWeight: 700 }}>
              Vendors
            </div>
            <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--text-primary)" }}>
              {vendorCount}
            </div>
          </div>
        </Card>

        {/* Employees */}
        <Card
          id="metric-employees-card"
          onClick={() => setEntityFilter("employee")}
          style={{
            padding: "0.9rem 1.1rem",
            display: "flex",
            alignItems: "center",
            gap: "0.85rem",
            borderLeft: entityFilter === "employee" ? "4px solid var(--accent-emerald)" : "4px solid transparent",
            backgroundColor: entityFilter === "employee" ? "rgba(16, 185, 129, 0.12)" : "var(--bg-surface)",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
          title="Click to show employees only"
        >
          <div
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "var(--radius-md)",
              backgroundColor: "rgba(16, 185, 129, 0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.2rem",
            }}
          >
            💼
          </div>
          <div>
            <div style={{ fontSize: "0.7rem", color: "var(--accent-emerald)", textTransform: "uppercase", fontWeight: 700 }}>
              Employees
            </div>
            <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--text-primary)" }}>
              {employeeCount}
            </div>
          </div>
        </Card>

        {/* Multi-Role Affiliations */}
        <Card
          id="metric-multirole-card"
          onClick={() => setEntityFilter("multirole")}
          style={{
            padding: "0.9rem 1.1rem",
            display: "flex",
            alignItems: "center",
            gap: "0.85rem",
            borderLeft: entityFilter === "multirole" ? "4px solid var(--accent-cyan, #06b6d4)" : "4px solid transparent",
            backgroundColor: entityFilter === "multirole" ? "rgba(6, 182, 212, 0.12)" : "var(--bg-surface)",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
          title="Click to show persons with 2 or more roles simultaneously (e.g. Employee + Customer)"
        >
          <div
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "var(--radius-md)",
              backgroundColor: "rgba(6, 182, 212, 0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.2rem",
            }}
          >
            🔄
          </div>
          <div>
            <div style={{ fontSize: "0.7rem", color: "var(--accent-cyan, #06b6d4)", textTransform: "uppercase", fontWeight: 700 }}>
              Multi-Role
            </div>
            <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--text-primary)" }}>
              {multiRoleCount}
            </div>
          </div>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card style={{ padding: "1.1rem" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          {/* Action Filter Buttons / Tabs */}
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              Filter By:
            </span>

            <select
              id="filter-person-entity-select"
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value as EntityFilterType)}
              style={{
                padding: "0.45rem 0.85rem",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-subtle)",
                backgroundColor: "var(--surface, var(--bg-surface-elevated))",
                color: "var(--text-primary)",
                fontSize: "0.85rem",
                cursor: "pointer",
                outline: "none",
              }}
            >
              <option value="all">All Roles ({profiles.length})</option>
              <option value="customer">🛍️ Customers ({customerCount})</option>
              <option value="vendor">🏭 Vendors ({vendorCount})</option>
              <option value="employee">💼 Employees ({employeeCount})</option>
              <option value="multirole">🔄 Multi-Role ({multiRoleCount})</option>
              <option value="individual">👤 Individuals ({individualCount})</option>
              <option value="company">🏢 Companies ({companyCount})</option>
            </select>
          </div>

          {/* Search Box */}
          <div style={{ minWidth: "260px", maxWidth: "360px", flex: 1 }}>
            <Input
              id="search-persons-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name, role, phone, handle, address..."
            />
          </div>
        </div>
      </Card>

      {/* Directory Table */}
      <Card style={{ overflow: "hidden", padding: 0 }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
            <div style={{ fontSize: "1.8rem", marginBottom: "0.5rem" }}>⏳</div>
            Loading person identities...
          </div>
        ) : filteredProfiles.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3.5rem 1.5rem", color: "var(--text-muted)" }}>
            <div style={{ fontSize: "2.2rem", marginBottom: "0.5rem" }}>🔍</div>
            <div style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)" }}>
              No identities match current criteria
            </div>
            <p style={{ fontSize: "0.85rem", marginTop: "0.25rem", color: "var(--text-secondary)" }}>
              {entityFilter !== "all"
                ? `No records found under the "${entityFilter}" filter.`
                : searchQuery
                ? `No identities match "${searchQuery}"`
                : "No profiles registered yet."}
            </p>
            {entityFilter !== "all" && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setEntityFilter("all")}
                style={{ marginTop: "1rem" }}
              >
                Reset Filter to All
              </Button>
            )}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.875rem" }}>
              <thead>
                <tr
                  style={{
                    backgroundColor: "var(--bg-surface-elevated)",
                    borderBottom: "1px solid var(--border-subtle)",
                    color: "var(--text-secondary)",
                    fontSize: "0.75rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    userSelect: "none",
                  }}
                >
                  <th
                    style={{ padding: "0.85rem 1.25rem", fontWeight: 700, cursor: "pointer" }}
                    onClick={() => handleSort("name")}
                    title="Sort by Identity / Name"
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                      Identity {sortField === "name" ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}
                    </span>
                  </th>
                  <th
                    style={{ padding: "0.85rem 1.25rem", fontWeight: 700, cursor: "pointer" }}
                    onClick={() => handleSort("roles")}
                    title="Sort by Roles & Affiliations"
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                      Roles & Affiliations {sortField === "roles" ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}
                    </span>
                  </th>
                  <th
                    style={{ padding: "0.85rem 1.25rem", fontWeight: 700, cursor: "pointer" }}
                    onClick={() => handleSort("contact")}
                    title="Sort by Contacts"
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                      Contacts & Social {sortField === "contact" ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}
                    </span>
                  </th>
                  <th
                    style={{ padding: "0.85rem 1.25rem", fontWeight: 700, cursor: "pointer" }}
                    onClick={() => handleSort("tax")}
                    title="Sort by Tax / Social ID"
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                      Tax / Social ID {sortField === "tax" ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}
                    </span>
                  </th>
                  <th
                    style={{ padding: "0.85rem 1.25rem", fontWeight: 700, cursor: "pointer" }}
                    onClick={() => handleSort("address")}
                    title="Sort by Address"
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                      Address {sortField === "address" ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}
                    </span>
                  </th>
                  <th style={{ padding: "0.85rem 1.25rem", fontWeight: 700, textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProfiles.map((p, idx) => {
                  const fullName = `${p.title ? p.title + " " : ""}${p.firstName} ${p.lastName || ""}`.trim();
                  const isCust = Boolean(p.customer && p.customer.length > 0);
                  const isVend = Boolean(p.vendor && p.vendor.length > 0);
                  const isEmp = Boolean(p.employee && p.employee.length > 0);
                  const empPosition = p.employee?.[0]?.position?.name;

                  let roleCount = 0;
                  if (isCust) roleCount++;
                  if (isVend) roleCount++;
                  if (isEmp) roleCount++;
                  const isMultiRole = roleCount >= 2;

                  return (
                    <tr
                      key={p.id}
                      style={{
                        borderBottom: idx < filteredProfiles.length - 1 ? "1px solid var(--border-subtle)" : "none",
                        backgroundColor: idx % 2 === 0 ? "transparent" : "rgba(255, 255, 255, 0.015)",
                        transition: "background-color 0.15s ease",
                      }}
                    >
                      {/* Identity */}
                      <td style={{ padding: "0.9rem 1.25rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                          <div
                            style={{
                              width: "40px",
                              height: "40px",
                              borderRadius: "var(--radius-md)",
                              backgroundColor: p.isCompany
                                ? "rgba(245, 158, 11, 0.15)"
                                : isMultiRole
                                ? "rgba(6, 182, 212, 0.18)"
                                : "rgba(99, 102, 241, 0.15)",
                              border: p.isCompany
                                ? "1px solid rgba(245, 158, 11, 0.3)"
                                : isMultiRole
                                ? "1px solid var(--accent-cyan, #06b6d4)"
                                : "1px solid rgba(99, 102, 241, 0.3)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "1.15rem",
                              flexShrink: 0,
                            }}
                          >
                            {p.isCompany ? "🏢" : isMultiRole ? "🌟" : "👤"}
                          </div>
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                              <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{fullName}</span>
                              <Badge variant={p.isCompany ? "warning" : "info"} style={{ fontSize: "0.65rem", padding: "0.05rem 0.3rem" }}>
                                {p.isCompany ? "Company" : "Individual"}
                              </Badge>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.725rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                              {p.gender ? (
                                <span>{p.gender === "MALE" ? "👨 Male" : p.gender === "FEMALE" ? "👩 Female" : p.gender}</span>
                              ) : null}
                              {p.dateOfBirth && (
                                <span>
                                  {p.gender ? "• " : ""}
                                  🎂 {new Date(p.dateOfBirth).toLocaleDateString()}
                                </span>
                              )}
                              <span>• ID #{p.id}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Roles & Affiliations (Customer, Vendor, Employee simultaneously) */}
                      <td style={{ padding: "0.9rem 1.25rem" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                          {/* Active role badges */}
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem", alignItems: "center" }}>
                            {isCust && (
                              <Link href="/customers" style={{ textDecoration: "none" }}>
                                <span
                                  title="Registered Customer. Click to view in Customers Directory."
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "0.25rem",
                                    fontSize: "0.72rem",
                                    fontWeight: 700,
                                    padding: "0.15rem 0.45rem",
                                    borderRadius: "var(--radius-xs)",
                                    backgroundColor: "rgba(245, 158, 11, 0.15)",
                                    border: "1px solid rgba(245, 158, 11, 0.35)",
                                    color: "var(--accent-amber, #f59e0b)",
                                    cursor: "pointer",
                                  }}
                                >
                                  <span>🛍️ Customer</span>
                                  {p.customer?.[0]?.id && (
                                    <span style={{ opacity: 0.7, fontSize: "0.65rem" }}>#{p.customer[0].id}</span>
                                  )}
                                </span>
                              </Link>
                            )}

                            {isVend && (
                              <Link href="/vendors" style={{ textDecoration: "none" }}>
                                <span
                                  title="Registered Vendor. Click to view in Vendors Directory."
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "0.25rem",
                                    fontSize: "0.72rem",
                                    fontWeight: 700,
                                    padding: "0.15rem 0.45rem",
                                    borderRadius: "var(--radius-xs)",
                                    backgroundColor: "rgba(168, 85, 247, 0.15)",
                                    border: "1px solid rgba(168, 85, 247, 0.35)",
                                    color: "#c084fc",
                                    cursor: "pointer",
                                  }}
                                >
                                  <span>🏭 Vendor</span>
                                  {p.vendor?.[0]?.id && (
                                    <span style={{ opacity: 0.7, fontSize: "0.65rem" }}>#{p.vendor[0].id}</span>
                                  )}
                                </span>
                              </Link>
                            )}

                            {isEmp && (
                              <Link href="/employees" style={{ textDecoration: "none" }}>
                                <span
                                  title={`Registered Employee (${empPosition || "Staff"}). Click to view in Employees Directory.`}
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "0.25rem",
                                    fontSize: "0.72rem",
                                    fontWeight: 700,
                                    padding: "0.15rem 0.45rem",
                                    borderRadius: "var(--radius-xs)",
                                    backgroundColor: "rgba(16, 185, 129, 0.15)",
                                    border: "1px solid rgba(16, 185, 129, 0.35)",
                                    color: "var(--accent-emerald, #10b981)",
                                    cursor: "pointer",
                                  }}
                                >
                                  <span>💼 Employee</span>
                                  {empPosition && (
                                    <span style={{ opacity: 0.9, fontWeight: 600 }}>({empPosition})</span>
                                  )}
                                </span>
                              </Link>
                            )}

                            {!isCust && !isVend && !isEmp && (
                              <span
                                style={{
                                  fontSize: "0.72rem",
                                  color: "var(--text-muted)",
                                  padding: "0.1rem 0.35rem",
                                  borderRadius: "var(--radius-xs)",
                                  backgroundColor: "rgba(255, 255, 255, 0.04)",
                                  border: "1px solid var(--border-subtle)",
                                }}
                              >
                                Standalone Identity
                              </span>
                            )}
                          </div>

                          {/* Multi-role callout */}
                          {isMultiRole && (
                            <span
                              style={{
                                fontSize: "0.68rem",
                                color: "var(--accent-cyan, #06b6d4)",
                                fontWeight: 700,
                                textTransform: "uppercase",
                                letterSpacing: "0.04em",
                              }}
                            >
                              ✨ Active in {roleCount} Roles
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Contact Info & Social Media */}
                      <td style={{ padding: "0.9rem 1.25rem" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                          {p.phoneNumber ? (
                            <span style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.82rem" }}>
                              <span style={{ color: "var(--text-muted)" }}>📞</span>
                              <span>{p.phoneNumber}</span>
                              {p.phoneNumberVerified && (
                                <span title="Phone Verified" style={{ fontSize: "0.65rem", padding: "0.05rem 0.3rem", borderRadius: "var(--radius-xs)", backgroundColor: "rgba(16, 185, 129, 0.15)", color: "var(--accent-emerald)", fontWeight: 700 }}>
                                  ✓
                                </span>
                              )}
                            </span>
                          ) : null}
                          {p.whatsapp ? (
                            <span style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.82rem" }}>
                              <span style={{ color: "var(--accent-emerald)" }}>💬</span>
                              <span style={{ color: "var(--accent-emerald)" }}>{p.whatsapp}</span>
                              {p.whatsappVerified && (
                                <span title="WhatsApp Verified" style={{ fontSize: "0.65rem", padding: "0.05rem 0.3rem", borderRadius: "var(--radius-xs)", backgroundColor: "rgba(16, 185, 129, 0.15)", color: "var(--accent-emerald)", fontWeight: 700 }}>
                                  ✓
                                </span>
                              )}
                            </span>
                          ) : null}

                          {/* Social media icons */}
                          {p.socialMedia && p.socialMedia.length > 0 && (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem", marginTop: "0.2rem" }}>
                              {p.socialMedia.map((sm) => {
                                const icon = sm.platform === "instagram" ? "📸"
                                  : sm.platform === "linkedin" ? "💼"
                                  : sm.platform === "github" ? "💻"
                                  : sm.platform === "twitter" ? "𝕏"
                                  : sm.platform === "youtube" ? "▶️"
                                  : sm.platform === "tiktok" ? "🎵"
                                  : sm.platform === "facebook" ? "📘"
                                  : "🌐";
                                return (
                                  <a
                                    key={sm.id}
                                    href={sm.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title={`${sm.platform}: ${sm.username || sm.url}`}
                                    style={{
                                      fontSize: "0.72rem",
                                      padding: "0.1rem 0.35rem",
                                      borderRadius: "var(--radius-xs)",
                                      backgroundColor: "rgba(255, 255, 255, 0.05)",
                                      border: "1px solid var(--border-subtle)",
                                      textDecoration: "none",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "0.2rem",
                                      color: "var(--text-secondary)",
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <span>{icon}</span>
                                    <span style={{ fontSize: "0.68rem" }}>{sm.username || sm.platform}</span>
                                  </a>
                                );
                              })}
                            </div>
                          )}

                          {!p.phoneNumber && !p.whatsapp && (!p.socialMedia || p.socialMedia.length === 0) && (
                            <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>—</span>
                          )}
                        </div>
                      </td>

                      {/* Tax & Social ID */}
                      <td style={{ padding: "0.9rem 1.25rem" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                          {p.taxId && (
                            <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                              <span style={{ color: "var(--text-muted)", marginRight: "0.25rem" }}>Tax:</span>
                              <span style={{ fontFamily: "monospace" }}>{p.taxId}</span>
                            </span>
                          )}
                          {p.socialId && (
                            <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                              <span style={{ color: "var(--text-muted)", marginRight: "0.25rem" }}>ID:</span>
                              <span style={{ fontFamily: "monospace" }}>{p.socialId}</span>
                            </span>
                          )}
                          {!p.taxId && !p.socialId && (
                            <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>—</span>
                          )}
                        </div>
                      </td>

                      {/* Address & Notes */}
                      <td
                        style={{
                          padding: "0.9rem 1.25rem",
                          color: "var(--text-secondary)",
                          fontSize: "0.82rem",
                          maxWidth: "220px",
                        }}
                      >
                        <div
                          style={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                          title={p.address || undefined}
                        >
                          {p.address || "—"}
                        </div>
                        {(p.city || p.province) && (
                          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                            {[p.city, p.province, p.country].filter(Boolean).join(", ")}
                          </div>
                        )}
                        {p.notes && (
                          <div
                            style={{
                              fontSize: "0.725rem",
                              color: "var(--primary-light)",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              marginTop: "0.2rem",
                            }}
                            title={p.notes}
                          >
                            📝 {p.notes}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: "0.9rem 1.25rem", textAlign: "right" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "0.4rem" }}>
                          <Button
                            id={`view-person-btn-${p.id}`}
                            size="sm"
                            variant="ghost"
                            onClick={() => setViewingProfile(p)}
                          >
                            👁️ View
                          </Button>

                          {canDelete && (
                            <Button
                              id={`delete-person-btn-${p.id}`}
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setDeletingProfile(p);
                                setDeleteError(null);
                              }}
                              style={{
                                color: "var(--accent-rose)",
                                borderColor: "rgba(239, 68, 68, 0.25)",
                                fontSize: "0.8rem",
                                padding: "0.35rem 0.55rem",
                              }}
                              title="Delete Person Record"
                            >
                              🗑️
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Delete Confirmation Modal */}
      {deletingProfile && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 99999,
            padding: "1rem",
            animation: "fadeIn 150ms ease-out",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !isDeleting) {
              setDeletingProfile(null);
              setDeleteError(null);
            }
          }}
        >
          <Card
            style={{
              width: "100%",
              maxWidth: "460px",
              backgroundColor: "var(--bg-surface)",
              border: "1px solid var(--accent-rose)",
              borderRadius: "var(--radius-lg)",
              padding: "1.75rem",
              boxShadow: "0 24px 48px rgba(0,0,0,0.65)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "rgba(239, 68, 68, 0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.4rem",
                }}
              >
                🗑️
              </div>
              <div>
                <h3 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--accent-rose)", margin: 0 }}>
                  Delete Person Identity
                </h3>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  Identity ID #{deletingProfile.id}
                </span>
              </div>
            </div>

            <p style={{ fontSize: "0.875rem", color: "var(--text-primary)", marginBottom: "1rem", lineHeight: 1.5 }}>
              Are you sure you want to permanently delete profile for{" "}
              <strong>
                {deletingProfile.title ? deletingProfile.title + " " : ""}
                {deletingProfile.firstName} {deletingProfile.lastName || ""}
              </strong>
              ?
              <br />
              <span style={{ color: "var(--text-secondary)", fontSize: "0.8rem", marginTop: "0.35rem", display: "block" }}>
                This will soft-delete this profile and all associated social media accounts. This action cannot be undone.
              </span>
            </p>

            {deleteError && (
              <div
                style={{
                  padding: "0.6rem 0.8rem",
                  borderRadius: "var(--radius-sm)",
                  backgroundColor: "rgba(239, 68, 68, 0.25)",
                  border: "1px solid var(--accent-rose)",
                  color: "#ff8080",
                  fontSize: "0.82rem",
                  marginBottom: "1rem",
                  fontWeight: 600,
                }}
              >
                ❌ {deleteError}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.6rem" }}>
              <Button
                variant="ghost"
                size="sm"
                disabled={isDeleting}
                onClick={() => {
                  setDeletingProfile(null);
                  setDeleteError(null);
                }}
              >
                Cancel
              </Button>
              <Button
                id="modal-confirm-delete-btn"
                variant="primary"
                size="sm"
                disabled={isDeleting}
                onClick={async () => {
                  setIsDeleting(true);
                  setDeleteError(null);
                  try {
                    await profileApi.deleteProfile(deletingProfile.id);
                    setDeletingProfile(null);
                    loadProfiles();
                  } catch (err: any) {
                    setDeleteError(err?.message || "Failed to delete profile. It may be linked to active accounts.");
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                style={{
                  backgroundColor: "var(--accent-rose)",
                  borderColor: "var(--accent-rose)",
                  color: "#ffffff",
                }}
              >
                {isDeleting ? "Deleting..." : "Yes, Delete Person"}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Add Person Modal */}
      <AddPersonModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onPersonCreated={(newP) => {
          loadProfiles();
          setViewingProfile(newP);
        }}
      />

      {/* View / Edit Person Modal */}
      <ViewProfileModal
        isOpen={!!viewingProfile}
        onClose={() => setViewingProfile(null)}
        initialProfile={viewingProfile}
        profileId={viewingProfile?.id}
        canEdit={canEdit}
        canDelete={canDelete}
        onProfileUpdated={() => {
          loadProfiles();
        }}
        onProfileDeleted={() => {
          setViewingProfile(null);
          loadProfiles();
        }}
      />
    </div>
  );
}
