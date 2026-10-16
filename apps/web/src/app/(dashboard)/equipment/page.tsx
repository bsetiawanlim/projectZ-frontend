"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { SortableTh } from "@/components/ui/SortableTh";
import { useAuth } from "@/lib/authContext";
import { equipmentApi } from "@/lib/api";
import { formatIDR } from "@pz/shared";
import { AddEquipmentModal } from "@/components/equipment/AddEquipmentModal";
import { EditEquipmentModal } from "@/components/equipment/EditEquipmentModal";
import { ViewEquipmentModal } from "@/components/equipment/ViewEquipmentModal";
import { EquipmentPriceModal } from "@/components/equipment/EquipmentPriceModal";
import type { EquipmentEntityRecord } from "@pz/shared";

export default function EquipmentPage() {
  const { user, canAccess } = useAuth();
  const [equipmentList, setEquipmentList] = useState<EquipmentEntityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  type EquipmentSortField = "code" | "name" | "brand" | "valuation" | "specs";
  const [sortField, setSortField] = useState<EquipmentSortField>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const handleSort = (field: EquipmentSortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };


  const [isAddOpen, setIsAddOpen] = useState(false);
  const [viewingEquipment, setViewingEquipment] = useState<EquipmentEntityRecord | null>(null);
  const [editingEquipment, setEditingEquipment] = useState<EquipmentEntityRecord | null>(null);
  const [pricingEquipment, setPricingEquipment] = useState<EquipmentEntityRecord | null>(null);


  const canCreate = Boolean(
    user?.isSuperAdmin ||
      canAccess("equipment", "create") ||
      canAccess("equipment", "*")
  );

  const canEdit = Boolean(
    user?.isSuperAdmin ||
      canAccess("equipment", "update") ||
      canAccess("equipment", "*")
  );

  const canDelete = Boolean(
    user?.isSuperAdmin ||
      canAccess("equipment", "delete") ||
      canAccess("equipment", "*")
  );

  const loadEquipment = useCallback(async () => {
    setLoading(true);
    try {
      const res = await equipmentApi.listEquipment({ limit: 100 });
      setEquipmentList(res.items || []);
    } catch (err) {
      console.error("Failed to load equipment assets", err);
      setEquipmentList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEquipment();
  }, [loadEquipment]);

  const filteredEquipment = useMemo(() => {
    let list = equipmentList;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = equipmentList.filter((eq) => {
        const name = (eq.name || "").toLowerCase();
        const code = (eq.code || "").toLowerCase();
        const desc = (eq.description || "").toLowerCase();
        const brand = (eq.brand?.name || "").toLowerCase();
        const model = (eq.model?.name || "").toLowerCase();

        return (
          name.includes(q) ||
          code.includes(q) ||
          desc.includes(q) ||
          brand.includes(q) ||
          model.includes(q)
        );
      });
    }

    return [...list].sort((a, b) => {
      let cmp = 0;
      if (sortField === "code") {
        cmp = (a.code || String(a.id)).localeCompare(b.code || String(b.id));
      } else if (sortField === "name") {
        cmp = (a.name || "").localeCompare(b.name || "");
      } else if (sortField === "brand") {
        const brandA = `${a.brand?.name || ""} ${a.model?.name || ""}`.trim();
        const brandB = `${b.brand?.name || ""} ${b.model?.name || ""}`.trim();
        cmp = brandA.localeCompare(brandB);
      } else if (sortField === "valuation") {
        cmp = (Number(a.unitPrice) || 0) - (Number(b.unitPrice) || 0);
      } else if (sortField === "specs") {
        cmp = (a.description || "").localeCompare(b.description || "");
      }
      return sortOrder === "asc" ? cmp : -cmp;
    });
  }, [equipmentList, searchQuery, sortField, sortOrder]);

  const totalAssetValuation = useMemo(() => {
    return equipmentList.reduce((acc, eq) => acc + (Number(eq.unitPrice) || 0), 0);
  }, [equipmentList]);

  const brandCount = useMemo(() => {
    const brands = new Set(
      equipmentList.map((eq) => eq.brand?.name).filter(Boolean)
    );
    return brands.size;
  }, [equipmentList]);

  const handleDelete = async (id: number, name: string) => {
    if (!window.confirm(`Are you sure you want to remove ${name} from active equipment registry?`)) {
      return;
    }
    try {
      await equipmentApi.deleteEquipment(id);
      await loadEquipment();
    } catch (err: any) {
      alert(err?.message || "Failed to delete equipment.");
    }
  };

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
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <h2 style={{ fontSize: "1.3rem", fontWeight: 700 }}>Equipments</h2>
            <Badge variant="warning">Assets & Fleet</Badge>
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginTop: "0.2rem" }}>
            Master registry of operational machinery, vehicles, industrial tools, and capital asset valuations
          </p>
        </div>
        {canCreate && (
          <Button
            id="add-equipment-btn"
            size="md"
            onClick={() => setIsAddOpen(true)}
            style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
          >
            <span>🚜</span>
            <span>+ Add Equipment</span>
          </Button>
        )}
      </div>

      {/* KPI Overview Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "1rem",
        }}
      >
        <Card style={{ padding: "1rem 1.25rem" }}>
          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
            Total Machinery Assets
          </p>
          <p style={{ fontSize: "1.4rem", fontWeight: 700, marginTop: "0.25rem", color: "var(--text-primary)" }}>
            {loading ? "—" : equipmentList.length}
          </p>
          <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>
            Registered machines & tools
          </span>
        </Card>

        <Card style={{ padding: "1rem 1.25rem" }}>
          <p style={{ fontSize: "0.75rem", color: "var(--accent-amber)", textTransform: "uppercase" }}>
            Total Asset Valuation
          </p>
          <p style={{ fontSize: "1.2rem", fontWeight: 700, marginTop: "0.25rem", color: "var(--accent-amber)" }}>
            {loading ? "—" : formatIDR(totalAssetValuation)}
          </p>
          <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>
            Combined physical asset value
          </span>
        </Card>

        <Card style={{ padding: "1rem 1.25rem" }}>
          <p style={{ fontSize: "0.75rem", color: "var(--accent-cyan)", textTransform: "uppercase" }}>
            Manufacturers & Brands
          </p>
          <p style={{ fontSize: "1.4rem", fontWeight: 700, marginTop: "0.25rem", color: "var(--accent-cyan)" }}>
            {loading ? "—" : brandCount}
          </p>
          <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>
            Equipment makers represented
          </span>
        </Card>

        <Card style={{ padding: "1rem 1.25rem" }}>
          <p style={{ fontSize: "0.75rem", color: "var(--accent-emerald)", textTransform: "uppercase" }}>
            Fleet Readiness
          </p>
          <p style={{ fontSize: "1.4rem", fontWeight: 700, marginTop: "0.25rem", color: "var(--accent-emerald)" }}>
            {loading ? "—" : `${equipmentList.length} Active`}
          </p>
          <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>
            Operational units deployed
          </span>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card style={{ padding: "1rem 1.25rem" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          <div style={{ flex: "1 1 280px", maxWidth: "420px" }}>
            <Input
              id="search-equipment-input"
              placeholder="Search by equipment name, code, brand, model..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Button
              id="refresh-equipment-btn"
              size="sm"
              variant="ghost"
              onClick={loadEquipment}
              title="Refresh equipment registry"
            >
              🔄 Refresh List
            </Button>
          </div>
        </div>
      </Card>

      {/* Equipment Table */}
      <Card style={{ padding: "0", overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
            <p>Loading equipment registry...</p>
          </div>
        ) : filteredEquipment.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3.5rem 1.5rem", color: "var(--text-secondary)" }}>
            <span style={{ fontSize: "2.5rem" }}>🚜</span>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginTop: "1rem", color: "var(--text-primary)" }}>
              No Equipment Assets Found
            </h3>
            <p style={{ marginTop: "0.4rem", fontSize: "0.875rem", maxWidth: "400px", margin: "0.4rem auto 1.25rem auto" }}>
              {searchQuery
                ? "No equipment matches your search query."
                : "No machinery or fleet equipment has been registered in the database yet."}
            </p>
            {canCreate && (
              <Button size="sm" onClick={() => setIsAddOpen(true)}>
                + Register First Machine
              </Button>
            )}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr
                  style={{
                    borderBottom: "1px solid var(--border-subtle)",
                    backgroundColor: "var(--bg-surface-elevated)",
                    color: "var(--text-muted)",
                    fontSize: "0.75rem",
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                  }}
                >
                  <SortableTh field="code" currentSortField={sortField} currentSortOrder={sortOrder} onSort={handleSort} style={{ padding: "0.85rem 1.25rem" }}>
                    ID / Code
                  </SortableTh>
                  <SortableTh field="name" currentSortField={sortField} currentSortOrder={sortOrder} onSort={handleSort} style={{ padding: "0.85rem 1.25rem" }}>
                    Equipment Name
                  </SortableTh>
                  <SortableTh field="brand" currentSortField={sortField} currentSortOrder={sortOrder} onSort={handleSort} style={{ padding: "0.85rem 1.25rem" }}>
                    Brand & Model
                  </SortableTh>
                  <SortableTh field="valuation" currentSortField={sortField} currentSortOrder={sortOrder} onSort={handleSort} style={{ padding: "0.85rem 1.25rem" }}>
                    Asset Valuation
                  </SortableTh>
                  <SortableTh field="specs" currentSortField={sortField} currentSortOrder={sortOrder} onSort={handleSort} style={{ padding: "0.85rem 1.25rem" }}>
                    Specs / Notes
                  </SortableTh>
                  <th style={{ padding: "0.85rem 1.25rem", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEquipment.map((eq) => (
                  <tr
                    key={eq.id}
                    style={{
                      borderBottom: "1px solid var(--border-subtle)",
                      fontSize: "0.875rem",
                      transition: "background-color var(--transition-fast)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "var(--bg-surface-elevated)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    {/* ID / Code */}
                    <td style={{ padding: "0.9rem 1.25rem", color: "var(--text-secondary)", fontFamily: "monospace" }}>
                      <div>#{eq.id}</div>
                      {eq.code && (
                        <div style={{ fontSize: "0.75rem", color: "var(--accent-amber)" }}>
                          {eq.code}
                        </div>
                      )}
                    </td>

                    {/* Equipment Name */}
                    <td style={{ padding: "0.9rem 1.25rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                        <span style={{ fontSize: "1.2rem" }}>🚜</span>
                        <div>
                          <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                            {eq.name}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Brand & Model */}
                    <td style={{ padding: "0.9rem 1.25rem" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
                        <span style={{ fontWeight: 500, color: "var(--text-primary)" }}>
                          {eq.brand?.name || "Standard Brand"}
                        </span>
                        {eq.model?.name && (
                          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                            Model: {eq.model.name}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Asset Valuation */}
                    <td style={{ padding: "0.9rem 1.25rem", fontWeight: 600, color: "var(--accent-emerald)" }}>
                      {formatIDR(eq.unitPrice)}
                    </td>

                    {/* Specs / Notes */}
                    <td
                      style={{
                        padding: "0.9rem 1.25rem",
                        color: "var(--text-secondary)",
                        fontSize: "0.82rem",
                        maxWidth: "240px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={eq.description || undefined}
                    >
                      {eq.description || "—"}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: "0.9rem 1.25rem", textAlign: "right" }}>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
                        <Button
                          id={`price-equipment-btn-${eq.id}`}
                          size="sm"
                          variant="secondary"
                          onClick={() => setPricingEquipment(eq)}
                          title="Manage sale and lease prices"
                          style={{
                            borderColor: "rgba(16, 185, 129, 0.4)",
                            color: "var(--accent-emerald)",
                          }}
                        >
                          💲 Prices
                        </Button>
                        <Button
                          id={`view-equipment-btn-${eq.id}`}
                          size="sm"
                          variant="ghost"
                          onClick={() => setViewingEquipment(eq)}
                        >
                          👁️ Details
                        </Button>
                        {canEdit && (
                          <Button
                            id={`edit-equipment-btn-${eq.id}`}
                            size="sm"
                            variant="secondary"
                            onClick={() => setEditingEquipment(eq)}
                            title="Edit equipment asset details"
                          >
                            ✏️ Edit
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            id={`delete-equipment-btn-${eq.id}`}
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(eq.id, eq.name)}
                            style={{ color: "var(--accent-rose)" }}
                          >
                            🗑️
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add Equipment Modal */}
      <AddEquipmentModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onEquipmentCreated={(newEq) => {
          loadEquipment();
          setViewingEquipment(newEq);
        }}
      />

      {/* View Equipment Modal */}
      <ViewEquipmentModal
        isOpen={!!viewingEquipment}
        onClose={() => setViewingEquipment(null)}
        equipment={viewingEquipment}
      />

      {/* Edit Equipment Modal */}
      <EditEquipmentModal
        isOpen={!!editingEquipment}
        onClose={() => setEditingEquipment(null)}
        equipment={editingEquipment}
        onEquipmentUpdated={(updated) => {
          loadEquipment();
          setViewingEquipment(updated);
        }}
      />

      {/* Sale/Lease Price Modal */}
      <EquipmentPriceModal
        isOpen={!!pricingEquipment}
        onClose={() => setPricingEquipment(null)}
        equipment={pricingEquipment}
      />
    </div>
  );
}

