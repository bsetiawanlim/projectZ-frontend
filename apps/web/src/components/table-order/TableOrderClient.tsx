"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { posApi } from "@/lib/api";
import {
  formatIDR,
  type TableMenuItem,
  type TableMenuCategory,
  type TableMenuFacility,
  type SalesOrderRecord,
} from "@pz/shared";

interface CartOrderItem {
  product: TableMenuItem;
  quantity: number;
  notes: string;
}

export function TableOrderClient() {
  const searchParams = useSearchParams();
  const facilityIdParam = searchParams.get("facilityId");
  const tableNumberParam = searchParams.get("tableNumber");

  const facilityId = facilityIdParam ? Number(facilityIdParam) : null;
  const tableNumber = (tableNumberParam || "").trim();

  // Menu data
  const [facilityInfo, setFacilityInfo] = useState<TableMenuFacility | null>(null);
  const [categories, setCategories] = useState<TableMenuCategory[]>([]);
  const [products, setProducts] = useState<TableMenuItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // In-session cart
  const [cart, setCart] = useState<CartOrderItem[]>([]);
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  // Item note modal
  const [editingItemNote, setEditingItemNote] = useState<{ productId: number; note: string } | null>(null);

  // Order submission details
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submittedOrder, setSubmittedOrder] = useState<SalesOrderRecord | null>(null);

  // Load Menu for the specific scanned facility
  useEffect(() => {
    if (!facilityId) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setLoadError(null);

    posApi
      .getTableMenu(facilityId)
      .then((res) => {
        if (!isMounted) return;
        const data = res.data;
        if (data) {
          setFacilityInfo(data.facility ?? null);
          setCategories(data.categories || []);
          setProducts(data.products || []);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error("Failed to load table menu", err);
        setLoadError(err.message || "Unable to load menu. Please check your network connection.");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [facilityId]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCategory = selectedCategory === null || p.categoryId === selectedCategory;
      const matchesSearch =
        !searchQuery ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  // Cart operations
  const getItemQuantity = (productId: number) => {
    const item = cart.find((i) => i.product.id === productId);
    return item ? item.quantity : 0;
  };

  const getItemNotes = (productId: number) => {
    const item = cart.find((i) => i.product.id === productId);
    return item ? item.notes : "";
  };

  const handleAddToCart = (product: TableMenuItem) => {
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.product.id === product.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx]!, quantity: copy[idx]!.quantity + 1 };
        return copy;
      }
      return [...prev, { product, quantity: 1, notes: "" }];
    });
  };

  const handleUpdateQuantity = (productId: number, delta: number) => {
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.product.id === productId);
      if (idx === -1) return prev;
      const copy = [...prev];
      const newQty = copy[idx]!.quantity + delta;
      if (newQty <= 0) {
        copy.splice(idx, 1);
        return copy;
      }
      copy[idx] = { ...copy[idx]!, quantity: newQty };
      return copy;
    });
  };

  const handleSaveItemNote = (productId: number, note: string) => {
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.product.id === productId);
      if (idx === -1) return prev;
      const copy = [...prev];
      copy[idx] = { ...copy[idx]!, notes: note };
      return copy;
    });
    setEditingItemNote(null);
  };

  // Cart Totals
  const totalItemCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  const grandTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity * item.product.price, 0);
  }, [cart]);

  // Handle Order Submit (table and facility are strictly from the URL)
  const handlePlaceOrder = async () => {
    if (!facilityId || !tableNumber) {
      alert("Invalid table session. Please scan your table barcode.");
      return;
    }
    if (cart.length === 0) {
      alert("Your cart is empty. Please select items from the menu.");
      return;
    }

    try {
      setSubmitting(true);
      const res = await posApi.createTableOrder({
        facilityId,
        tableNumber,
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        notes: orderNotes.trim() || undefined,
        items: cart.map((item) => ({
          productId: item.product.id,
          unitId: item.product.unitId,
          quantity: item.quantity,
          unitPrice: item.product.price,
          discountPercentage: 0,
          notes: item.notes.trim() || undefined,
        })),
      });

      const order = (res as any).data?.salesOrder || (res as any).data || (res as any).salesOrder;
      setSubmittedOrder(order);
      setCart([]);
      setIsReviewOpen(false);
    } catch (err: any) {
      alert(err.message || "Failed to submit order. Please try again or alert a staff member.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Missing Table or Facility Screen (Customer cannot set/change them) ──
  if (!facilityId || !tableNumber) {
    return (
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: "var(--bg-primary)",
          color: "var(--text-primary)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "1.5rem",
          textAlign: "center",
        }}
      >
        <div
          style={{
            maxWidth: "460px",
            width: "100%",
            backgroundColor: "var(--bg-surface)",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--border-subtle)",
            padding: "2.5rem 1.5rem",
            boxShadow: "var(--shadow-glass)",
          }}
        >
          <div
            style={{
              width: "72px",
              height: "72px",
              borderRadius: "50%",
              backgroundColor: "rgba(99, 102, 241, 0.12)",
              border: "2px solid var(--border-glow)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1.25rem",
              fontSize: "2.2rem",
            }}
          >
            📷
          </div>
          <h2 style={{ fontSize: "1.35rem", fontWeight: 800 }}>Please Scan Your Table Barcode</h2>
          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: "0.875rem",
              marginTop: "0.5rem",
              lineHeight: 1.5,
            }}
          >
            To browse our digital menu and place an order, please scan the QR code sticker located directly on your dining table.
          </p>
          <div
            style={{
              marginTop: "1.5rem",
              padding: "0.85rem",
              borderRadius: "var(--radius-md)",
              backgroundColor: "var(--bg-surface-elevated)",
              border: "1px solid var(--border-subtle)",
              fontSize: "0.8rem",
              color: "var(--text-muted)",
            }}
          >
            Table numbers and store locations are assigned automatically by the scanned QR code.
          </div>
        </div>
      </div>
    );
  }

  // ── Success Confirmation Screen ──────────────────────────────────────────
  if (submittedOrder) {
    return (
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: "var(--bg-primary)",
          color: "var(--text-primary)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "1.5rem",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "460px",
            backgroundColor: "var(--bg-surface)",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--border-glow)",
            padding: "2rem 1.5rem",
            textAlign: "center",
            boxShadow: "var(--shadow-glass)",
          }}
        >
          <div
            style={{
              width: "72px",
              height: "72px",
              borderRadius: "50%",
              backgroundColor: "rgba(16, 185, 129, 0.15)",
              border: "2px solid var(--accent-emerald)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1.25rem",
              fontSize: "2.2rem",
            }}
          >
            ✅
          </div>

          <h2 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--text-primary)" }}>
            Order Sent to Kitchen!
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: "0.35rem" }}>
            Your meal is being prepared. Staff will deliver it to your table shortly.
          </p>

          <div
            style={{
              margin: "1.5rem 0",
              padding: "1rem",
              borderRadius: "var(--radius-md)",
              backgroundColor: "var(--bg-surface-elevated)",
              border: "1px solid var(--border-subtle)",
              textAlign: "left",
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
              fontSize: "0.85rem",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>Order Reference:</span>
              <span style={{ fontWeight: 700, color: "var(--primary)" }}>{submittedOrder.orderNumber}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>Table:</span>
              <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                🪑 Table {submittedOrder.tableNumber || tableNumber}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>Outlet:</span>
              <span>{facilityInfo?.facilityName || "Main Outlet"}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>Status:</span>
              <span style={{ fontWeight: 700, color: "var(--accent-amber)" }}>Received / In Preparation</span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                borderTop: "1px dashed var(--border-subtle)",
                paddingTop: "0.5rem",
                marginTop: "0.25rem",
                fontWeight: 700,
              }}
            >
              <span>Total Amount:</span>
              <span style={{ color: "var(--accent-emerald)" }}>{formatIDR(submittedOrder.grandTotal)}</span>
            </div>
          </div>

          <button
            onClick={() => {
              setSubmittedOrder(null);
            }}
            style={{
              width: "100%",
              padding: "0.85rem",
              backgroundColor: "var(--primary)",
              color: "#ffffff",
              fontWeight: 700,
              fontSize: "0.95rem",
              borderRadius: "var(--radius-md)",
              border: "none",
              cursor: "pointer",
              transition: "background var(--transition-fast)",
            }}
          >
            + Order More Food & Drinks
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--bg-primary)",
        color: "var(--text-primary)",
        display: "flex",
        flexDirection: "column",
        paddingBottom: totalItemCount > 0 ? "90px" : "2rem",
      }}
    >
      {/* Top Banner / Store Header */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 40,
          backgroundColor: "rgba(17, 22, 34, 0.85)",
          backdropFilter: "blur(14px)",
          borderBottom: "1px solid var(--border-subtle)",
          padding: "0.85rem 1rem",
        }}
      >
        <div style={{ maxWidth: "800px", margin: "0 auto" }}>
          {/* Outlet Title & Static Fixed Table Pill */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <span style={{ fontSize: "1.1rem" }}>🍽️</span>
                <h1 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--text-primary)" }}>
                  {facilityInfo?.facilityName || "Digital Table Menu"}
                </h1>
              </div>
              {facilityInfo?.address && (
                <p style={{ fontSize: "0.725rem", color: "var(--text-muted)", marginTop: "0.1rem" }}>
                  {facilityInfo.address}
                </p>
              )}
            </div>

            {/* Static Read-Only Table Badge (Cannot be changed or edited) */}
            <div
              id="table-number-badge"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.35rem",
                padding: "0.4rem 0.85rem",
                borderRadius: "var(--radius-full)",
                backgroundColor: "rgba(99, 102, 241, 0.18)",
                border: "1px solid var(--border-glow)",
                color: "var(--primary)",
                fontSize: "0.85rem",
                fontWeight: 800,
                whiteSpace: "nowrap",
                userSelect: "none",
              }}
              title="Table number is fixed to this table barcode"
            >
              <span>🪑</span>
              <span>Table {tableNumber}</span>
            </div>
          </div>

          {/* Quick Search Bar */}
          <div style={{ marginTop: "0.75rem", position: "relative" }}>
            <input
              id="table-search-input"
              type="text"
              placeholder="Search dishes, drinks, desserts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "0.55rem 0.85rem 0.55rem 2.2rem",
                borderRadius: "var(--radius-full)",
                backgroundColor: "var(--bg-surface-elevated)",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-primary)",
                fontSize: "0.85rem",
                outline: "none",
              }}
            />
            <span
              style={{
                position: "absolute",
                left: "0.75rem",
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: "0.85rem",
                color: "var(--text-muted)",
              }}
            >
              🔍
            </span>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                style={{
                  position: "absolute",
                  right: "0.75rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Horizontal Category Carousel */}
          <div
            style={{
              display: "flex",
              gap: "0.45rem",
              overflowX: "auto",
              paddingTop: "0.75rem",
              paddingBottom: "0.2rem",
              scrollbarWidth: "none",
            }}
          >
            <button
              onClick={() => setSelectedCategory(null)}
              style={{
                padding: "0.35rem 0.85rem",
                borderRadius: "var(--radius-full)",
                fontSize: "0.8rem",
                fontWeight: 600,
                border: "1px solid transparent",
                cursor: "pointer",
                whiteSpace: "nowrap",
                backgroundColor: selectedCategory === null ? "var(--primary)" : "var(--bg-surface-elevated)",
                color: selectedCategory === null ? "#ffffff" : "var(--text-secondary)",
                transition: "all var(--transition-fast)",
              }}
            >
              All Items ({products.length})
            </button>
            {categories.map((cat) => {
              const active = selectedCategory === cat.id;
              const count = products.filter((p) => p.categoryId === cat.id).length;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  style={{
                    padding: "0.35rem 0.85rem",
                    borderRadius: "var(--radius-full)",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    border: "1px solid transparent",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    backgroundColor: active ? "var(--primary)" : "var(--bg-surface-elevated)",
                    color: active ? "#ffffff" : "var(--text-secondary)",
                    transition: "all var(--transition-fast)",
                  }}
                >
                  {cat.name} ({count})
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Product Catalog List */}
      <main style={{ maxWidth: "800px", margin: "1rem auto", padding: "0 1rem", width: "100%", flex: 1 }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "4rem 0", color: "var(--text-muted)" }}>
            <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>⏳</div>
            <p>Loading digital menu items...</p>
          </div>
        ) : loadError ? (
          <div
            style={{
              textAlign: "center",
              padding: "3rem 1.5rem",
              backgroundColor: "var(--bg-surface)",
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <p style={{ color: "var(--accent-rose)", fontWeight: 700, marginBottom: "0.5rem" }}>
              Menu Unavailable
            </p>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "1rem" }}>
              {loadError}
            </p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "3rem 1rem",
              color: "var(--text-muted)",
              backgroundColor: "var(--bg-surface)",
              borderRadius: "var(--radius-lg)",
            }}
          >
            <p style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>🔍</p>
            <p>No menu items matching your filter.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "0.85rem" }}>
            {filteredProducts.map((product) => {
              const qty = getItemQuantity(product.id);
              const note = getItemNotes(product.id);

              return (
                <div
                  key={product.id}
                  style={{
                    backgroundColor: "var(--bg-surface)",
                    borderRadius: "var(--radius-lg)",
                    border: qty > 0 ? "1px solid var(--border-glow)" : "1px solid var(--border-subtle)",
                    padding: "1rem",
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "1rem",
                    alignItems: "center",
                    boxShadow: qty > 0 ? "0 4px 20px -6px rgba(99, 102, 241, 0.25)" : "none",
                    transition: "all var(--transition-fast)",
                  }}
                >
                  {/* Left Column: Product Info */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
                      <span
                        style={{
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          padding: "0.1rem 0.4rem",
                          borderRadius: "var(--radius-sm)",
                          backgroundColor: "rgba(255, 255, 255, 0.06)",
                          color: "var(--text-muted)",
                          textTransform: "uppercase",
                        }}
                      >
                        {product.categoryName}
                      </span>
                      {product.unitLabel && (
                        <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                          • {product.unitLabel}
                        </span>
                      )}
                    </div>

                    <h3
                      style={{
                        fontSize: "1rem",
                        fontWeight: 700,
                        color: "var(--text-primary)",
                        marginTop: "0.3rem",
                      }}
                    >
                      {product.name}
                    </h3>

                    {product.description && (
                      <p
                        style={{
                          fontSize: "0.8rem",
                          color: "var(--text-secondary)",
                          marginTop: "0.2rem",
                          lineHeight: 1.35,
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {product.description}
                      </p>
                    )}

                    <div
                      style={{
                        fontSize: "0.95rem",
                        fontWeight: 800,
                        color: "var(--accent-emerald)",
                        marginTop: "0.4rem",
                      }}
                    >
                      {formatIDR(product.price)}
                    </div>

                    {/* Note indicator / button if in cart */}
                    {qty > 0 && (
                      <div style={{ marginTop: "0.4rem" }}>
                        <button
                          onClick={() => setEditingItemNote({ productId: product.id, note })}
                          style={{
                            background: "none",
                            border: "none",
                            color: note ? "var(--accent-amber)" : "var(--primary)",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            cursor: "pointer",
                            padding: 0,
                            display: "flex",
                            alignItems: "center",
                            gap: "0.25rem",
                          }}
                        >
                          <span>✏️</span>
                          <span>{note ? `Note: "${note}"` : "Add special instruction"}</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Add / Stepper controls */}
                  <div style={{ flexShrink: 0 }}>
                    {qty === 0 ? (
                      <button
                        id={`add-btn-${product.id}`}
                        onClick={() => handleAddToCart(product)}
                        style={{
                          padding: "0.55rem 1.15rem",
                          borderRadius: "var(--radius-full)",
                          backgroundColor: "var(--primary)",
                          color: "#ffffff",
                          fontWeight: 700,
                          fontSize: "0.85rem",
                          border: "none",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.35rem",
                          boxShadow: "0 2px 8px rgba(99, 102, 241, 0.35)",
                          transition: "transform var(--transition-fast)",
                        }}
                      >
                        <span>+ Add</span>
                      </button>
                    ) : (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          backgroundColor: "var(--bg-surface-elevated)",
                          borderRadius: "var(--radius-full)",
                          padding: "0.25rem",
                          border: "1px solid var(--border-glow)",
                        }}
                      >
                        <button
                          onClick={() => handleUpdateQuantity(product.id, -1)}
                          style={{
                            width: "30px",
                            height: "30px",
                            borderRadius: "50%",
                            border: "none",
                            backgroundColor: "rgba(255, 255, 255, 0.08)",
                            color: "var(--text-primary)",
                            fontWeight: 800,
                            fontSize: "1rem",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          -
                        </button>
                        <span
                          style={{
                            minWidth: "22px",
                            textAlign: "center",
                            fontWeight: 800,
                            fontSize: "0.95rem",
                            color: "var(--primary)",
                          }}
                        >
                          {qty}
                        </span>
                        <button
                          onClick={() => handleUpdateQuantity(product.id, 1)}
                          style={{
                            width: "30px",
                            height: "30px",
                            borderRadius: "50%",
                            border: "none",
                            backgroundColor: "var(--primary)",
                            color: "#ffffff",
                            fontWeight: 800,
                            fontSize: "1rem",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          +
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Floating Bottom Cart Bar */}
      {totalItemCount > 0 && (
        <div
          style={{
            position: "fixed",
            bottom: "1rem",
            left: "1rem",
            right: "1rem",
            zIndex: 50,
            maxWidth: "768px",
            margin: "0 auto",
          }}
        >
          <div
            onClick={() => setIsReviewOpen(true)}
            style={{
              backgroundColor: "var(--primary)",
              color: "#ffffff",
              borderRadius: "var(--radius-lg)",
              padding: "0.85rem 1.25rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              cursor: "pointer",
              boxShadow: "0 10px 25px -5px rgba(99, 102, 241, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.3)",
              transition: "transform var(--transition-fast)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.25)",
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                  fontSize: "0.85rem",
                }}
              >
                {totalItemCount}
              </div>
              <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.15 }}>
                <span style={{ fontSize: "0.75rem", opacity: 0.9 }}>Your Order</span>
                <span style={{ fontSize: "1.05rem", fontWeight: 800 }}>{formatIDR(grandTotal)}</span>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontWeight: 700, fontSize: "0.95rem" }}>
              <span>Review Order</span>
              <span>→</span>
            </div>
          </div>
        </div>
      )}

      {/* Item Note Modal */}
      {editingItemNote && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 65,
            padding: "1rem",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "400px",
              backgroundColor: "var(--bg-surface)",
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--border-subtle)",
              padding: "1.5rem",
            }}
          >
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.5rem" }}>
              Special Instructions
            </h3>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
              e.g. Less ice, no onions, sauce on the side, extra spicy.
            </p>
            <textarea
              id="item-special-note-input"
              rows={3}
              value={editingItemNote.note}
              onChange={(e) =>
                setEditingItemNote((prev) => (prev ? { ...prev, note: e.target.value } : null))
              }
              placeholder="Type your preferences here..."
              style={{
                width: "100%",
                padding: "0.75rem",
                borderRadius: "var(--radius-md)",
                backgroundColor: "var(--bg-surface-elevated)",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-primary)",
                fontSize: "0.875rem",
                outline: "none",
                resize: "none",
              }}
            />
            <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem" }}>
              <button
                onClick={() => setEditingItemNote(null)}
                style={{
                  flex: 1,
                  padding: "0.6rem",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "transparent",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--border-subtle)",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  handleSaveItemNote(editingItemNote.productId, editingItemNote.note)
                }
                style={{
                  flex: 1,
                  padding: "0.6rem",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "var(--primary)",
                  color: "#ffffff",
                  border: "none",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review Order Sheet / Modal */}
      {isReviewOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            zIndex: 60,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "600px",
              maxHeight: "85vh",
              display: "flex",
              flexDirection: "column",
              backgroundColor: "var(--bg-surface)",
              borderTopLeftRadius: "var(--radius-lg)",
              borderTopRightRadius: "var(--radius-lg)",
              border: "1px solid var(--border-glow)",
              boxShadow: "0 -10px 40px rgba(0, 0, 0, 0.5)",
              overflow: "hidden",
            }}
          >
            {/* Sheet Header */}
            <div
              style={{
                padding: "1.25rem 1.5rem",
                borderBottom: "1px solid var(--border-subtle)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <h3 style={{ fontSize: "1.2rem", fontWeight: 800 }}>Review Your Order</h3>
                <span style={{ fontSize: "0.8rem", color: "var(--primary)", fontWeight: 700 }}>
                  🪑 Table {tableNumber} • {facilityInfo?.facilityName || "Outlet"}
                </span>
              </div>
              <button
                onClick={() => setIsReviewOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "1.25rem",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>

            {/* Items List */}
            <div style={{ flex: 1, overflowY: "auto", padding: "1rem 1.5rem" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {cart.map((item) => (
                  <div
                    key={item.product.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      paddingBottom: "0.75rem",
                      borderBottom: "1px solid var(--border-subtle)",
                    }}
                  >
                    <div style={{ flex: 1, paddingRight: "0.75rem" }}>
                      <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>{item.product.name}</div>
                      <div style={{ fontSize: "0.8rem", color: "var(--accent-emerald)", fontWeight: 600 }}>
                        {formatIDR(item.product.price)} each
                      </div>
                      {item.notes ? (
                        <div
                          style={{
                            fontSize: "0.75rem",
                            color: "var(--accent-amber)",
                            marginTop: "0.2rem",
                            cursor: "pointer",
                          }}
                          onClick={() =>
                            setEditingItemNote({ productId: item.product.id, note: item.notes })
                          }
                        >
                          ✏️ &quot;{item.notes}&quot;
                        </div>
                      ) : (
                        <div
                          style={{
                            fontSize: "0.75rem",
                            color: "var(--text-muted)",
                            marginTop: "0.2rem",
                            cursor: "pointer",
                          }}
                          onClick={() =>
                            setEditingItemNote({ productId: item.product.id, note: "" })
                          }
                        >
                          + Add note
                        </div>
                      )}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.35rem",
                          backgroundColor: "var(--bg-surface-elevated)",
                          borderRadius: "var(--radius-full)",
                          padding: "0.15rem 0.35rem",
                        }}
                      >
                        <button
                          onClick={() => handleUpdateQuantity(item.product.id, -1)}
                          style={{
                            width: "24px",
                            height: "24px",
                            borderRadius: "50%",
                            border: "none",
                            background: "none",
                            color: "var(--text-primary)",
                            fontWeight: 800,
                            cursor: "pointer",
                          }}
                        >
                          -
                        </button>
                        <span style={{ fontWeight: 700, minWidth: "16px", textAlign: "center" }}>
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => handleUpdateQuantity(item.product.id, 1)}
                          style={{
                            width: "24px",
                            height: "24px",
                            borderRadius: "50%",
                            border: "none",
                            background: "none",
                            color: "var(--primary)",
                            fontWeight: 800,
                            cursor: "pointer",
                          }}
                        >
                          +
                        </button>
                      </div>
                      <div
                        style={{
                          fontWeight: 700,
                          minWidth: "75px",
                          textAlign: "right",
                          fontSize: "0.95rem",
                        }}
                      >
                        {formatIDR(item.quantity * item.product.price)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Guest Details & Table Instructions */}
              <div
                style={{
                  marginTop: "1.25rem",
                  padding: "1rem",
                  backgroundColor: "var(--bg-surface-elevated)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-subtle)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem",
                }}
              >
                <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-secondary)" }}>
                  Diner Details (Optional)
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                  <div>
                    <label style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Your Name:</label>
                    <input
                      id="table-customer-name-input"
                      type="text"
                      placeholder="e.g. Alex"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      style={{
                        width: "100%",
                        marginTop: "0.2rem",
                        padding: "0.45rem 0.6rem",
                        borderRadius: "var(--radius-sm)",
                        backgroundColor: "var(--bg-surface)",
                        border: "1px solid var(--border-subtle)",
                        color: "var(--text-primary)",
                        fontSize: "0.8rem",
                        outline: "none",
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>WhatsApp / Phone:</label>
                    <input
                      id="table-customer-phone-input"
                      type="tel"
                      placeholder="e.g. 0812..."
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      style={{
                        width: "100%",
                        marginTop: "0.2rem",
                        padding: "0.45rem 0.6rem",
                        borderRadius: "var(--radius-sm)",
                        backgroundColor: "var(--bg-surface)",
                        border: "1px solid var(--border-subtle)",
                        color: "var(--text-primary)",
                        fontSize: "0.8rem",
                        outline: "none",
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>General Kitchen Note:</label>
                  <input
                    id="table-order-notes-input"
                    type="text"
                    placeholder="e.g. Please bring drinks first, extra napkins"
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    style={{
                      width: "100%",
                      marginTop: "0.2rem",
                      padding: "0.45rem 0.6rem",
                      borderRadius: "var(--radius-sm)",
                      backgroundColor: "var(--bg-surface)",
                      border: "1px solid var(--border-subtle)",
                      color: "var(--text-primary)",
                      fontSize: "0.8rem",
                      outline: "none",
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Sheet Footer */}
            <div
              style={{
                padding: "1rem 1.5rem",
                borderTop: "1px solid var(--border-subtle)",
                backgroundColor: "var(--bg-surface-elevated)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "1rem",
                }}
              >
                <span style={{ fontSize: "1rem", color: "var(--text-secondary)" }}>Total Bill:</span>
                <span style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--accent-emerald)" }}>
                  {formatIDR(grandTotal)}
                </span>
              </div>

              <button
                id="submit-table-order-btn"
                disabled={submitting}
                onClick={handlePlaceOrder}
                style={{
                  width: "100%",
                  padding: "0.9rem",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "var(--primary)",
                  color: "#ffffff",
                  fontSize: "1rem",
                  fontWeight: 800,
                  border: "none",
                  cursor: submitting ? "not-allowed" : "pointer",
                  opacity: submitting ? 0.7 : 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                  boxShadow: "0 4px 14px rgba(99, 102, 241, 0.4)",
                }}
              >
                {submitting ? "Sending Order to Kitchen..." : "🚀 Place Order Now"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
