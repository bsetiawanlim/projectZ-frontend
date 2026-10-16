"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { productApi, employeeApi, equipmentApi } from "@/lib/api";
import {
  formatIDR,
  type ProductItem,
  type ProductRecipeItem,
  type EmployeeRecord,
  type PositionRecord,
  type EquipmentEntityRecord,
} from "@pz/shared";

interface ProductRecipeModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: ProductItem | null;
  onUpdated?: () => void;
}

// Structured extra recipe data for employee labor & equipment usage
export interface EmployeeLaborItem {
  id: string;
  positionId?: number;
  employeeId?: number;
  roleOrName: string;
  hours: number;
  hourlyRate?: number;
  notes?: string;
}

export interface EquipmentUsageItem {
  id: string;
  equipmentId?: number;
  equipmentName: string;
  hours: number;
  hourlyRate?: number;
  notes?: string;
}

export interface RecipeMetaSpecification {
  version?: number;
  instructions?: string;
  labor: EmployeeLaborItem[];
  equipment: EquipmentUsageItem[];
}

export function parseRecipeMeta(rawDescription?: string | null): {
  cleanDescription: string;
  meta: RecipeMetaSpecification;
} {
  const defaultMeta: RecipeMetaSpecification = {
    version: 1,
    instructions: "",
    labor: [],
    equipment: [],
  };

  if (!rawDescription) {
    return { cleanDescription: "", meta: defaultMeta };
  }

  const markerStart = "---RECIPE_SPEC_START---";
  const markerEnd = "---RECIPE_SPEC_END---";
  const startIndex = rawDescription.indexOf(markerStart);
  const endIndex = rawDescription.indexOf(markerEnd);

  if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
    const cleanDescription = rawDescription.substring(0, startIndex).trim();
    const jsonStr = rawDescription
      .substring(startIndex + markerStart.length, endIndex)
      .trim();
    try {
      const parsed = JSON.parse(jsonStr);
      return {
        cleanDescription,
        meta: {
          version: parsed.version || 1,
          instructions: parsed.instructions || "",
          labor: Array.isArray(parsed.labor) ? parsed.labor : [],
          equipment: Array.isArray(parsed.equipment) ? parsed.equipment : [],
        },
      };
    } catch {
      return { cleanDescription: rawDescription, meta: defaultMeta };
    }
  }

  return { cleanDescription: rawDescription, meta: defaultMeta };
}

export function encodeRecipeMeta(
  cleanDescription: string,
  meta: RecipeMetaSpecification
): string {
  const markerStart = "---RECIPE_SPEC_START---";
  const markerEnd = "---RECIPE_SPEC_END---";
  const payload = JSON.stringify(meta);
  const prefix = cleanDescription.trim();
  if (prefix) {
    return `${prefix}\n\n${markerStart}\n${payload}\n${markerEnd}`;
  }
  return `${markerStart}\n${payload}\n${markerEnd}`;
}

export function ProductRecipeModal({
  isOpen,
  onClose,
  product,
  onUpdated,
}: ProductRecipeModalProps) {
  // Recipe Material Items
  const [recipes, setRecipes] = useState<ProductRecipeItem[]>([]);
  const [allProducts, setAllProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);



  // Material Form
  const [selectedIngredientId, setSelectedIngredientId] = useState<number | "">("");
  const [ingredientQty, setIngredientQty] = useState<number | "">("");
  const [ingredientUnit, setIngredientUnit] = useState<string>("");
  const [ingredientNotes, setIngredientNotes] = useState<string>("");
  const [togglingTradeable, setTogglingTradeable] = useState(false);

  // Labor & Equipment Meta
  const [cleanDesc, setCleanDesc] = useState<string>("");
  const [recipeMeta, setRecipeMeta] = useState<RecipeMetaSpecification>({
    version: 1,
    instructions: "",
    labor: [],
    equipment: [],
  });

  // Resources Master Data for Dropdowns
  const [positions, setPositions] = useState<PositionRecord[]>([]);
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [equipmentList, setEquipmentList] = useState<EquipmentEntityRecord[]>([]);

  // Labor Form (Labor / Employee Type)
  const [selectedPositionId, setSelectedPositionId] = useState<number | "">("");
  const [customEmpRole, setCustomEmpRole] = useState<string>("");
  const [empHours, setEmpHours] = useState<number | "">("");
  const [empRate, setEmpRate] = useState<number | "">("");
  const [empNotes, setEmpNotes] = useState<string>("");

  // Equipment Form
  const [selectedEquipId, setSelectedEquipId] = useState<number | "">("");
  const [customEquipName, setCustomEquipName] = useState<string>("");
  const [equipHours, setEquipHours] = useState<number | "">("");
  const [equipRate, setEquipRate] = useState<number | "">("");
  const [equipNotes, setEquipNotes] = useState<string>("");

  // Instructions State
  const [instructions, setInstructions] = useState<string>("");
  const [savingMeta, setSavingMeta] = useState(false);

  const loadData = useCallback(async () => {
    if (!product) return;
    setLoading(true);
    setError(null);
    try {
      const [recipeRes, prodRes, posRes, empRes, equipRes] = await Promise.all([
        productApi.getRecipeByProduct(product.id),
        productApi.getProducts({ limit: 300 }),
        employeeApi.listPositions().catch(() => ({ items: [] })),
        employeeApi.listEmployees({ limit: 100 }).catch(() => ({ items: [] })),
        equipmentApi.listEquipment({ limit: 100 }).catch(() => ({ items: [] })),
      ]);

      setRecipes(recipeRes.data || []);
      setAllProducts(prodRes.data || []);
      setPositions(posRes.items || []);
      setEmployees(empRes.items || []);
      setEquipmentList(equipRes.items || []);

      const { cleanDescription, meta } = parseRecipeMeta(product.description);
      setCleanDesc(cleanDescription);
      setRecipeMeta(meta);
      setInstructions(meta.instructions || "");
    } catch (err: any) {
      console.error("Failed to load recipe data", err);
      setError(err?.message || "Failed to load recipe data");
    } finally {
      setLoading(false);
    }
  }, [product]);

  useEffect(() => {
    if (isOpen && product) {
      loadData();
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
      setSuccessMsg(null);
      setError(null);
    }
  }, [isOpen, product, loadData]);

  // Live Recipe COGS Calculations
  const productPriceMap = useMemo(() => {
    return new Map(allProducts.map((p) => [p.id, p]));
  }, [allProducts]);

  const liveMaterialCogs = useMemo(() => {
    return recipes.reduce((sum, r) => {
      const fallbackProd = productPriceMap.get(r.ingredientProductId);
      const unitCost = Number(
        r.ingredient?.unitCost ??
        r.ingredient?.retailPrice ??
        fallbackProd?.retailPrice ??
        0
      );
      return sum + (Number(r.quantity) * unitCost);
    }, 0);
  }, [recipes, productPriceMap]);

  const liveLaborCost = useMemo(() => {
    return (recipeMeta.labor || []).reduce((sum, l) => sum + ((l.hours || 0) * (l.hourlyRate || 0)), 0);
  }, [recipeMeta.labor]);

  const liveEquipCost = useMemo(() => {
    return (recipeMeta.equipment || []).reduce((sum, eq) => sum + ((eq.hours || 0) * (eq.hourlyRate || 0)), 0);
  }, [recipeMeta.equipment]);

  const liveTotalCogs = liveMaterialCogs + liveLaborCost + liveEquipCost;
  const liveRetailPrice = Number(product?.retailPrice || 0);
  const liveGrossProfit = liveRetailPrice - liveTotalCogs;
  const liveMarginPercent = liveRetailPrice > 0 ? (liveGrossProfit / liveRetailPrice) * 100 : 0;

  const totalLaborHours = useMemo(() => {
    return (recipeMeta.labor || []).reduce((sum, l) => sum + (l.hours || 0), 0);
  }, [recipeMeta.labor]);

  const totalEquipHours = useMemo(() => {
    return (recipeMeta.equipment || []).reduce((sum, eq) => sum + (eq.hours || 0), 0);
  }, [recipeMeta.equipment]);

  const handleToggleTradeable = async () => {
    if (!product) return;
    const current = product.isTradeable !== false;
    const nextVal = !current;
    setTogglingTradeable(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await productApi.updateProduct({
        id: product.id,
        isTradeable: nextVal,
      });
      product.isTradeable = nextVal;
      setSuccessMsg(
        nextVal
          ? "Product is now Tradeable and visible in the POS register!"
          : "Product is now Formula-only (hidden from POS register)."
      );
      onUpdated?.();
    } catch (err: any) {
      console.error("Failed to toggle tradeable status", err);
      setError(err?.message || "Failed to toggle tradeable status");
    } finally {
      setTogglingTradeable(false);
    }
  };

  // When selecting an ingredient product, auto-fill unit
  const handleSelectIngredient = (id: number | "") => {
    setSelectedIngredientId(id);
    if (id) {
      const found = allProducts.find((p) => p.id === Number(id));
      if (found && found.unitLabel) {
        setIngredientUnit(found.unitLabel);
      }
    }
  };

  // Add Material Ingredient
  const handleAddIngredient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product || !selectedIngredientId || !ingredientQty) return;

    setSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await productApi.createRecipeItem({
        productId: product.id,
        ingredientProductId: Number(selectedIngredientId),
        quantity: Number(ingredientQty),
        unitLabel: ingredientUnit.trim() || undefined,
        notes: ingredientNotes.trim() || undefined,
      });

      setSuccessMsg("Material ingredient added successfully!");
      setSelectedIngredientId("");
      setIngredientQty("");
      setIngredientUnit("");
      setIngredientNotes("");
      await loadData();
      onUpdated?.();
    } catch (err: any) {
      console.error("Failed to add ingredient", err);
      setError(err?.message || "Failed to add ingredient to formula");
    } finally {
      setSaving(false);
    }
  };

  // Remove Material Ingredient
  const handleDeleteIngredient = async (id: number) => {
    if (!confirm("Are you sure you want to remove this ingredient from the formula?")) return;

    setSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await productApi.deleteRecipeItem(id);
      setSuccessMsg("Ingredient removed.");
      await loadData();
      onUpdated?.();
    } catch (err: any) {
      console.error("Failed to remove recipe item", err);
      setError(err?.message || "Failed to remove formula ingredient");
    } finally {
      setSaving(false);
    }
  };

  // Save Meta Helper
  const saveUpdatedMeta = async (updatedMeta: RecipeMetaSpecification) => {
    if (!product) return;
    setSavingMeta(true);
    setError(null);
    try {
      const serialized = encodeRecipeMeta(cleanDesc, updatedMeta);
      await productApi.updateProduct({
        id: product.id,
        description: serialized,
      });
      product.description = serialized;
      setRecipeMeta(updatedMeta);
      setSuccessMsg("Formula specifications updated successfully!");
      onUpdated?.();
    } catch (err: any) {
      console.error("Failed to save formula specification", err);
      setError(err?.message || "Failed to save formula labor/equipment metadata");
    } finally {
      setSavingMeta(false);
    }
  };

  // Add Labor Row (Employee Type / Role)
  const handleAddLabor = async (e: React.FormEvent) => {
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
      setError("Please select an employee type (role/position) or enter a custom labor role.");
      return;
    }

    const newLaborItem: EmployeeLaborItem = {
      id: "lab_" + Date.now(),
      positionId: posId,
      roleOrName: roleName,
      hours: Number(empHours),
      hourlyRate: empRate ? Number(empRate) : undefined,
      notes: empNotes.trim() || undefined,
    };

    const nextMeta: RecipeMetaSpecification = {
      ...recipeMeta,
      instructions,
      labor: [...recipeMeta.labor, newLaborItem],
    };

    await saveUpdatedMeta(nextMeta);
    setSelectedPositionId("");
    setCustomEmpRole("");
    setEmpHours("");
    setEmpRate("");
    setEmpNotes("");
  };

  // Remove Labor Row
  const handleDeleteLabor = async (laborId: string) => {
    const nextMeta: RecipeMetaSpecification = {
      ...recipeMeta,
      instructions,
      labor: recipeMeta.labor.filter((l) => l.id !== laborId),
    };
    await saveUpdatedMeta(nextMeta);
  };

  // Add Equipment Row
  const handleAddEquipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!equipHours || Number(equipHours) <= 0) return;

    let eqName = customEquipName.trim();
    let equipId: number | undefined;

    if (selectedEquipId) {
      equipId = Number(selectedEquipId);
      const found = equipmentList.find((eq) => eq.id === equipId);
      eqName = found ? found.name : `Equipment #${equipId}`;
    }

    if (!eqName) {
      setError("Please select or enter an equipment / machinery name.");
      return;
    }

    const newEquipItem: EquipmentUsageItem = {
      id: "eq_" + Date.now(),
      equipmentId: equipId,
      equipmentName: eqName,
      hours: Number(equipHours),
      hourlyRate: equipRate ? Number(equipRate) : undefined,
      notes: equipNotes.trim() || undefined,
    };

    const nextMeta: RecipeMetaSpecification = {
      ...recipeMeta,
      instructions,
      equipment: [...recipeMeta.equipment, newEquipItem],
    };

    await saveUpdatedMeta(nextMeta);
    setSelectedEquipId("");
    setCustomEquipName("");
    setEquipHours("");
    setEquipRate("");
    setEquipNotes("");
  };

  // Remove Equipment Row
  const handleDeleteEquipment = async (equipId: string) => {
    const nextMeta: RecipeMetaSpecification = {
      ...recipeMeta,
      instructions,
      equipment: recipeMeta.equipment.filter((eq) => eq.id !== equipId),
    };
    await saveUpdatedMeta(nextMeta);
  };

  // Save Instructions
  const handleSaveInstructions = async () => {
    const nextMeta: RecipeMetaSpecification = {
      ...recipeMeta,
      instructions,
    };
    await saveUpdatedMeta(nextMeta);
  };

  if (!isOpen || !product) return null;

  // Filter available ingredients
  const alreadyAddedIds = new Set(recipes.map((r) => r.ingredientProductId));
  const availableIngredients = allProducts.filter(
    (p) => p.id !== product.id && !alreadyAddedIds.has(p.id)
  );



  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "1rem",
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
          backgroundColor: "var(--surface)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "0 20px 40px -15px rgba(0,0,0,0.5)",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <span style={{ fontSize: "1.5rem" }}>🧪</span>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 700 }}>Comprehensive Product Formulas</h3>
            </div>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "0.3rem" }}>
              Bill of Materials for <strong>{product.productName}</strong> ({product.sku || `#${product.id}`}) — Raw materials, employee labor hours, and equipment runtimes
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} style={{ fontSize: "1.1rem", padding: "0.2rem 0.5rem" }}>
            ✕
          </Button>
        </div>

        {/* POS Tradeable Status & Toggle */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0.85rem 1.1rem",
            backgroundColor: product.isTradeable !== false ? "rgba(16, 185, 129, 0.08)" : "rgba(148, 163, 184, 0.08)",
            border: "1px solid " + (product.isTradeable !== false ? "rgba(16, 185, 129, 0.3)" : "rgba(148, 163, 184, 0.3)"),
            borderRadius: "var(--radius-md)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{ fontSize: "1.3rem" }}>{product.isTradeable !== false ? "🛒" : "📦"}</span>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>
                  {product.isTradeable !== false ? "Tradeable in POS" : "Formula / Ingredient Only"}
                </span>
                <Badge variant={product.isTradeable !== false ? "success" : "default"}>
                  {product.isTradeable !== false ? "Visible in POS register" : "Hidden from POS register"}
                </Badge>
              </div>
              <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.15rem" }}>
                {product.isTradeable !== false
                  ? "Customers can directly order this formula product at the checkout terminal."
                  : "Internal formula or semi-finished component. Hidden from sales catalog."}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant={product.isTradeable !== false ? "secondary" : "primary"}
            onClick={handleToggleTradeable}
            disabled={togglingTradeable}
            style={{ flexShrink: 0 }}
          >
            {togglingTradeable ? "Updating..." : product.isTradeable !== false ? "Set as Formula Only" : "Make Tradeable in POS"}
          </Button>
        </div>

        {/* Summary Counter Bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            padding: "0.5rem 0.85rem",
            backgroundColor: "#111622",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            fontSize: "0.825rem",
            color: "var(--text-secondary)",
          }}
        >
          <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>BOM Breakdown:</span>
          <span>🌾 <strong>{recipes.length}</strong> Materials</span>
          <span>•</span>
          <span>👔 <strong>{recipeMeta.labor.length}</strong> Employee Types ({totalLaborHours}h)</span>
          <span>•</span>
          <span>🚜 <strong>{recipeMeta.equipment.length}</strong> Machines ({totalEquipHours}h)</span>
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

        {successMsg && (
          <div
            style={{
              padding: "0.75rem 1rem",
              backgroundColor: "rgba(16, 185, 129, 0.1)",
              border: "1px solid #10b981",
              color: "#10b981",
              borderRadius: "var(--radius-md)",
              fontSize: "0.85rem",
            }}
          >
            {successMsg}
          </div>
        )}

        {/* SECTION 1: INGREDIENTS */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div
              style={{
                padding: "0.75rem 1rem",
                backgroundColor: "rgba(99, 102, 241, 0.08)",
                border: "1px solid rgba(99, 102, 241, 0.2)",
                borderRadius: "var(--radius-md)",
                fontSize: "0.825rem",
                color: "var(--text-secondary)",
                lineHeight: 1.45,
              }}
            >
              💡 <strong>Automatic Recursive Stock Deduction:</strong> Whenever this product is sold in POS, these material ingredients are deducted from real-time stock. If an ingredient itself has a formula (e.g. Espresso in a Cappuccino), its nested components are also deducted automatically.
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              <h4 style={{ fontSize: "0.95rem", fontWeight: 600 }}>Constituent Ingredients ({recipes.length})</h4>
              {loading ? (
                <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>Loading formula ingredients...</p>
              ) : recipes.length === 0 ? (
                <div
                  style={{
                    padding: "1.5rem",
                    textAlign: "center",
                    backgroundColor: "var(--surface-muted, rgba(255,255,255,0.02))",
                    borderRadius: "var(--radius-md)",
                    border: "1px dashed var(--border-subtle)",
                    color: "var(--text-muted)",
                    fontSize: "0.875rem",
                  }}
                >
                  No material ingredients added yet. Add raw materials below.
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--border-subtle)", color: "var(--text-muted)", fontSize: "0.8rem" }}>
                        <th style={{ padding: "0.6rem 0" }}>INGREDIENT</th>
                        <th>QTY REQUIRED</th>
                        <th>UNIT</th>
                        <th>UNIT COST</th>
                        <th>LINE COGS</th>
                        <th>IN STOCK</th>
                        <th>NOTES</th>
                        <th style={{ textAlign: "right" }}>ACTION</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recipes.map((r) => {
                        const ingStock = Number(r.ingredient?.currentStock ?? 0);
                        return (
                          <tr key={r.id} style={{ borderBottom: "1px solid var(--border-subtle)", fontSize: "0.875rem" }}>
                            <td style={{ padding: "0.65rem 0", fontWeight: 600 }}>
                              <div>{r.ingredient?.productName || `Product #${r.ingredientProductId}`}</div>
                              {r.ingredient?.sku && (
                                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{r.ingredient.sku}</span>
                              )}
                            </td>
                            <td style={{ fontWeight: 700, color: "var(--primary)" }}>{Number(r.quantity)}</td>
                            <td>
                              <Badge variant="info">{r.unitLabel || r.unit?.abbr || r.ingredient?.unitLabel || "unit"}</Badge>
                            </td>
                            <td style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>
                              {(() => {
                                const fallbackProd = productPriceMap.get(r.ingredientProductId);
                                const rUnitCost = Number(r.ingredient?.unitCost ?? r.ingredient?.retailPrice ?? fallbackProd?.retailPrice ?? 0);
                                return rUnitCost > 0 ? `${formatIDR(rUnitCost)} / ${r.unitLabel || "unit"}` : "-";
                              })()}
                            </td>
                            <td style={{ fontWeight: 700, color: "var(--accent-amber)", fontSize: "0.85rem" }}>
                              {(() => {
                                const fallbackProd = productPriceMap.get(r.ingredientProductId);
                                const rUnitCost = Number(r.ingredient?.unitCost ?? r.ingredient?.retailPrice ?? fallbackProd?.retailPrice ?? 0);
                                return formatIDR(Number(r.quantity) * rUnitCost);
                              })()}
                            </td>
                            <td>
                              <span
                                style={{
                                  fontSize: "0.85rem",
                                  fontWeight: 600,
                                  color: ingStock < Number(r.quantity) ? "var(--accent-rose)" : "var(--text-primary)",
                                }}
                              >
                                {ingStock} {r.unitLabel || r.ingredient?.unitLabel || ""}
                              </span>
                            </td>
                            <td style={{ color: "var(--text-muted)", fontSize: "0.8rem", maxWidth: "160px" }}>
                              {r.notes || "—"}
                            </td>
                            <td style={{ textAlign: "right" }}>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteIngredient(r.id)}
                                disabled={saving}
                                style={{ color: "var(--accent-rose)", fontSize: "0.75rem", padding: "0.2rem 0.5rem" }}
                              >
                                ✕ Remove
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Add Ingredient Form */}
            <form
              onSubmit={handleAddIngredient}
              style={{
                marginTop: "0.5rem",
                padding: "1rem",
                backgroundColor: "var(--bg-surface)",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-subtle)",
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
              }}
            >
              <h4 style={{ fontSize: "0.9rem", fontWeight: 600 }}>+ Add Material Ingredient</h4>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "0.3rem" }}>
                    Select Ingredient Product *
                  </label>
                  <select
                    value={selectedIngredientId}
                    onChange={(e) => handleSelectIngredient(e.target.value === "" ? "" : Number(e.target.value))}
                    required
                    style={{
                      width: "100%",
                      padding: "0.55rem 0.75rem",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--border-subtle)",
                      backgroundColor: "#111622",
                      color: "#f8fafc",
                      fontSize: "0.875rem",
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
                  <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "0.3rem" }}>
                    Quantity Needed *
                  </label>
                  <Input
                    type="number"
                    step="any"
                    min="0.0001"
                    placeholder="e.g. 8 or 120"
                    value={ingredientQty}
                    onChange={(e) => setIngredientQty(e.target.value === "" ? "" : Number(e.target.value))}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "0.3rem" }}>
                    Unit Label
                  </label>
                  <Input
                    placeholder="e.g. g, ml, shot"
                    value={ingredientUnit}
                    onChange={(e) => setIngredientUnit(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-end" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "0.3rem" }}>
                    Usage Notes (Optional)
                  </label>
                  <Input
                    placeholder="e.g. Freshly ground roast beans, steamed whole milk"
                    value={ingredientNotes}
                    onChange={(e) => setIngredientNotes(e.target.value)}
                  />
                </div>

                <Button
                  type="submit"
                  size="md"
                  disabled={saving || !selectedIngredientId || !ingredientQty}
                  style={{ flexShrink: 0 }}
                >
                  {saving ? "Adding..." : "+ Add to Formula"}
                </Button>
              </div>
            </form>
          </div>

        {/* SECTION 2: EMPLOYEE LABOR */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div
              style={{
                padding: "0.75rem 1rem",
                backgroundColor: "rgba(16, 185, 129, 0.08)",
                border: "1px solid rgba(16, 185, 129, 0.25)",
                borderRadius: "var(--radius-md)",
                fontSize: "0.825rem",
                color: "var(--text-secondary)",
                lineHeight: 1.45,
              }}
            >
              👔 <strong>Labor & Working Hours:</strong> Track required preparation or production time for employee types, positions, or roles. Total planned labor for this formula: <strong>{totalLaborHours} hour{totalLaborHours !== 1 ? "s" : ""}</strong>.
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              <h4 style={{ fontSize: "0.95rem", fontWeight: 600 }}>Planned Employee Type Labor Lines ({recipeMeta.labor.length})</h4>
              {recipeMeta.labor.length === 0 ? (
                <div
                  style={{
                    padding: "1.5rem",
                    textAlign: "center",
                    backgroundColor: "var(--surface-muted, rgba(255,255,255,0.02))",
                    borderRadius: "var(--radius-md)",
                    border: "1px dashed var(--border-subtle)",
                    color: "var(--text-muted)",
                    fontSize: "0.875rem",
                  }}
                >
                  No employee type working hours recorded for this formula yet.
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--border-subtle)", color: "var(--text-muted)", fontSize: "0.8rem" }}>
                        <th style={{ padding: "0.6rem 0" }}>EMPLOYEE TYPE / ROLE</th>
                        <th>WORKING HOURS</th>
                        <th>EST. HOURLY RATE</th>
                        <th>NOTES</th>
                        <th style={{ textAlign: "right" }}>ACTION</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recipeMeta.labor.map((l) => (
                        <tr key={l.id} style={{ borderBottom: "1px solid var(--border-subtle)", fontSize: "0.875rem" }}>
                          <td style={{ padding: "0.65rem 0", fontWeight: 600 }}>
                            <div style={{ color: "var(--text-primary)" }}>{l.roleOrName}</div>
                          </td>
                          <td style={{ fontWeight: 700, color: "var(--accent-emerald)" }}>
                            ⏱️ {l.hours} hr{l.hours !== 1 ? "s" : ""}
                          </td>
                          <td>
                            {l.hourlyRate ? `Rp ${l.hourlyRate.toLocaleString("id-ID")}/hr` : "—"}
                          </td>
                          <td style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
                            {l.notes || "—"}
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteLabor(l.id)}
                              disabled={savingMeta}
                              style={{ color: "var(--accent-rose)", fontSize: "0.75rem", padding: "0.2rem 0.5rem" }}
                            >
                              ✕ Remove
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Add Labor Form */}
            <form
              onSubmit={handleAddLabor}
              style={{
                marginTop: "0.5rem",
                padding: "1rem",
                backgroundColor: "var(--bg-surface)",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-subtle)",
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
              }}
            >
              <h4 style={{ fontSize: "0.9rem", fontWeight: 600 }}>+ Add Employee Type Working Hours</h4>
              <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1.2fr 1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "0.3rem" }}>
                    Select Employee Type (Position / Role)
                  </label>
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
                      fontSize: "0.875rem",
                      outline: "none",
                    }}
                  >
                    <option value="" style={{ backgroundColor: "#111622", color: "#f8fafc" }}>
                      -- Choose employee type / position --
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
                  <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "0.3rem" }}>
                    Or Custom Role / Type Title
                  </label>
                  <Input
                    placeholder="e.g. Head Barista / Pastry Chef"
                    value={customEmpRole}
                    onChange={(e) => {
                      setCustomEmpRole(e.target.value);
                      if (e.target.value) setSelectedPositionId("");
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "0.3rem" }}>
                    Working Hours *
                  </label>
                  <Input
                    type="number"
                    step="0.05"
                    min="0.01"
                    placeholder="e.g. 0.25 or 1.5"
                    value={empHours}
                    onChange={(e) => setEmpHours(e.target.value === "" ? "" : Number(e.target.value))}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "0.3rem" }}>
                    Est. Rate / Hr (IDR)
                  </label>
                  <Input
                    type="number"
                    placeholder="e.g. 50000"
                    value={empRate}
                    onChange={(e) => setEmpRate(e.target.value === "" ? "" : Number(e.target.value))}
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-end" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "0.3rem" }}>
                    Task / Operation Notes (Optional)
                  </label>
                  <Input
                    placeholder="e.g. Dialing espresso grind, milk frothing & latte art pouring"
                    value={empNotes}
                    onChange={(e) => setEmpNotes(e.target.value)}
                  />
                </div>

                <Button
                  type="submit"
                  size="md"
                  disabled={savingMeta || !empHours}
                  style={{ flexShrink: 0 }}
                >
                  {savingMeta ? "Saving..." : "+ Record Labor"}
                </Button>
              </div>
            </form>
          </div>

        {/* SECTION 3: EQUIPMENT */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div
              style={{
                padding: "0.75rem 1rem",
                backgroundColor: "rgba(245, 158, 11, 0.08)",
                border: "1px solid rgba(245, 158, 11, 0.25)",
                borderRadius: "var(--radius-md)",
                fontSize: "0.825rem",
                color: "var(--text-secondary)",
                lineHeight: 1.45,
              }}
            >
              🚜 <strong>Equipment & Machinery Usage:</strong> Assign required machinery runtimes (espresso machines, grinders, ovens, mixers) necessary to produce this formula. Total machine runtime: <strong>{totalEquipHours} hour{totalEquipHours !== 1 ? "s" : ""}</strong>.
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              <h4 style={{ fontSize: "0.95rem", fontWeight: 600 }}>Assigned Equipment & Machinery ({recipeMeta.equipment.length})</h4>
              {recipeMeta.equipment.length === 0 ? (
                <div
                  style={{
                    padding: "1.5rem",
                    textAlign: "center",
                    backgroundColor: "var(--surface-muted, rgba(255,255,255,0.02))",
                    borderRadius: "var(--radius-md)",
                    border: "1px dashed var(--border-subtle)",
                    color: "var(--text-muted)",
                    fontSize: "0.875rem",
                  }}
                >
                  No machinery runtime configured for this formula yet.
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--border-subtle)", color: "var(--text-muted)", fontSize: "0.8rem" }}>
                        <th style={{ padding: "0.6rem 0" }}>EQUIPMENT / MACHINERY</th>
                        <th>RUNTIME</th>
                        <th>DEPRECIATION / RUN COST</th>
                        <th>NOTES</th>
                        <th style={{ textAlign: "right" }}>ACTION</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recipeMeta.equipment.map((eq) => (
                        <tr key={eq.id} style={{ borderBottom: "1px solid var(--border-subtle)", fontSize: "0.875rem" }}>
                          <td style={{ padding: "0.65rem 0", fontWeight: 600 }}>
                            <div style={{ color: "var(--text-primary)" }}>{eq.equipmentName}</div>
                          </td>
                          <td style={{ fontWeight: 700, color: "var(--accent-amber)" }}>
                            ⚙️ {eq.hours} hr{eq.hours !== 1 ? "s" : ""}
                          </td>
                          <td>
                            {eq.hourlyRate ? `Rp ${eq.hourlyRate.toLocaleString("id-ID")}/hr` : "—"}
                          </td>
                          <td style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
                            {eq.notes || "—"}
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteEquipment(eq.id)}
                              disabled={savingMeta}
                              style={{ color: "var(--accent-rose)", fontSize: "0.75rem", padding: "0.2rem 0.5rem" }}
                            >
                              ✕ Remove
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Add Equipment Form */}
            <form
              onSubmit={handleAddEquipment}
              style={{
                marginTop: "0.5rem",
                padding: "1rem",
                backgroundColor: "var(--bg-surface)",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-subtle)",
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
              }}
            >
              <h4 style={{ fontSize: "0.9rem", fontWeight: 600 }}>+ Add Equipment Runtime</h4>
              <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1.2fr 1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "0.3rem" }}>
                    Select Machinery Asset
                  </label>
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
                      fontSize: "0.875rem",
                      outline: "none",
                    }}
                  >
                    <option value="" style={{ backgroundColor: "#111622", color: "#f8fafc" }}>
                      -- Choose equipment asset --
                    </option>
                    {equipmentList.map((eq) => (
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
                  <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "0.3rem" }}>
                    Or Custom Equipment Name
                  </label>
                  <Input
                    placeholder="e.g. Commercial Espresso Group 2 / Convection Oven"
                    value={customEquipName}
                    onChange={(e) => {
                      setCustomEquipName(e.target.value);
                      if (e.target.value) setSelectedEquipId("");
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "0.3rem" }}>
                    Runtime (Hours) *
                  </label>
                  <Input
                    type="number"
                    step="0.05"
                    min="0.01"
                    placeholder="e.g. 0.1 or 0.5"
                    value={equipHours}
                    onChange={(e) => setEquipHours(e.target.value === "" ? "" : Number(e.target.value))}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "0.3rem" }}>
                    Est. Cost / Hr (IDR)
                  </label>
                  <Input
                    type="number"
                    placeholder="e.g. 25000"
                    value={equipRate}
                    onChange={(e) => setEquipRate(e.target.value === "" ? "" : Number(e.target.value))}
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-end" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "0.3rem" }}>
                    Machine Operating Notes (Optional)
                  </label>
                  <Input
                    placeholder="e.g. 9 bar extraction pressure, steam wand sanitation cycle"
                    value={equipNotes}
                    onChange={(e) => setEquipNotes(e.target.value)}
                  />
                </div>

                <Button
                  type="submit"
                  size="md"
                  disabled={savingMeta || !equipHours}
                  style={{ flexShrink: 0 }}
                >
                  {savingMeta ? "Saving..." : "+ Record Equipment"}
                </Button>
              </div>
            </form>
          </div>

        {/* Preparation Instructions / Recipe Method */}
        <div
          style={{
            marginTop: "0.5rem",
            padding: "1rem",
            backgroundColor: "var(--bg-surface-elevated)",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border-subtle)",
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)" }}>
              📝 Preparation Method & Standard Operating Procedure (SOP)
            </label>
            <Button
              size="sm"
              variant="secondary"
              onClick={handleSaveInstructions}
              disabled={savingMeta}
            >
              {savingMeta ? "Saving..." : "Save Instructions"}
            </Button>
          </div>
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Step-by-step preparation notes, heating temperature, mixing ratios, etc..."
            rows={3}
            style={{
              width: "100%",
              padding: "0.6rem 0.75rem",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-subtle)",
              backgroundColor: "var(--surface)",
              color: "var(--text-primary)",
              fontSize: "0.875rem",
              fontFamily: "inherit",
              resize: "vertical",
            }}
          />
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.5rem" }}>
          <Button variant="secondary" onClick={onClose}>
            Done / Close
          </Button>
        </div>
      </Card>
    </div>
  );
}
