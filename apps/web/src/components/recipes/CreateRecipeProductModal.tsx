"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { productApi, employeeApi, equipmentApi } from "@/lib/api";
import {
  encodeRecipeMeta,
  type EmployeeLaborItem,
  type EquipmentUsageItem,
  type RecipeMetaSpecification,
} from "@/components/products/ProductRecipeModal";
import type {
  ProductCategoryItem,
  ProductItem,
  EmployeeRecord,
  PositionRecord,
  EquipmentEntityRecord,
} from "@pz/shared";

interface CreateRecipeProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (newProduct: ProductItem) => void;
  existingProducts: ProductItem[];
}

interface IngredientDraft {
  ingredientProductId: number;
  quantity: number;
  unitLabel: string;
  notes: string;
}

export function CreateRecipeProductModal({
  isOpen,
  onClose,
  onCreated,
  existingProducts,
}: CreateRecipeProductModalProps) {
  // Product Details
  const [productName, setProductName] = useState("");
  const [retailPrice, setRetailPrice] = useState<string>("");
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [unitLabel, setUnitLabel] = useState("cup");
  const [sku, setSku] = useState("");
  const [description, setDescription] = useState("");
  const [isTradeable, setIsTradeable] = useState(true);



  // Categories
  const [categories, setCategories] = useState<ProductCategoryItem[]>([]);

  // Initial Recipe Ingredients List
  const [ingredients, setIngredients] = useState<IngredientDraft[]>([]);

  // Labor List
  const [laborList, setLaborList] = useState<EmployeeLaborItem[]>([]);

  // Equipment List
  const [equipmentUsageList, setEquipmentUsageList] = useState<EquipmentUsageItem[]>([]);

  // Preparation instructions
  const [instructions, setInstructions] = useState("");

  // Master records for employee type (positions) & equipment
  const [positions, setPositions] = useState<PositionRecord[]>([]);
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [equipmentAssets, setEquipmentAssets] = useState<EquipmentEntityRecord[]>([]);

  // New Ingredient Row Form
  const [selectedIngredientId, setSelectedIngredientId] = useState<number | "">("");
  const [ingredientQty, setIngredientQty] = useState<number | "">("");
  const [ingredientUnit, setIngredientUnit] = useState("");
  const [ingredientNotes, setIngredientNotes] = useState("");

  // New Labor Row Form (Employee Type / Role)
  const [selectedPositionId, setSelectedPositionId] = useState<number | "">("");
  const [customEmpRole, setCustomEmpRole] = useState("");
  const [empHours, setEmpHours] = useState<number | "">("");
  const [empRate, setEmpRate] = useState<number | "">("");
  const [empNotes, setEmpNotes] = useState("");

  // New Equipment Row Form
  const [selectedEquipId, setSelectedEquipId] = useState<number | "">("");
  const [customEquipName, setCustomEquipName] = useState("");
  const [equipHours, setEquipHours] = useState<number | "">("");
  const [equipRate, setEquipRate] = useState<number | "">("");
  const [equipNotes, setEquipNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      productApi
        .getCategories()
        .then((res) => setCategories(res.data || []))
        .catch((err) => console.error("Could not load categories", err));

      employeeApi
        .listPositions()
        .then((res) => setPositions(res.items || []))
        .catch(() => {});

      employeeApi
        .listEmployees({ limit: 100 })
        .then((res) => setEmployees(res.items || []))
        .catch(() => {});

      equipmentApi
        .listEquipment({ limit: 100 })
        .then((res) => setEquipmentAssets(res.items || []))
        .catch(() => {});

      // Reset form
      setProductName("");
      setRetailPrice("");
      setCategoryId("");
      setUnitLabel("cup");
      setSku("");
      setDescription("");
      setIsTradeable(true);
      setIngredients([]);
      setLaborList([]);
      setEquipmentUsageList([]);
      setInstructions("");
      setSelectedIngredientId("");
      setIngredientQty("");
      setIngredientUnit("");
      setIngredientNotes("");
      setSelectedPositionId("");
      setCustomEmpRole("");
      setEmpHours("");
      setEmpRate("");
      setEmpNotes("");
      setSelectedEquipId("");
      setCustomEquipName("");
      setEquipHours("");
      setEquipRate("");
      setEquipNotes("");
      setError(null);
    }
  }, [isOpen]);

  // When selecting an ingredient, auto-fill unit if known
  const handleSelectIngredient = (id: number | "") => {
    setSelectedIngredientId(id);
    if (id) {
      const found = existingProducts.find((p) => p.id === Number(id));
      if (found?.unitLabel) {
        setIngredientUnit(found.unitLabel);
      }
    }
  };

  const handleAddIngredientRow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIngredientId || !ingredientQty) return;

    const ingId = Number(selectedIngredientId);
    if (ingredients.some((i) => i.ingredientProductId === ingId)) {
      setError("This ingredient is already in the list below.");
      return;
    }

    setIngredients((prev) => [
      ...prev,
      {
        ingredientProductId: ingId,
        quantity: Number(ingredientQty),
        unitLabel: ingredientUnit.trim(),
        notes: ingredientNotes.trim(),
      },
    ]);

    setSelectedIngredientId("");
    setIngredientQty("");
    setIngredientUnit("");
    setIngredientNotes("");
    setError(null);
  };

  const handleRemoveIngredientRow = (index: number) => {
    setIngredients((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddLaborRow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empHours || Number(empHours) <= 0) return;

    let roleName = customEmpRole.trim();
    let posId: number | undefined;

    if (selectedPositionId) {
      posId = Number(selectedPositionId);
      const foundPos = positions.find((p) => p.id === posId);
      roleName = foundPos?.positionName || foundPos?.name || `Role #${posId}`;
    }

    if (!roleName) {
      setError("Please select an employee type (position/role) or specify a custom role.");
      return;
    }

    setLaborList((prev) => [
      ...prev,
      {
        id: "lab_" + Date.now(),
        positionId: posId,
        roleOrName: roleName,
        hours: Number(empHours),
        hourlyRate: empRate ? Number(empRate) : undefined,
        notes: empNotes.trim() || undefined,
      },
    ]);

    setSelectedPositionId("");
    setCustomEmpRole("");
    setEmpHours("");
    setEmpRate("");
    setEmpNotes("");
    setError(null);
  };

  const handleRemoveLaborRow = (id: string) => {
    setLaborList((prev) => prev.filter((l) => l.id !== id));
  };

  const handleAddEquipmentRow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!equipHours || Number(equipHours) <= 0) return;

    let eqName = customEquipName.trim();
    let equipId: number | undefined;

    if (selectedEquipId) {
      equipId = Number(selectedEquipId);
      const found = equipmentAssets.find((eq) => eq.id === equipId);
      eqName = found ? found.name : `Equipment #${equipId}`;
    }

    if (!eqName) {
      setError("Please select or enter an equipment / machinery name.");
      return;
    }

    setEquipmentUsageList((prev) => [
      ...prev,
      {
        id: "eq_" + Date.now(),
        equipmentId: equipId,
        equipmentName: eqName,
        hours: Number(equipHours),
        hourlyRate: equipRate ? Number(equipRate) : undefined,
        notes: equipNotes.trim() || undefined,
      },
    ]);

    setSelectedEquipId("");
    setCustomEquipName("");
    setEquipHours("");
    setEquipRate("");
    setEquipNotes("");
    setError(null);
  };

  const handleRemoveEquipmentRow = (id: string) => {
    setEquipmentUsageList((prev) => prev.filter((eq) => eq.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName.trim() || productName.trim().length < 3) {
      setError("Product / Formula name must be at least 3 characters long.");
      return;
    }

    const priceNum = retailPrice ? Number(retailPrice) : 0;
    if (priceNum < 0 || isNaN(priceNum)) {
      setError("Please provide a valid retail price.");
      return;
    }

    if (ingredients.length === 0) {
      setError("Please add at least one raw material or component ingredient to this formula.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Encode labor, equipment, and SOP into the structured description meta
      const metaSpec: RecipeMetaSpecification = {
        version: 1,
        instructions: instructions.trim() || undefined,
        labor: laborList,
        equipment: equipmentUsageList,
      };
      const finalDescription = encodeRecipeMeta(description.trim(), metaSpec);

      // 1. Create the product
      const res = await productApi.createProduct({
        productName: productName.trim(),
        retailPrice: priceNum,
        price: priceNum,
        unitLabel: unitLabel.trim() || undefined,
        productCategoryId: categoryId ? Number(categoryId) : undefined,
        sku: sku.trim() || undefined,
        description: finalDescription,
        isTradeable,
      });

      const newProduct = res.data;
      if (!newProduct) throw new Error("Failed to create product record");

      // 2. Set the recipe ingredients in bulk
      await productApi.setProductRecipe({
        productId: newProduct.id,
        items: ingredients.map((item) => ({
          ingredientProductId: item.ingredientProductId,
          quantity: item.quantity,
          unitLabel: item.unitLabel || undefined,
          notes: item.notes || undefined,
        })),
      });

      onCreated(newProduct);
      onClose();
    } catch (err: any) {
      console.error("Failed to create formula product", err);
      setError(err?.message || "Failed to create formula product.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Filter available ingredients: exclude ones already added
  const alreadyAddedIds = new Set(ingredients.map((i) => i.ingredientProductId));
  const availableIngredients = existingProducts.filter((p) => !alreadyAddedIds.has(p.id));

  const totalLaborHours = laborList.reduce((sum, l) => sum + (l.hours || 0), 0);
  const totalEquipHours = equipmentUsageList.reduce((sum, eq) => sum + (eq.hours || 0), 0);

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
        zIndex: 1000,
        padding: "1rem",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <Card
        style={{
          width: "100%",
          maxWidth: "880px",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem",
          padding: "1.75rem",
          backgroundColor: "#111622",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <span style={{ fontSize: "1.5rem" }}>🧪</span>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#f8fafc" }}>Create New Formula & Bill of Materials</h3>
            </div>
            <p style={{ color: "#94a3b8", fontSize: "0.85rem", marginTop: "0.2rem" }}>
              Register a manufactured formula product and configure raw materials, labor working hours, and machinery runtimes
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} style={{ fontSize: "1.1rem", padding: "0.2rem 0.5rem" }}>
            ✕
          </Button>
        </div>

        {error && (
          <div
            style={{
              padding: "0.75rem 1rem",
              backgroundColor: "rgba(244, 63, 94, 0.1)",
              border: "1px solid var(--accent-rose)",
              color: "var(--accent-rose)",
              borderRadius: "var(--radius-md)",
              fontSize: "0.85rem",
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Step 1: Formula Product Master Info */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <h4 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--primary)", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "0.4rem" }}>
              1. Formula Product Identification & Retail Attributes
            </h4>

            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "0.75rem" }}>
              <Input
                id="create-recipe-name-input"
                label="Product / Formula Name *"
                placeholder="e.g. Vanilla Latte (Large)"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                required
                autoFocus
              />

              <Input
                id="create-recipe-price-input"
                label="Base / Retail Price (IDR)"
                placeholder="Optional or set via customer groups"
                type="number"
                min="0"
                step="500"
                value={retailPrice}
                onChange={(e) => setRetailPrice(e.target.value)}
              />

              <Input
                id="create-recipe-unit-input"
                label="Yield Unit *"
                placeholder="e.g. cup, serving, plate"
                value={unitLabel}
                onChange={(e) => setUnitLabel(e.target.value)}
                required
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1.5fr 2fr", gap: "0.75rem", alignItems: "center" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                <label style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--text-secondary)" }}>
                  Category
                </label>
                <select
                  id="create-recipe-category-select"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value === "" ? "" : Number(e.target.value))}
                  style={{
                    width: "100%",
                    padding: "0.6rem 0.85rem",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border-subtle)",
                    backgroundColor: "#111622",
                    color: "#f8fafc",
                    fontSize: "0.875rem",
                    outline: "none",
                  }}
                >
                  <option value="" style={{ backgroundColor: "#111622", color: "#f8fafc" }}>
                    -- Uncategorized --
                  </option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id} style={{ backgroundColor: "#111622", color: "#f8fafc" }}>
                      {c.categoryName}
                    </option>
                  ))}
                </select>
              </div>

              <Input
                id="create-recipe-sku-input"
                label="SKU / Barcode (Optional)"
                placeholder="e.g. REC-LAT-001"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
              />

              <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                <label style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--text-secondary)" }}>
                  Point of Sale Visibility
                </label>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.6rem",
                    padding: "0.45rem 0.75rem",
                    backgroundColor: "rgba(255,255,255,0.02)",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  <input
                    type="checkbox"
                    id="create-recipe-tradeable-checkbox"
                    checked={isTradeable}
                    onChange={(e) => setIsTradeable(e.target.checked)}
                    style={{ width: "16px", height: "16px", cursor: "pointer", accentColor: "var(--primary)" }}
                  />
                  <label htmlFor="create-recipe-tradeable-checkbox" style={{ fontSize: "0.85rem", cursor: "pointer" }}>
                    {isTradeable ? "🛒 Visible for POS sales" : "📦 Internal / Sub-formula only"}
                  </label>
                </div>
              </div>
            </div>

            <Input
              id="create-recipe-desc-input"
              label="Brief Overview / Description (Optional)"
              placeholder="e.g. Signature hot espresso drink blended with steamed milk and vanilla syrup"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Step 2: Bill of Materials (Ingredients, Labor, Equipment) */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {/* Summary Bar */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                backgroundColor: "#111622",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-md)",
                padding: "0.6rem 0.9rem",
                fontSize: "0.825rem",
              }}
            >
              <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", color: "var(--text-secondary)" }}>
                <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>BOM Breakdown:</span>
                <span>🌾 <strong>{ingredients.length}</strong> Materials</span>
                <span>•</span>
                <span>👔 <strong>{laborList.length}</strong> Employee Types ({totalLaborHours}h)</span>
                <span>•</span>
                <span>🚜 <strong>{equipmentUsageList.length}</strong> Machines ({totalEquipHours}h)</span>
              </div>

              <span style={{ fontSize: "0.775rem", color: "var(--text-muted)" }}>
                Yield: 1 {unitLabel || "unit"}
              </span>
            </div>

            {/* SECTION 1: INGREDIENTS */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h4 style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--text-primary)" }}>
                  🌾 Raw Materials & Ingredients ({ingredients.length})
                </h4>
              </div>
                {ingredients.length === 0 ? (
                  <div
                    style={{
                      padding: "1.25rem",
                      textAlign: "center",
                      backgroundColor: "var(--bg-surface)",
                      borderRadius: "var(--radius-md)",
                      border: "1px dashed var(--border-subtle)",
                      color: "var(--text-muted)",
                      fontSize: "0.85rem",
                    }}
                  >
                    No material ingredients added yet. Add at least one raw item below.
                  </div>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.85rem" }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid var(--border-subtle)", color: "var(--text-muted)", fontSize: "0.75rem" }}>
                          <th style={{ padding: "0.5rem 0" }}>INGREDIENT ITEM</th>
                          <th>QTY NEEDED</th>
                          <th>UNIT</th>
                          <th>CURRENT STOCK</th>
                          <th>NOTES</th>
                          <th style={{ textAlign: "right" }}>REMOVE</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ingredients.map((ing, idx) => {
                          const foundProd = existingProducts.find((p) => p.id === ing.ingredientProductId);
                          return (
                            <tr key={idx} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                              <td style={{ padding: "0.5rem 0", fontWeight: 600, color: "#f8fafc" }}>
                                {foundProd?.productName || `Item #${ing.ingredientProductId}`}
                                {foundProd?.sku && (
                                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginLeft: "0.4rem" }}>
                                    ({foundProd.sku})
                                  </span>
                                )}
                              </td>
                              <td style={{ fontWeight: 700, color: "var(--primary)" }}>{ing.quantity}</td>
                              <td>{ing.unitLabel || foundProd?.unitLabel || "unit"}</td>
                              <td>
                                <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                                  {foundProd?.currentStock ?? 0} {foundProd?.unitLabel || ""}
                                </span>
                              </td>
                              <td style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>{ing.notes || "—"}</td>
                              <td style={{ textAlign: "right" }}>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleRemoveIngredientRow(idx)}
                                  style={{ color: "var(--accent-rose)", fontSize: "0.75rem", padding: "0.15rem 0.45rem" }}
                                >
                                  ✕
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Quick Add Ingredient Input Strip */}
                <div
                  style={{
                    marginTop: "0.25rem",
                    padding: "0.85rem",
                    backgroundColor: "var(--bg-surface)",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border-subtle)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.6rem",
                  }}
                >
                  <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)" }}>
                    + Insert Material Ingredient into Formula:
                  </span>

                  <div style={{ display: "grid", gridTemplateColumns: "2.5fr 1fr 1fr", gap: "0.6rem" }}>
                    <div>
                      <select
                        id="insert-ingredient-select"
                        value={selectedIngredientId}
                        onChange={(e) => handleSelectIngredient(e.target.value === "" ? "" : Number(e.target.value))}
                        style={{
                          width: "100%",
                          padding: "0.55rem 0.75rem",
                          borderRadius: "var(--radius-md)",
                          border: "1px solid var(--border-subtle)",
                          backgroundColor: "#111622",
                          color: "#f8fafc",
                          fontSize: "0.85rem",
                          outline: "none",
                        }}
                      >
                        <option value="" style={{ backgroundColor: "#111622", color: "#f8fafc" }}>
                          -- Choose ingredient product --
                        </option>
                        {availableIngredients.map((p) => (
                          <option
                            key={p.id}
                            value={p.id}
                            style={{ backgroundColor: "#111622", color: "#f8fafc" }}
                          >
                            {p.productName} ({p.sku || `#${p.id}`}) — Stock: {p.currentStock ?? 0} {p.unitLabel || ""}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Input
                        id="insert-ingredient-qty"
                        type="number"
                        step="any"
                        min="0.0001"
                        placeholder="Qty (e.g. 8.5)"
                        value={ingredientQty}
                        onChange={(e) => setIngredientQty(e.target.value === "" ? "" : Number(e.target.value))}
                      />
                    </div>

                    <div>
                      <Input
                        id="insert-ingredient-unit"
                        placeholder="Unit (e.g. g, ml)"
                        value={ingredientUnit}
                        onChange={(e) => setIngredientUnit(e.target.value)}
                      />
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
                    <div style={{ flex: 1 }}>
                      <Input
                        id="insert-ingredient-notes"
                        placeholder="Usage notes (optional, e.g. finely ground, steamed milk)"
                        value={ingredientNotes}
                        onChange={(e) => setIngredientNotes(e.target.value)}
                      />
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={handleAddIngredientRow}
                      disabled={!selectedIngredientId || !ingredientQty}
                      style={{ whiteSpace: "nowrap" }}
                    >
                      + Add Item
                    </Button>
                  </div>
                </div>
              </div>

            {/* SECTION 2: EMPLOYEE LABOR */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h4 style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--text-primary)" }}>
                  👔 Employee Type & Labor Working Hours ({laborList.length})
                </h4>
              </div>
                {laborList.length === 0 ? (
                  <div
                    style={{
                      padding: "1.25rem",
                      textAlign: "center",
                      backgroundColor: "var(--bg-surface)",
                      borderRadius: "var(--radius-md)",
                      border: "1px dashed var(--border-subtle)",
                      color: "var(--text-muted)",
                      fontSize: "0.85rem",
                    }}
                  >
                    No employee type working hours recorded yet for this formula.
                  </div>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.85rem" }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid var(--border-subtle)", color: "var(--text-muted)", fontSize: "0.75rem" }}>
                          <th style={{ padding: "0.5rem 0" }}>EMPLOYEE TYPE / ROLE</th>
                          <th>WORKING HOURS</th>
                          <th>EST. HOURLY RATE</th>
                          <th>NOTES</th>
                          <th style={{ textAlign: "right" }}>REMOVE</th>
                        </tr>
                      </thead>
                      <tbody>
                        {laborList.map((l) => (
                          <tr key={l.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                            <td style={{ padding: "0.5rem 0", fontWeight: 600, color: "#f8fafc" }}>
                              {l.roleOrName}
                            </td>
                            <td style={{ fontWeight: 700, color: "var(--accent-emerald)" }}>
                              ⏱️ {l.hours} hr{l.hours !== 1 ? "s" : ""}
                            </td>
                            <td>{l.hourlyRate ? `Rp ${l.hourlyRate.toLocaleString("id-ID")}/hr` : "—"}</td>
                            <td style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>{l.notes || "—"}</td>
                            <td style={{ textAlign: "right" }}>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => handleRemoveLaborRow(l.id)}
                                style={{ color: "var(--accent-rose)", fontSize: "0.75rem", padding: "0.15rem 0.45rem" }}
                              >
                                ✕
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Quick Add Labor Strip */}
                <div
                  style={{
                    marginTop: "0.25rem",
                    padding: "0.85rem",
                    backgroundColor: "var(--bg-surface)",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border-subtle)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.6rem",
                  }}
                >
                  <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)" }}>
                    + Record Employee Type Working Hours:
                  </span>

                  <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1.2fr 1fr 1fr", gap: "0.6rem" }}>
                    <div>
                      <select
                        value={selectedPositionId}
                        onChange={(e) => {
                          setSelectedPositionId(e.target.value === "" ? "" : Number(e.target.value));
                          if (e.target.value !== "") setCustomEmpRole("");
                        }}
                        style={{
                          width: "100%",
                          padding: "0.55rem 0.75rem",
                          borderRadius: "var(--radius-md)",
                          border: "1px solid var(--border-subtle)",
                          backgroundColor: "#111622",
                          color: "#f8fafc",
                          fontSize: "0.85rem",
                          outline: "none",
                        }}
                      >
                        <option value="" style={{ backgroundColor: "#111622", color: "#f8fafc" }}>
                          -- Choose employee type / role --
                        </option>
                        {positions.map((p) => {
                          const posTitle = p.positionName || p.name || `Position #${p.id}`;
                          return (
                            <option
                              key={p.id}
                              value={p.id}
                              style={{ backgroundColor: "#111622", color: "#f8fafc" }}
                            >
                              {posTitle}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <div>
                      <Input
                        placeholder="Or custom role title"
                        value={customEmpRole}
                        onChange={(e) => {
                          setCustomEmpRole(e.target.value);
                          if (e.target.value) setSelectedPositionId("");
                        }}
                      />
                    </div>

                    <div>
                      <Input
                        type="number"
                        step="0.05"
                        min="0.01"
                        placeholder="Hours (e.g. 0.5)"
                        value={empHours}
                        onChange={(e) => setEmpHours(e.target.value === "" ? "" : Number(e.target.value))}
                      />
                    </div>

                    <div>
                      <Input
                        type="number"
                        placeholder="Rate / hr (IDR)"
                        value={empRate}
                        onChange={(e) => setEmpRate(e.target.value === "" ? "" : Number(e.target.value))}
                      />
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
                    <div style={{ flex: 1 }}>
                      <Input
                        placeholder="Task notes (e.g. espresso grind calibration, milk frothing)"
                        value={empNotes}
                        onChange={(e) => setEmpNotes(e.target.value)}
                      />
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={handleAddLaborRow}
                      disabled={!empHours}
                      style={{ whiteSpace: "nowrap" }}
                    >
                      + Add Labor
                    </Button>
                  </div>
                </div>
              </div>

            {/* SECTION 3: EQUIPMENT */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h4 style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--text-primary)" }}>
                  🚜 Equipment & Machinery Usage ({equipmentUsageList.length})
                </h4>
              </div>
                {equipmentUsageList.length === 0 ? (
                  <div
                    style={{
                      padding: "1.25rem",
                      textAlign: "center",
                      backgroundColor: "var(--bg-surface)",
                      borderRadius: "var(--radius-md)",
                      border: "1px dashed var(--border-subtle)",
                      color: "var(--text-muted)",
                      fontSize: "0.85rem",
                    }}
                  >
                    No machinery runtime configured yet for this formula.
                  </div>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.85rem" }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid var(--border-subtle)", color: "var(--text-muted)", fontSize: "0.75rem" }}>
                          <th style={{ padding: "0.5rem 0" }}>EQUIPMENT / MACHINERY</th>
                          <th>RUNTIME</th>
                          <th>DEPRECIATION / RUN COST</th>
                          <th>NOTES</th>
                          <th style={{ textAlign: "right" }}>REMOVE</th>
                        </tr>
                      </thead>
                      <tbody>
                        {equipmentUsageList.map((eq) => (
                          <tr key={eq.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                            <td style={{ padding: "0.5rem 0", fontWeight: 600, color: "#f8fafc" }}>
                              {eq.equipmentName}
                            </td>
                            <td style={{ fontWeight: 700, color: "var(--accent-amber)" }}>
                              ⚙️ {eq.hours} hr{eq.hours !== 1 ? "s" : ""}
                            </td>
                            <td>{eq.hourlyRate ? `Rp ${eq.hourlyRate.toLocaleString("id-ID")}/hr` : "—"}</td>
                            <td style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>{eq.notes || "—"}</td>
                            <td style={{ textAlign: "right" }}>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => handleRemoveEquipmentRow(eq.id)}
                                style={{ color: "var(--accent-rose)", fontSize: "0.75rem", padding: "0.15rem 0.45rem" }}
                              >
                                ✕
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Quick Add Equipment Strip */}
                <div
                  style={{
                    marginTop: "0.25rem",
                    padding: "0.85rem",
                    backgroundColor: "var(--bg-surface)",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border-subtle)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.6rem",
                  }}
                >
                  <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)" }}>
                    + Assign Machinery Runtime:
                  </span>

                  <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1.2fr 1fr 1fr", gap: "0.6rem" }}>
                    <div>
                      <select
                        value={selectedEquipId}
                        onChange={(e) => {
                          setSelectedEquipId(e.target.value === "" ? "" : Number(e.target.value));
                          if (e.target.value !== "") setCustomEquipName("");
                        }}
                        style={{
                          width: "100%",
                          padding: "0.55rem 0.75rem",
                          borderRadius: "var(--radius-md)",
                          border: "1px solid var(--border-subtle)",
                          backgroundColor: "#111622",
                          color: "#f8fafc",
                          fontSize: "0.85rem",
                          outline: "none",
                        }}
                      >
                        <option value="" style={{ backgroundColor: "#111622", color: "#f8fafc" }}>
                          -- Choose machinery asset --
                        </option>
                        {equipmentAssets.map((eq) => (
                          <option
                            key={eq.id}
                            value={eq.id}
                            style={{ backgroundColor: "#111622", color: "#f8fafc" }}
                          >
                            {eq.name} ({eq.code || `#${eq.id}`})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Input
                        placeholder="Or custom equipment name"
                        value={customEquipName}
                        onChange={(e) => {
                          setCustomEquipName(e.target.value);
                          if (e.target.value) setSelectedEquipId("");
                        }}
                      />
                    </div>

                    <div>
                      <Input
                        type="number"
                        step="0.05"
                        min="0.01"
                        placeholder="Hours (e.g. 0.25)"
                        value={equipHours}
                        onChange={(e) => setEquipHours(e.target.value === "" ? "" : Number(e.target.value))}
                      />
                    </div>

                    <div>
                      <Input
                        type="number"
                        placeholder="Cost / hr (IDR)"
                        value={equipRate}
                        onChange={(e) => setEquipRate(e.target.value === "" ? "" : Number(e.target.value))}
                      />
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
                    <div style={{ flex: 1 }}>
                      <Input
                        placeholder="Operating notes (e.g. 9 bar extraction, steamer preheat)"
                        value={equipNotes}
                        onChange={(e) => setEquipNotes(e.target.value)}
                      />
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={handleAddEquipmentRow}
                      disabled={!equipHours}
                      style={{ whiteSpace: "nowrap" }}
                    >
                      + Add Equipment
                    </Button>
                  </div>
                </div>
              </div>

            {/* Preparation SOP Instructions */}
            <div
              style={{
                marginTop: "0.25rem",
                padding: "0.85rem",
                backgroundColor: "var(--bg-surface)",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-subtle)",
                display: "flex",
                flexDirection: "column",
                gap: "0.4rem",
              }}
            >
              <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)" }}>
                📝 Preparation Method & SOP Instructions (Optional)
              </label>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Step-by-step preparation method, steam temperature, brewing time, etc..."
                rows={2}
                style={{
                  width: "100%",
                  padding: "0.5rem 0.75rem",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-subtle)",
                  backgroundColor: "#111622",
                  color: "#f8fafc",
                  fontSize: "0.85rem",
                  fontFamily: "inherit",
                  resize: "vertical",
                  outline: "none",
                }}
              />
            </div>
          </div>

          {/* Footer Submit */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.5rem", borderTop: "1px solid var(--border-subtle)", paddingTop: "1rem" }}>
            <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" size="md" disabled={loading || ingredients.length === 0}>
              {loading ? "Creating Formula..." : "🧪 Save & Register Formula"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
