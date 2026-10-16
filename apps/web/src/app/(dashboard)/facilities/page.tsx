"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";
import { useAuth } from "@/lib/authContext";
import { facilityApi, employeeApi } from "@/lib/api";
import type { EmployeeRecord } from "@pz/shared";
import type {
  FacilityRecord,
  FacilitySectionRecord,
  FacilityType,
  FacilitySectionType,
  CreateFacilityInput,
  CreateFacilitySectionInput,
} from "@/lib/api";

const FACILITY_TYPES: Array<{ value: FacilityType; label: string; icon: string }> = [
  { value: "WAREHOUSE", label: "Warehouse & Depot", icon: "🏭" },
  { value: "STORE", label: "Store / POS Outlet", icon: "🏪" },
  { value: "OFFICE", label: "Office & Branch", icon: "🏢" },
  { value: "FACTORY", label: "Kitchen / Factory", icon: "🏗️" },
  { value: "OTHER", label: "Other Location", icon: "📍" },
];

const SECTION_TYPES: Array<{ value: FacilitySectionType; label: string }> = [
  { value: "ZONE", label: "Zone / Floor" },
  { value: "AISLE", label: "Storage Aisle" },
  { value: "RACK", label: "Rack / Shelf" },
  { value: "ROOM", label: "Cold / Dry Room" },
  { value: "COUNTER", label: "POS Checkout Counter" },
  { value: "DISPLAY", label: "Sales Display" },
  { value: "STAGING", label: "Dispatch / Loading Bay" },
  { value: "OTHER", label: "Other Section" },
];

export default function FacilitiesPage() {
  const { user, canAccess } = useAuth();
  const [facilities, setFacilities] = useState<FacilityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState<FacilityType | "ALL">("ALL");

  // Active facility drawer / sections modal
  const [activeFacility, setActiveFacility] = useState<FacilityRecord | null>(null);
  const [sections, setSections] = useState<FacilitySectionRecord[]>([]);
  const [sectionsLoading, setSectionsLoading] = useState(false);
  const [activeFacilityTab, setActiveFacilityTab] = useState<"sections" | "staff">("sections");
  const [facilityEmployees, setFacilityEmployees] = useState<EmployeeRecord[]>([]);
  const [allEmployees, setAllEmployees] = useState<EmployeeRecord[]>([]);
  const [facilityEmployeesLoading, setFacilityEmployeesLoading] = useState(false);
  const [isAssignStaffModalOpen, setIsAssignStaffModalOpen] = useState(false);
  const [selectedStaffToAssign, setSelectedStaffToAssign] = useState<number | "">("");
  const [assigningStaff, setAssigningStaff] = useState(false);
  const [assignStaffError, setAssignStaffError] = useState<string | null>(null);

  // Add Facility Modal
  const [isAddFacilityOpen, setIsAddFacilityOpen] = useState(false);
  const [newFacility, setNewFacility] = useState<CreateFacilityInput>({
    facilityCode: "",
    facilityName: "",
    type: "WAREHOUSE",
    city: "",
    province: "",
    address: "",
    phoneNumber: "",
    isActive: true,
  });
  const [savingFacility, setSavingFacility] = useState(false);
  const [facilityError, setFacilityError] = useState<string | null>(null);

  // Add Section Modal
  const [isAddSectionOpen, setIsAddSectionOpen] = useState(false);
  const [newSection, setNewSection] = useState<Partial<CreateFacilitySectionInput>>({
    sectionCode: "",
    sectionName: "",
    type: "ZONE",
    description: "",
    isActive: true,
  });
  const [savingSection, setSavingSection] = useState(false);
  const [sectionError, setSectionError] = useState<string | null>(null);

  const canManage = Boolean(
    user?.isSuperAdmin ||
      canAccess("facility", "create") ||
      canAccess("facility", "update") ||
      canAccess("facility", "*")
  );

  const loadFacilities = useCallback(async () => {
    setLoading(true);
    try {
      const res = await facilityApi.getFacilities({ limit: 100 });
      const items = res?.items ?? (res as any)?.data ?? (Array.isArray(res) ? res : []);
      setFacilities(items);
    } catch (err: any) {
      console.error("Failed to load facilities:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFacilities();
  }, [loadFacilities]);

  const loadFacilityEmployees = async (facilityId: number) => {
    setFacilityEmployeesLoading(true);
    try {
      const [facEmpRes, allEmpRes] = await Promise.all([
        employeeApi.listEmployees({ limit: 100, facilityId: facilityId as any }),
        employeeApi.listEmployees({ limit: 200 }),
      ]);
      const facItems = Array.isArray(facEmpRes) ? facEmpRes : (facEmpRes as any).items || (facEmpRes as any).data || [];
      const allItems = Array.isArray(allEmpRes) ? allEmpRes : (allEmpRes as any).items || (allEmpRes as any).data || [];
      // Also filter client-side just in case
      setFacilityEmployees(facItems.filter((e: EmployeeRecord) => e.facilityId === facilityId));
      setAllEmployees(allItems);
    } catch (err) {
      console.error("Failed to load facility employees:", err);
    } finally {
      setFacilityEmployeesLoading(false);
    }
  };

  const loadSections = async (facilityId: number) => {
    setSectionsLoading(true);
    try {
      const res = await facilityApi.getSectionsByFacility(facilityId);
      const items = (res as any)?.data ?? (res as any)?.items ?? (Array.isArray(res) ? res : []);
      setSections(items);
    } catch (err) {
      console.error("Failed to load sections:", err);
    } finally {
      setSectionsLoading(false);
    }
  };

  const handleSelectFacility = (fac: FacilityRecord) => {
    setActiveFacility(fac);
    loadSections(fac.id);
    loadFacilityEmployees(fac.id);
  };

  const handleAssignEmployee = async () => {
    if (!selectedStaffToAssign || !activeFacility) return;
    setAssigningStaff(true);
    setAssignStaffError(null);
    try {
      await employeeApi.updateEmployee({
        id: Number(selectedStaffToAssign),
        facilityId: activeFacility.id,
      });
      setIsAssignStaffModalOpen(false);
      setSelectedStaffToAssign("");
      await Promise.all([
        loadFacilityEmployees(activeFacility.id),
        loadFacilities(),
      ]);
    } catch (err: any) {
      setAssignStaffError(err.message || "Failed to assign employee.");
    } finally {
      setAssigningStaff(false);
    }
  };

  const handleUnassignEmployee = async (empId: number) => {
    if (!activeFacility) return;
    try {
      await employeeApi.updateEmployee({
        id: empId,
        facilityId: null,
      });
      await Promise.all([
        loadFacilityEmployees(activeFacility.id),
        loadFacilities(),
      ]);
    } catch (err: any) {
      console.error("Failed to unassign employee:", err);
    }
  };

  const handleCreateFacility = async (e: React.FormEvent) => {
    e.preventDefault();
    setFacilityError(null);
    setSavingFacility(true);
    try {
      await facilityApi.createFacility(newFacility);
      setIsAddFacilityOpen(false);
      setNewFacility({
        facilityCode: "",
        facilityName: "",
        type: "WAREHOUSE",
        city: "",
        province: "",
        address: "",
        phoneNumber: "",
        isActive: true,
      });
      loadFacilities();
    } catch (err: any) {
      setFacilityError(err.message || "Failed to create facility.");
    } finally {
      setSavingFacility(false);
    }
  };

  const handleCreateSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFacility) return;
    setSectionError(null);
    setSavingSection(true);
    try {
      await facilityApi.createSection({
        facilityId: activeFacility.id,
        sectionCode: newSection.sectionCode!,
        sectionName: newSection.sectionName!,
        type: newSection.type as FacilitySectionType,
        description: newSection.description,
        isActive: true,
      });
      setIsAddSectionOpen(false);
      setNewSection({ sectionCode: "", sectionName: "", type: "ZONE", description: "", isActive: true });
      loadSections(activeFacility.id);
      loadFacilities();
    } catch (err: any) {
      setSectionError(err.message || "Failed to create section.");
    } finally {
      setSavingSection(false);
    }
  };

  const filteredFacilities = useMemo(() => {
    return facilities.filter((f) => {
      const matchType = selectedType === "ALL" || f.type === selectedType;
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        f.facilityName.toLowerCase().includes(q) ||
        f.facilityCode.toLowerCase().includes(q) ||
        (f.city && f.city.toLowerCase().includes(q)) ||
        (f.address && f.address.toLowerCase().includes(q));
      return matchType && matchSearch;
    });
  }, [facilities, selectedType, search]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", height: "100%" }}>
      {/* Top Header & Actions */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h2 style={{ fontSize: "1.35rem", fontWeight: 700, color: "var(--text-primary)" }}>
            Facilities
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "0.2rem" }}>
            Multi-warehouse network, store branches, offices, and sub-divided storage sections.
          </p>
        </div>

        {canManage && (
          <Button id="add-facility-btn" onClick={() => setIsAddFacilityOpen(true)}>
            + Add Facility / Warehouse
          </Button>
        )}
      </div>

      {/* Filter & Search Bar */}
      <Card style={{ padding: "1rem", display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ flex: 1, minWidth: "260px" }}>
          <Input
            id="facility-search-input"
            placeholder="Search facility name, code, city, address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Type:</span>
          <select
            id="filter-facility-type-select"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as any)}
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
            <option value="ALL">All Types ({facilities.length})</option>
            {FACILITY_TYPES.map((t) => {
              const count = facilities.filter((f) => f.type === t.value).length;
              return (
                <option key={t.value} value={t.value}>
                  {t.icon} {t.label} ({count})
                </option>
              );
            })}
          </select>
        </div>
      </Card>

      {/* Main Grid: Facilities List & Active Detail */}
      <div style={{ display: "grid", gridTemplateColumns: activeFacility ? "1fr 420px" : "1fr", gap: "1.25rem", flex: 1, minHeight: 0 }}>
        {/* Facilities Grid */}
        <div style={{ overflowY: "auto", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: "1rem", alignContent: "start" }}>
          {loading ? (
            <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
              Loading facilities network...
            </div>
          ) : filteredFacilities.length === 0 ? (
            <Card style={{ gridColumn: "1 / -1", textAlign: "center", padding: "3rem" }}>
              <span style={{ fontSize: "2.5rem" }}>🏬</span>
              <h3 style={{ marginTop: "1rem", color: "var(--text-primary)" }}>No facilities found</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "0.3rem" }}>
                {search ? "No records match your query." : "Register your first central warehouse or retail store outlet."}
              </p>
              {canManage && (
                <Button style={{ marginTop: "1.25rem" }} onClick={() => setIsAddFacilityOpen(true)}>
                  + Add Facility
                </Button>
              )}
            </Card>
          ) : (
            filteredFacilities.map((fac) => {
              const typeMeta = FACILITY_TYPES.find((t) => t.value === fac.type) || { icon: "📍", label: fac.type };
              const isSelected = activeFacility?.id === fac.id;
              const sectionCount = fac._count?.sections ?? fac.sections?.length ?? 0;
              const stockItemCount = fac._count?.storageStocks ?? 0;
              const staffCount = fac._count?.employees ?? 0;

              return (
                <Card
                  key={fac.id}
                  id={`facility-card-${fac.id}`}
                  onClick={() => handleSelectFacility(fac)}
                  style={{
                    padding: "1.25rem",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    border: isSelected ? "2px solid var(--primary)" : "1px solid var(--border-subtle)",
                    backgroundColor: isSelected ? "var(--bg-surface-elevated)" : "var(--bg-surface)",
                    boxShadow: isSelected ? "0 0 15px rgba(99, 102, 241, 0.2)" : undefined,
                    transition: "all var(--transition-fast)",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                      <span style={{ fontSize: "1.35rem" }}>{typeMeta.icon}</span>
                      <Badge variant={fac.isActive ? "success" : "default"}>
                        {fac.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>

                    <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.2rem" }}>
                      {fac.facilityName}
                    </h3>
                    <span style={{ fontSize: "0.75rem", fontFamily: "monospace", color: "var(--accent-cyan)", display: "block", marginBottom: "0.6rem" }}>
                      {fac.facilityCode}
                    </span>

                    <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.4, marginBottom: "0.75rem" }}>
                      {fac.address ? `${fac.address}, ${fac.city || ""}` : fac.city || "No address specified"}
                    </p>
                  </div>

                  {/* Metrics summary */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr 1fr",
                      gap: "0.4rem",
                      borderTop: "1px solid var(--border-subtle)",
                      paddingTop: "0.75rem",
                      fontSize: "0.75rem",
                      color: "var(--text-muted)",
                    }}
                  >
                    <span><strong>{sectionCount}</strong> Sections</span>
                    <span><strong>{stockItemCount}</strong> Stocks</span>
                    <span><strong>{staffCount}</strong> Staff</span>
                    <span><strong>{fac._count?.purchaseOrders ?? 0}</strong> POs</span>
                    <span><strong>{fac._count?.salesOrders ?? 0}</strong> Sales</span>
                    <span style={{ color: "var(--primary)", fontWeight: 600 }}>Explore →</span>
                  </div>
                </Card>
              );
            })
          )}
        </div>

        {/* Section Breakdown Drawer / Panel */}
        {activeFacility && (
          <Card style={{ display: "flex", flexDirection: "column", height: "100%", padding: "1.25rem", backgroundColor: "var(--bg-surface-elevated)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
              <div>
                <span style={{ fontSize: "0.75rem", color: "var(--accent-cyan)", fontFamily: "monospace" }}>
                  {activeFacility.facilityCode}
                </span>
                <h3 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--text-primary)", marginTop: "0.15rem" }}>
                  {activeFacility.facilityName}
                </h3>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setActiveFacility(null)}>
                ✕
              </Button>
            </div>

            <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: "0.75rem" }}>
              {activeFacility.description || "Facility storage layout and sub-sections."}
            </p>

            {/* Quick Hub Navigation Links */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "0.5rem",
                padding: "0.75rem",
                borderRadius: "var(--radius-md)",
                backgroundColor: "var(--bg-primary)",
                border: "1px solid var(--border-subtle)",
                marginBottom: "1rem",
              }}
            >
              <Link
                href={`/inventory?facilityId=${activeFacility.id}`}
                style={{
                  padding: "0.5rem 0.65rem",
                  borderRadius: "var(--radius-sm)",
                  backgroundColor: "var(--bg-surface)",
                  border: "1px solid var(--border-subtle)",
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: "0.8rem",
                  color: "var(--text-primary)",
                }}
              >
                <span>📦 Inventory Stock</span>
                <Badge variant="info">{activeFacility._count?.storageStocks ?? 0}</Badge>
              </Link>

              <Link
                href={`/employees?facilityId=${activeFacility.id}`}
                style={{
                  padding: "0.5rem 0.65rem",
                  borderRadius: "var(--radius-sm)",
                  backgroundColor: "var(--bg-surface)",
                  border: "1px solid var(--border-subtle)",
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: "0.8rem",
                  color: "var(--text-primary)",
                }}
              >
                <span>👥 Stationed Staff</span>
                <Badge variant="default">{activeFacility._count?.employees ?? 0}</Badge>
              </Link>

              <Link
                href={`/procurement/orders?facilityId=${activeFacility.id}`}
                style={{
                  padding: "0.5rem 0.65rem",
                  borderRadius: "var(--radius-sm)",
                  backgroundColor: "var(--bg-surface)",
                  border: "1px solid var(--border-subtle)",
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: "0.8rem",
                  color: "var(--text-primary)",
                }}
              >
                <span>📑 Purchase Orders</span>
                <Badge variant="warning">{activeFacility._count?.purchaseOrders ?? 0}</Badge>
              </Link>

              <Link
                href={`/pos/orders?facilityId=${activeFacility.id}`}
                style={{
                  padding: "0.5rem 0.65rem",
                  borderRadius: "var(--radius-sm)",
                  backgroundColor: "var(--bg-surface)",
                  border: "1px solid var(--border-subtle)",
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: "0.8rem",
                  color: "var(--text-primary)",
                }}
              >
                <span>💳 POS Sales Orders</span>
                <Badge variant="success">{activeFacility._count?.salesOrders ?? 0}</Badge>
              </Link>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <h4 style={{ fontSize: "0.92rem", fontWeight: 600, color: "var(--text-primary)" }}>
                Storage Sections ({sections.length})
              </h4>
              {canManage && (
                <Button size="sm" onClick={() => setIsAddSectionOpen(true)}>
                  + Add Section
                </Button>
              )}
            </div>

            {/* Sections List */}
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {sectionsLoading ? (
                <p style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem" }}>
                  Loading storage sections...
                </p>
              ) : sections.length === 0 ? (
                <div style={{ textAlign: "center", padding: "2.5rem 1rem", border: "1px dashed var(--border-subtle)", borderRadius: "var(--radius-md)" }}>
                  <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                    No sections configured yet.
                  </p>
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.75rem", marginTop: "0.25rem" }}>
                    Divide this warehouse into Cold Rooms, Aisles, Racks, or Floor Zones.
                  </p>
                  {canManage && (
                    <Button size="sm" style={{ marginTop: "0.75rem" }} onClick={() => setIsAddSectionOpen(true)}>
                      + Create First Section
                    </Button>
                  )}
                </div>
              ) : (
                sections.map((sec) => (
                  <div
                    key={sec.id}
                    style={{
                      padding: "0.75rem 0.9rem",
                      borderRadius: "var(--radius-md)",
                      backgroundColor: "var(--bg-surface)",
                      border: "1px solid var(--border-subtle)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span style={{ fontWeight: 600, fontSize: "0.88rem", color: "var(--text-primary)" }}>
                          {sec.sectionName}
                        </span>
                        <Badge variant="default" style={{ fontSize: "0.65rem" }}>
                          {sec.type}
                        </Badge>
                      </div>
                      <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontFamily: "monospace" }}>
                        {sec.sectionCode}
                      </span>
                    </div>

                    <Badge variant={sec.isActive ? "success" : "default"}>
                      {sec.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </Card>
        )}
      </div>

      {/* Add Facility Modal */}
      {isAddFacilityOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: "1rem",
          }}
        >
          <Card style={{ width: "100%", maxWidth: "520px", padding: "1.75rem", maxHeight: "90vh", overflowY: "auto" }}>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.25rem" }}>
              Add New Facility
            </h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.82rem", marginBottom: "1.25rem" }}>
              Create a warehouse, store outlet, or administrative office location.
            </p>

            {facilityError && (
              <div style={{ padding: "0.6rem 0.8rem", backgroundColor: "rgba(239, 68, 68, 0.15)", color: "var(--accent-rose)", borderRadius: "var(--radius-md)", fontSize: "0.82rem", marginBottom: "1rem" }}>
                {facilityError}
              </div>
            )}

            <form onSubmit={handleCreateFacility} style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                    Facility Code *
                  </label>
                  <Input
                    required
                    placeholder="e.g. WH-JKT-01"
                    value={newFacility.facilityCode}
                    onChange={(e) => setNewFacility({ ...newFacility, facilityCode: e.target.value.toUpperCase() })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                    Type *
                  </label>
                  <select
                    style={{
                      width: "100%",
                      padding: "0.5rem 0.75rem",
                      borderRadius: "var(--radius-md)",
                      backgroundColor: "var(--bg-surface-elevated)",
                      border: "1px solid var(--border-subtle)",
                      color: "var(--text-primary)",
                      fontSize: "0.85rem",
                    }}
                    value={newFacility.type}
                    onChange={(e) => setNewFacility({ ...newFacility, type: e.target.value as FacilityType })}
                  >
                    {FACILITY_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                  Facility Name *
                </label>
                <Input
                  required
                  placeholder="e.g. Central Distribution Warehouse Jakarta"
                  value={newFacility.facilityName}
                  onChange={(e) => setNewFacility({ ...newFacility, facilityName: e.target.value })}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                    City
                  </label>
                  <Input
                    placeholder="e.g. Jakarta Barat"
                    value={newFacility.city || ""}
                    onChange={(e) => setNewFacility({ ...newFacility, city: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                    Province
                  </label>
                  <Input
                    placeholder="e.g. DKI Jakarta"
                    value={newFacility.province || ""}
                    onChange={(e) => setNewFacility({ ...newFacility, province: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                  Street Address
                </label>
                <Input
                  placeholder="e.g. Jl. Daan Mogot KM 12 No. 8"
                  value={newFacility.address || ""}
                  onChange={(e) => setNewFacility({ ...newFacility, address: e.target.value })}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.5rem" }}>
                <Button type="button" variant="secondary" onClick={() => setIsAddFacilityOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={savingFacility}>
                  {savingFacility ? "Saving..." : "Create Facility"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Add Section Modal */}
      {isAddSectionOpen && activeFacility && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: "1rem",
          }}
        >
          <Card style={{ width: "100%", maxWidth: "460px", padding: "1.75rem" }}>
            <h3 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.25rem" }}>
              Add Storage Section
            </h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.82rem", marginBottom: "1.25rem" }}>
              Create a section inside <strong>{activeFacility.facilityName}</strong>.
            </p>

            {sectionError && (
              <div style={{ padding: "0.6rem 0.8rem", backgroundColor: "rgba(239, 68, 68, 0.15)", color: "var(--accent-rose)", borderRadius: "var(--radius-md)", fontSize: "0.82rem", marginBottom: "1rem" }}>
                {sectionError}
              </div>
            )}

            <form onSubmit={handleCreateSection} style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                    Section Code *
                  </label>
                  <Input
                    required
                    placeholder="e.g. SEC-A1, RACK-04"
                    value={newSection.sectionCode || ""}
                    onChange={(e) => setNewSection({ ...newSection, sectionCode: e.target.value.toUpperCase() })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                    Section Type *
                  </label>
                  <select
                    style={{
                      width: "100%",
                      padding: "0.5rem 0.75rem",
                      borderRadius: "var(--radius-md)",
                      backgroundColor: "var(--bg-surface-elevated)",
                      border: "1px solid var(--border-subtle)",
                      color: "var(--text-primary)",
                      fontSize: "0.85rem",
                    }}
                    value={newSection.type}
                    onChange={(e) => setNewSection({ ...newSection, type: e.target.value as FacilitySectionType })}
                  >
                    {SECTION_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                  Section Name *
                </label>
                <Input
                  required
                  placeholder="e.g. Zone A - Cold Storage Room"
                  value={newSection.sectionName || ""}
                  onChange={(e) => setNewSection({ ...newSection, sectionName: e.target.value })}
                />
              </div>

              <div>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                  Description / Notes
                </label>
                <Input
                  placeholder="Temperature controlled at 4°C, dairy & meats"
                  value={newSection.description || ""}
                  onChange={(e) => setNewSection({ ...newSection, description: e.target.value })}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.5rem" }}>
                <Button type="button" variant="secondary" onClick={() => setIsAddSectionOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={savingSection}>
                  {savingSection ? "Saving..." : "Create Section"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
