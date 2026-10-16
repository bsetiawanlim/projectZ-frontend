"use client";

import React, { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { parseRecipeMeta } from "@/components/products/ProductRecipeModal";
import { formatIDR, type ProductItem, type ProductRecipeItem } from "@pz/shared";

interface ViewFormulaModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: ProductItem | null;
  recipes: ProductRecipeItem[];
  productMap?: Map<number, ProductItem>;
  onProduceBatch?: (product: ProductItem) => void;
}

export function ViewFormulaModal({
  isOpen,
  onClose,
  product,
  recipes,
  productMap,
  onProduceBatch,
}: ViewFormulaModalProps) {
  // Interactive Multiplier Slider State
  const [multiplier, setMultiplier] = useState<number>(1);

  const { cleanDescription, meta } = useMemo(() => {
    if (!product) {
      return { cleanDescription: "", meta: { version: 1, instructions: "", labor: [], equipment: [] } };
    }
    return parseRecipeMeta(product.description);
  }, [product]);

  // Parse instructions into individual numbered steps
  const steps = useMemo(() => {
    if (!meta.instructions || !meta.instructions.trim()) return [];

    const raw = meta.instructions.trim();
    const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

    const parsedSteps: { stepNumber: number; text: string }[] = [];
    let currentStepNumber = 1;

    for (const line of lines) {
      const match = line.match(/^(?:(?:Step\s*)?(\d+)[\.\:\-\)]\s*)(.*)$/i);
      if (match) {
        parsedSteps.push({
          stepNumber: parseInt(match[1] || "1", 10),
          text: (match[2] || "").trim(),
        });
        currentStepNumber = parseInt(match[1] || "1", 10) + 1;
      } else {
        parsedSteps.push({
          stepNumber: currentStepNumber++,
          text: line,
        });
      }
    }

    return parsedSteps;
  }, [meta.instructions]);

  // Compute total labor & equipment runtimes (unscaled base)
  const baseLaborHours = useMemo(() => {
    return (meta.labor || []).reduce((sum, l) => sum + (l.hours || 0), 0);
  }, [meta.labor]);

  const baseEquipHours = useMemo(() => {
    return (meta.equipment || []).reduce((sum, eq) => sum + (eq.hours || 0), 0);
  }, [meta.equipment]);

  // Ingredient Costs & Raw Material BOM COGS (scaled by multiplier)
  const ingredientCosts = useMemo(() => {
    return recipes.map((r) => {
      const fallbackProd = productMap?.get(r.ingredientProductId);
      const unitCost = Number(
        r.ingredient?.unitCost ??
        r.ingredient?.retailPrice ??
        fallbackProd?.retailPrice ??
        0
      );
      const baseQty = Number(r.quantity);
      const scaledQty = baseQty * multiplier;
      const lineCost = scaledQty * unitCost;
      const currentStock = r.ingredient?.currentStock ?? fallbackProd?.currentStock ?? null;
      return {
        ...r,
        baseQty,
        scaledQty,
        unitCost,
        lineCost,
        currentStock,
      };
    });
  }, [recipes, productMap, multiplier]);

  const materialCogs = useMemo(() => {
    return ingredientCosts.reduce((sum, item) => sum + item.lineCost, 0);
  }, [ingredientCosts]);

  // Labor Costs (scaled)
  const laborCosts = useMemo(() => {
    return (meta.labor || []).map((l) => {
      const rate = l.hourlyRate ?? 0;
      const scaledHours = (l.hours || 0) * multiplier;
      const cost = scaledHours * rate;
      return { ...l, rate, scaledHours, cost };
    });
  }, [meta.labor, multiplier]);

  const totalLaborCost = useMemo(() => {
    return laborCosts.reduce((sum, l) => sum + l.cost, 0);
  }, [laborCosts]);

  // Equipment Costs (scaled)
  const equipmentCosts = useMemo(() => {
    return (meta.equipment || []).map((eq) => {
      const rate = eq.hourlyRate ?? 0;
      const scaledHours = (eq.hours || 0) * multiplier;
      const cost = scaledHours * rate;
      return { ...eq, rate, scaledHours, cost };
    });
  }, [meta.equipment, multiplier]);

  const totalEquipCost = useMemo(() => {
    return equipmentCosts.reduce((sum, eq) => sum + eq.cost, 0);
  }, [equipmentCosts]);

  // Total Production COGS & Financial Margins
  const totalCogs = materialCogs + totalLaborCost + totalEquipCost;
  const baseRetailPrice = Number(product?.retailPrice || 0);
  const totalRetailPrice = baseRetailPrice * multiplier;
  const grossProfit = totalRetailPrice - totalCogs;
  const grossMarginPercent = totalRetailPrice > 0 ? (grossProfit / totalRetailPrice) * 100 : 0;
  const foodCostPercent = totalRetailPrice > 0 ? (materialCogs / totalRetailPrice) * 100 : 0;

  if (!isOpen || !product) return null;

  const isTradeable = product.isTradeable !== false;

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
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
          maxWidth: "950px",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem",
          padding: "1.75rem",
          backgroundColor: "var(--surface)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.7)",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
              <span style={{ fontSize: "1.5rem" }}>📖</span>
              <h3 style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--text-primary)" }}>
                {product.productName}
              </h3>
              <Badge variant={isTradeable ? "success" : "default"}>
                {isTradeable ? "🛒 POS Sellable" : "📦 Formula Component"}
              </Badge>
              <Badge variant="info">🔒 Read-Only Kitchen Spec</Badge>
            </div>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "0.35rem" }}>
              {product.category?.categoryName || "General Category"} • SKU: <code>{product.sku || "N/A"}</code> • Retail Price:{" "}
              <strong style={{ color: "var(--accent-emerald)" }}>{formatIDR(product.retailPrice || 0)}</strong> • In-Stock:{" "}
              <strong>{product.currentStock ?? 0} {product.unitLabel || "pcs"}</strong>
            </p>
          </div>

          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            {onProduceBatch && (
              <Button
                id="open-produce-modal-from-view-btn"
                size="sm"
                variant="primary"
                onClick={() => {
                  onClose();
                  onProduceBatch(product);
                }}
                style={{
                  backgroundColor: "var(--accent-emerald)",
                  color: "#000",
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                }}
                title="Open Kitchen Work Order to produce this formula"
              >
                <span>🍳</span>
                <span>Produce Batch</span>
              </Button>
            )}
            <Button size="sm" variant="secondary" onClick={handlePrint} title="Print Recipe Sheet">
              🖨️ Print
            </Button>
            <Button size="sm" variant="ghost" onClick={onClose} style={{ fontSize: "1.2rem", padding: "0.2rem 0.5rem" }}>
              ✕
            </Button>
          </div>
        </div>

        {/* Dynamic Recipe Scaling Multiplier Bar */}
        <div
          style={{
            padding: "0.85rem 1.1rem",
            borderRadius: "var(--radius-md)",
            backgroundColor: "var(--bg-surface-elevated, rgba(255, 255, 255, 0.04))",
            border: "1px solid var(--border-subtle)",
            display: "flex",
            flexDirection: "column",
            gap: "0.6rem",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "1.1rem" }}>⚖️</span>
              <strong style={{ fontSize: "0.9rem", color: "var(--text-primary)" }}>Batch Portions Scaling:</strong>
              <Badge variant={multiplier > 1 ? "info" : "default"}>
                Yield: {multiplier} {product.unitLabel || "serving(s)"} ({multiplier}x Scale)
              </Badge>
            </div>
            <div style={{ display: "flex", gap: "0.35rem" }}>
              {[1, 2, 5, 10, 25, 50].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setMultiplier(preset)}
                  style={{
                    padding: "0.25rem 0.55rem",
                    fontSize: "0.75rem",
                    borderRadius: "var(--radius-sm)",
                    border: multiplier === preset ? "1px solid var(--accent-cyan)" : "1px solid var(--border-subtle)",
                    backgroundColor: multiplier === preset ? "rgba(6, 182, 212, 0.18)" : "transparent",
                    color: multiplier === preset ? "var(--accent-cyan)" : "var(--text-secondary)",
                    fontWeight: multiplier === preset ? 700 : 500,
                    cursor: "pointer",
                  }}
                >
                  {preset}x
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
            <input
              id="recipe-multiplier-range"
              type="range"
              min="1"
              max="100"
              step="1"
              value={multiplier}
              onChange={(e) => setMultiplier(Math.max(1, parseInt(e.target.value, 10) || 1))}
              style={{
                flex: 1,
                cursor: "pointer",
                accentColor: "var(--accent-cyan)",
              }}
            />
            <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
              <input
                id="recipe-multiplier-number"
                type="number"
                min="1"
                max="500"
                value={multiplier}
                onChange={(e) => setMultiplier(Math.max(1, parseInt(e.target.value, 10) || 1))}
                style={{
                  width: "70px",
                  padding: "0.25rem 0.4rem",
                  textAlign: "center",
                  fontSize: "0.85rem",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border-subtle)",
                  backgroundColor: "var(--bg-input, rgba(0,0,0,0.2))",
                  color: "var(--text-primary)",
                  fontWeight: 700,
                }}
              />
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>servings</span>
            </div>
          </div>
        </div>

        {/* Clean Flavor Profile Description */}
        {cleanDescription && (
          <div
            style={{
              padding: "0.85rem 1rem",
              borderRadius: "var(--radius-md)",
              backgroundColor: "rgba(99, 102, 241, 0.08)",
              border: "1px solid rgba(99, 102, 241, 0.2)",
            }}
          >
            <h4 style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--accent-cyan)", marginBottom: "0.25rem" }}>
              ✨ Culinary Description & Flavor Notes
            </h4>
            <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", lineHeight: 1.5, margin: 0 }}>
              {cleanDescription}
            </p>
          </div>
        )}

        {/* Section 1: Step-by-Step Preparation Protocol */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <span style={{ fontSize: "1.2rem" }}>📋</span>
              <h4 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)" }}>
                Step-by-Step Culinary Protocol
              </h4>
            </div>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              {steps.length} {steps.length === 1 ? "Phase" : "Phases"}
            </span>
          </div>

          {steps.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {steps.map((st) => (
                <div
                  key={st.stepNumber}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "0.85rem",
                    padding: "0.75rem 0.9rem",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: "var(--bg-surface-elevated, rgba(255, 255, 255, 0.02))",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  <div
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "50%",
                      backgroundColor: "rgba(99, 102, 241, 0.2)",
                      color: "var(--accent-cyan)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      fontSize: "0.85rem",
                      flexShrink: 0,
                    }}
                  >
                    {st.stepNumber}
                  </div>
                  <div style={{ flex: 1, fontSize: "0.9rem", color: "var(--text-primary)", lineHeight: 1.5 }}>
                    {st.text}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div
              style={{
                padding: "1rem",
                textAlign: "center",
                color: "var(--text-muted)",
                backgroundColor: "var(--bg-surface-elevated, rgba(255, 255, 255, 0.02))",
                borderRadius: "var(--radius-md)",
                fontSize: "0.85rem",
                fontStyle: "italic",
              }}
            >
              No specific step instructions logged yet. Check ingredient quantities below.
            </div>
          )}
        </div>

        {/* Section 2: Bill of Materials (BOM) & Scaled Ingredient Requirements */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <span style={{ fontSize: "1.2rem" }}>🧪</span>
              <h4 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)" }}>
                Bill of Materials / Ingredients ({recipes.length}) {multiplier > 1 && <span style={{ color: "var(--accent-cyan)" }}>• Scaled for {multiplier} units</span>}
              </h4>
            </div>
            <span style={{ fontSize: "0.82rem", color: "var(--accent-cyan)", fontWeight: 600 }}>
              Material Cost: {formatIDR(materialCogs)}
            </span>
          </div>

          {ingredientCosts.length > 0 ? (
            <div
              style={{
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-subtle)",
                overflow: "hidden",
              }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                <thead>
                  <tr style={{ backgroundColor: "var(--bg-surface-elevated, rgba(255,255,255,0.04))", textAlign: "left" }}>
                    <th style={{ padding: "0.65rem 0.85rem", color: "var(--text-secondary)", fontWeight: 600 }}>Ingredient</th>
                    <th style={{ padding: "0.65rem 0.85rem", color: "var(--text-secondary)", fontWeight: 600 }}>Base Qty</th>
                    <th style={{ padding: "0.65rem 0.85rem", color: "var(--text-secondary)", fontWeight: 600 }}>Scaled Needed</th>
                    <th style={{ padding: "0.65rem 0.85rem", color: "var(--text-secondary)", fontWeight: 600 }}>Current Stock</th>
                    <th style={{ padding: "0.65rem 0.85rem", color: "var(--text-secondary)", fontWeight: 600, textAlign: "right" }}>Unit Cost</th>
                    <th style={{ padding: "0.65rem 0.85rem", color: "var(--text-secondary)", fontWeight: 600, textAlign: "right" }}>Line Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {ingredientCosts.map((ing) => {
                    const isShortage = ing.currentStock !== null && ing.currentStock < ing.scaledQty;
                    return (
                      <tr
                        key={ing.id}
                        style={{
                          borderTop: "1px solid var(--border-subtle)",
                          backgroundColor: isShortage ? "rgba(239, 68, 68, 0.05)" : "transparent",
                        }}
                      >
                        <td style={{ padding: "0.65rem 0.85rem", color: "var(--text-primary)", fontWeight: 600 }}>
                          {ing.ingredient?.productName || `Ingredient #${ing.ingredientProductId}`}
                          {ing.ingredient?.sku && (
                            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginLeft: "0.4rem" }}>
                              ({ing.ingredient.sku})
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "0.65rem 0.85rem", color: "var(--text-secondary)" }}>
                          {ing.baseQty} {ing.unitLabel || "unit"}
                        </td>
                        <td style={{ padding: "0.65rem 0.85rem", color: isShortage ? "var(--accent-rose)" : "var(--accent-cyan)", fontWeight: 700 }}>
                          {ing.scaledQty} {ing.unitLabel || "unit"}
                        </td>
                        <td style={{ padding: "0.65rem 0.85rem" }}>
                          {ing.currentStock !== null ? (
                            <span style={{ color: isShortage ? "var(--accent-rose)" : "var(--accent-emerald)", fontWeight: isShortage ? 700 : 500 }}>
                              {ing.currentStock} {ing.unitLabel || ""} {isShortage ? "⚠️ Short" : "✓ In Stock"}
                            </span>
                          ) : (
                            <span style={{ color: "var(--text-muted)" }}>-</span>
                          )}
                        </td>
                        <td style={{ padding: "0.65rem 0.85rem", color: "var(--text-muted)", textAlign: "right" }}>
                          {ing.unitCost > 0 ? formatIDR(ing.unitCost) : "-"}
                        </td>
                        <td style={{ padding: "0.65rem 0.85rem", color: "var(--accent-emerald)", fontWeight: 600, textAlign: "right" }}>
                          {ing.lineCost > 0 ? formatIDR(ing.lineCost) : "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div
              style={{
                padding: "1rem",
                textAlign: "center",
                color: "var(--text-muted)",
                backgroundColor: "var(--bg-surface-elevated, rgba(255, 255, 255, 0.02))",
                borderRadius: "var(--radius-md)",
                fontSize: "0.85rem",
                fontStyle: "italic",
              }}
            >
              No constituent raw materials linked to this recipe.
            </div>
          )}
        </div>

        {/* Section 3 & 4: Labor & Equipment Requirements */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          {/* Labor */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <span style={{ fontSize: "1.1rem" }}>👨‍🍳</span>
                <h4 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)" }}>
                  Staff Labor ({meta.labor?.length || 0})
                </h4>
              </div>
              <span style={{ fontSize: "0.8rem", color: "var(--accent-purple, #a855f7)", fontWeight: 600 }}>
                {formatIDR(totalLaborCost)}
              </span>
            </div>

            {laborCosts.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {laborCosts.map((lb, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: "0.75rem",
                      borderRadius: "var(--radius-md)",
                      backgroundColor: "var(--bg-surface-elevated, rgba(255,255,255,0.03))",
                      border: "1px solid var(--border-subtle)",
                      fontSize: "0.85rem",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <strong style={{ color: "var(--text-primary)" }}>{lb.roleOrName}</strong>
                      <span style={{ color: "var(--accent-purple, #a855f7)", fontWeight: 600 }}>
                        {lb.scaledHours}h (~{Math.round(lb.scaledHours * 60)}m)
                      </span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.25rem", fontSize: "0.8rem" }}>
                      <span style={{ color: "var(--text-secondary)" }}>
                        {lb.rate > 0 ? `@ ${formatIDR(lb.rate)}/hr` : "Standard kitchen rate"}
                      </span>
                      <strong style={{ color: "var(--accent-purple, #a855f7)" }}>
                        {lb.cost > 0 ? formatIDR(lb.cost) : "-"}
                      </strong>
                    </div>
                    {lb.notes && (
                      <p style={{ color: "var(--text-muted)", fontSize: "0.78rem", marginTop: "0.25rem" }}>
                        {lb.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", fontStyle: "italic" }}>
                No specialized staff labor entered.
              </p>
            )}
          </div>

          {/* Equipment */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <span style={{ fontSize: "1.1rem" }}>⚙️</span>
                <h4 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)" }}>
                  Machinery & Equipment ({meta.equipment?.length || 0})
                </h4>
              </div>
              <span style={{ fontSize: "0.8rem", color: "var(--accent-amber)", fontWeight: 600 }}>
                {formatIDR(totalEquipCost)}
              </span>
            </div>

            {equipmentCosts.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {equipmentCosts.map((eq, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: "0.75rem",
                      borderRadius: "var(--radius-md)",
                      backgroundColor: "var(--bg-surface-elevated, rgba(255,255,255,0.03))",
                      border: "1px solid var(--border-subtle)",
                      fontSize: "0.85rem",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <strong style={{ color: "var(--text-primary)" }}>{eq.equipmentName}</strong>
                      <span style={{ color: "var(--accent-amber)", fontWeight: 600 }}>
                        {eq.scaledHours}h (~{Math.round(eq.scaledHours * 60)}m)
                      </span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.25rem", fontSize: "0.8rem" }}>
                      <span style={{ color: "var(--text-secondary)" }}>
                        {eq.rate > 0 ? `@ ${formatIDR(eq.rate)}/hr depreciation` : "Standard depreciation"}
                      </span>
                      <strong style={{ color: "var(--accent-amber)" }}>
                        {eq.cost > 0 ? formatIDR(eq.cost) : "-"}
                      </strong>
                    </div>
                    {eq.notes && (
                      <p style={{ color: "var(--text-muted)", fontSize: "0.78rem", marginTop: "0.25rem" }}>
                        {eq.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", fontStyle: "italic" }}>
                Manual assembly / No machines required.
              </p>
            )}
          </div>
        </div>

        {/* Section 5: Executive Recipe Profitability & Full COGS Summary Card */}
        <div
          style={{
            padding: "1rem 1.25rem",
            borderRadius: "var(--radius-md)",
            backgroundColor: "rgba(16, 185, 129, 0.04)",
            border: "1px solid rgba(16, 185, 129, 0.25)",
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <span style={{ fontSize: "1.2rem" }}>💰</span>
              <h4 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--accent-emerald)" }}>
                Scaled Recipe Financials & COGS Summary ({multiplier}x Yield)
              </h4>
            </div>
            <Badge variant={grossMarginPercent >= 50 ? "success" : "info"}>
              Gross Margin: {grossMarginPercent.toFixed(1)}%
            </Badge>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
              gap: "0.75rem",
              paddingTop: "0.25rem",
            }}
          >
            <div>
              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Scaled Retail</span>
              <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--text-primary)" }}>
                {formatIDR(totalRetailPrice)}
              </div>
              <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>@{formatIDR(baseRetailPrice)}/unit</span>
            </div>

            <div>
              <span style={{ fontSize: "0.72rem", color: "var(--accent-cyan)", textTransform: "uppercase" }}>(-) Material BOM</span>
              <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--accent-cyan)" }}>
                {formatIDR(materialCogs)}
              </div>
              <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                {totalRetailPrice > 0 ? `${foodCostPercent.toFixed(1)}% Food Cost` : "-"}
              </span>
            </div>

            <div>
              <span style={{ fontSize: "0.72rem", color: "var(--accent-purple, #a855f7)", textTransform: "uppercase" }}>(-) Staff Labor</span>
              <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--accent-purple, #a855f7)" }}>
                {formatIDR(totalLaborCost)}
              </div>
              <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                {totalRetailPrice > 0 ? `${((totalLaborCost / totalRetailPrice) * 100).toFixed(1)}% of price` : "-"}
              </span>
            </div>

            <div>
              <span style={{ fontSize: "0.72rem", color: "var(--accent-amber)", textTransform: "uppercase" }}>(-) Machinery</span>
              <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--accent-amber)" }}>
                {formatIDR(totalEquipCost)}
              </div>
              <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                {totalRetailPrice > 0 ? `${((totalEquipCost / totalRetailPrice) * 100).toFixed(1)}% of price` : "-"}
              </span>
            </div>

            <div style={{ borderLeft: "1px solid var(--border-subtle)", paddingLeft: "0.75rem" }}>
              <span style={{ fontSize: "0.72rem", color: "var(--accent-amber)", textTransform: "uppercase", fontWeight: 700 }}>Total COGS</span>
              <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--accent-amber)" }}>
                {formatIDR(totalCogs)}
              </div>
              <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>
                {totalRetailPrice > 0 ? `${((totalCogs / totalRetailPrice) * 100).toFixed(1)}% Cost Ratio` : "-"}
              </span>
            </div>

            <div style={{ borderLeft: "1px solid var(--border-subtle)", paddingLeft: "0.75rem" }}>
              <span style={{ fontSize: "0.72rem", color: "var(--accent-emerald)", textTransform: "uppercase", fontWeight: 700 }}>Net Gross Profit</span>
              <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--accent-emerald)" }}>
                {formatIDR(grossProfit)}
              </div>
              <span style={{ fontSize: "0.7rem", color: "var(--accent-emerald)", fontWeight: 600 }}>
                +{grossMarginPercent.toFixed(1)}% Profit
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: "0.75rem",
            borderTop: "1px solid var(--border-subtle)",
            marginTop: "0.5rem",
          }}
        >
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
            Chrono Production Management • Read-Only Inspection Mode
          </span>
          <Button variant="secondary" size="md" onClick={onClose} style={{ minWidth: "100px" }}>
            Close
          </Button>
        </div>
      </Card>
    </div>
  );
}
