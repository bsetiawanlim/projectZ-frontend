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

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName("");
      setCode("");
      setUnitPrice(0);
      setDescription("");
      setBrandId(undefined);
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
          maxWidth: "520px",
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
                Unit Value (IDR) *
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
