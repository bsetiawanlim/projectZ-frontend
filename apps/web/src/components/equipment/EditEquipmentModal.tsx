"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { equipmentApi } from "@/lib/api";
import type { EquipmentEntityRecord, EquipmentBrandRecord } from "@pz/shared";

interface EditEquipmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  equipment: EquipmentEntityRecord | null;
  onEquipmentUpdated: (equipment: EquipmentEntityRecord) => void;
}

export function EditEquipmentModal({
  isOpen,
  onClose,
  equipment,
  onEquipmentUpdated,
}: EditEquipmentModalProps) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [description, setDescription] = useState("");
  const [brandId, setBrandId] = useState<number | undefined>(undefined);
  const [brands, setBrands] = useState<EquipmentBrandRecord[]>([]);

  const [salvageValue, setSalvageValue] = useState<number>(0);
  const [usefulLifeYears, setUsefulLifeYears] = useState<number>(5);
  const [depreciationMethod, setDepreciationMethod] = useState<"STRAIGHT_LINE" | "DOUBLE_DECLINING">("STRAIGHT_LINE");
  const [acquisitionDate, setAcquisitionDate] = useState<string>("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && equipment) {
      setName(equipment.name || "");
      setCode(equipment.code || "");
      setUnitPrice(Number(equipment.unitPrice) || 0);
      setDescription(equipment.description || "");
      setBrandId(equipment.brandId || equipment.brand?.id || undefined);
      setSalvageValue(Number(equipment.salvageValue ?? 0));
      setUsefulLifeYears(Number(equipment.usefulLifeYears ?? 5));
      setDepreciationMethod((equipment.depreciationMethod as any) || "STRAIGHT_LINE");
      setAcquisitionDate(
        equipment.acquisitionDate
          ? new Date(equipment.acquisitionDate).toISOString().slice(0, 10)
          : equipment.createdAt
          ? new Date(equipment.createdAt).toISOString().slice(0, 10)
          : new Date().toISOString().slice(0, 10)
      );
      setError(null);

      // Load available brands
      equipmentApi
        .listBrands({ limit: 50 })
        .then((res) => {
          setBrands(res.items || []);
        })
        .catch(() => {
          setBrands([]);
        });
    }
  }, [isOpen, equipment]);

  if (!isOpen || !equipment) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Equipment name is required.");
      return;
    }
    if (!unitPrice || unitPrice <= 0) {
      setError("Asset unit price must be greater than 0.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await equipmentApi.updateEquipment({
        id: equipment.id,
        name: name.trim(),
        code: code.trim() || undefined,
        unitPrice: Number(unitPrice),
        description: description.trim() || undefined,
        brandId: brandId ? Number(brandId) : undefined,
        salvageValue: Number(salvageValue) || 0,
        usefulLifeYears: Number(usefulLifeYears) || 5,
        depreciationMethod: depreciationMethod,
        acquisitionDate: acquisitionDate ? new Date(acquisitionDate).toISOString() : undefined,
      });

      const updated = (res as any)?.data ?? res;
      if (updated) {
        onEquipmentUpdated(updated);
        onClose();
      }
    } catch (err: any) {
      console.error("Failed to update equipment", err);
      setError(err?.message || "Failed to update equipment asset.");
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
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <Card
        style={{
          width: "100%",
          maxWidth: "560px",
          maxHeight: "90vh",
          overflowY: "auto",
          backgroundColor: "var(--bg-surface)",
          border: "1px solid var(--border-glow)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "0 24px 48px -12px rgba(0,0,0,0.65)",
          padding: "1.75rem",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem" }}>
          <div>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--text-primary)" }}>
              ✏️ Edit Equipment Asset
            </h3>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
              Modify equipment asset properties, brand specification, and valuation for #{equipment.id}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              background: "none",
              border: "none",
              color: "var(--text-muted)",
              fontSize: "1.25rem",
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: "0.75rem 1rem",
              backgroundColor: "rgba(239, 68, 68, 0.15)",
              border: "1px solid var(--accent-rose)",
              borderRadius: "var(--radius-md)",
              color: "var(--accent-rose)",
              fontSize: "0.85rem",
              marginBottom: "1rem",
            }}
          >
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Name & Code */}
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "0.75rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.3rem" }}>
                Equipment Name *
              </label>
              <Input
                id="edit-equipment-name-input"
                placeholder="e.g. La Marzocco Linea PB"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.3rem" }}>
                Asset Code / Tag
              </label>
              <Input
                id="edit-equipment-code-input"
                placeholder="e.g. EQ-ESP-01"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>
          </div>

          {/* Unit Price & Brand */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.3rem" }}>
                Unit Price / Valuation (IDR) *
              </label>
              <Input
                id="edit-equipment-price-input"
                type="number"
                min="0"
                step="1000"
                placeholder="e.g. 185000000"
                value={unitPrice || ""}
                onChange={(e) => setUnitPrice(Number(e.target.value))}
                required
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.3rem" }}>
                Brand Manufacturer
              </label>
              <select
                id="edit-equipment-brand-select"
                value={brandId || ""}
                onChange={(e) => setBrandId(e.target.value ? Number(e.target.value) : undefined)}
                style={{
                  width: "100%",
                  padding: "0.55rem 0.75rem",
                  backgroundColor: "var(--bg-surface-elevated)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-md)",
                  color: "var(--text-primary)",
                  fontSize: "0.85rem",
                  outline: "none",
                }}
              >
                <option value="">Select Brand Manufacturer</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description / Notes */}
          <div>
            <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.3rem" }}>
              Technical Specification / Notes
            </label>
            <textarea
              id="edit-equipment-desc-input"
              rows={3}
              placeholder="e.g. 2-group espresso machine with dual PID boiler and auto-brew ratio scales..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{
                width: "100%",
                padding: "0.55rem 0.75rem",
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

          {/* Depreciation Policy Section */}
          <div
            style={{
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-md)",
              padding: "1rem",
              backgroundColor: "rgba(255, 255, 255, 0.02)",
              display: "flex",
              flexDirection: "column",
              gap: "0.85rem",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--accent-amber)" }}>
                📉 Asset Depreciation & Amortization
              </span>
              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                Accounting parameters
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>
                  Salvage / Scrap Value (IDR)
                </label>
                <Input
                  id="edit-equipment-salvage-input"
                  type="number"
                  min="0"
                  step="1000"
                  value={salvageValue || ""}
                  placeholder="0"
                  onChange={(e) => setSalvageValue(Number(e.target.value))}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>
                  Useful Life (Years)
                </label>
                <Input
                  id="edit-equipment-life-input"
                  type="number"
                  min="1"
                  max="50"
                  value={usefulLifeYears || ""}
                  placeholder="5"
                  onChange={(e) => setUsefulLifeYears(Number(e.target.value))}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>
                  Depreciation Method
                </label>
                <select
                  id="edit-equipment-method-select"
                  value={depreciationMethod}
                  onChange={(e) => setDepreciationMethod(e.target.value as any)}
                  style={{
                    width: "100%",
                    padding: "0.6rem 0.85rem",
                    backgroundColor: "var(--bg-surface-elevated)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-md)",
                    color: "var(--text-primary)",
                    fontSize: "0.85rem",
                    outline: "none",
                  }}
                >
                  <option value="STRAIGHT_LINE">Straight-Line (Default)</option>
                  <option value="DOUBLE_DECLINING">Double Declining Balance</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>
                  Acquisition Date
                </label>
                <input
                  id="edit-equipment-acq-date"
                  type="date"
                  value={acquisitionDate}
                  onChange={(e) => setAcquisitionDate(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.55rem 0.85rem",
                    backgroundColor: "var(--bg-surface-elevated)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-md)",
                    color: "var(--text-primary)",
                    fontSize: "0.85rem",
                    outline: "none",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.5rem" }}>
            <Button
              type="button"
              id="cancel-edit-equipment-btn"
              variant="ghost"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              id="save-edit-equipment-btn"
              isLoading={loading}
            >
              ✓ Save Changes
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
