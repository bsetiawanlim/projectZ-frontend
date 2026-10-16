"use client";

import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { productApi } from "@/lib/api";
import { ProductPriceManager, type PendingPriceItem } from "@/components/products/ProductPriceManager";
import type { ProductCategoryItem, ProductItem } from "@pz/shared";

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductCreated: (product: ProductItem) => void;
  initialParentProduct?: ProductItem | null;
}

export function AddProductModal({
  isOpen,
  onClose,
  onProductCreated,
  initialParentProduct = null,
}: AddProductModalProps) {
  const [productName, setProductName] = useState("");
  const [parentProductId, setParentProductId] = useState<number | "">("");
  const [availableParents, setAvailableParents] = useState<ProductItem[]>([]);
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [sku, setSku] = useState("");
  const [barcode, setBarcode] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [unitLabel, setUnitLabel] = useState("pcs");
  const [isTradeable, setIsTradeable] = useState(true);
  const [isLowStockAlertEnabled, setIsLowStockAlertEnabled] = useState(true);
  const [minStock, setMinStock] = useState<number | "">("");
  const [pendingPrices, setPendingPrices] = useState<PendingPriceItem[]>([]);

  const [categories, setCategories] = useState<ProductCategoryItem[]>([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryParentId, setNewCategoryParentId] = useState<number | "">("");
  const [showNewCatInput, setShowNewCatInput] = useState(false);


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

  const hierarchicalCategories = React.useMemo(() => {
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      productApi
        .getCategories()
        .then((res) => setCategories(res.data || []))
        .catch((err) => console.error("Could not load categories", err));

      productApi
        .getProducts({ limit: 100 })
        .then((res) => {
          // Filter root products only as potential parents
          const list = (res.data || []).filter((p) => !p.parentProductId);
          setAvailableParents(list);
        })
        .catch((err) => console.error("Could not load parent products", err));

      if (initialParentProduct) {
        setParentProductId(initialParentProduct.id);
        if (initialParentProduct.productCategoryId) {
          setCategoryId(initialParentProduct.productCategoryId);
        }
      } else {
        setParentProductId("");
      }
    }
  }, [isOpen, initialParentProduct]);

  if (!isOpen) return null;

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
      const res = await productApi.createProduct({
        productName: productName.trim(),
        productCategoryId: categoryId ? Number(categoryId) : undefined,
        parentProductId: parentProductId ? Number(parentProductId) : undefined,
        sku: sku.trim() || undefined,
        barcode: barcode.trim() || undefined,
        description: description.trim() || undefined,
        isTradeable,
        isLowStockAlertEnabled,
        minStock: minStock !== "" ? Number(minStock) : 0,
        imageUrl: imageUrl.trim() || undefined,
        unitLabel: unitLabel.trim() || undefined,
      });

      if (res && res.data) {
        const createdProduct = res.data;

        // Save any pending customer group price points
        if (pendingPrices.length > 0) {
          for (const pr of pendingPrices) {
            try {
              await productApi.createPrice({
                productId: createdProduct.id,
                customerGroup: pr.customerGroup,
                priceType: pr.priceType,
                amount: pr.amount,
                currency: pr.currency || "IDR",
                startDate: pr.startDate ? new Date(pr.startDate).toISOString() : undefined,
                endDate: pr.endDate ? new Date(pr.endDate).toISOString() : undefined,
              });
            } catch (priceErr) {
              console.error("Failed to save price tier", priceErr);
            }
          }
        }

        onProductCreated(createdProduct);
        onClose();
        // Reset form
        setProductName("");
        setCategoryId("");
        setSku("");
        setBarcode("");
        setDescription("");
        setMinStock("");
        setPendingPrices([]);
      }
    } catch (err: any) {
      console.error("Failed to create product", err);
      setError(err?.message || "Failed to create product.");
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
    >
      <div style={{ width: "100%", maxWidth: "660px" }}>
        <Card
          glass
          style={{
            padding: "1.75rem",
            backgroundColor: "var(--bg-surface)",
            maxHeight: "90vh",
            overflowY: "auto",
          }}
        >

          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
            <div>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 700 }}>Add New Product</h2>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
                Add an item to the master catalog & POS inventory
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
              }}
            >
              ✕
            </button>
          </div>

          {error && (
            <div
              style={{
                padding: "0.75rem",
                backgroundColor: "rgba(244, 63, 94, 0.15)",
                border: "1px solid rgba(244, 63, 94, 0.3)",
                borderRadius: "var(--radius-md)",
                color: "var(--accent-rose)",
                fontSize: "0.85rem",
                marginBottom: "1rem",
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <Input
              id="product-name-input"
              label="Product Name *"
              placeholder="e.g. Lays Barbecue 68g"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              required
              autoFocus
            />

            {/* Parent Product Selector (Optional for Sub-Products / Variants) */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--text-secondary)" }}>
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
                      padding: 0,
                    }}
                  >
                    Clear Parent (Make Standalone)
                  </button>
                )}
              </div>
              <select
                id="product-parent-select"
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
                  padding: "0.6rem 0.9rem",
                  backgroundColor: "var(--bg-surface)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-md)",
                  color: "var(--text-primary)",
                  fontSize: "0.925rem",
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
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.1rem" }}>
                Select a parent product to make this item a sub-product / flavor / package variant.
              </p>
            </div>

            {/* Category */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--text-secondary)" }}>
                  Category
                </label>
                <button
                  type="button"
                  onClick={() => setShowNewCatInput(!showNewCatInput)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--primary)",
                    fontSize: "0.75rem",
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  {showNewCatInput ? "Select existing" : "+ New category"}
                </button>
              </div>

              {showNewCatInput ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  <div style={{ display: "flex", gap: "0.3rem" }}>
                    <input
                      placeholder="New category name"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      style={{
                        flex: 1,
                        padding: "0.55rem 0.75rem",
                        backgroundColor: "var(--bg-surface)",
                        border: "1px solid var(--border-subtle)",
                        borderRadius: "var(--radius-md)",
                        color: "var(--text-primary)",
                        fontSize: "0.85rem",
                        outline: "none",
                      }}
                    />
                    <Button type="button" size="sm" onClick={handleCreateCategoryInline}>
                      Add
                    </Button>
                  </div>
                  <select
                    value={newCategoryParentId}
                    onChange={(e) => setNewCategoryParentId(e.target.value ? Number(e.target.value) : "")}
                    style={{
                      padding: "0.45rem 0.65rem",
                      backgroundColor: "var(--bg-surface)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "var(--radius-md)",
                      color: "var(--text-secondary)",
                      fontSize: "0.8rem",
                      outline: "none",
                    }}
                  >
                    <option value="">No Parent (Root Category - 0 steps)</option>
                    {hierarchicalCategories.map(({ category: c, depth }) => {
                      const cannotBeParent = depth >= 5;
                      return (
                        <option key={c.id} value={c.id} disabled={cannotBeParent}>
                          {"— ".repeat(depth)}{c.categoryName} ({depth}/5 steps){cannotBeParent ? " [MAX 5 STEPS]" : ""}
                        </option>
                      );
                    })}
                  </select>
                </div>
              ) : (
                <select
                  id="product-category-select"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : "")}
                  style={{
                    width: "100%",
                    padding: "0.6rem 0.9rem",
                    backgroundColor: "var(--bg-surface)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-md)",
                    color: "var(--text-primary)",
                    fontSize: "0.925rem",
                    outline: "none",
                  }}
                >
                  <option value="">General / None</option>
                  {hierarchicalCategories.map(({ category: c, depth }) => (
                    <option key={c.id} value={c.id}>
                      {"— ".repeat(depth)}{c.categoryName} {depth > 0 ? `(${depth}/5 steps)` : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>


            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <Input
                id="product-sku-input"
                label="SKU (Optional)"
                placeholder="Leave blank to auto-generate"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
              />
              <Input
                id="product-barcode-input"
                label="Barcode / UPC (Optional)"
                placeholder="e.g. 8991234567890"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
              />
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
                    id="product-image-url-input"
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

            {/* Tradeable in POS Toggle */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0.85rem 1rem",
                backgroundColor: "var(--surface-muted, rgba(255,255,255,0.03))",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <div>
                <label
                  htmlFor="product-tradeable-toggle"
                  style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text-primary)", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.4rem" }}
                >
                  <span>🛒 Tradeable in POS</span>
                  <span style={{ fontSize: "0.75rem", padding: "0.15rem 0.45rem", borderRadius: "9999px", backgroundColor: isTradeable ? "rgba(16, 185, 129, 0.15)" : "rgba(148, 163, 184, 0.15)", color: isTradeable ? "#10b981" : "var(--text-muted)", fontWeight: 600 }}>
                    {isTradeable ? "Visible in POS" : "Recipe / Ingredient Only"}
                  </span>
                </label>
                <p style={{ fontSize: "0.775rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
                  Turn on if this item can be directly sold to customers. Turn off for internal ingredients or sub-recipes (e.g. raw ground coffee or intermediate mixes) that shouldn't appear on the POS register.
                </p>
              </div>
              <input
                id="product-tradeable-toggle"
                type="checkbox"
                checked={isTradeable}
                onChange={(e) => setIsTradeable(e.target.checked)}
                style={{ width: "1.2rem", height: "1.2rem", cursor: "pointer", accentColor: "var(--primary)" }}
              />
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
                  htmlFor="product-min-stock-input"
                  style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.4rem" }}
                >
                  <span>⚠️ Low Stock Alert Threshold (Min Stock)</span>
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Input
                    id="product-min-stock-input"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="e.g. 5 or 10"
                    value={minStock}
                    onChange={(e) => setMinStock(e.target.value === "" ? "" : Math.max(0, parseFloat(e.target.value)))}
                    style={{ width: "120px", textAlign: "right", fontWeight: 600 }}
                  />
                  <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>units</span>
                </div>
              </div>
              <p style={{ fontSize: "0.775rem", color: "var(--text-muted)", margin: 0 }}>
                When inventory falls to or below this threshold, alert warnings and badge notifications will appear in Inventory, POS, and Formula lists.
              </p>
              <div style={{ marginTop: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <input
                  type="checkbox"
                  id="add-product-low-stock-alert-toggle"
                  checked={isLowStockAlertEnabled}
                  onChange={(e) => setIsLowStockAlertEnabled(e.target.checked)}
                  style={{ width: "1rem", height: "1rem", cursor: "pointer", accentColor: "var(--primary)" }}
                />
                <label htmlFor="add-product-low-stock-alert-toggle" style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--text-primary)", cursor: "pointer" }}>
                  Enable Low Stock & 0-Stock Alerts for this product
                </label>
              </div>
            </div>

            {/* Customer Group Pricing Tiers */}
            <ProductPriceManager
              prices={pendingPrices}
              onAddPrice={(newPrice) => {
                setPendingPrices((prev) => [
                  ...prev,
                  { ...newPrice, tempId: `temp-${Date.now()}-${Math.random()}` },
                ]);
              }}
              onDeletePrice={(tempId) => {
                setPendingPrices((prev) =>
                  prev.filter((p) => p.tempId !== tempId)
                );
              }}
            />

            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <label style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--text-secondary)" }}>
                Description (Optional)
              </label>
              <textarea
                id="product-description-input"
                placeholder="Product specifications, unit details, etc."
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.6rem 0.9rem",
                  backgroundColor: "var(--bg-surface)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-md)",
                  color: "var(--text-primary)",
                  fontSize: "0.925rem",
                  outline: "none",
                  resize: "vertical",
                }}
              />
            </div>


            {/* Actions */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1rem" }}>
              <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
              <Button id="save-product-submit-btn" type="submit" disabled={loading}>
                {loading ? "Saving..." : "Save Product"}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
