"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { equipmentApi } from "@/lib/api";
import type { EquipmentEntityRecord, EquipmentBrandRecord } from "@pz/shared";

interface AddEquipmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEquipmentCreated: (equipment: EquipmentEntityRecord) => void;
}

export function AddEquipmentModal({ isOpen, onClose, onEquipmentCreated }: AddEquipmentModalProps) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [description, setDescription] = useState("");
  const [brandId, setBrandId] = useState<number | undefined>(undefined);
  const [brands, setBrands] = useState<EquipmentBrandRecord[]>([]);

  const [salvageValue, setSalvageValue] = useState<number>(0);
  const [usefulLifeYears, setUsefulLifeYears] = useState<number>(5);
  const [depreciationMethod, setDepreciationMethod] = useState<"STRAIGHT_LINE" | "DOUBLE_DECLINING">("STRAIGHT_LINE");
  const [acquisitionDate, setAcquisitionDate] = useState<string>(new Date().toISOString().slice(0, 10));

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName("");
      setCode("");
      setUnitPrice(0);
      setDescription("");
      setBrandId(undefined);
      setSalvageValue(0);
      setUsefulLifeYears(5);
      setDepreciationMethod("STRAIGHT_LINE");
      setAcquisitionDate(new Date().toISOString().slice(0, 10));
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
  }, [isOpen]);

  if (!isOpen) return null;

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
      const res = await equipmentApi.createEquipment({
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

      const newEquipment = (res as any)?.data ?? res;
      if (newEquipment) {
        onEquipmentCreated(newEquipment);
        onClose();
      }
    } catch (err: any) {
      setError(err?.message || "Failed to register equipment asset.");
    } finally {
      setLoading(false);
    }
  };

  const depreciableBase = Math.max(0, (Number(unitPrice) || 0) - (Number(salvageValue) || 0));
  const estAnnualDep = usefulLifeYears > 0 ? depreciableBase / usefulLifeYears : 0;
  const estMonthlyDep = estAnnualDep / 12;

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
          maxWidth: "560px",
          maxHeight: "90vh",
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
              Add Equipment & Machinery
            </h3>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
              Register machinery, tools, vehicles, or physical operational assets
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              fontSize: "1.25rem",
              color: "var(--text-muted)",
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
              fontSize: "0.875rem",
              marginBottom: "1rem",
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.35rem" }}>
              Equipment Name *
            </label>
            <Input
              id="equipment-name-input"
              placeholder="e.g. Caterpillar Excavator 320D, Forklift Toyota 3-Ton"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.35rem" }}>
                Asset Code / Tag
              </label>
              <Input
                id="equipment-code-input"
                placeholder="e.g. EQ-EXC-001"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.35rem" }}>
                Acquisition Cost (IDR) *
              </label>
              <Input
                id="equipment-price-input"
                type="number"
                min="1"
                step="1000"
                required
                value={unitPrice || ""}
                onChange={(e) => setUnitPrice(Number(e.target.value))}
              />
            </div>
          </div>

          {brands.length > 0 && (
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.35rem" }}>
                Brand / Manufacturer
              </label>
              <select
                id="equipment-brand-select"
                value={brandId || ""}
                onChange={(e) => setBrandId(e.target.value ? Number(e.target.value) : undefined)}
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
                <option value="">— Select Brand (Optional) —</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.35rem" }}>
              Technical Specs & Description
            </label>
            <Input
              id="equipment-desc-input"
              placeholder="e.g. Diesel powered, 2024 model, assigned to Warehouse A"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
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
                  id="equipment-salvage-input"
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
                  id="equipment-life-input"
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
                  id="equipment-method-select"
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
                  id="equipment-acq-date"
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

            {/* Quick Math Preview */}
            {unitPrice > 0 && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "0.5rem",
                  padding: "0.65rem 0.85rem",
                  backgroundColor: "rgba(245, 158, 11, 0.08)",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "0.75rem",
                  color: "var(--text-secondary)",
                }}
              >
                <div>
                  Est. Annual Dep: <strong style={{ color: "var(--accent-amber)" }}>Rp {Math.round(estAnnualDep).toLocaleString("id-ID")}</strong>
                </div>
                <div>
                  Est. Monthly Dep: <strong style={{ color: "var(--accent-cyan)" }}>Rp {Math.round(estMonthlyDep).toLocaleString("id-ID")}</strong>
                </div>
              </div>
            )}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.75rem" }}>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button id="submit-equipment-btn" type="submit" isLoading={loading}>
              Register Asset
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

