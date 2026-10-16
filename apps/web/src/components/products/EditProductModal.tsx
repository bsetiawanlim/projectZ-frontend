"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { productApi } from "@/lib/api";
import { parseRecipeMeta, encodeRecipeMeta } from "@/components/products/ProductRecipeModal";
import { ProductPriceManager } from "@/components/products/ProductPriceManager";
import type { ProductCategoryItem, ProductItem, ProductPriceItem } from "@pz/shared";

interface EditProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: ProductItem | null;
  onProductUpdated: (product: ProductItem) => void;
}

export function EditProductModal({
  isOpen,
  onClose,
  product,
  onProductUpdated,
}: EditProductModalProps) {
  const [productName, setProductName] = useState("");
  const [parentProductId, setParentProductId] = useState<number | "">("");
  const [availableParents, setAvailableParents] = useState<ProductItem[]>([]);
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [sku, setSku] = useState("");
  const [barcode, setBarcode] = useState("");
  const [unitLabel, setUnitLabel] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [description, setDescription] = useState("");
  const [isTradeable, setIsTradeable] = useState(true);
  const [isLowStockAlertEnabled, setIsLowStockAlertEnabled] = useState(true);
  const [minStock, setMinStock] = useState<number | "">("");
  const [prices, setPrices] = useState<ProductPriceItem[]>([]);
  const [pricesLoading, setPricesLoading] = useState(false);



  // Categories
  const [categories, setCategories] = useState<ProductCategoryItem[]>([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryParentId, setNewCategoryParentId] = useState<number | "">("");
  const [showNewCatInput, setShowNewCatInput] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper to compute depth (steps from root)
  const getCategoryDepth = (cat: ProductCategoryItem): number => {
    let depth = 0;
    let currentParentId = cat.parentCategoryId;
    const visited = new Set<number>();
    while (currentParentId && !visited.has(currentParentId)) {
      visited.add(currentParentId);
      depth++;
      const parent = categories.find((c) => c.id === currentParentId);
      currentParentId = parent?.parentCategoryId;
    }
    return depth;
  };

  const hierarchicalCategories = useMemo(() => {
    const depthMap = new Map<number, number>();
    categories.forEach((c) => depthMap.set(c.id, getCategoryDepth(c)));

    const roots = categories.filter((c) => !c.parentCategoryId);
    const result: Array<{ category: ProductCategoryItem; depth: number }> = [];

    const appendChildren = (parentId: number, currentDepth: number) => {
      const children = categories
        .filter((c) => c.parentCategoryId === parentId)
        .sort((a, b) => a.categoryName.localeCompare(b.categoryName));
      for (const child of children) {
        result.push({ category: child, depth: currentDepth });
        appendChildren(child.id, currentDepth + 1);
      }
    };

    roots
      .sort((a, b) => a.categoryName.localeCompare(b.categoryName))
      .forEach((root) => {
        result.push({ category: root, depth: 0 });
        appendChildren(root.id, 1);
      });

    const addedIds = new Set(result.map((r) => r.category.id));
    categories.forEach((c) => {
      if (!addedIds.has(c.id)) {
        result.push({ category: c, depth: depthMap.get(c.id) || 0 });
      }
    });

    return result;
  }, [categories]);

  useEffect(() => {
    if (isOpen) {
      productApi
        .getCategories()
        .then((res) => setCategories(res.data || []))
        .catch((err) => console.error("Could not load categories", err));

      productApi
        .getProducts({ limit: 100 })
        .then((res) => {
          // Filter root products only, excluding the current product itself
          const list = (res.data || []).filter((p) => !p.parentProductId && p.id !== product?.id);
          setAvailableParents(list);
        })
        .catch((err) => console.error("Could not load parent products", err));
    }
  }, [isOpen, product?.id]);

  const loadProductPrices = async (productId: number) => {
    setPricesLoading(true);
    try {
      const res = await productApi.getPrices(productId);
      setPrices(res.data || []);
    } catch (err) {
      console.error("Failed to load prices for product", err);
      setPrices([]);
    } finally {
      setPricesLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && product) {
      setProductName(product.productName || "");
      setParentProductId(product.parentProductId || "");
      setCategoryId(product.productCategoryId || "");
      setSku(product.sku || "");
      setBarcode(product.barcode || "");
      setUnitLabel(product.unitLabel || "pcs");
      const primaryImg = (product as any).productImages?.find((img: any) => img.isPrimary)?.imageUrl || (product as any).productImages?.[0]?.imageUrl || (product as any).imageUrl || "";
      setImageUrl(primaryImg);
      setIsTradeable(product.isTradeable !== false);
        setIsLowStockAlertEnabled(product.isLowStockAlertEnabled !== false);
      setMinStock(product.minStock !== undefined && product.minStock !== null ? Number(product.minStock) : "");

      // Parse clean description and preserve existing recipe specification
      const { cleanDescription } = parseRecipeMeta(product.description);
      setDescription(cleanDescription || "");
      setError(null);
      setShowNewCatInput(false);

      loadProductPrices(product.id);
    }
  }, [isOpen, product]);


  const handleAddPrice = async (newPrice: any) => {
    if (!product) return;
    try {
      await productApi.createPrice({
        productId: product.id,
        customerGroup: newPrice.customerGroup,
        priceType: newPrice.priceType,
        amount: newPrice.amount,
        currency: newPrice.currency || "IDR",
        startDate: newPrice.startDate ? new Date(newPrice.startDate).toISOString() : undefined,
        endDate: newPrice.endDate ? new Date(newPrice.endDate).toISOString() : undefined,
      });
      await loadProductPrices(product.id);
    } catch (err: any) {
      alert(err?.message || "Failed to add price tier");
    }
  };

  const handleDeletePrice = async (priceId: any) => {
    if (!window.confirm("Are you sure you want to remove this price tier?")) return;
    try {
      await productApi.deletePrice(Number(priceId));
      if (product) await loadProductPrices(product.id);
    } catch (err: any) {
      alert(err?.message || "Failed to delete price tier");
    }
  };


  if (!isOpen || !product) return null;

  const handleCreateCategoryInline = async () => {
    if (!newCategoryName.trim()) return;
    try {
      const res = await productApi.createCategory({
        categoryName: newCategoryName.trim(),
        parentCategoryId: newCategoryParentId ? Number(newCategoryParentId) : undefined,
      });
      if (res && res.data) {
        setCategories((prev) => [...prev, res.data]);
        setCategoryId(res.data.id);
        setNewCategoryName("");
        setNewCategoryParentId("");
        setShowNewCatInput(false);
      }
    } catch (err: any) {
      console.error("Failed to create category", err);
      setError(err?.message || "Failed to create category.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName.trim() || productName.trim().length < 3) {
      setError("Product name must be at least 3 characters.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Preserve any existing recipe spec from original description
      const { meta } = parseRecipeMeta(product.description);
      const hasRecipeMeta =
        (meta.labor && meta.labor.length > 0) ||
        (meta.equipment && meta.equipment.length > 0) ||
        Boolean(meta.instructions && meta.instructions.trim().length > 0);

      const finalDescription = hasRecipeMeta
        ? encodeRecipeMeta(description.trim(), meta)
        : description.trim();

      const res = await productApi.updateProduct({
        id: product.id,
        productName: productName.trim(),
        productCategoryId: categoryId ? Number(categoryId) : undefined,
        parentProductId: parentProductId ? Number(parentProductId) : null,
        sku: sku.trim() || undefined,
        barcode: barcode.trim() || undefined,
        unitLabel: unitLabel.trim() || undefined,
        isTradeable,
        isLowStockAlertEnabled,
        description: finalDescription,
        imageUrl: imageUrl.trim() || undefined,
      });

      if (res && res.data) {
        onProductUpdated(res.data);
        onClose();
      }
    } catch (err: any) {
      console.error("Failed to update product", err);
      setError(err?.message || "Failed to update product.");
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
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 60,
        padding: "1rem",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div style={{ width: "100%", maxWidth: "660px" }}>
        <Card
          style={{
            padding: "1.75rem",
            backgroundColor: "var(--bg-surface)",
            border: "1px solid var(--border-glow)",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
            maxHeight: "90vh",
            overflowY: "auto",
          }}
        >

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <h3 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-primary)" }}>
                  ✏️ Edit Product
                </h3>
                <Badge variant={isTradeable ? "success" : "default"}>
                  {isTradeable ? "🛒 Tradeable in POS" : "📦 Formula / Internal Only"}
                </Badge>
              </div>
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                Update catalog details, retail pricing, SKU, and category classification for ID #{product.id}
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
                padding: "0.25rem",
              }}
            >
              ✕
            </button>
          </div>

          {error && (
            <div
              style={{
                padding: "0.75rem 1rem",
                marginBottom: "1rem",
                borderRadius: "var(--radius-md)",
                backgroundColor: "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                color: "var(--accent-rose)",
                fontSize: "0.85rem",
              }}
            >
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {/* Product Name */}
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.3rem" }}>
                Product Name *
              </label>
              <Input
                id="edit-product-name-input"
                required
                placeholder="e.g. Lays Barbecue 68g"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
              />
            </div>

            {/* Parent Product Selector (Optional for Sub-Products / Variants) */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.3rem" }}>
                <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                  Parent Product (Optional - for Sub-Products / Variants)
                </label>
                {parentProductId && (
                  <button
                    type="button"
                    onClick={() => setParentProductId("")}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--text-muted)",
                      fontSize: "0.75rem",
                      cursor: "pointer",
                      textDecoration: "underline",
                    }}
                  >
                    Clear Parent (Make Standalone)
                  </button>
                )}
              </div>
              <select
                id="edit-product-parent-select"
                value={parentProductId}
                onChange={(e) => {
                  const val = e.target.value ? Number(e.target.value) : "";
                  setParentProductId(val);
                  if (val) {
                    const found = availableParents.find((p) => p.id === val);
                    if (found?.productCategoryId) {
                      setCategoryId(found.productCategoryId);
                    }
                  }
                }}
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
                <option value="">None (Independent Master Product, e.g. Lays)</option>
                {availableParents.map((parent) => (
                  <option key={parent.id} value={parent.id}>
                    📦 {parent.productName} ({parent.sku || `#${parent.id}`})
                  </option>
                ))}
              </select>
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                Assigning a parent groups this item as a flavour/size variant under that product.
              </p>
            </div>

            {/* Category selection */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.3rem" }}>
                <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Category</label>
                <button
                  type="button"
                  id="toggle-new-cat-inline-btn"
                  onClick={() => setShowNewCatInput(!showNewCatInput)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--accent-indigo)",
                    fontSize: "0.75rem",
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
                >
                  {showNewCatInput ? "Cancel" : "+ New Category"}
                </button>
              </div>

              {showNewCatInput ? (
                <div
                  style={{
                    padding: "0.75rem",
                    backgroundColor: "var(--bg-surface-elevated)",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border-subtle)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.5rem",
                    marginBottom: "0.5rem",
                  }}
                >
                  <Input
                    id="new-cat-inline-name-input"
                    placeholder="New Category Name (e.g. Specialty Beverages)"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                  />
                  <select
                    id="new-cat-inline-parent-select"
                    value={newCategoryParentId}
                    onChange={(e) => setNewCategoryParentId(e.target.value ? Number(e.target.value) : "")}
                    style={{
                      width: "100%",
                      padding: "0.5rem 0.75rem",
                      backgroundColor: "var(--bg-surface)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "var(--radius-md)",
                      color: "var(--text-primary)",
                      fontSize: "0.85rem",
                    }}
                  >
                    <option value="">No Parent (Root Category)</option>
                    {hierarchicalCategories.map(({ category, depth }) => (
                      <option key={category.id} value={category.id}>
                        {"\u00A0\u00A0".repeat(depth)}
                        {depth > 0 ? "↳ " : ""}
                        {category.categoryName}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    id="save-new-cat-inline-btn"
                    size="sm"
                    onClick={handleCreateCategoryInline}
                    disabled={!newCategoryName.trim()}
                  >
                    Save Category
                  </Button>
                </div>
              ) : (
                <select
                  id="edit-product-category-select"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : "")}
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
                  <option value="">No Category</option>
                  {hierarchicalCategories.map(({ category, depth }) => (
                    <option key={category.id} value={category.id}>
                      {"\u00A0\u00A0".repeat(depth)}
                      {depth > 0 ? "↳ " : ""}
                      {category.categoryName}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Unit Label */}
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.3rem" }}>
                Unit Label
              </label>
              <Input
                id="edit-product-unit-input"
                placeholder="e.g. pcs, cup, kg"
                value={unitLabel}
                onChange={(e) => setUnitLabel(e.target.value)}
              />
            </div>


            {/* SKU and Barcode Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.3rem" }}>
                  SKU (Item Code)
                </label>
                <Input
                  id="edit-product-sku-input"
                  placeholder="e.g. BEV-ESP-01"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.3rem" }}>
                  Barcode
                </label>
                <Input
                  id="edit-product-barcode-input"
                  placeholder="e.g. 8991234567890"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                />
              </div>
            </div>

                        {/* Image URL & Thumbnail Preview */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
                padding: "0.85rem 1rem",
                backgroundColor: "var(--bg-surface-elevated, rgba(255, 255, 255, 0.02))",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <span>🖼️ Product / Sub-Product Picture</span>
                </label>
                {imageUrl && (
                  <button
                    type="button"
                    onClick={() => setImageUrl("")}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--text-muted)",
                      fontSize: "0.75rem",
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    Clear Picture
                  </button>
                )}
              </div>

              <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                <div
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "8px",
                    backgroundColor: "rgba(0,0,0,0.25)",
                    border: "1px dashed var(--border-subtle)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                    flexShrink: 0,
                  }}
                >
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt="Product preview"
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      onError={(e) => {
                        (e.currentTarget as any).src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'><rect width='18' height='18' x='3' y='3' rx='2'/><circle cx='9' cy='9' r='2'/><path d='m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21'/></svg>";
                      }}
                    />
                  ) : (
                    <span style={{ fontSize: "1.5rem", opacity: 0.5 }}>☕</span>
                  )}
                </div>

                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                  <Input
                    id="edit-product-image-url-input"
                    placeholder="Paste image URL (e.g. https://... or /images/...)"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                  />
                  <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Quick presets:</span>
                    {[
                      { name: "Coffee", url: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=300&q=80" },
                      { name: "Matcha", url: "https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=300&q=80" },
                      { name: "Pastry", url: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=300&q=80" },
                      { name: "Beans", url: "https://images.unsplash.com/photo-1587734195503-904fca47e0e9?w=300&q=80" },
                    ].map((p) => (
                      <button
                        key={p.name}
                        type="button"
                        onClick={() => setImageUrl(p.url)}
                        style={{
                          fontSize: "0.7rem",
                          padding: "1px 6px",
                          borderRadius: "4px",
                          backgroundColor: "rgba(255,255,255,0.06)",
                          border: "1px solid var(--border-subtle)",
                          color: "var(--text-secondary)",
                          cursor: "pointer",
                        }}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* POS Tradeable Toggle */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0.75rem 1rem",
                backgroundColor: "var(--bg-surface-elevated)",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <div>
                <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)" }}>
                  🛒 Tradeable in POS Register
                </span>
                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.1rem" }}>
                  {isTradeable
                    ? "Product is visible and searchable by cashiers during POS checkout"
                    : "Product is internal / formula only and hidden from POS sales"}
                </p>
              </div>

              <label style={{ position: "relative", display: "inline-block", width: "44px", height: "24px" }}>
                <input
                  id="edit-product-tradeable-toggle"
                  type="checkbox"
                  checked={isTradeable}
                  onChange={(e) => setIsTradeable(e.target.checked)}
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span
                  style={{
                    position: "absolute",
                    cursor: "pointer",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: isTradeable ? "var(--accent-emerald)" : "var(--border-subtle)",
                    transition: "0.2s",
                    borderRadius: "24px",
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      content: '""',
                      height: "18px",
                      width: "18px",
                      left: isTradeable ? "22px" : "3px",
                      bottom: "3px",
                      backgroundColor: "white",
                      transition: "0.2s",
                      borderRadius: "50%",
                    }}
                  />
                </span>
              </label>
            </div>

                        {/* Minimum Low Stock Alert Threshold */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.4rem",
                padding: "0.85rem 1rem",
                borderRadius: "var(--radius-md)",
                backgroundColor: "var(--bg-surface-elevated, rgba(255, 255, 255, 0.02))",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label
                  htmlFor="edit-product-min-stock-input"
                  style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.4rem" }}
                >
                  <span>⚠️ Low Stock Alert Threshold (Min Stock)</span>
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Input
                    id="edit-product-min-stock-input"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="e.g. 5 or 10"
                    value={minStock}
                    onChange={(e) => setMinStock(e.target.value === "" ? "" : Math.max(0, parseFloat(e.target.value)))}
                    style={{ width: "120px", textAlign: "right", fontWeight: 600 }}
                  />
                  <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{unitLabel || "units"}</span>
                </div>
              </div>
              <p style={{ fontSize: "0.775rem", color: "var(--text-muted)", margin: 0 }}>
                When inventory falls to or below this threshold, alert warnings and badge notifications will appear across the system.
              </p>
              <div style={{ marginTop: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <input
                  type="checkbox"
                  id="edit-product-low-stock-alert-toggle"
                  checked={isLowStockAlertEnabled}
                  onChange={(e) => setIsLowStockAlertEnabled(e.target.checked)}
                  style={{ width: "1rem", height: "1rem", cursor: "pointer", accentColor: "var(--primary)" }}
                />
                <label htmlFor="edit-product-low-stock-alert-toggle" style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--text-primary)", cursor: "pointer" }}>
                  Enable Low Stock & 0-Stock Alerts for this product
                </label>
              </div>
            </div>

            {/* Customer Group Pricing Tiers */}
            <ProductPriceManager
              prices={prices}
              onAddPrice={handleAddPrice}
              onDeletePrice={handleDeletePrice}
              loading={pricesLoading}
            />

            {/* Description */}
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.3rem" }}>
                Description / Notes
              </label>
              <textarea
                id="edit-product-description-input"
                rows={3}
                placeholder="Brief item description or handling notes..."
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


            {/* Actions */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.5rem" }}>
              <Button
                type="button"
                id="cancel-edit-product-btn"
                variant="ghost"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                id="save-edit-product-btn"
                isLoading={loading}
              >
                ✓ Save Changes
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
