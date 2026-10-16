"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { SortableTh } from "@/components/ui/SortableTh";
import { useAuth } from "@/lib/authContext";
import { productApi, facilityApi } from "@/lib/api";
import { formatIDR } from "@pz/shared";
import { parseRecipeMeta } from "@/components/products/ProductRecipeModal";
import { AddPurchaseOrderModal } from "@/components/orders/AddPurchaseOrderModal";
import { AddProductWasteModal } from "@/components/inventory/AddProductWasteModal";
import type { ProductWasteRecord } from "@pz/shared";
import type {
  ProductItem,
  ProductInventoryItem,
  ProductRecipeItem,
  FacilityRecord,
  FacilitySectionRecord,
} from "@pz/shared";

type StockFilterType = "all" | "instock" | "lowstock" | "outofstock";

export default function InventoryPage() {
  const { user, canAccess } = useAuth();
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [facilities, setFacilities] = useState<FacilityRecord[]>([]);
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<StockFilterType>("all");

  // Product table sort state
  type InvSortField = "sku" | "name" | "category" | "stock" | "status" | "price";
  const [sortField, setSortField] = useState<InvSortField>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const handleSort = (field: InvSortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  // Waste log table sort state
  type WasteSortField = "date" | "sku" | "reason" | "location" | "qty" | "cost" | "total";
  const [wasteSortField, setWasteSortField] = useState<WasteSortField>("date");
  const [wasteSortOrder, setWasteSortOrder] = useState<"asc" | "desc">("desc");

  const handleWasteSort = (field: WasteSortField) => {
    if (wasteSortField === field) {
      setWasteSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setWasteSortField(field);
      setWasteSortOrder("desc");
    }
  };


  // Adjustment Modal State
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);
  const [adjustFacilityId, setAdjustFacilityId] = useState<number | undefined>(undefined);
  const [adjustSectionId, setAdjustSectionId] = useState<number | undefined>(undefined);
  const [adjustType, setAdjustType] = useState<"IN" | "OUT" | "ADJUSTMENT">("IN");
  const [adjustQuantity, setAdjustQuantity] = useState<number>(1);
  const [adjustReference, setAdjustReference] = useState("");
  const [adjustNotes, setAdjustNotes] = useState("");
  const [adjusting, setAdjusting] = useState(false);
  const [adjustError, setAdjustError] = useState<string | null>(null);

  // History Ledger Modal State
  const [historyProduct, setHistoryProduct] = useState<ProductItem | null>(null);
  const [historyFacilityFilter, setHistoryFacilityFilter] = useState<string>("ALL");
  const [historyItems, setHistoryItems] = useState<ProductInventoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Purchase Order Modal State
  const [isPoModalOpen, setIsPoModalOpen] = useState(false);
  const [poInitialProductId, setPoInitialProductId] = useState<number | undefined>(undefined);

  // Waste / Loss Modal State & Ledger Tab
  const [activeTab, setActiveTab] = useState<"stock" | "waste">("stock");
  const [isWasteModalOpen, setIsWasteModalOpen] = useState(false);
  const [wasteTargetProduct, setWasteTargetProduct] = useState<ProductItem | null>(null);
  const [wasteRecords, setWasteRecords] = useState<ProductWasteRecord[]>([]);
  const [wasteLoading, setWasteLoading] = useState(false);
  const [wasteReasonFilter, setWasteReasonFilter] = useState<string>("ALL");

  const canAdjust = Boolean(
    user?.isSuperAdmin ||
      canAccess("product", "inventory") ||
      canAccess("product", "*") ||
      canAccess("item", "*")
  );

  const canCreatePo = Boolean(
    user?.isSuperAdmin ||
      canAccess("purchase-order", "create") ||
      canAccess("purchase-order", "*")
  );

  const loadWasteRecords = useCallback(async () => {
    setWasteLoading(true);
    try {
      const res = await productApi.getWasteRecords({
        limit: 100,
        ...(selectedFacilityId !== "ALL" ? { facilityId: Number(selectedFacilityId) } : {}),
        ...(wasteReasonFilter !== "ALL" ? { reason: wasteReasonFilter as any } : {}),
      });
      setWasteRecords(res.items || []);
    } catch (err) {
      console.error("Failed to load waste records", err);
      setWasteRecords([]);
    } finally {
      setWasteLoading(false);
    }
  }, [selectedFacilityId, wasteReasonFilter]);

  useEffect(() => {
    if (activeTab === "waste") {
      loadWasteRecords();
    }
  }, [activeTab, loadWasteRecords]);

  // Fetch facilities list once
  const loadFacilities = useCallback(async () => {
    try {
      const res = await facilityApi.getFacilities();
      const list = Array.isArray((res as any)?.data) ? (res as any).data : (res as any)?.items || [];
      setFacilities(list);
    } catch (err) {
      console.error("Failed to load facilities", err);
    }
  }, []);

  useEffect(() => {
    loadFacilities();
  }, [loadFacilities]);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const facilityIdParam =
        selectedFacilityId !== "ALL" ? Number(selectedFacilityId) : undefined;

      const [prodRes, recipeRes] = await Promise.all([
        productApi.getProducts({
          limit: 150,
          ...(facilityIdParam ? { facilityId: facilityIdParam } : {}),
        }),
        productApi.getAllRecipes({ limit: 500 }).catch(() => ({ items: [] })),
      ]);

      const allList: ProductItem[] = prodRes?.data || [];
      const allRecipes: ProductRecipeItem[] = recipeRes?.items || [];

      // Collect IDs of products that have a recipe configured (parent formula/manufactured products)
      const recipeProductIds = new Set<number>();
      allRecipes.forEach((r) => {
        if (r.productId) recipeProductIds.add(r.productId);
      });

      // Filter: Items that have recipes are NOT put in the raw inventory.
      const nonRecipeProducts = allList.filter((p) => {
        if (recipeProductIds.has(p.id)) return false;
        if (p.recipes && p.recipes.length > 0) return false;
        const { meta } = parseRecipeMeta(p.description);
        const hasRecipe =
          (meta.labor && meta.labor.length > 0) ||
          (meta.equipment && meta.equipment.length > 0) ||
          Boolean(meta.instructions && meta.instructions.trim().length > 0);
        if (hasRecipe) return false;
        return true;
      });

      setProducts(nonRecipeProducts);
    } catch (err) {
      console.error("Failed to load products for inventory", err);
    } finally {
      setLoading(false);
    }
  }, [selectedFacilityId]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Derived filter
  const filteredProducts = useMemo(() => {
    let result = products;

    if (filterType === "instock") {
      result = result.filter((p) => {
        if (p.isLowStockAlertEnabled === false) return true;
        const min = p.minStock && p.minStock > 0 ? p.minStock : 0;
        return min > 0 ? (p.currentStock ?? 0) > min : (p.currentStock ?? 0) > 0;
      });
    } else if (filterType === "lowstock") {
      result = result.filter((p) => {
        if (p.isLowStockAlertEnabled === false) return false;
        const min = p.minStock && p.minStock > 0 ? p.minStock : 0;
        return min > 0 && (p.currentStock ?? 0) > 0 && (p.currentStock ?? 0) <= min;
      });
    } else if (filterType === "outofstock") {
      result = result.filter((p) => {
        if (p.isLowStockAlertEnabled === false) return false;
        return (p.currentStock ?? 0) <= 0;
      });
    }

    if (!searchQuery.trim()) return result;
    const q = searchQuery.toLowerCase().trim();

    return result.filter((p) => {
      const name = (p.productName || "").toLowerCase();
      const sku = (p.sku || "").toLowerCase();
      const cat = (p.category?.categoryName || "").toLowerCase();
      return name.includes(q) || sku.includes(q) || cat.includes(q);
    });
  }, [products, filterType, searchQuery]);

  const inStockCount = useMemo(
    () =>
      products.filter((p) => {
        if (p.isLowStockAlertEnabled === false) return true;
        const min = p.minStock && p.minStock > 0 ? p.minStock : 0;
        return min > 0 ? (p.currentStock ?? 0) > min : (p.currentStock ?? 0) > 0;
      }).length,
    [products]
  );
  const lowStockCount = useMemo(
    () =>
      products.filter((p) => {
        if (p.isLowStockAlertEnabled === false) return false;
        const min = p.minStock && p.minStock > 0 ? p.minStock : 0;
        return min > 0 && (p.currentStock ?? 0) > 0 && (p.currentStock ?? 0) <= min;
      }).length,
    [products]
  );
  const outOfStockCount = useMemo(
    () =>
      products.filter((p) => {
        if (p.isLowStockAlertEnabled === false) return false;
        return (p.currentStock ?? 0) <= 0;
      }).length,
    [products]
  );

    const sortedWasteRecords = useMemo(() => {
    return [...wasteRecords].sort((a, b) => {
      let cmp = 0;
      if (wasteSortField === "date") {
        const dateA = new Date(a.wasteDate || a.createdAt || 0).getTime();
        const dateB = new Date(b.wasteDate || b.createdAt || 0).getTime();
        cmp = dateA - dateB;
      } else if (wasteSortField === "sku") {
        const nameA = a.product?.productName || "";
        const nameB = b.product?.productName || "";
        cmp = nameA.localeCompare(nameB);
      } else if (wasteSortField === "reason") {
        cmp = (a.reason || "").localeCompare(b.reason || "");
      } else if (wasteSortField === "location") {
        const locA = a.facility?.facilityName || "";
        const locB = b.facility?.facilityName || "";
        cmp = locA.localeCompare(locB);
      } else if (wasteSortField === "qty") {
        cmp = (Number(a.quantity) || 0) - (Number(b.quantity) || 0);
      } else if (wasteSortField === "cost") {
        cmp = (Number(a.unitCost) || 0) - (Number(b.unitCost) || 0);
      } else if (wasteSortField === "total") {
        cmp = (Number(a.totalCost) || 0) - (Number(b.totalCost) || 0);
      }
      return wasteSortOrder === "asc" ? cmp : -cmp;
    });
  }, [wasteRecords, wasteSortField, wasteSortOrder]);

  const selectedFacilityObj = useMemo(() => {
    if (selectedFacilityId === "ALL") return null;
    return facilities.find((f) => f.id === Number(selectedFacilityId)) || null;
  }, [facilities, selectedFacilityId]);

  const adjustFacilitySections = useMemo(() => {
    if (!adjustFacilityId) return [];
    const fac = facilities.find((f) => f.id === adjustFacilityId);
    return fac?.sections || [];
  }, [facilities, adjustFacilityId]);

  const openAdjustModal = (prod?: ProductItem) => {
    const targetProd = prod || products[0] || null;
    setSelectedProduct(targetProd);

    // Default adjust facility to current filter if specific facility selected
    if (selectedFacilityId !== "ALL") {
      setAdjustFacilityId(Number(selectedFacilityId));
    } else if (facilities.length > 0) {
      setAdjustFacilityId(facilities[0]?.id);
    } else {
      setAdjustFacilityId(undefined);
    }

    setAdjustSectionId(undefined);
    setAdjustType("IN");
    setAdjustQuantity(1);
    setAdjustReference("");
    setAdjustNotes("");
    setAdjustError(null);
    setIsAdjustOpen(true);
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    if (!adjustQuantity || adjustQuantity <= 0) {
      setAdjustError("Quantity must be greater than 0.");
      return;
    }

    setAdjusting(true);
    setAdjustError(null);

    try {
      await productApi.createInventory({
        productId: selectedProduct.id,
        facilityId: adjustFacilityId,
        sectionId: adjustSectionId,
        transactionType: adjustType,
        quantity: Math.floor(adjustQuantity),
        reference: adjustReference.trim() || undefined,
        notes: adjustNotes.trim() || undefined,
      });

      await loadProducts();
      setIsAdjustOpen(false);
    } catch (err: any) {
      setAdjustError(err?.message || "Failed to record inventory adjustment.");
    } finally {
      setAdjusting(false);
    }
  };

  const openHistoryModal = async (prod: ProductItem, facilityFilter?: string) => {
    setHistoryProduct(prod);
    const facFilter = facilityFilter ?? (selectedFacilityId !== "ALL" ? selectedFacilityId : "ALL");
    setHistoryFacilityFilter(facFilter);
    setHistoryLoading(true);

    try {
      const res = await productApi.getInventory({
        productId: prod.id,
        ...(facFilter !== "ALL" ? { facilityId: Number(facFilter) } : {}),
      });
      const data = (res as any)?.data?.inventory ?? (res as any)?.data ?? [];
      setHistoryItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load inventory history", err);
      setHistoryItems([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Header Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
            <h2 style={{ fontSize: "1.3rem", fontWeight: 700 }}>Inventory Ledger</h2>
            <Badge variant="info">Operations</Badge>
            {selectedFacilityObj ? (
              <Badge variant="success" style={{ fontSize: "0.75rem" }}>
                📍 {selectedFacilityObj.facilityName} ({selectedFacilityObj.type})
              </Badge>
            ) : (
              <Badge variant="default" style={{ fontSize: "0.75rem" }}>
                🌐 All Facilities (Consolidated)
              </Badge>
            )}
            <Badge variant="default" style={{ fontSize: "0.75rem" }}>
              📦 Recipe Products Excluded
            </Badge>
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginTop: "0.2rem" }}>
            Real-time stock balance across multi-facility warehouses, stores, and storage sections.
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.6rem", alignItems: "center", flexWrap: "wrap" }}>
          {canCreatePo && (
            <Button
              id="inventory-issue-po-btn"
              size="md"
              variant="secondary"
              onClick={() => {
                setPoInitialProductId(undefined);
                setIsPoModalOpen(true);
              }}
              style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
            >
              <span>📑</span>
              <span>+ Issue Purchase Order</span>
            </Button>
          )}
          {canAdjust && (
            <>
              <Button
                id="stock-adjustment-btn"
                size="md"
                onClick={() => openAdjustModal()}
                style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
              >
                <span>⚖️</span>
                <span>+ Stock Adjustment</span>
              </Button>

              <Button
                id="record-waste-btn"
                size="md"
                variant="danger"
                onClick={() => {
                  setWasteTargetProduct(null);
                  setIsWasteModalOpen(true);
                }}
                style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
              >
                <span>🗑️</span>
                <span>+ Record Lost / Expired</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Navigation Tabs (Current Stock vs Lost/Spoiled/Expired Log) */}
      <div style={{ display: "flex", gap: "0.5rem", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "0.5rem" }}>
        <button
          type="button"
          onClick={() => setActiveTab("stock")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.45rem",
            padding: "0.55rem 1rem",
            borderRadius: "var(--radius-md)",
            border: "none",
            backgroundColor: activeTab === "stock" ? "var(--bg-surface-elevated)" : "transparent",
            color: activeTab === "stock" ? "var(--text-primary)" : "var(--text-muted)",
            fontWeight: activeTab === "stock" ? 700 : 500,
            fontSize: "0.9rem",
            cursor: "pointer",
            borderBottom: activeTab === "stock" ? "2px solid var(--accent-indigo)" : "2px solid transparent",
          }}
        >
          <span>📦</span>
          <span>Current Stock Balances</span>
          <Badge variant="default" style={{ fontSize: "0.72rem", padding: "1px 6px" }}>
            {products.length}
          </Badge>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("waste")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.45rem",
            padding: "0.55rem 1rem",
            borderRadius: "var(--radius-md)",
            border: "none",
            backgroundColor: activeTab === "waste" ? "rgba(239, 68, 68, 0.12)" : "transparent",
            color: activeTab === "waste" ? "var(--accent-rose)" : "var(--text-muted)",
            fontWeight: activeTab === "waste" ? 700 : 500,
            fontSize: "0.9rem",
            cursor: "pointer",
            borderBottom: activeTab === "waste" ? "2px solid var(--accent-rose)" : "2px solid transparent",
          }}
        >
          <span>🗑️</span>
          <span>Lost / Spoiled / Expired Log</span>
          {wasteRecords.length > 0 && (
            <Badge variant="danger" style={{ fontSize: "0.72rem", padding: "1px 6px" }}>
              {wasteRecords.length}
            </Badge>
          )}
        </button>
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
            Catalog SKUs
          </p>
          <p style={{ fontSize: "1.4rem", fontWeight: 700, marginTop: "0.25rem", color: "var(--text-primary)" }}>
            {loading ? "—" : products.length}
          </p>
          <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>
            {selectedFacilityObj ? `In ${selectedFacilityObj.facilityName}` : "Across all facilities"}
          </span>
        </Card>

        <Card style={{ padding: "1rem 1.25rem" }}>
          <p style={{ fontSize: "0.75rem", color: "var(--accent-emerald)", textTransform: "uppercase" }}>
            Healthy Stock
          </p>
          <p style={{ fontSize: "1.4rem", fontWeight: 700, marginTop: "0.25rem", color: "var(--accent-emerald)" }}>
            {loading ? "—" : inStockCount}
          </p>
          <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>
            Stock &gt; threshold units
          </span>
        </Card>

        <Card style={{ padding: "1rem 1.25rem" }}>
          <p style={{ fontSize: "0.75rem", color: "var(--accent-amber)", textTransform: "uppercase" }}>
            Low Stock Alert
          </p>
          <p style={{ fontSize: "1.4rem", fontWeight: 700, marginTop: "0.25rem", color: "var(--accent-amber)" }}>
            {loading ? "—" : lowStockCount}
          </p>
          <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>
            At or below minimum threshold
          </span>
        </Card>

        <Card style={{ padding: "1rem 1.25rem" }}>
          <p style={{ fontSize: "0.75rem", color: "var(--accent-rose)", textTransform: "uppercase" }}>
            Out of Stock
          </p>
          <p style={{ fontSize: "1.4rem", fontWeight: 700, marginTop: "0.25rem", color: "var(--accent-rose)" }}>
            {loading ? "—" : outOfStockCount}
          </p>
          <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>
            Depleted inventory items
          </span>
        </Card>
      </div>

      {/* Lost / Spoiled / Expired Ledger View */}
      {activeTab === "waste" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Waste Filter Bar */}
          <Card style={{ padding: "1rem 1.25rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)" }}>
                  Facility:
                </span>
                <select
                  id="filter-waste-facility-select"
                  value={selectedFacilityId}
                  onChange={(e) => setSelectedFacilityId(e.target.value)}
                  style={{
                    padding: "0.45rem 0.85rem",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border-subtle)",
                    backgroundColor: "var(--surface, var(--bg-surface-elevated))",
                    color: "var(--text-primary)",
                    fontSize: "0.85rem",
                    cursor: "pointer",
                    outline: "none",
                    fontWeight: 500,
                  }}
                >
                  <option value="ALL">🏢 All Facilities</option>
                  {facilities.map((fac) => {
                    const icon =
                      fac.type === "STORE"
                        ? "🏪"
                        : fac.type === "OFFICE"
                        ? "💼"
                        : fac.type === "FACTORY"
                        ? "🏗️"
                        : "🏬";
                    return (
                      <option key={fac.id} value={String(fac.id)}>
                        {icon} {fac.facilityName} ({fac.type})
                      </option>
                    );
                  })}
                </select>

                <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)", marginLeft: "0.35rem" }}>
                  Reason Filter:
                </span>
                <select
                  id="filter-waste-reason-select"
                  value={wasteReasonFilter}
                  onChange={(e) => setWasteReasonFilter(e.target.value)}
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
                  <option value="ALL">All Reasons</option>
                  <option value="EXPIRED">EXPIRED</option>
                  <option value="SPOILED">SPOILED</option>
                  <option value="LOST">LOST</option>
                  <option value="DAMAGED">DAMAGED</option>
                  <option value="SCRAP">SCRAP</option>
                  <option value="OTHER">OTHER</option>
                </select>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={loadWasteRecords}
                  title="Refresh waste log"
                >
                  🔄 Refresh
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => {
                    setWasteTargetProduct(null);
                    setIsWasteModalOpen(true);
                  }}
                  style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
                >
                  <span>🗑️</span>
                  <span>+ Record Write-Off</span>
                </Button>
              </div>
            </div>
          </Card>

          {/* Waste Records Table */}
          <Card style={{ padding: "0", overflow: "hidden" }}>
            {wasteLoading ? (
              <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
                <p>Loading write-off records...</p>
              </div>
            ) : wasteRecords.length === 0 ? (
              <div style={{ textAlign: "center", padding: "3.5rem 1.5rem", color: "var(--text-secondary)" }}>
                <span style={{ fontSize: "2.5rem" }}>✨</span>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginTop: "1rem", color: "var(--text-primary)" }}>
                  No Product Losses Recorded
                </h3>
                <p style={{ marginTop: "0.4rem", fontSize: "0.875rem", maxWidth: "420px", margin: "0.4rem auto 1.25rem auto" }}>
                  {wasteReasonFilter !== "ALL"
                    ? `No products have been written off under reason "${wasteReasonFilter}".`
                    : "No spoiled, expired, or lost product write-offs have been logged yet."}
                </p>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setWasteTargetProduct(null);
                    setIsWasteModalOpen(true);
                  }}
                >
                  + Record Incident Write-Off
                </Button>
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
                        userSelect: "none",
                      }}
                    >
                      <th
                        style={{ padding: "0.85rem 1.25rem", cursor: "pointer" }}
                        onClick={() => handleWasteSort("date")}
                        title="Sort by Date"
                      >
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                          Date {wasteSortField === "date" ? (wasteSortOrder === "asc" ? "▲" : "▼") : "↕"}
                        </span>
                      </th>
                      <th
                        style={{ padding: "0.85rem 1.25rem", cursor: "pointer" }}
                        onClick={() => handleWasteSort("sku")}
                        title="Sort by Product SKU"
                      >
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                          Product SKU {wasteSortField === "sku" ? (wasteSortOrder === "asc" ? "▲" : "▼") : "↕"}
                        </span>
                      </th>
                      <th
                        style={{ padding: "0.85rem 1.25rem", cursor: "pointer" }}
                        onClick={() => handleWasteSort("reason")}
                        title="Sort by Reason"
                      >
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                          Reason {wasteSortField === "reason" ? (wasteSortOrder === "asc" ? "▲" : "▼") : "↕"}
                        </span>
                      </th>
                      <th
                        style={{ padding: "0.85rem 1.25rem", cursor: "pointer" }}
                        onClick={() => handleWasteSort("location")}
                        title="Sort by Location"
                      >
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                          Location {wasteSortField === "location" ? (wasteSortOrder === "asc" ? "▲" : "▼") : "↕"}
                        </span>
                      </th>
                      <th
                        style={{ padding: "0.85rem 1.25rem", cursor: "pointer" }}
                        onClick={() => handleWasteSort("qty")}
                        title="Sort by Quantity Lost"
                      >
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                          Quantity Lost {wasteSortField === "qty" ? (wasteSortOrder === "asc" ? "▲" : "▼") : "↕"}
                        </span>
                      </th>
                      <th
                        style={{ padding: "0.85rem 1.25rem", cursor: "pointer" }}
                        onClick={() => handleWasteSort("cost")}
                        title="Sort by Unit Cost"
                      >
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                          Unit Cost {wasteSortField === "cost" ? (wasteSortOrder === "asc" ? "▲" : "▼") : "↕"}
                        </span>
                      </th>
                      <th
                        style={{ padding: "0.85rem 1.25rem", cursor: "pointer" }}
                        onClick={() => handleWasteSort("total")}
                        title="Sort by Total Loss Value"
                      >
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                          Total Loss Value {wasteSortField === "total" ? (wasteSortOrder === "asc" ? "▲" : "▼") : "↕"}
                        </span>
                      </th>
                      <th style={{ padding: "0.85rem 1.25rem" }}>Notes / Logged By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedWasteRecords.map((w) => (
                      <tr
                        key={w.id}
                        style={{
                          borderBottom: "1px solid var(--border-subtle)",
                          fontSize: "0.875rem",
                          transition: "background-color var(--transition-fast)",
                        }}
                      >
                        {/* Date */}
                        <td style={{ padding: "0.9rem 1.25rem", color: "var(--text-secondary)" }}>
                          {w.wasteDate ? new Date(w.wasteDate).toLocaleDateString() : "—"}
                        </td>

                        {/* Product SKU */}
                        <td style={{ padding: "0.9rem 1.25rem" }}>
                          <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                            {w.product?.productName || `Product #${w.productId}`}
                          </div>
                          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "monospace" }}>
                            {w.product?.sku || `#${w.productId}`}
                          </div>
                        </td>

                        {/* Reason */}
                        <td style={{ padding: "0.9rem 1.25rem" }}>
                          <Badge
                            variant={
                              w.reason === "EXPIRED"
                                ? "danger"
                                : w.reason === "SPOILED"
                                ? "danger"
                                : w.reason === "LOST"
                                ? "warning"
                                : w.reason === "DAMAGED"
                                ? "danger"
                                : "default"
                            }
                          >
                            {w.reason === "EXPIRED" && "⌛ "}
                            {w.reason === "SPOILED" && "🥀 "}
                            {w.reason === "LOST" && "🔍 "}
                            {w.reason === "DAMAGED" && "💥 "}
                            {w.reason === "SCRAP" && "🗑️ "}
                            {w.reason}
                          </Badge>
                        </td>

                        {/* Location */}
                        <td style={{ padding: "0.9rem 1.25rem" }}>
                          {w.facility ? (
                            <div>
                              <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                                {w.facility.facilityName}
                              </span>
                              {w.section && (
                                <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "block" }}>
                                  Sec: {w.section.sectionName}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: "var(--text-muted)" }}>General</span>
                          )}
                        </td>

                        {/* Quantity Lost */}
                        <td style={{ padding: "0.9rem 1.25rem", fontWeight: 600, color: "var(--accent-rose)" }}>
                          -{w.quantity} {w.product?.unitLabel || "units"}
                        </td>

                        {/* Unit Cost */}
                        <td style={{ padding: "0.9rem 1.25rem", color: "var(--text-secondary)" }}>
                          {formatIDR(w.unitCost || 0)}
                        </td>

                        {/* Total Loss Value */}
                        <td style={{ padding: "0.9rem 1.25rem", fontWeight: 700, color: "var(--accent-rose)" }}>
                          {formatIDR(w.totalCost || 0)}
                        </td>

                        {/* Notes / Logged By */}
                        <td style={{ padding: "0.9rem 1.25rem", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                          <div>{w.notes || "—"}</div>
                          {w.wasteCreatedBy && (
                            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
                              By: @{w.wasteCreatedBy.username || w.wasteCreatedBy.email}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      ) : (
        <>
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
              id="search-inventory-input"
              placeholder="Search by SKU, product name, or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginRight: "0.15rem" }}>
              Facility:
            </span>
            <select
              id="filter-inv-facility-select"
              value={selectedFacilityId}
              onChange={(e) => setSelectedFacilityId(e.target.value)}
              style={{
                padding: "0.45rem 0.85rem",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-subtle)",
                backgroundColor: "var(--surface, var(--bg-surface-elevated))",
                color: "var(--text-primary)",
                fontSize: "0.85rem",
                cursor: "pointer",
                outline: "none",
                fontWeight: 500,
              }}
            >
              <option value="ALL">🏢 All Facilities (Consolidated)</option>
              {facilities.map((fac) => {
                const icon =
                  fac.type === "STORE"
                    ? "🏪"
                    : fac.type === "OFFICE"
                    ? "💼"
                    : fac.type === "FACTORY"
                    ? "🏗️"
                    : "🏬";
                return (
                  <option key={fac.id} value={String(fac.id)}>
                    {icon} {fac.facilityName} ({fac.type})
                  </option>
                );
              })}
            </select>

            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginLeft: "0.35rem", marginRight: "0.15rem" }}>
              Filter:
            </span>
            <select
              id="filter-inv-stock-select"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as StockFilterType)}
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
              <option value="all">All Products ({products.length})</option>
              <option value="instock">🟢 In Stock ({inStockCount})</option>
              <option value="lowstock">🟡 Low Stock ({lowStockCount})</option>
              <option value="outofstock">🔴 Out of Stock ({outOfStockCount})</option>
            </select>

            <Button
              id="refresh-inventory-btn"
              size="sm"
              variant="ghost"
              onClick={loadProducts}
              title="Refresh inventory"
              style={{ marginLeft: "0.5rem" }}
            >
              🔄 Refresh
            </Button>
          </div>
        </div>
      </Card>

      {/* Stock Table */}
      <Card style={{ padding: "0", overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
            <p>Loading inventory balances...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3.5rem 1.5rem", color: "var(--text-secondary)" }}>
            <span style={{ fontSize: "2.5rem" }}>📦</span>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginTop: "1rem", color: "var(--text-primary)" }}>
              No Inventory Items Found
            </h3>
            <p style={{ marginTop: "0.4rem", fontSize: "0.875rem", maxWidth: "400px", margin: "0.4rem auto 1.25rem auto" }}>
              {searchQuery || filterType !== "all"
                ? "No products match the selected inventory filter."
                : selectedFacilityObj
                ? `No products currently stored in ${selectedFacilityObj.facilityName}.`
                : "No products exist in the catalog to track inventory."}
            </p>
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
                    userSelect: "none",
                  }}
                >
                  <th
                    style={{ padding: "0.85rem 1.25rem", cursor: "pointer" }}
                    onClick={() => handleSort("sku")}
                    title="Sort by SKU / ID"
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                      SKU / ID {sortField === "sku" ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}
                    </span>
                  </th>
                  <th
                    style={{ padding: "0.85rem 1.25rem", cursor: "pointer" }}
                    onClick={() => handleSort("name")}
                    title="Sort by Product Name"
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                      Product Name {sortField === "name" ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}
                    </span>
                  </th>
                  <th
                    style={{ padding: "0.85rem 1.25rem", cursor: "pointer" }}
                    onClick={() => handleSort("category")}
                    title="Sort by Category"
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                      Category {sortField === "category" ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}
                    </span>
                  </th>
                  <th
                    style={{ padding: "0.85rem 1.25rem", cursor: "pointer" }}
                    onClick={() => handleSort("stock")}
                    title="Sort by Stock Level"
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                      {selectedFacilityObj ? `Stock (${selectedFacilityObj.facilityName})` : "Stock Level (Total)"}{" "}
                      {sortField === "stock" ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}
                    </span>
                  </th>
                  <th style={{ padding: "0.85rem 1.25rem" }}>Facility Breakdown</th>
                  <th
                    style={{ padding: "0.85rem 1.25rem", cursor: "pointer" }}
                    onClick={() => handleSort("status")}
                    title="Sort by Status"
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                      Status {sortField === "status" ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}
                    </span>
                  </th>
                  <th
                    style={{ padding: "0.85rem 1.25rem", cursor: "pointer" }}
                    onClick={() => handleSort("price")}
                    title="Sort by Unit Price"
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                      Unit Price {sortField === "price" ? (sortOrder === "asc" ? "▲" : "▼") : "↕"}
                    </span>
                  </th>
                  <th style={{ padding: "0.85rem 1.25rem", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((p) => {
                  const stock = p.currentStock ?? 0;
                  const alertEnabled = p.isLowStockAlertEnabled !== false;
                  const minThresh = (p.minStock && p.minStock > 0) ? p.minStock : 0;
                  const isDepleted = alertEnabled && stock <= 0;
                  const isLow = alertEnabled && minThresh > 0 && stock > 0 && stock <= minThresh;
                  const statusVariant = isDepleted ? "danger" : isLow ? "warning" : "success";
                  const statusLabel = !alertEnabled ? "Standard" : isDepleted ? "Depleted" : isLow ? "Low Stock" : "In Stock";

                  return (
                    <tr
                      key={p.id}
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
                      {/* SKU / ID */}
                      <td style={{ padding: "0.9rem 1.25rem", color: "var(--text-secondary)", fontFamily: "monospace" }}>
                        <div>#{p.id}</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{p.sku || "NO-SKU"}</div>
                      </td>

                      {/* Product Name */}
                      <td style={{ padding: "0.9rem 1.25rem" }}>
                        <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{p.productName}</div>
                        {p.description && (
                          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", maxWidth: "240px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {p.description}
                          </div>
                        )}
                      </td>

                      {/* Category */}
                      <td style={{ padding: "0.9rem 1.25rem" }}>
                        <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                          {p.category?.categoryName || "General"}
                        </span>
                      </td>

                      {/* Stock Level */}
                      <td style={{ padding: "0.9rem 1.25rem" }}>
                        <div style={{ display: "flex", alignItems: "baseline", gap: "0.35rem" }}>
                          <span
                            style={{
                              fontSize: "1.15rem",
                              fontWeight: 700,
                              color: isDepleted ? "var(--accent-rose)" : isLow ? "var(--accent-amber)" : "var(--text-primary)",
                            }}
                          >
                            {stock}
                          </span>
                          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                            {p.unitLabel || "units"}
                          </span>
                        </div>
                      </td>

                      {/* Facility Breakdown Badges */}
                      <td style={{ padding: "0.9rem 1.25rem" }}>
                        {p.storageStocks && p.storageStocks.length > 0 ? (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", maxWidth: "260px" }}>
                            {p.storageStocks.map((st) => (
                              <span
                                key={st.id}
                                style={{
                                  fontSize: "0.72rem",
                                  padding: "2px 6px",
                                  borderRadius: "4px",
                                  backgroundColor:
                                    selectedFacilityId === String(st.facilityId)
                                      ? "rgba(16, 185, 129, 0.2)"
                                      : "rgba(255, 255, 255, 0.06)",
                                  border:
                                    selectedFacilityId === String(st.facilityId)
                                      ? "1px solid var(--accent-emerald)"
                                      : "1px solid var(--border-subtle)",
                                  color: "var(--text-primary)",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "0.25rem",
                                }}
                              >
                                <strong style={{ color: "var(--accent-cyan)" }}>{st.facility?.facilityName || `Fac #${st.facilityId}`}:</strong>
                                <span>{st.stock}</span>
                                {st.section && (
                                  <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>
                                    ({st.section.sectionCode})
                                  </span>
                                )}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                            General Warehouse
                          </span>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td style={{ padding: "0.9rem 1.25rem" }}>
                        <Badge variant={statusVariant}>{statusLabel}</Badge>
                      </td>

                      {/* Unit Price */}
                      <td style={{ padding: "0.9rem 1.25rem", fontWeight: 500, color: "var(--text-secondary)" }}>
                        {formatIDR(p.retailPrice || 0)}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: "0.9rem 1.25rem", textAlign: "right" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                          {canCreatePo && (
                            <Button
                              id={`reorder-po-btn-${p.id}`}
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setPoInitialProductId(p.id);
                                setIsPoModalOpen(true);
                              }}
                              title="Issue Purchase Order for this item"
                            >
                              🛒 PO
                            </Button>
                          )}
                          <Button
                            id={`view-ledger-btn-${p.id}`}
                            size="sm"
                            variant="ghost"
                            onClick={() => openHistoryModal(p)}
                            title="View stock movement logs"
                          >
                            📜 History
                          </Button>
                          {canAdjust && (
                            <>
                              <Button
                                id={`adjust-stock-btn-${p.id}`}
                                size="sm"
                                variant="secondary"
                                onClick={() => openAdjustModal(p)}
                              >
                                ⚖️ Adjust
                              </Button>

                              <Button
                                id={`waste-stock-btn-${p.id}`}
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setWasteTargetProduct(p);
                                  setIsWasteModalOpen(true);
                                }}
                                title="Record loss, spoilage, or expiration for this item"
                                style={{ color: "var(--accent-rose)", borderColor: "rgba(239, 68, 68, 0.3)" }}
                              >
                                🗑️ Write-Off
                              </Button>
                            </>
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
        </>
      )}
      {/* Stock Adjustment Modal */}
      {isAdjustOpen && selectedProduct && (
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
          }}
        >
          <Card
            style={{
              width: "100%",
              maxWidth: "540px",
              backgroundColor: "var(--bg-surface)",
              border: "1px solid var(--border-glow)",
              borderRadius: "var(--radius-lg)",
              padding: "1.75rem",
              boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <div>
                <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--text-primary)" }}>
                  Stock Adjustment
                </h3>
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.15rem" }}>
                  Record inventory movement for a specific facility & section
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAdjustOpen(false)}
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

            {adjustError && (
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
                {adjustError}
              </div>
            )}

            <form onSubmit={handleAdjustSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
              {/* Product Selector */}
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.4rem" }}>
                  Target Product SKU
                </label>
                <select
                  value={selectedProduct.id}
                  onChange={(e) => {
                    const found = products.find((p) => p.id === Number(e.target.value));
                    if (found) setSelectedProduct(found);
                  }}
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
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.productName} ({p.sku || `#${p.id}`}) — Current: {p.currentStock ?? 0} {p.unitLabel || "units"}
                    </option>
                  ))}
                </select>
              </div>

              {/* Target Facility & Section Selector */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.4rem" }}>
                    Destination Facility
                  </label>
                  <select
                    value={adjustFacilityId ?? ""}
                    onChange={(e) => {
                      const val = e.target.value ? Number(e.target.value) : undefined;
                      setAdjustFacilityId(val);
                      setAdjustSectionId(undefined);
                    }}
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
                    <option value="">(Global / No specific facility)</option>
                    {facilities.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.facilityName} ({f.type})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.4rem" }}>
                    Section (Optional)
                  </label>
                  <select
                    disabled={!adjustFacilityId || adjustFacilitySections.length === 0}
                    value={adjustSectionId ?? ""}
                    onChange={(e) => setAdjustSectionId(e.target.value ? Number(e.target.value) : undefined)}
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
                    <option value="">(Entire facility)</option>
                    {adjustFacilitySections.map((sec) => (
                      <option key={sec.id} value={sec.id}>
                        {sec.sectionName} ({sec.sectionCode})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Adjustment Mode Switcher */}
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.4rem" }}>
                  Adjustment Action
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem" }}>
                  <Button
                    type="button"
                    size="sm"
                    variant={adjustType === "IN" ? "primary" : "ghost"}
                    onClick={() => setAdjustType("IN")}
                    style={{ justifyContent: "center" }}
                  >
                    📥 Stock In (+)
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={adjustType === "OUT" ? "danger" : "ghost"}
                    onClick={() => setAdjustType("OUT")}
                    style={{ justifyContent: "center" }}
                  >
                    📤 Stock Out (-)
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={adjustType === "ADJUSTMENT" ? "secondary" : "ghost"}
                    onClick={() => setAdjustType("ADJUSTMENT")}
                    style={{ justifyContent: "center" }}
                  >
                    🔄 Audit (Set)
                  </Button>
                </div>
              </div>

              {/* Quantity */}
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.4rem" }}>
                  {adjustType === "ADJUSTMENT" ? "Exact Count Counted" : "Units Quantity"}
                </label>
                <Input
                  id="adjust-quantity-input"
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={adjustQuantity}
                  onChange={(e) => setAdjustQuantity(Number(e.target.value))}
                />
              </div>

              {/* Reference */}
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.4rem" }}>
                  Reference / Document Number (Optional)
                </label>
                <Input
                  id="adjust-reference-input"
                  placeholder="e.g. PO-89214, AUDIT-2026-Q4, DAMAGE-01"
                  value={adjustReference}
                  onChange={(e) => setAdjustReference(e.target.value)}
                />
              </div>

              {/* Notes */}
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.4rem" }}>
                  Notes & Reasons (Optional)
                </label>
                <Input
                  id="adjust-notes-input"
                  placeholder="e.g. Broken package during transit, annual audit reconciliation"
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.75rem" }}>
                <Button type="button" variant="ghost" onClick={() => setIsAdjustOpen(false)}>
                  Cancel
                </Button>
                <Button id="submit-adjust-btn" type="submit" isLoading={adjusting}>
                  Confirm Adjustment
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Stock History Modal */}
      {historyProduct && (
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
          }}
        >
          <Card
            style={{
              width: "100%",
              maxWidth: "750px",
              maxHeight: "85vh",
              overflowY: "auto",
              backgroundColor: "var(--bg-surface)",
              border: "1px solid var(--border-glow)",
              borderRadius: "var(--radius-lg)",
              padding: "1.75rem",
              boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem" }}>
              <div>
                <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--text-primary)" }}>
                  Stock Ledger: {historyProduct.productName}
                </h3>
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.15rem" }}>
                  SKU: {historyProduct.sku || "N/A"} | Current Total Stock: <strong>{historyProduct.currentStock ?? 0} {historyProduct.unitLabel || "units"}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setHistoryProduct(null)}
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

            {/* Modal Facility Filter Filter */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem", padding: "0.5rem 0.75rem", backgroundColor: "rgba(255,255,255,0.03)", borderRadius: "6px" }}>
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Filter by Facility:</span>
              <select
                value={historyFacilityFilter}
                onChange={(e) => openHistoryModal(historyProduct, e.target.value)}
                style={{
                  padding: "0.3rem 0.6rem",
                  fontSize: "0.8rem",
                  backgroundColor: "var(--bg-surface-elevated)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "4px",
                  color: "var(--text-primary)",
                  outline: "none",
                }}
              >
                <option value="ALL">All Facilities</option>
                {facilities.map((fac) => (
                  <option key={fac.id} value={fac.id}>
                    {fac.facilityName}
                  </option>
                ))}
              </select>
            </div>

            {historyLoading ? (
              <p style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>
                Loading ledger entries...
              </p>
            ) : historyItems.length === 0 ? (
              <div style={{ textAlign: "center", padding: "2.5rem 1rem", color: "var(--text-secondary)" }}>
                <span style={{ fontSize: "2rem" }}>📜</span>
                <p style={{ marginTop: "0.5rem" }}>No stock transactions recorded for this product yet.</p>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.85rem" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border-subtle)", color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase" }}>
                      <th style={{ padding: "0.6rem 0" }}>Date</th>
                      <th>Facility / Section</th>
                      <th>Type</th>
                      <th>Qty</th>
                      <th>Balance</th>
                      <th>Ref / Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyItems.map((item) => (
                      <tr key={item.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                        <td style={{ padding: "0.65rem 0", color: "var(--text-secondary)" }}>
                          {item.transactionDate ? new Date(item.transactionDate).toLocaleDateString() : "—"}
                        </td>
                        <td>
                          {item.facility ? (
                            <div>
                              <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{item.facility.facilityName}</span>
                              {item.section && (
                                <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "block" }}>
                                  Sec: {item.section.sectionName}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: "var(--text-muted)" }}>—</span>
                          )}
                        </td>
                        <td>
                          <Badge
                            variant={
                              item.transactionType === "IN"
                                ? "success"
                                : item.transactionType === "OUT"
                                ? "danger"
                                : "warning"
                            }
                          >
                            {item.transactionType}
                          </Badge>
                        </td>
                        <td style={{ fontWeight: 600 }}>
                          {item.transactionType === "IN" ? `+${item.quantity}` : item.transactionType === "OUT" ? `-${item.quantity}` : item.quantity}
                        </td>
                        <td style={{ fontWeight: 600, color: "var(--accent-cyan)" }}>
                          {item.currentStock}
                        </td>
                        <td style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>
                          <div>{item.reference || "—"}</div>
                          {item.notes && <div style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>{item.notes}</div>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1.25rem" }}>
              <Button size="sm" variant="ghost" onClick={() => setHistoryProduct(null)}>
                Close
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Waste Write-Off Modal */}
      <AddProductWasteModal
        isOpen={isWasteModalOpen}
        onClose={() => {
          setIsWasteModalOpen(false);
          setWasteTargetProduct(null);
        }}
        products={products}
        facilities={facilities}
        initialProduct={wasteTargetProduct}
        initialFacilityId={selectedFacilityId}
        onWasteCreated={() => {
          loadProducts();
          if (activeTab === "waste") {
            loadWasteRecords();
          }
        }}
      />

      {/* Purchase Order Modal in Inventory */}
      <AddPurchaseOrderModal
        isOpen={isPoModalOpen}
        initialProductId={poInitialProductId}
        onClose={() => {
          setIsPoModalOpen(false);
          setPoInitialProductId(undefined);
        }}
        onOrderCreated={() => {
          loadProducts();
        }}
      />
    </div>
  );
}
