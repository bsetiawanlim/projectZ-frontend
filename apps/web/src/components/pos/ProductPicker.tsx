"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { productApi } from "@/lib/api";
import { AddProductModal } from "@/components/products/AddProductModal";
import { TableQrModal } from "./TableQrModal";
import { useAuth } from "@/lib/authContext";
import { useDevice } from "@/lib/useDevice";
import { cartStore, formatIDR, type ProductItem, type ProductCategoryItem } from "@pz/shared";

export function ProductPicker() {
  const { user, canAccess } = useAuth();
  const device = useDevice();
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [categories, setCategories] = useState<ProductCategoryItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [isTableQrOpen, setIsTableQrOpen] = useState(false);
  const [activeFacilityId, setActiveFacilityId] = useState<number | null>(cartStore.getState().facilityId);

  const canCreateProduct = Boolean(
    user?.isSuperAdmin || canAccess("product", "create") || canAccess("product", "*")
  );

  // Subscribe to facility changes in POS cart
  useEffect(() => {
    const unsub = cartStore.subscribe((state) => {
      if (state.facilityId !== activeFacilityId) {
        setActiveFacilityId(state.facilityId);
      }
    });
    return () => unsub();
  }, [activeFacilityId]);

  const loadData = useCallback(async (currentFacilityId?: number | null) => {
    try {
      setLoading(true);
      const params: any = { limit: 100, isTradeable: true };
      if (currentFacilityId) {
        params.facilityId = currentFacilityId;
      }
      const [prodRes, catRes] = await Promise.all([
        productApi.getProducts(params).catch(() => ({ data: [] })),
        productApi.getCategories().catch(() => ({ data: [] })),
      ]);
      setProducts(prodRes.data || []);
      setCategories(catRes.data || []);
    } catch (err) {
      console.error("Failed to load products/categories", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(activeFacilityId);
  }, [activeFacilityId, loadData]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (p.isTradeable === false) return false;
      const matchesCategory = selectedCategory === null || p.productCategoryId === selectedCategory;
      const term = search.toLowerCase().trim();
      const matchesSearch =
        !term ||
        p.productName.toLowerCase().includes(term) ||
        (p.sku && p.sku.toLowerCase().includes(term)) ||
        (p.barcode && p.barcode.toLowerCase().includes(term));
      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, search]);

  const handleAddProduct = (p: ProductItem) => {
    const rawPrice = p.retailPrice ?? (p as any).productPrice?.[0]?.amount;
    const price = rawPrice !== undefined && rawPrice !== null ? Number(rawPrice) : 0;
    cartStore.getState().addItem({
      id: p.id,
      productName: p.productName,
      unitPrice: price,
      unitId: p.unitId,
    });
  };

  const handleAddDemoItem = (name: string, price: number, id: number) => {
    cartStore.getState().addItem({
      id,
      productName: name,
      unitPrice: price,
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem", height: "100%" }}>
      {/* Search & New Product Action */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
          <Input
            id="pos-product-search-input"
            placeholder={device.isSmallScreen ? "Search products..." : "Search by product name, SKU, or scan barcode (F2)..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              backgroundColor: "var(--bg-surface-elevated)",
              border: "1px solid var(--border-glow)",
              fontSize: device.isSmallScreen ? "0.85rem" : "1rem",
              padding: device.isSmallScreen ? "0.45rem 0.75rem" : "0.75rem 1rem",
              flex: 1,
              minWidth: "160px",
            }}
          />
          {canCreateProduct && (
            <Button
              id="pos-add-product-quick-btn"
              size={device.isSmallScreen ? "sm" : "md"}
              onClick={() => setIsAddProductModalOpen(true)}
              style={{ whiteSpace: "nowrap", flexShrink: 0 }}
            >
              + New Product
            </Button>
          )}
          <Button
            id="pos-table-qr-btn"
            variant="secondary"
            size={device.isSmallScreen ? "sm" : "md"}
            onClick={() => setIsTableQrOpen(true)}
            style={{ whiteSpace: "nowrap", flexShrink: 0 }}
            title="Generate & print table QR codes"
          >
            🪑 Table QRs
          </Button>
        </div>

        {/* Categories Bar */}
        <div style={{ display: "flex", gap: "0.5rem", overflowX: "auto", paddingBottom: "0.25rem" }}>
          <Button
            size="sm"
            variant={selectedCategory === null ? "primary" : "secondary"}
            onClick={() => setSelectedCategory(null)}
          >
            All Items
          </Button>
          {categories.map((c) => (
            <Button
              key={c.id}
              size="sm"
              variant={selectedCategory === c.id ? "primary" : "secondary"}
              onClick={() => setSelectedCategory(c.id)}
            >
              {c.categoryName}
            </Button>
          ))}
        </div>
      </div>

      {/* Catalog Grid */}
      <div style={{ flex: 1, overflowY: "auto", paddingRight: "0.25rem" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
            <p>Loading catalog items...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <Card style={{ textAlign: "center", padding: "3rem" }}>
            <p style={{ color: "var(--text-secondary)", marginBottom: "1.25rem" }}>
              {search ? `No items matching "${search}"` : "No items registered in the master catalog yet."}
            </p>
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", marginBottom: "1.5rem" }}>
              <Button size="md" onClick={() => setIsAddProductModalOpen(true)}>
                + Register New Product
              </Button>
            </div>
            <div style={{ borderTop: "1px dashed var(--border-subtle)", paddingTop: "1.25rem" }}>
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "0.5rem" }}>
                Or test with sample items:
              </span>
              <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center" }}>
                <Button size="sm" variant="secondary" onClick={() => handleAddDemoItem("Cement 50kg (Holcim)", 75000, 101)}>
                  + Demo Cement
                </Button>
                <Button size="sm" variant="secondary" onClick={() => handleAddDemoItem("Sand 1m³", 180000, 102)}>
                  + Demo Sand
                </Button>
                <Button size="sm" variant="secondary" onClick={() => handleAddDemoItem("Steel Rebar 10mm", 95000, 103)}>
                  + Demo Steel
                </Button>
              </div>
            </div>
          </Card>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(min(145px, 100%), 1fr))",
              gap: device.isSmallScreen ? "0.55rem" : "0.85rem",
            }}
          >
            {filteredProducts.map((p) => {
              const currentStockNum = Number(p.currentStock ?? 0);
              const isFormula = Boolean(p.hasFormula || (p.recipes && p.recipes.length > 0));

              // Compute how many can be produced from ingredient stock if recipes exist
              let producibleCount = 0;
              if (p.producibleStock !== undefined) {
                producibleCount = Number(p.producibleStock);
              } else if (isFormula && p.recipes && p.recipes.length > 0) {
                let minMakeable = Infinity;
                for (const r of p.recipes) {
                  const needed = Number(r.quantity);
                  if (needed <= 0) continue;
                  const avail = Number((r as any).ingredient?.currentStock ?? 0);
                  const makeable = Math.floor(avail / needed);
                  if (makeable < minMakeable) minMakeable = makeable;
                }
                producibleCount = minMakeable === Infinity ? 0 : Math.max(0, minMakeable);
              }

              // Formula products can be sold even when current stock is 0 as long as ingredients are sufficient
              const canSell = p.canBeSold !== undefined
                ? p.canBeSold
                : (isFormula
                  ? (currentStockNum > 0 || producibleCount > 0)
                  : (p.currentStock === undefined || currentStockNum > 0));

              const inStock = canSell;
              const rawPrice = p.retailPrice ?? (p as any).productPrice?.[0]?.amount;
              const hasPrice = rawPrice !== undefined && rawPrice !== null;
              const displayPrice = hasPrice ? Number(rawPrice) : 0;
              const primaryImage = p.productImages?.find((img) => img.isPrimary)?.imageUrl || p.productImages?.[0]?.imageUrl || p.imageUrl;

              // Determine badge text and badge color
              let badgeText = "Available";
              let badgeVariant: "success" | "danger" | "info" | "warning" = "success";

              if (currentStockNum > 0) {
                badgeText = `${currentStockNum} in stock${isFormula && producibleCount > 0 ? ` (+${producibleCount})` : ""}`;
                badgeVariant = "success";
              } else if (isFormula) {
                if (producibleCount > 0) {
                  badgeText = `Made to order (${producibleCount})`;
                  badgeVariant = "info";
                } else {
                  badgeText = "Out of ingredients";
                  badgeVariant = "danger";
                }
              } else {
                badgeText = p.currentStock !== undefined ? `${p.currentStock} in stock` : "Out of stock";
                badgeVariant = canSell ? "success" : "danger";
              }

              return (
                <Card
                  key={p.id}
                  id={`product-card-${p.id}`}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    padding: device.isSmallScreen ? "0.6rem" : "0.85rem",
                    cursor: canSell ? "pointer" : "not-allowed",
                    opacity: canSell ? 1 : 0.6,
                    backgroundColor: "var(--bg-surface)",
                    borderColor: "var(--border-subtle)",
                    transition: "all var(--transition-fast)",
                    overflow: "hidden",
                  }}
                  onClick={() => canSell && handleAddProduct(p)}
                >
                  <div>
                    {/* Product Image Thumbnail */}
                    <div
                      style={{
                        width: "100%",
                        height: device.isSmallScreen ? "85px" : "120px",
                        borderRadius: "var(--radius-md, 8px)",
                        overflow: "hidden",
                        backgroundColor: "var(--bg-surface-elevated, rgba(255,255,255,0.05))",
                        marginBottom: "0.75rem",
                        position: "relative",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {primaryImage ? (
                        <img
                          src={primaryImage}
                          alt={p.productName}
                          loading="lazy"
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            transition: "transform 0.25s ease",
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: "100%",
                            height: "100%",
                            color: "var(--text-muted)",
                            fontSize: "1.75rem",
                            userSelect: "none",
                            background: "linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.08) 100%)",
                          }}
                        >
                          📦
                        </div>
                      )}
                      <span
                        style={{
                          position: "absolute",
                          top: "6px",
                          right: "6px",
                          zIndex: 2,
                        }}
                      >
                        <Badge variant={badgeVariant}>
                          {badgeText}
                        </Badge>
                      </span>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontFamily: "monospace" }}>
                        {p.sku || "NO-SKU"}
                      </span>
                    </div>

                    <h4
                      style={{
                        fontSize: "0.92rem",
                        fontWeight: 600,
                        margin: "0.35rem 0 0.25rem",
                        color: "var(--text-primary)",
                        lineHeight: 1.3,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {p.productName}
                    </h4>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginTop: "0.85rem",
                      paddingTop: "0.6rem",
                      borderTop: "1px solid var(--border-subtle)",
                    }}
                  >
                    <span style={{ fontWeight: 700, fontSize: "0.95rem", color: hasPrice ? "var(--accent-emerald)" : "var(--text-muted)" }}>
                      {hasPrice ? formatIDR(displayPrice) : "Price not set"}
                    </span>
                    <span style={{ fontSize: "0.8rem", color: canSell ? "var(--primary)" : "var(--text-muted)", fontWeight: 600 }}>
                      {canSell ? "+ Add" : "Unavailable"}
                    </span>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <AddProductModal
        isOpen={isAddProductModalOpen}
        onClose={() => setIsAddProductModalOpen(false)}
        onProductCreated={(newProd) => {
          loadData();
          handleAddProduct(newProd);
        }}
      />

      <TableQrModal
        isOpen={isTableQrOpen}
        onClose={() => setIsTableQrOpen(false)}
      />
    </div>
  );
}