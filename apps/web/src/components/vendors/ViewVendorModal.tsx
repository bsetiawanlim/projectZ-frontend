"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { formatIDR } from "@pz/shared";
import { vendorApi, orderApi, productApi } from "@/lib/api";
import {
  getVendorGroupName,
  getVendorGroupBadgeVariant,
  type VendorRecord,
  type VendorProductRecord,
  type PurchaseOrderRecord,
  type ProductItem,
} from "@pz/shared";

interface ViewVendorModalProps {
  isOpen: boolean;
  onClose: () => void;
  vendor: VendorRecord | null;
  onVendorUpdated?: () => void;
}

export function ViewVendorModal({
  isOpen,
  onClose,
  vendor,
  onVendorUpdated,
}: ViewVendorModalProps) {
  const [activeTab, setActiveTab] = useState<"selling" | "sold">("selling");
  const [loading, setLoading] = useState(false);
  const [vendorProducts, setVendorProducts] = useState<VendorProductRecord[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderRecord[]>([]);

  // Linking product state
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [catalogProducts, setCatalogProducts] = useState<ProductItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<number | "">("");
  const [vendorSku, setVendorSku] = useState("");
  const [vendorPrice, setVendorPrice] = useState<string>("");
  const [leadTimeDays, setLeadTimeDays] = useState<string>("");
  const [minOrderQuantity, setMinOrderQuantity] = useState<string>("");
  const [isPreferred, setIsPreferred] = useState(false);
  const [productNotes, setProductNotes] = useState("");
  const [linkingProduct, setLinkingProduct] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  // Expanded order view state
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
  const [orderFilter, setOrderFilter] = useState<string>("ALL");

  const loadData = useCallback(async () => {
    if (!vendor) return;
    setLoading(true);
    try {
      // 1. Fetch vendor products (what they sell)
      try {
        const prodRes = await vendorApi.getProductsByVendor(vendor.id);
        const prods = (prodRes as any)?.data ?? (prodRes as any)?.items ?? prodRes;
        if (Array.isArray(prods)) {
          setVendorProducts(prods);
        } else if (vendor.vendorProducts) {
          setVendorProducts(vendor.vendorProducts);
        }
      } catch (err) {
        console.warn("Could not fetch vendor products by endpoint, using fallback", err);
        if (vendor.vendorProducts) {
          setVendorProducts(vendor.vendorProducts);
        }
      }

      // 2. Fetch purchase orders (what they sold to us)
      try {
        const orderRes = await orderApi.listPurchaseOrders({ limit: 100 });
        const allOrders = orderRes?.items || [];
        const vendorOrders = allOrders.filter(
          (o) => o.vendorId === vendor.id || (o as any).purchaseOrderVendor?.id === vendor.id
        );
        setPurchaseOrders(vendorOrders);
      } catch (err) {
        console.warn("Could not fetch purchase orders for vendor", err);
      }
    } finally {
      setLoading(false);
    }
  }, [vendor]);

  useEffect(() => {
    if (isOpen && vendor) {
      loadData();
      setShowAddProduct(false);
      setExpandedOrderId(null);
      setOrderFilter("ALL");

      // Preload available products catalog for linking
      productApi
        .getProducts()
        .then((res: any) => {
          const prods = res?.data ?? res?.items ?? (Array.isArray(res) ? res : []);
          setCatalogProducts(prods);
        })
        .catch(() => {});
    }
  }, [isOpen, vendor, loadData]);

  // Aggregate metrics
  const totalOrdersCount = purchaseOrders.length;
  const totalAmountSold = useMemo(() => {
    return purchaseOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
  }, [purchaseOrders]);

  const approvedOrdersCount = useMemo(() => {
    return purchaseOrders.filter((o) => o.status === "APPROVED").length;
  }, [purchaseOrders]);

  const pendingOrdersCount = useMemo(() => {
    return purchaseOrders.filter((o) => o.status === "PENDING" || o.status === "DRAFT").length;
  }, [purchaseOrders]);

  const filteredOrders = useMemo(() => {
    if (orderFilter === "ALL") return purchaseOrders;
    return purchaseOrders.filter((o) => o.status === orderFilter);
  }, [purchaseOrders, orderFilter]);

  if (!isOpen || !vendor) return null;

  const vendorDisplayName = vendor.profile
    ? `${vendor.profile.firstName} ${vendor.profile.lastName || ""}`.trim()
    : `Vendor #${vendor.id}`;

  const handleLinkProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) {
      setLinkError("Please select a product from the catalog.");
      return;
    }

    setLinkingProduct(true);
    setLinkError(null);

    try {
      await vendorApi.createVendorProduct({
        vendorId: vendor.id,
        productId: Number(selectedProductId),
        vendorSku: vendorSku.trim() || undefined,
        vendorPrice: vendorPrice ? Number(vendorPrice) : undefined,
        leadTimeDays: leadTimeDays ? Number(leadTimeDays) : undefined,
        minOrderQuantity: minOrderQuantity ? Number(minOrderQuantity) : undefined,
        isPreferred,
        notes: productNotes.trim() || undefined,
      });

      // Reset & reload
      setShowAddProduct(false);
      setSelectedProductId("");
      setVendorSku("");
      setVendorPrice("");
      setLeadTimeDays("");
      setMinOrderQuantity("");
      setIsPreferred(false);
      setProductNotes("");
      await loadData();
      if (onVendorUpdated) onVendorUpdated();
    } catch (err: any) {
      setLinkError(err?.message || "Failed to link product to vendor.");
    } finally {
      setLinkingProduct(false);
    }
  };

  const handleUnlinkProduct = async (vendorProductId: number) => {
    if (!window.confirm("Are you sure you want to remove this product from the vendor's catalog?")) {
      return;
    }
    try {
      await vendorApi.deleteVendorProduct(vendorProductId);
      await loadData();
      if (onVendorUpdated) onVendorUpdated();
    } catch (err: any) {
      alert(err?.message || "Failed to unlink product.");
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
        zIndex: 9999,
        padding: "1rem",
        overflowY: "auto",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <Card
        style={{
          width: "100%",
          maxWidth: "850px",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "var(--bg-surface)",
          border: "1px solid var(--border-glow)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "0 20px 40px rgba(0,0,0,0.6)",
          padding: 0,
          overflow: "hidden",
        }}
      >
        {/* Header Bar */}
        <div
          style={{
            padding: "1.5rem",
            borderBottom: "1px solid var(--border-subtle)",
            backgroundColor: "var(--bg-surface-elevated)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
              <h3 style={{ fontSize: "1.35rem", fontWeight: 700, color: "var(--text-primary)" }}>
                {vendorDisplayName}
              </h3>
              <Badge variant={vendor.profile?.isCompany ? "warning" : "info"}>
                {vendor.profile?.isCompany ? "🏢 Corporate Vendor" : "👤 Individual Contractor"}
              </Badge>
              <Badge variant={getVendorGroupBadgeVariant(vendor.vendorgroup)}>{getVendorGroupName(vendor.vendorgroup)}</Badge>
            </div>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "1.25rem",
                marginTop: "0.5rem",
                fontSize: "0.85rem",
                color: "var(--text-secondary)",
              }}
            >
              <span>
                <strong>ID:</strong> #{vendor.id}
              </span>
              {vendor.profile?.phoneNumber && (
                <span>
                  📞 <strong>Phone:</strong> {vendor.profile.phoneNumber}
                </span>
              )}
              {vendor.profile?.address && (
                <span>
                  📍 <strong>Address:</strong> {vendor.profile.address}
                  {vendor.profile.city ? `, ${vendor.profile.city}` : ""}
                </span>
              )}
            </div>
          </div>
          <button
            id="close-view-vendor-modal"
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              fontSize: "1.25rem",
              color: "var(--text-muted)",
              cursor: "pointer",
              padding: "0.25rem",
            }}
          >
            ✕
          </button>
        </div>

        {/* Quick KPI Metric Highlights */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "0.75rem",
            padding: "1rem 1.5rem",
            backgroundColor: "var(--bg-primary)",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          <div
            style={{
              padding: "0.75rem 1rem",
              borderRadius: "var(--radius-md)",
              backgroundColor: "var(--bg-surface-elevated)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
              Products Offered
            </div>
            <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--accent-cyan)", marginTop: "0.2rem" }}>
              {vendorProducts.length} items
            </div>
          </div>

          <div
            style={{
              padding: "0.75rem 1rem",
              borderRadius: "var(--radius-md)",
              backgroundColor: "var(--bg-surface-elevated)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
              Purchase Orders
            </div>
            <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-primary)", marginTop: "0.2rem" }}>
              {totalOrdersCount} orders
            </div>
          </div>

          <div
            style={{
              padding: "0.75rem 1rem",
              borderRadius: "var(--radius-md)",
              backgroundColor: "var(--bg-surface-elevated)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
              Total Sold to Us
            </div>
            <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--accent-emerald)", marginTop: "0.2rem" }}>
              {formatIDR(totalAmountSold)}
            </div>
          </div>

          <div
            style={{
              padding: "0.75rem 1rem",
              borderRadius: "var(--radius-md)",
              backgroundColor: "var(--bg-surface-elevated)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
              Fulfillment Status
            </div>
            <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text-secondary)", marginTop: "0.3rem" }}>
              <span style={{ color: "var(--accent-emerald)" }}>{approvedOrdersCount} approved</span>
              {" • "}
              <span style={{ color: "var(--accent-amber)" }}>{pendingOrdersCount} pending</span>
            </div>
          </div>
        </div>

        {/* Tab Selection */}
        <div
          style={{
            display: "flex",
            borderBottom: "1px solid var(--border-subtle)",
            backgroundColor: "var(--bg-surface)",
            padding: "0 1.5rem",
          }}
        >
          <button
            id="tab-vendor-what-they-sell"
            type="button"
            onClick={() => setActiveTab("selling")}
            style={{
              padding: "0.85rem 1.25rem",
              background: "none",
              border: "none",
              borderBottom: activeTab === "selling" ? "2px solid var(--primary)" : "2px solid transparent",
              color: activeTab === "selling" ? "var(--primary)" : "var(--text-secondary)",
              fontWeight: activeTab === "selling" ? 700 : 500,
              fontSize: "0.95rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <span>📦 What They Sell</span>
            <span
              style={{
                fontSize: "0.75rem",
                padding: "0.15rem 0.5rem",
                borderRadius: "var(--radius-full)",
                backgroundColor:
                  activeTab === "selling" ? "var(--primary-glow)" : "var(--bg-surface-elevated)",
                color: activeTab === "selling" ? "var(--primary)" : "var(--text-muted)",
              }}
            >
              {vendorProducts.length}
            </span>
          </button>

          <button
            id="tab-vendor-what-they-sold"
            type="button"
            onClick={() => setActiveTab("sold")}
            style={{
              padding: "0.85rem 1.25rem",
              background: "none",
              border: "none",
              borderBottom: activeTab === "sold" ? "2px solid var(--primary)" : "2px solid transparent",
              color: activeTab === "sold" ? "var(--primary)" : "var(--text-secondary)",
              fontWeight: activeTab === "sold" ? 700 : 500,
              fontSize: "0.95rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <span>📑 What They Have Sold to Us</span>
            <span
              style={{
                fontSize: "0.75rem",
                padding: "0.15rem 0.5rem",
                borderRadius: "var(--radius-full)",
                backgroundColor:
                  activeTab === "sold" ? "var(--primary-glow)" : "var(--bg-surface-elevated)",
                color: activeTab === "sold" ? "var(--primary)" : "var(--text-muted)",
              }}
            >
              {purchaseOrders.length}
            </span>
          </button>
        </div>

        {/* Tab Body (Scrollable) */}
        <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem" }}>
          {/* TAB 1: WHAT THEY SELL (Catalog) */}
          {activeTab === "selling" && (
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "1rem",
                  flexWrap: "wrap",
                  gap: "0.5rem",
                }}
              >
                <div>
                  <h4 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)" }}>
                    Vendor Catalog & Sourced Products
                  </h4>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    Products this vendor supplies, wholesale prices, and lead times
                  </p>
                </div>
                {!showAddProduct && (
                  <Button
                    id="link-vendor-product-btn"
                    size="sm"
                    variant="primary"
                    onClick={() => setShowAddProduct(true)}
                  >
                    + Link Product to Vendor
                  </Button>
                )}
              </div>

              {/* Form to Link a Product */}
              {showAddProduct && (
                <div
                  style={{
                    backgroundColor: "var(--bg-surface-elevated)",
                    padding: "1.25rem",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border-glow)",
                    marginBottom: "1.25rem",
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
                    <h5 style={{ fontSize: "0.95rem", fontWeight: 600 }}>Link Product to {vendorDisplayName}</h5>
                    <button
                      type="button"
                      onClick={() => setShowAddProduct(false)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--text-muted)",
                        cursor: "pointer",
                      }}
                    >
                      ✕ Cancel
                    </button>
                  </div>

                  {linkError && (
                    <div
                      style={{
                        padding: "0.5rem 0.75rem",
                        backgroundColor: "rgba(239, 68, 68, 0.15)",
                        border: "1px solid var(--accent-rose)",
                        borderRadius: "var(--radius-sm)",
                        color: "var(--accent-rose)",
                        fontSize: "0.8rem",
                        marginBottom: "0.75rem",
                      }}
                    >
                      {linkError}
                    </div>
                  )}

                  <form onSubmit={handleLinkProduct}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                      <div style={{ gridColumn: "span 2" }}>
                        <label
                          style={{
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            color: "var(--text-secondary)",
                            display: "block",
                            marginBottom: "0.25rem",
                          }}
                        >
                          Select Catalog Product *
                        </label>
                        <select
                          id="select-vendor-product"
                          value={selectedProductId}
                          onChange={(e) => setSelectedProductId(e.target.value ? Number(e.target.value) : "")}
                          required
                          style={{
                            width: "100%",
                            padding: "0.6rem 0.75rem",
                            borderRadius: "var(--radius-md)",
                            backgroundColor: "var(--bg-primary)",
                            border: "1px solid var(--border-subtle)",
                            color: "var(--text-primary)",
                            fontSize: "0.85rem",
                          }}
                        >
                          <option value="">-- Choose a product from catalog --</option>
                          {catalogProducts.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.productName} (SKU: {p.sku || "N/A"})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label
                          style={{
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            color: "var(--text-secondary)",
                            display: "block",
                            marginBottom: "0.25rem",
                          }}
                        >
                          Vendor Sourced Price (IDR)
                        </label>
                        <Input
                          id="input-vendor-price"
                          type="number"
                          placeholder="e.g. 50000"
                          value={vendorPrice}
                          onChange={(e) => setVendorPrice(e.target.value)}
                        />
                      </div>

                      <div>
                        <label
                          style={{
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            color: "var(--text-secondary)",
                            display: "block",
                            marginBottom: "0.25rem",
                          }}
                        >
                          Vendor SKU / Part Number
                        </label>
                        <Input
                          id="input-vendor-sku"
                          placeholder="e.g. SUP-9021"
                          value={vendorSku}
                          onChange={(e) => setVendorSku(e.target.value)}
                        />
                      </div>

                      <div>
                        <label
                          style={{
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            color: "var(--text-secondary)",
                            display: "block",
                            marginBottom: "0.25rem",
                          }}
                        >
                          Min Order Quantity (MOQ)
                        </label>
                        <Input
                          id="input-vendor-moq"
                          type="number"
                          placeholder="e.g. 10"
                          value={minOrderQuantity}
                          onChange={(e) => setMinOrderQuantity(e.target.value)}
                        />
                      </div>

                      <div>
                        <label
                          style={{
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            color: "var(--text-secondary)",
                            display: "block",
                            marginBottom: "0.25rem",
                          }}
                        >
                          Lead Time (Days)
                        </label>
                        <Input
                          id="input-vendor-lead-time"
                          type="number"
                          placeholder="e.g. 3"
                          value={leadTimeDays}
                          onChange={(e) => setLeadTimeDays(e.target.value)}
                        />
                      </div>

                      <div style={{ gridColumn: "span 2" }}>
                        <label
                          style={{
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            color: "var(--text-secondary)",
                            display: "block",
                            marginBottom: "0.25rem",
                          }}
                        >
                          Notes / Specification
                        </label>
                        <Input
                          id="input-vendor-prod-notes"
                          placeholder="Packaging requirements, delivery terms..."
                          value={productNotes}
                          onChange={(e) => setProductNotes(e.target.value)}
                        />
                      </div>

                      <div
                        style={{
                          gridColumn: "span 2",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          marginTop: "0.25rem",
                        }}
                      >
                        <input
                          id="check-preferred-supplier"
                          type="checkbox"
                          checked={isPreferred}
                          onChange={(e) => setIsPreferred(e.target.checked)}
                          style={{ cursor: "pointer" }}
                        />
                        <label
                          htmlFor="check-preferred-supplier"
                          style={{ fontSize: "0.85rem", color: "var(--text-primary)", cursor: "pointer" }}
                        >
                          Mark as <strong>Preferred Vendor</strong> for this product
                        </label>
                      </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "1rem" }}>
                      <Button size="sm" variant="secondary" onClick={() => setShowAddProduct(false)}>
                        Cancel
                      </Button>
                      <Button
                        id="submit-link-product-btn"
                        size="sm"
                        variant="primary"
                        isLoading={linkingProduct}
                        type="submit"
                      >
                        Link Product
                      </Button>
                    </div>
                  </form>
                </div>
              )}

              {/* Vendor Products Table */}
              {loading ? (
                <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Loading catalog offerings...</p>
              ) : vendorProducts.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "2.5rem 1rem",
                    backgroundColor: "var(--bg-surface-elevated)",
                    borderRadius: "var(--radius-md)",
                    border: "1px dashed var(--border-subtle)",
                    color: "var(--text-secondary)",
                  }}
                >
                  <p style={{ fontSize: "1rem", fontWeight: 600 }}>No catalog products linked yet</p>
                  <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                    Link products from your inventory catalog to register what this vendor supplies and sells.
                  </p>
                  {!showAddProduct && (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => setShowAddProduct(true)}
                      style={{ marginTop: "1rem" }}
                    >
                      + Link First Product
                    </Button>
                  )}
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                    <thead>
                      <tr
                        style={{
                          borderBottom: "1px solid var(--border-subtle)",
                          color: "var(--text-muted)",
                          fontSize: "0.75rem",
                          textTransform: "uppercase",
                        }}
                      >
                        <th style={{ padding: "0.6rem 0.5rem" }}>Product Name</th>
                        <th style={{ padding: "0.6rem 0.5rem" }}>SKU / Barcode</th>
                        <th style={{ padding: "0.6rem 0.5rem" }}>Category</th>
                        <th style={{ padding: "0.6rem 0.5rem" }}>Vendor Price</th>
                        <th style={{ padding: "0.6rem 0.5rem" }}>MOQ / Lead Time</th>
                        <th style={{ padding: "0.6rem 0.5rem" }}>Status</th>
                        <th style={{ padding: "0.6rem 0.5rem", textAlign: "right" }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vendorProducts.map((vp) => {
                        const prod = vp.product;
                        const vPrice =
                          vp.vendorPrice !== undefined && vp.vendorPrice !== null
                            ? Number(vp.vendorPrice)
                            : null;

                        return (
                          <tr
                            key={vp.id}
                            style={{
                              borderBottom: "1px solid var(--border-subtle)",
                              fontSize: "0.85rem",
                            }}
                          >
                            <td style={{ padding: "0.75rem 0.5rem", fontWeight: 600 }}>
                              <div>{prod?.productName || `Product #${vp.productId}`}</div>
                              {vp.notes && (
                                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 400 }}>
                                  {vp.notes}
                                </div>
                              )}
                            </td>
                            <td style={{ padding: "0.75rem 0.5rem", color: "var(--text-secondary)" }}>
                              <div>{prod?.sku || "—"}</div>
                              {vp.vendorSku && (
                                <div style={{ fontSize: "0.75rem", color: "var(--accent-cyan)" }}>
                                  Vendor: {vp.vendorSku}
                                </div>
                              )}
                            </td>
                            <td style={{ padding: "0.75rem 0.5rem", color: "var(--text-muted)" }}>
                              {prod?.category?.categoryName || "General"}
                            </td>
                            <td style={{ padding: "0.75rem 0.5rem", fontWeight: 600, color: "var(--accent-emerald)" }}>
                              {vPrice !== null ? formatIDR(vPrice) : "—"}
                            </td>
                            <td style={{ padding: "0.75rem 0.5rem", color: "var(--text-secondary)" }}>
                              {vp.minOrderQuantity ? `${vp.minOrderQuantity} MOQ` : "1 MOQ"}
                              {vp.leadTimeDays ? ` • ${vp.leadTimeDays}d lead` : ""}
                            </td>
                            <td style={{ padding: "0.75rem 0.5rem" }}>
                              {vp.isPreferred ? (
                                <Badge variant="success">★ Preferred</Badge>
                              ) : (
                                <Badge variant="default">Active</Badge>
                              )}
                            </td>
                            <td style={{ padding: "0.75rem 0.5rem", textAlign: "right" }}>
                              <button
                                type="button"
                                onClick={() => handleUnlinkProduct(vp.id)}
                                title="Unlink product"
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: "var(--accent-rose)",
                                  cursor: "pointer",
                                  fontSize: "0.8rem",
                                }}
                              >
                                ✕ Remove
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: WHAT THEY HAVE SOLD TO US (Purchase Orders) */}
          {activeTab === "sold" && (
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "1rem",
                  flexWrap: "wrap",
                  gap: "0.5rem",
                }}
              >
                <div>
                  <h4 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)" }}>
                    Procurement History & Purchase Orders
                  </h4>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    All purchase orders and orders fulfilled or supplied to us by this vendor
                  </p>
                </div>

                {/* Filter Pills */}
                <div style={{ display: "flex", gap: "0.35rem" }}>
                  {["ALL", "APPROVED", "PENDING", "DRAFT"].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setOrderFilter(st)}
                      style={{
                        padding: "0.25rem 0.6rem",
                        borderRadius: "var(--radius-sm)",
                        border: "1px solid var(--border-subtle)",
                        backgroundColor: orderFilter === st ? "var(--primary)" : "var(--bg-surface-elevated)",
                        color: orderFilter === st ? "#fff" : "var(--text-secondary)",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {loading ? (
                <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Loading procurement history...</p>
              ) : filteredOrders.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "2.5rem 1rem",
                    backgroundColor: "var(--bg-surface-elevated)",
                    borderRadius: "var(--radius-md)",
                    border: "1px dashed var(--border-subtle)",
                    color: "var(--text-secondary)",
                  }}
                >
                  <p style={{ fontSize: "1rem", fontWeight: 600 }}>No purchase orders found</p>
                  <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                    There are no recorded purchase orders for this vendor matching the current filter.
                  </p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {filteredOrders.map((po) => {
                    const isExpanded = expandedOrderId === po.id;
                    const statusVariant =
                      po.status === "APPROVED"
                        ? "success"
                        : po.status === "PENDING"
                        ? "warning"
                        : po.status === "REJECTED"
                        ? "danger"
                        : "default";

                    const productLines = po.purchaseOrderProducts || [];

                    return (
                      <div
                        key={po.id}
                        style={{
                          backgroundColor: "var(--bg-surface-elevated)",
                          borderRadius: "var(--radius-md)",
                          border: "1px solid var(--border-subtle)",
                          padding: "1rem",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            flexWrap: "wrap",
                            gap: "0.75rem",
                          }}
                        >
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                              <strong style={{ fontSize: "0.95rem", color: "var(--text-primary)" }}>
                                {po.title}
                              </strong>
                              <Badge variant={statusVariant}>{po.status}</Badge>
                            </div>
                            <div
                              style={{
                                display: "flex",
                                gap: "1rem",
                                fontSize: "0.8rem",
                                color: "var(--text-secondary)",
                                marginTop: "0.3rem",
                              }}
                            >
                              <span>
                                <strong>PO #:</strong> {po.number}
                              </span>
                              <span>
                                📅 <strong>Date:</strong>{" "}
                                {po.date ? new Date(po.date).toLocaleDateString() : "—"}
                              </span>
                              <span>
                                ⏳ <strong>Due:</strong>{" "}
                                {po.dueDate ? new Date(po.dueDate).toLocaleDateString() : "—"}
                              </span>
                            </div>
                          </div>

                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--accent-emerald)" }}>
                              {formatIDR(Number(po.totalAmount) || 0)}
                            </div>
                            {productLines.length > 0 && (
                              <button
                                type="button"
                                onClick={() => setExpandedOrderId(isExpanded ? null : po.id)}
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: "var(--primary)",
                                  fontSize: "0.75rem",
                                  cursor: "pointer",
                                  padding: 0,
                                  marginTop: "0.2rem",
                                }}
                              >
                                {isExpanded ? "▲ Hide Items" : `▼ Show ${productLines.length} Item(s)`}
                              </button>
                            )}
                          </div>
                        </div>

                        {po.notes && (
                          <div
                            style={{
                              marginTop: "0.5rem",
                              padding: "0.4rem 0.6rem",
                              borderRadius: "var(--radius-sm)",
                              backgroundColor: "var(--bg-primary)",
                              fontSize: "0.75rem",
                              color: "var(--text-muted)",
                            }}
                          >
                            📝 {po.notes}
                          </div>
                        )}

                        {/* Expandable Order Products */}
                        {isExpanded && productLines.length > 0 && (
                          <div
                            style={{
                              marginTop: "0.75rem",
                              paddingTop: "0.75rem",
                              borderTop: "1px solid var(--border-subtle)",
                            }}
                          >
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                              <thead>
                                <tr style={{ color: "var(--text-muted)", textAlign: "left" }}>
                                  <th style={{ padding: "0.3rem 0" }}>Product Line</th>
                                  <th style={{ padding: "0.3rem 0", textAlign: "center" }}>Quantity</th>
                                  <th style={{ padding: "0.3rem 0", textAlign: "right" }}>Unit Price</th>
                                  <th style={{ padding: "0.3rem 0", textAlign: "right" }}>Subtotal</th>
                                </tr>
                              </thead>
                              <tbody>
                                {productLines.map((line) => (
                                  <tr key={line.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                                    <td style={{ padding: "0.4rem 0", color: "var(--text-primary)" }}>
                                      {line.purchaseOrderProduct?.productName || `Product #${line.productId}`}
                                    </td>
                                    <td style={{ padding: "0.4rem 0", textAlign: "center", color: "var(--text-secondary)" }}>
                                      {line.quantity}
                                    </td>
                                    <td style={{ padding: "0.4rem 0", textAlign: "right", color: "var(--text-secondary)" }}>
                                      {formatIDR(Number(line.unitPrice) || 0)}
                                    </td>
                                    <td style={{ padding: "0.4rem 0", textAlign: "right", fontWeight: 600, color: "var(--accent-emerald)" }}>
                                      {formatIDR(Number(line.totalPrice) || 0)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: "1rem 1.5rem",
            borderTop: "1px solid var(--border-subtle)",
            backgroundColor: "var(--bg-surface-elevated)",
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </Card>
    </div>
  );
}
