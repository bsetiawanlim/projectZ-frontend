"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SortableTh } from "@/components/ui/SortableTh";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { productApi } from "@/lib/api";
import { CreateRecipeProductModal } from "@/components/recipes/CreateRecipeProductModal";
import { ViewFormulaModal } from "@/components/recipes/ViewFormulaModal";
import { ProduceBatchModal } from "@/components/recipes/ProduceBatchModal";
import { ConfirmBatchModal } from "@/components/recipes/ConfirmBatchModal";
import type { ProductionBatchRecord } from "@pz/shared";
import {
  ProductRecipeModal,
  parseRecipeMeta,
  type RecipeMetaSpecification,
} from "@/components/products/ProductRecipeModal";
import { useAuth } from "@/lib/authContext";
import { useSearchParams } from "next/navigation";
import { formatIDR, type ProductItem, type ProductRecipeItem } from "@pz/shared";

export default function RecipesPage() {
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get("search") || "";

  const { user, canAccess } = useAuth();
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [recipes, setRecipes] = useState<ProductRecipeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(initialSearch);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterTradeable, setFilterTradeable] = useState<string>("all");
  const [selectedProductForRecipe, setSelectedProductForRecipe] = useState<ProductItem | null>(null);
  const [selectedProductForView, setSelectedProductForView] = useState<ProductItem | null>(null);
  const [selectedProductForBatch, setSelectedProductForBatch] = useState<ProductItem | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"formulas" | "batches">("formulas");
  const [batches, setBatches] = useState<ProductionBatchRecord[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [selectedBatchForConfirm, setSelectedBatchForConfirm] = useState<ProductionBatchRecord | null>(null);
  const [batchStatusFilter, setBatchStatusFilter] = useState<string>("all");

  type RecipeSortField = "name" | "sku" | "price" | "cogs" | "margin" | "status" | "bom";
  const [sortField, setSortField] = useState<RecipeSortField>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const handleSort = (field: RecipeSortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };


  const canEdit = Boolean(
    user?.isSuperAdmin || canAccess("product", "update") || canAccess("product", "*")
  );

  const loadBatches = useCallback(async () => {
    setLoadingBatches(true);
    try {
      const res = await productApi.getProductionBatches({ limit: 100 });
      setBatches(res.items || []);
    } catch (err) {
      console.error("Failed to load production batches", err);
    } finally {
      setLoadingBatches(false);
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [prodRes, recipeRes] = await Promise.all([
        productApi.getProducts({ limit: 150 }),
        productApi.getAllRecipes({ limit: 500 }).catch(() => ({ items: [] })),
      ]);

      setProducts(prodRes.data || []);
      setRecipes(recipeRes.items || []);
      loadBatches();
    } catch (err) {
      console.error("Failed to load recipes data", err);
    } finally {
      setLoading(false);
    }
  }, [loadBatches]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const q = searchParams.get("search");
    if (q !== null) {
      setSearch(q);
    }
  }, [searchParams]);

  // Map each product to its recipe ingredients
  const recipeMap = useMemo(() => {
    const map = new Map<number, ProductRecipeItem[]>();
    recipes.forEach((r) => {
      const existing = map.get(r.productId) || [];
      existing.push(r);
      map.set(r.productId, existing);
    });
    return map;
  }, [recipes]);

  // Map all products by ID for fast pricing & cost lookups
  const productMap = useMemo(() => {
    return new Map(products.map((p) => [p.id, p]));
  }, [products]);

  // Compute full COGS (Materials BOM + Labor + Equipment) for any formula product
  const getProductCogs = useCallback((p: ProductItem) => {
    const pRecipes = recipeMap.get(p.id) || [];
    const materialCogs = pRecipes.reduce((sum, r) => {
      const fallbackProd = productMap.get(r.ingredientProductId);
      const unitCost = Number(
        r.ingredient?.unitCost ??
        r.ingredient?.retailPrice ??
        fallbackProd?.retailPrice ??
        0
      );
      return sum + (Number(r.quantity) * unitCost);
    }, 0);

    const { meta } = parseRecipeMeta(p.description);
    const laborCost = (meta.labor || []).reduce((sum, l) => sum + ((l.hours || 0) * (l.hourlyRate || 0)), 0);
    const equipCost = (meta.equipment || []).reduce((sum, eq) => sum + ((eq.hours || 0) * (eq.hourlyRate || 0)), 0);

    const totalCogs = materialCogs + laborCost + equipCost;
    const retailPrice = Number(p.retailPrice || 0);
    const grossProfit = retailPrice - totalCogs;
    const marginPercent = retailPrice > 0 ? (grossProfit / retailPrice) * 100 : 0;
    const foodCostPercent = retailPrice > 0 ? (materialCogs / retailPrice) * 100 : 0;

    return {
      materialCogs,
      laborCost,
      equipCost,
      totalCogs,
      retailPrice,
      grossProfit,
      marginPercent,
      foodCostPercent,
    };
  }, [recipeMap, productMap]);

  // Dedicated strictly to products that have a configured recipe (materials BOM, labor hours, or machinery)
  const recipeProducts = useMemo(() => {
    return products.filter((p) => {
      const pRecipes = recipeMap.get(p.id) || [];
      const hasMaterials = pRecipes.length > 0;
      const meta = parseRecipeMeta(p.description).meta;
      const hasLaborOrEquip = (meta.labor && meta.labor.length > 0) || (meta.equipment && meta.equipment.length > 0);

      // Products WITHOUT any recipe materials, labor, or equipment are completely excluded
      return hasMaterials || hasLaborOrEquip;
    });
  }, [products, recipeMap]);

  // Filter recipe products by search and category
  const filteredProducts = useMemo(() => {
    const filtered = recipeProducts.filter((p) => {
      const pRecipes = recipeMap.get(p.id) || [];
      const { meta } = parseRecipeMeta(p.description);

      if (filterCategory !== "all" && String(p.productCategoryId) !== filterCategory) {
        return false;
      }

      if (filterTradeable === "tradeable" && p.isTradeable === false) {
        return false;
      }

      if (filterTradeable === "internal" && p.isTradeable !== false) {
        return false;
      }

      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const matchName = p.productName.toLowerCase().includes(q);
      const matchSku = p.sku?.toLowerCase().includes(q) || false;
      const matchCategory = p.category?.categoryName?.toLowerCase().includes(q) || false;
      const matchIngredient = pRecipes.some((r) =>
        r.ingredient?.productName?.toLowerCase().includes(q)
      );
      const matchLabor = (meta.labor || []).some((l) =>
        l.roleOrName.toLowerCase().includes(q)
      );
      const matchEquip = (meta.equipment || []).some((eq) =>
        eq.equipmentName.toLowerCase().includes(q)
      );

      return matchName || matchSku || matchCategory || matchIngredient || matchLabor || matchEquip;
    });

    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortField === "name") {
        cmp = (a.productName || "").localeCompare(b.productName || "");
      } else if (sortField === "sku") {
        cmp = (a.sku || "").localeCompare(b.sku || "");
      } else if (sortField === "price") {
        cmp = (Number(a.retailPrice) || 0) - (Number(b.retailPrice) || 0);
      } else if (sortField === "cogs") {
        const cogsA = getProductCogs(a).totalCogs;
        const cogsB = getProductCogs(b).totalCogs;
        cmp = cogsA - cogsB;
      } else if (sortField === "margin") {
        const marginA = getProductCogs(a).marginPercent;
        const marginB = getProductCogs(b).marginPercent;
        cmp = marginA - marginB;
      } else if (sortField === "status") {
        const tA = a.isTradeable !== false ? 1 : 0;
        const tB = b.isTradeable !== false ? 1 : 0;
        cmp = tA - tB;
      } else if (sortField === "bom") {
        const bomA = (recipeMap.get(a.id) || []).length;
        const bomB = (recipeMap.get(b.id) || []).length;
        cmp = bomA - bomB;
      }
      return sortOrder === "asc" ? cmp : -cmp;
    });
  }, [recipeProducts, recipeMap, filterCategory, filterTradeable, search, sortField, sortOrder, getProductCogs]);

  // Unique categories for filtering
  const categories = useMemo(() => {
    const catMap = new Map<number, string>();
    recipeProducts.forEach((p) => {
      if (p.productCategoryId && p.category?.categoryName) {
        catMap.set(p.productCategoryId, p.category.categoryName);
      }
    });
    return Array.from(catMap.entries());
  }, [recipeProducts]);

  // Stats across recipe products
  const totalRecipeItems = recipeProducts.length;
  const totalTradeableWithRecipe = recipeProducts.filter((p) => p.isTradeable !== false).length;
  const totalInternalRecipeOnly = recipeProducts.filter((p) => p.isTradeable === false).length;

  const totalLaborHoursAll = useMemo(() => {
    return recipeProducts.reduce((sum, p) => {
      const meta = parseRecipeMeta(p.description).meta;
      return sum + (meta.labor || []).reduce((lSum, l) => lSum + (l.hours || 0), 0);
    }, 0);
  }, [recipeProducts]);

  const avgFoodCostPercent = useMemo(() => {
    const tradeable = recipeProducts.filter((p) => (p.retailPrice || 0) > 0);
    if (tradeable.length === 0) return 0;
    const sum = tradeable.reduce((acc, p) => acc + getProductCogs(p).foodCostPercent, 0);
    return sum / tradeable.length;
  }, [recipeProducts, getProductCogs]);

  const avgGrossMargin = useMemo(() => {
    const tradeable = recipeProducts.filter((p) => (p.retailPrice || 0) > 0);
    if (tradeable.length === 0) return 0;
    const sum = tradeable.reduce((acc, p) => acc + getProductCogs(p).marginPercent, 0);
    return sum / tradeable.length;
  }, [recipeProducts, getProductCogs]);

  const totalEquipHoursAll = useMemo(() => {
    return recipeProducts.reduce((sum, p) => {
      const meta = parseRecipeMeta(p.description).meta;
      return sum + (meta.equipment || []).reduce((eSum, eq) => eSum + (eq.hours || 0), 0);
    }, 0);
  }, [recipeProducts]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Page Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <h2 style={{ fontSize: "1.35rem", fontWeight: 700 }}>Formulas</h2>
            <Badge variant="info">Production & Formulas</Badge>
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginTop: "0.2rem" }}>
            Dedicated management for formula products — Raw material bill of materials, employee labor working hours, and machinery runtimes
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
        {canEdit && (
          <Button
            id="create-recipe-btn"
            size="md"
            variant="primary"
            onClick={() => setIsCreateModalOpen(true)}
            style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
          >
            <span>✨</span>
            <span>+ Create Formula</span>
          </Button>
        )}
      </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: "flex", gap: "0.5rem", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "0.5rem" }}>
        <button
          onClick={() => setActiveTab("formulas")}
          style={{
            padding: "0.55rem 1.1rem",
            borderRadius: "var(--radius-md)",
            border: "none",
            backgroundColor: activeTab === "formulas" ? "var(--surface-hover, rgba(255,255,255,0.08))" : "transparent",
            color: activeTab === "formulas" ? "var(--text-primary)" : "var(--text-muted)",
            fontWeight: activeTab === "formulas" ? 700 : 500,
            fontSize: "0.9rem",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.45rem",
          }}
        >
          <span>📖</span>
          <span>Formulas ({filteredProducts.length})</span>
        </button>

        <button
          onClick={() => {
            setActiveTab("batches");
            loadBatches();
          }}
          style={{
            padding: "0.55rem 1.1rem",
            borderRadius: "var(--radius-md)",
            border: "none",
            backgroundColor: activeTab === "batches" ? "var(--surface-hover, rgba(255,255,255,0.08))" : "transparent",
            color: activeTab === "batches" ? "var(--text-primary)" : "var(--text-muted)",
            fontWeight: activeTab === "batches" ? 700 : 500,
            fontSize: "0.9rem",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.45rem",
          }}
        >
          <span>🍳</span>
          <span>Production Work Orders ({batches.length})</span>
          {batches.filter((b) => b.status === "PLANNED").length > 0 && (
            <Badge variant="warning">
              {batches.filter((b) => b.status === "PLANNED").length} Pending
            </Badge>
          )}
        </button>
      </div>

      {activeTab === "batches" ? (
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem", marginBottom: "1.25rem" }}>
            <div>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700 }}>Kitchen Production Work Orders</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.82rem", marginTop: "0.2rem" }}>
                Scheduled production batches with assigned facility and person in charge. Confirm completion when finished to deposit inventory into facility stock.
              </p>
            </div>

            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <select
                value={batchStatusFilter}
                onChange={(e) => setBatchStatusFilter(e.target.value)}
                style={{
                  padding: "0.45rem 0.85rem",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-subtle)",
                  backgroundColor: "var(--surface)",
                  color: "var(--text-primary)",
                  fontSize: "0.85rem",
                  cursor: "pointer",
                }}
              >
                <option value="all">All Statuses</option>
                <option value="PLANNED">Planned (Pending Confirmation)</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>

              <Button size="sm" variant="secondary" onClick={loadBatches} disabled={loadingBatches}>
                ↻ Refresh
              </Button>
            </div>
          </div>

          {loadingBatches ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
              Loading production batches...
            </div>
          ) : batches.length === 0 ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
              <p style={{ fontSize: "1.5rem" }}>🍳</p>
              <p style={{ marginTop: "0.5rem" }}>No production work orders found.</p>
              <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                Go to the Formulas tab and click "Produce" on any formula to schedule a batch.
              </p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.85rem" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-subtle)", color: "var(--text-muted)", fontSize: "0.75rem" }}>
                    <th style={{ padding: "0.75rem 1rem" }}>BATCH #</th>
                    <th style={{ padding: "0.75rem 1rem" }}>PRODUCT</th>
                    <th style={{ padding: "0.75rem 1rem" }}>FACILITY</th>
                    <th style={{ padding: "0.75rem 1rem" }}>PERSON IN CHARGE</th>
                    <th style={{ padding: "0.75rem 1rem" }}>OUTPUT QTY</th>
                    <th style={{ padding: "0.75rem 1rem" }}>TOTAL COGS</th>
                    <th style={{ padding: "0.75rem 1rem" }}>STATUS</th>
                    <th style={{ padding: "0.75rem 1rem", textAlign: "right" }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {batches
                    .filter((b) => batchStatusFilter === "all" || b.status === batchStatusFilter)
                    .map((b) => {
                      const picName = b.personInCharge?.profile
                        ? `${b.personInCharge.profile.firstName || ""} ${b.personInCharge.profile.lastName || ""}`.trim()
                        : b.personInChargeId ? `Employee #${b.personInChargeId}` : "Unassigned";

                      return (
                        <tr key={b.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                          <td style={{ padding: "0.75rem 1rem", fontFamily: "monospace", fontWeight: 700, color: "var(--accent-cyan)" }}>
                            {b.batchNumber}
                            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontFamily: "sans-serif" }}>
                              {new Date(b.createdAt).toLocaleDateString()} {new Date(b.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </td>
                          <td style={{ padding: "0.75rem 1rem" }}>
                            <strong style={{ color: "var(--text-primary)" }}>{b.product?.productName || "Unknown"}</strong>
                            {b.product?.sku && (
                              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "monospace" }}>
                                {b.product.sku}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: "0.75rem 1rem" }}>
                            <span style={{ fontWeight: 600 }}>{b.facility?.facilityName || "N/A"}</span>
                            {b.facility?.facilityCode && (
                              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                                {b.facility.facilityCode}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: "0.75rem 1rem" }}>
                            <span style={{ color: "var(--accent-purple, #a855f7)", fontWeight: 600 }}>
                              👤 {picName}
                            </span>
                            {b.personInCharge?.position?.name && (
                              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                                {b.personInCharge.position.name}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: "0.75rem 1rem", fontWeight: 700 }}>
                            {b.quantity} {b.unitLabel || "units"}
                          </td>
                          <td style={{ padding: "0.75rem 1rem", color: "var(--accent-amber)", fontWeight: 600 }}>
                            {formatIDR(b.totalCost)}
                          </td>
                          <td style={{ padding: "0.75rem 1rem" }}>
                            <Badge
                              variant={
                                b.status === "COMPLETED"
                                  ? "success"
                                  : b.status === "PLANNED"
                                  ? "warning"
                                  : "danger"
                              }
                            >
                              {b.status}
                            </Badge>
                            {b.confirmedAt && (
                              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                                Confirmed: {new Date(b.confirmedAt).toLocaleDateString()}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: "0.75rem 1rem", textAlign: "right" }}>
                            {b.status === "PLANNED" && (
                              <Button
                                id={`confirm-batch-btn-${b.id}`}
                                size="sm"
                                variant="primary"
                                onClick={() => setSelectedBatchForConfirm(b)}
                                style={{
                                  backgroundColor: "var(--accent-emerald)",
                                  color: "#000",
                                  fontWeight: 700,
                                  fontSize: "0.8rem",
                                  padding: "0.25rem 0.75rem",
                                }}
                              >
                                ✓ Confirm Completion
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ) : (
      /* Main Table Card */
      <Card>
        {/* Search & Filter Controls */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem", marginBottom: "1.25rem" }}>
          <div style={{ minWidth: "280px", maxWidth: "420px", flex: 1 }}>
            <Input
              id="search-recipes-input"
              placeholder="🔍 Search formula products, ingredients, employee roles, or machines..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
            {/* Tradeable in POS Filter */}
            <select
              id="filter-tradeable-select"
              value={filterTradeable}
              onChange={(e) => setFilterTradeable(e.target.value)}
              style={{
                padding: "0.5rem 0.85rem",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-subtle)",
                backgroundColor: "var(--surface)",
                color: "var(--text-primary)",
                fontSize: "0.85rem",
                cursor: "pointer",
              }}
            >
              <option value="all">All (Tradeable / Formula Only)</option>
              <option value="tradeable">Tradeable</option>
              <option value="internal">Formula Only</option>
            </select>

            {/* Category Filter */}
            <select
              id="filter-category-select"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              style={{
                padding: "0.5rem 0.85rem",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-subtle)",
                backgroundColor: "var(--surface)",
                color: "var(--text-primary)",
                fontSize: "0.85rem",
                cursor: "pointer",
              }}
            >
              <option value="all">All Categories</option>
              {categories.map(([catId, catName]) => (
                <option key={catId} value={String(catId)}>
                  {catName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Recipes Table */}
        {loading ? (
          <p style={{ color: "var(--text-muted)", padding: "2rem", textAlign: "center" }}>
            Loading formula products and BOM data...
          </p>
        ) : filteredProducts.length === 0 ? (
          <div style={{ textAlign: "center", padding: "2.5rem", color: "var(--text-secondary)" }}>
            <p style={{ marginBottom: "0.5rem" }}>
              {search
                ? `No formula products matching "${search}".`
                : "No products with formulas found yet."}
            </p>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
              Go to the General Products Catalog to assign a formula to any existing inventory item.
            </p>
            <a href="/products" style={{ textDecoration: "none" }}>
              <Button size="sm" variant="secondary">
                Go to Products Catalog →
              </Button>
            </a>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-subtle)", color: "var(--text-muted)", fontSize: "0.8rem" }}>
                  <SortableTh field="name" currentSortField={sortField} currentSortOrder={sortOrder} onSort={handleSort} style={{ padding: "0.75rem 0" }}>
                    PRODUCT & CATEGORY
                  </SortableTh>
                  <SortableTh field="sku" currentSortField={sortField} currentSortOrder={sortOrder} onSort={handleSort}>
                    SKU / CODE
                  </SortableTh>
                  <SortableTh field="price" currentSortField={sortField} currentSortOrder={sortOrder} onSort={handleSort}>
                    RETAIL PRICE
                  </SortableTh>
                  <SortableTh field="cogs" currentSortField={sortField} currentSortOrder={sortOrder} onSort={handleSort}>
                    COGS & MARGIN
                  </SortableTh>
                  <th style={{ textAlign: "right", paddingRight: "0.5rem" }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((p) => {
                  const pRecipes = recipeMap.get(p.id) || [];
                  const isTradeable = p.isTradeable !== false;
                  const { meta } = parseRecipeMeta(p.description);
                  const laborCount = (meta.labor || []).length;
                  const laborHours = (meta.labor || []).reduce((sum, l) => sum + (l.hours || 0), 0);
                  const equipCount = (meta.equipment || []).length;
                  const equipHours = (meta.equipment || []).reduce((sum, eq) => sum + (eq.hours || 0), 0);

                  return (
                    <tr key={p.id} style={{ borderBottom: "1px solid var(--border-subtle)", fontSize: "0.9rem" }}>
                      <td style={{ padding: "0.75rem 0" }}>
                        <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{p.productName}</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                          {p.category?.categoryName || "General Category"} • Stock: {p.currentStock ?? 0} {p.unitLabel || "pcs"}
                        </div>
                      </td>

                      <td style={{ color: "var(--text-secondary)", fontFamily: "monospace" }}>
                        {p.sku || "—"}
                      </td>

                      <td style={{ color: "var(--accent-emerald)", fontWeight: 600 }}>
                        {formatIDR(p.retailPrice || 0)}
                      </td>

                      <td>
                        {(() => {
                          const cogs = getProductCogs(p);
                          return (
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                                <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>BOM COGS:</span>
                                <strong style={{ color: "var(--accent-cyan)", fontSize: "0.85rem" }}>
                                  {formatIDR(cogs.materialCogs)}
                                </strong>
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                                <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Total Cost:</span>
                                <span style={{ color: "var(--accent-amber)", fontSize: "0.8rem", fontWeight: 600 }}>
                                  {formatIDR(cogs.totalCogs)}
                                </span>
                              </div>
                              {cogs.retailPrice > 0 ? (
                                <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", marginTop: "0.15rem" }}>
                                  <Badge variant={cogs.marginPercent >= 55 ? "success" : cogs.marginPercent >= 35 ? "info" : "warning"}>
                                    {cogs.marginPercent.toFixed(1)}% Margin
                                  </Badge>
                                </div>
                              ) : (
                                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Internal Component</span>
                              )}
                            </div>
                          );
                        })()}
                      </td>

                      <td style={{ textAlign: "right", paddingRight: "0.5rem", whiteSpace: "nowrap" }}>
                        <div style={{ display: "inline-flex", gap: "0.4rem", alignItems: "center", justifyContent: "flex-end" }}>
                          <Button
                            id={`produce-batch-btn-${p.id}`}
                            size="sm"
                            variant="primary"
                            onClick={() => setSelectedProductForBatch(p)}
                            style={{
                              fontSize: "0.8rem",
                              padding: "0.25rem 0.65rem",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.3rem",
                              backgroundColor: "var(--accent-emerald)",
                              color: "#000",
                              fontWeight: 700,
                            }}
                            title="Execute Kitchen Work Order / Produce Batch"
                          >
                            <span>🍳</span>
                            <span>Produce</span>
                          </Button>
                          <Button
                            id={`view-recipe-btn-${p.id}`}
                            size="sm"
                            variant="secondary"
                            onClick={() => setSelectedProductForView(p)}
                            style={{
                              fontSize: "0.8rem",
                              padding: "0.25rem 0.65rem",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.3rem",
                              backgroundColor: "var(--accent-cyan)",
                              color: "#000",
                              fontWeight: 600,
                            }}
                            title="View recipe instructions, BOM ingredients, labor, and machinery (Read-only)"
                          >
                            <span>👁️</span>
                            <span>View</span>
                          </Button>
                          {canEdit && (
                            <Button
                              id={`manage-recipe-btn-${p.id}`}
                              size="sm"
                              variant="secondary"
                              onClick={() => setSelectedProductForRecipe(p)}
                              style={{
                                fontSize: "0.8rem",
                                padding: "0.25rem 0.65rem",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.3rem",
                              }}
                              title="Open formula and BOM editor"
                            >
                              <span>✏️</span>
                              <span>Edit</span>
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

      )}

      {/* Read-Only Recipe Presentation Modal ("How to Make") */}
      <ViewFormulaModal
        isOpen={Boolean(selectedProductForView)}
        product={selectedProductForView}
        productMap={productMap}
        recipes={selectedProductForView ? recipeMap.get(selectedProductForView.id) || [] : []}
        onClose={() => setSelectedProductForView(null)}
        onProduceBatch={(prod) => setSelectedProductForBatch(prod)}
      />

      {/* Kitchen Batch Production Work Order Modal */}
      <ProduceBatchModal
        isOpen={Boolean(selectedProductForBatch)}
        product={selectedProductForBatch}
        onClose={() => setSelectedProductForBatch(null)}
        onBatchCreated={() => {
          loadData();
          setActiveTab("batches");
        }}
      />

      {/* Confirm Batch Completion Modal */}
      <ConfirmBatchModal
        isOpen={Boolean(selectedBatchForConfirm)}
        batch={selectedBatchForConfirm}
        onClose={() => setSelectedBatchForConfirm(null)}
        onBatchConfirmed={() => {
          loadData();
        }}
      />

      {/* Recipe, Labor & Equipment Modal */}
      <ProductRecipeModal
        isOpen={Boolean(selectedProductForRecipe)}
        product={selectedProductForRecipe}
        onClose={() => setSelectedProductForRecipe(null)}
        onUpdated={() => {
          loadData();
        }}
      />
      {/* Create New Recipe & Ingredients Modal */}
      <CreateRecipeProductModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={() => {
          loadData();
        }}
        existingProducts={products}
      />
    </div>
  );
}
