"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SortableTh } from "@/components/ui/SortableTh";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { productApi } from "@/lib/api";
import { AddProductModal } from "@/components/products/AddProductModal";
import { EditProductModal } from "@/components/products/EditProductModal";
import { CategoryManagementModal } from "@/components/products/CategoryManagementModal";
import {
  ProductRecipeModal,
  parseRecipeMeta,
} from "@/components/products/ProductRecipeModal";
import { ViewFormulaModal } from "@/components/recipes/ViewFormulaModal";
import type { ProductRecipeItem } from "@pz/shared";
import { useAuth } from "@/lib/authContext";
import { type ProductItem } from "@pz/shared";

export default function ProductsPage() {
  const { user, canAccess } = useAuth();
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [selectedProductForEdit, setSelectedProductForEdit] = useState<ProductItem | null>(null);
  const [selectedProductForRecipe, setSelectedProductForRecipe] = useState<ProductItem | null>(null);
  const [selectedProductForView, setSelectedProductForView] = useState<ProductItem | null>(null);
  const [allRecipes, setAllRecipes] = useState<ProductRecipeItem[]>([]);
  const [search, setSearch] = useState("");
  const [filterTradeable, setFilterTradeable] = useState<string>("all");
  const [filterFormula, setFilterFormula] = useState<string>("all");
  const [filterAlert, setFilterAlert] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");


  const [parentProductForNewSub, setParentProductForNewSub] = useState<ProductItem | null>(null);

  type ProductSortField = "sku" | "name" | "category" | "stock" | "alert" | "tradeable";
  const [sortField, setSortField] = useState<ProductSortField>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const handleSort = (field: ProductSortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };


  const canCreate = Boolean(
    user?.isSuperAdmin || canAccess("product", "create") || canAccess("product", "*")
  );

  const canEdit = Boolean(
    user?.isSuperAdmin || canAccess("product", "update") || canAccess("product", "*")
  );

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const [prodRes, recipeRes] = await Promise.all([
        productApi.getProducts({ limit: 250 }),
        productApi.getAllRecipes({ limit: 1000 }).catch(() => ({ items: [] })),
      ]);
      setProducts(prodRes.data || []);
      setAllRecipes(recipeRes.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const recipeMap = useMemo(() => {
    const map = new Map<number, ProductRecipeItem[]>();
    allRecipes.forEach((r) => {
      const existing = map.get(r.productId) || [];
      existing.push(r);
      map.set(r.productId, existing);
    });
    return map;
  }, [allRecipes]);

  const productMap = useMemo(() => {
    return new Map(products.map((p) => [p.id, p]));
  }, [products]);

  const categories = useMemo(() => {
    const catMap = new Map<number, string>();
    products.forEach((p) => {
      if (p.productCategoryId && p.category?.categoryName) {
        catMap.set(p.productCategoryId, p.category.categoryName);
      }
    });
    return Array.from(catMap.entries());
  }, [products]);

  const filteredProducts = useMemo(() => {
    // 1. Filter matching criteria
    const filtered = products.filter((p) => {
      // Tradeable filter
      if (filterTradeable === "tradeable" && p.isTradeable === false) return false;
      if (filterTradeable === "non-tradeable" && p.isTradeable !== false) return false;

      // Formula filter (a product is considered a formula if it has configured BOM recipe ingredients or labor/machinery specs)
      const pRecipes = recipeMap.get(p.id) || p.recipes || [];
      const { meta } = parseRecipeMeta(p.description);
      const hasRecipeBOM = Boolean(pRecipes.length > 0);
      const hasRecipeMeta = Boolean(
        (meta.labor && meta.labor.length > 0) ||
        (meta.equipment && meta.equipment.length > 0) ||
        (meta.instructions && meta.instructions.trim().length > 0) ||
        (p.description || "").includes("---RECIPE_SPEC_START---")
      );
      const isFormula = hasRecipeBOM || hasRecipeMeta;
      if (filterFormula === "formula" && !isFormula) return false;
      if (filterFormula === "not-formula" && isFormula) return false;

      // Low Stock Alert filter
      const alertEnabled = p.isLowStockAlertEnabled !== false;
      if (filterAlert === "alert" && !alertEnabled) return false;
      if (filterAlert === "non-alert" && alertEnabled) return false;

      // Category filter
      if (filterCategory !== "all" && String(p.productCategoryId) !== filterCategory) return false;

      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const matchName = p.productName.toLowerCase().includes(q);
      const matchSku = p.sku?.toLowerCase().includes(q) || false;
      const matchCategory = p.category?.categoryName?.toLowerCase().includes(q) || false;
      return matchName || matchSku || matchCategory;
    });

    // 2. Group by hierarchy so variants always appear immediately after their parent product
    const rootProducts = filtered.filter((p) => !p.parentProductId);
    const variantsByParent = new Map<number, ProductItem[]>();

    filtered.forEach((p) => {
      if (p.parentProductId) {
        const list = variantsByParent.get(p.parentProductId) || [];
        list.push(p);
        variantsByParent.set(p.parentProductId, list);
      }
    });

    const ordered: ProductItem[] = [];
    const visitedIds = new Set<number>();

    rootProducts.forEach((root) => {
      ordered.push(root);
      visitedIds.add(root.id);

      // Append all direct variants of this root product right after it
      const children = variantsByParent.get(root.id) || [];
      children.forEach((child) => {
        ordered.push(child);
        visitedIds.add(child.id);
      });
    });

    // Append any orphaned variants whose parent was filtered out by search/category
    filtered.forEach((p) => {
      if (!visitedIds.has(p.id)) {
        ordered.push(p);
      }
    });

    return ordered;
  }, [products, recipeMap, filterTradeable, filterFormula, filterAlert, filterCategory, search]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: "1.3rem", fontWeight: 700 }}>Product Master Catalog</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
            Manage inventory items, SKUs, categories, and product variants
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <Button
            id="manage-categories-btn"
            variant="secondary"
            size="md"
            onClick={() => setIsCategoryModalOpen(true)}
          >
            📁 Categories
          </Button>
          {canCreate && (
            <Button id="add-product-btn" size="md" onClick={() => setIsModalOpen(true)}>
              + New Product
            </Button>
          )}
        </div>
      </div>

      <Card>
        {/* Search & Filter Toolbar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem", marginBottom: "1.25rem" }}>
          <div style={{ minWidth: "260px", maxWidth: "380px", flex: 1 }}>
            <Input
              id="search-products-input"
              placeholder="🔍 Search products by name, SKU, or category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
            {/* Filter Tradeable */}
            <select
              id="filter-tradeable-products-select"
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
              <option value="all">All Trade Status</option>
              <option value="tradeable">Tradeable</option>
              <option value="non-tradeable">Non-Tradeable</option>
            </select>

            {/* Filter Formula */}
            <select
              id="filter-formula-products-select"
              value={filterFormula}
              onChange={(e) => setFilterFormula(e.target.value)}
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
              <option value="all">All Formula Status</option>
              <option value="formula">Formula</option>
              <option value="not-formula">Not-Formula</option>
            </select>

            {/* Filter Alert */}
            <select
              id="filter-alert-products-select"
              value={filterAlert}
              onChange={(e) => setFilterAlert(e.target.value)}
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
              <option value="all">All Alert Status</option>
              <option value="alert">Alert Enabled</option>
              <option value="non-alert">Non-Alert</option>
            </select>

            {/* Filter Category */}
            <select
              id="filter-category-products-select"
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
        {loading ? (
          <p style={{ color: "var(--text-muted)" }}>Loading products...</p>
        ) : filteredProducts.length === 0 ? (
          <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-secondary)" }}>
            <p>
              {search || filterTradeable !== "all" || filterFormula !== "all" || filterAlert !== "all" || filterCategory !== "all" ? "No products matching your search or filters." : "No products registered yet."}
              {canCreate ? ' Click "+ New Product" to create one.' : ""}
            </p>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-subtle)", color: "var(--text-muted)", fontSize: "0.8rem" }}>
                <th style={{ padding: "0.75rem 0" }}>SKU</th>
                <th>PRODUCT NAME</th>
                <th>CATEGORY</th>
                <th>STOCK LEVEL</th>
                <th>MIN ALERT</th>
                <th>TRADEABLE IN POS</th>
                <th style={{ textAlign: "right", paddingRight: "0.5rem" }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((p) => {
                const subProductCount = p.subProducts?.length ?? 0;
                const isSubProduct = Boolean(p.parentProductId);

                const pRecipes = recipeMap.get(p.id) || p.recipes || [];
                const { meta: rMeta } = parseRecipeMeta(p.description);
                const hasBOM = Boolean(pRecipes.length > 0);
                const isFormulaProduct = hasBOM || Boolean(
                  (rMeta.labor && rMeta.labor.length > 0) ||
                  (rMeta.equipment && rMeta.equipment.length > 0) ||
                  (p.description || "").includes("---RECIPE_SPEC_START---")
                );

                return (
                  <tr
                    key={p.id}
                    style={{
                      borderBottom: "1px solid var(--border-subtle)",
                      fontSize: "0.9rem",
                      backgroundColor: isSubProduct ? "rgba(99, 102, 241, 0.04)" : undefined,
                    }}
                  >
                    <td style={{ padding: "0.75rem 0", color: "var(--text-secondary)", fontFamily: "monospace" }}>
                      {isSubProduct ? (
                        <div style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", paddingLeft: "1rem" }}>
                          <span style={{ color: "var(--accent-indigo)", fontWeight: 700 }}>↳</span>
                          <span>{p.sku || "—"}</span>
                        </div>
                      ) : (
                        p.sku || "—"
                      )}
                    </td>
                    <td style={{ fontWeight: isSubProduct ? 500 : 600 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap", paddingLeft: isSubProduct ? "0.75rem" : undefined }}>
                        {/* Product / Variant Picture Thumbnail */}
                        <div
                          style={{
                            width: "32px",
                            height: "32px",
                            borderRadius: "var(--radius-sm)",
                            backgroundColor: "var(--bg-surface-elevated)",
                            border: "1px solid var(--border-subtle)",
                            overflow: "hidden",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          {p.imageUrl ? (
                            <img
                              src={p.imageUrl}
                              alt={p.productName}
                              style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            />
                          ) : (
                            <span style={{ fontSize: "0.85rem", opacity: 0.6 }}>
                              {isSubProduct ? "🍱" : "☕"}
                            </span>
                          )}
                        </div>
                        {isSubProduct && (
                          <span
                            style={{
                              display: "inline-block",
                              width: "6px",
                              height: "6px",
                              borderRadius: "50%",
                              backgroundColor: "var(--accent-indigo)",
                            }}
                          />
                        )}
                        <span>{p.productName}</span>
                        {isSubProduct && (
                          <span style={{ fontSize: "0.75rem", padding: "0.1rem 0.4rem", borderRadius: "4px", backgroundColor: "rgba(99, 102, 241, 0.12)", color: "var(--accent-indigo)" }}>
                            Variant
                          </span>
                        )}
                        {subProductCount > 0 && (
                          <Badge variant="info">
                            🍱 {subProductCount} Variant{subProductCount !== 1 ? "s" : ""}
                          </Badge>
                        )}
                        {isFormulaProduct && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedProductForView(p);
                            }}
                            title="Click to view full recipe formulation, BOM materials, and instructions"
                            style={{
                              border: "1px solid rgba(139, 92, 246, 0.35)",
                              borderRadius: "var(--radius-sm)",
                              backgroundColor: "rgba(139, 92, 246, 0.14)",
                              color: "#8b5cf6",
                              fontSize: "0.75rem",
                              fontWeight: 600,
                              padding: "0.15rem 0.5rem",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.25rem",
                              transition: "all 0.15s ease",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = "rgba(139, 92, 246, 0.28)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = "rgba(139, 92, 246, 0.14)";
                            }}
                          >
                            🧪 Formula
                          </button>
                        )}
                      </div>
                    </td>
                    <td>
                      <Badge variant="info">{p.category?.categoryName || "General"}</Badge>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "baseline", gap: "0.3rem" }}>
                        <span style={{ fontWeight: 600, color: (p.currentStock ?? 0) <= 0 && p.isLowStockAlertEnabled !== false ? "var(--accent-rose)" : "var(--text-primary)" }}>
                          {p.currentStock ?? 0}
                        </span>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                          {p.unitLabel || "units"}
                        </span>
                      </div>
                    </td>
                    <td>
                      {p.isLowStockAlertEnabled === false ? (
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Non-Alert</span>
                      ) : p.minStock && Number(p.minStock) > 0 ? (
                        <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--accent-amber)" }}>
                          ≤ {Number(p.minStock)} {p.unitLabel || "units"}
                        </span>
                      ) : (
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>None (Default 0)</span>
                      )}
                    </td>
                    <td>
                      {p.isTradeable !== false ? (
                        <Badge variant="success">🛒 Tradeable</Badge>
                      ) : (
                        <Badge variant="default">🔒 Non-Tradeable</Badge>
                      )}
                    </td>
                    <td style={{ textAlign: "right", paddingRight: "0.5rem" }}>
                      <div style={{ display: "inline-flex", gap: "0.4rem", alignItems: "center" }}>
                        {!isSubProduct && canCreate && (
                          <Button
                            id={`add-variant-btn-${p.id}`}
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setParentProductForNewSub(p);
                              setIsModalOpen(true);
                            }}
                            style={{
                              padding: "0.25rem 0.6rem",
                              fontSize: "0.8rem",
                              borderColor: "rgba(99, 102, 241, 0.4)",
                              color: "var(--accent-indigo)",
                            }}
                            title={`Add a new flavor, size, or variant for ${p.productName}`}
                          >
                            + Variant
                          </Button>
                        )}
                        {isFormulaProduct && (
                          <Button
                            id={`view-formula-btn-${p.id}`}
                            size="sm"
                            variant="secondary"
                            onClick={() => setSelectedProductForView(p)}
                            style={{
                              padding: "0.25rem 0.6rem",
                              fontSize: "0.8rem",
                              backgroundColor: "rgba(139, 92, 246, 0.12)",
                              color: "#8b5cf6",
                              borderColor: "rgba(139, 92, 246, 0.3)",
                            }}
                            title="View recipe and formula details"
                          >
                            🧪 Formula
                          </Button>
                        )}
                        {canEdit && (
                          <Button
                            id={`edit-product-btn-${p.id}`}
                            size="sm"
                            variant="secondary"
                            onClick={() => setSelectedProductForEdit(p)}
                            style={{ padding: "0.25rem 0.6rem", fontSize: "0.8rem" }}
                            title="Edit product details, pricing tiers, and category"
                          >
                            ✏️ Edit
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      <AddProductModal
        isOpen={isModalOpen}
        initialParentProduct={parentProductForNewSub}
        onClose={() => {
          setIsModalOpen(false);
          setParentProductForNewSub(null);
        }}
        onProductCreated={() => {
          loadProducts();
        }}
      />

      <CategoryManagementModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onCategoriesChanged={() => {
          loadProducts();
        }}
      />



      <EditProductModal
        isOpen={Boolean(selectedProductForEdit)}
        product={selectedProductForEdit}
        onClose={() => setSelectedProductForEdit(null)}
        onProductUpdated={() => {
          loadProducts();
        }}
      />

      {/* Read-Only Formula Presentation Modal */}
      <ViewFormulaModal
        isOpen={Boolean(selectedProductForView)}
        product={selectedProductForView}
        productMap={productMap}
        recipes={selectedProductForView ? recipeMap.get(selectedProductForView.id) || selectedProductForView.recipes || [] : []}
        onClose={() => setSelectedProductForView(null)}
      />

      {/* Formula & BOM Editor Modal */}
      <ProductRecipeModal
        isOpen={Boolean(selectedProductForRecipe)}
        product={selectedProductForRecipe}
        onClose={() => setSelectedProductForRecipe(null)}
        onUpdated={() => {
          loadProducts();
        }}
      />
    </div>
  );
}

