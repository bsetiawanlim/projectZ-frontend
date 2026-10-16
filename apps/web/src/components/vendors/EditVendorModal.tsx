"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { vendorApi, productApi } from "@/lib/api";
import {
  formatIDR,
  type VendorRecord,
  type VendorProductRecord,
  type ProductItem,
  VENDOR_GROUPS,
} from "@pz/shared";

interface EditVendorModalProps {
  isOpen: boolean;
  onClose: () => void;
  vendor: VendorRecord | null;
  onSuccess?: () => void;
  onVendorUpdated?: () => void;
}

export function EditVendorModal({ isOpen, onClose, vendor, onSuccess, onVendorUpdated }: EditVendorModalProps) {
  // Vendor Basic Fields
  const [firstName, setFirstName] = useState(vendor?.profile?.firstName || "");
  const [lastName, setLastName] = useState(vendor?.profile?.lastName || "");
  const [phoneNumber, setPhoneNumber] = useState(vendor?.profile?.phoneNumber || "");
  const [address, setAddress] = useState(vendor?.profile?.address || "");
  const [city, setCity] = useState(vendor?.profile?.city || "");
  const [province, setProvince] = useState(vendor?.profile?.province || "");
  const [postalCode, setPostalCode] = useState(vendor?.profile?.postalCode || "");
  const [vendorGroup, setVendorGroup] = useState<number>(vendor?.vendorgroup ?? 1);
  const [isCompany, setIsCompany] = useState<boolean>(vendor?.profile?.isCompany ?? true);
  const [departReason, setDepartReason] = useState<string>(vendor?.departReason || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Vendor Products (What they sell) Section
  const [vendorProducts, setVendorProducts] = useState<VendorProductRecord[]>(vendor?.vendorProducts || []);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [catalogProducts, setCatalogProducts] = useState<ProductItem[]>([]);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<number | "">("");
  const [productVendorSku, setProductVendorSku] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [productLeadTime, setProductLeadTime] = useState("");
  const [productMinQty, setProductMinQty] = useState("");
  const [productIsPreferred, setProductIsPreferred] = useState(false);
  const [productNotes, setProductNotes] = useState("");
  const [productActionLoading, setProductActionLoading] = useState(false);
  const [productActionError, setProductActionError] = useState<string | null>(null);

  const loadVendorProducts = useCallback(async () => {
    if (!vendor?.id) return;
    setLoadingProducts(true);
    try {
      const prodRes = await vendorApi.getProductsByVendor(vendor.id);
      const prods = (prodRes as any)?.data ?? (prodRes as any)?.items ?? prodRes;
      if (Array.isArray(prods)) {
        setVendorProducts(prods);
      }
    } catch (err) {
      console.warn("Could not reload vendor products:", err);
    } finally {
      setLoadingProducts(false);
    }
  }, [vendor?.id]);

  useEffect(() => {
    if (isOpen && vendor) {
      setFirstName(vendor.profile?.firstName || "");
      setLastName(vendor.profile?.lastName || "");
      setPhoneNumber(vendor.profile?.phoneNumber || "");
      setAddress(vendor.profile?.address || "");
      setCity(vendor.profile?.city || "");
      setProvince(vendor.profile?.province || "");
      setPostalCode(vendor.profile?.postalCode || "");
      setVendorGroup(vendor.vendorgroup ?? 1);
      setIsCompany(vendor.profile?.isCompany ?? true);
      setDepartReason(vendor.departReason || "");
      setError(null);
      setShowAddProduct(false);
      setProductActionError(null);

      loadVendorProducts();

      // Load products catalog for dropdown
      productApi
        .getProducts()
        .then((res: any) => {
          const prods = res?.data ?? res?.items ?? (Array.isArray(res) ? res : []);
          setCatalogProducts(prods);
        })
        .catch(() => {});
    }
  }, [isOpen, vendor, loadVendorProducts]);

  if (!isOpen || !vendor) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await vendorApi.updateVendor({
        id: vendor.id,
        profileId: vendor.profileId,
        firstName: firstName.trim(),
        lastName: lastName.trim() || undefined,
        phoneNumber: phoneNumber.trim() || undefined,
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        province: province.trim() || undefined,
        postalCode: postalCode.trim() || undefined,
        isCompany,
        vendorgroup: vendorGroup,
        departReason: departReason.trim() || undefined,
      });

      if (onSuccess) onSuccess();
      if (onVendorUpdated) onVendorUpdated();
      onClose();
    } catch (err: any) {
      console.error("Failed to update vendor", err);
      setError(err?.message || "Failed to update vendor record.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) {
      setProductActionError("Please select a product from the catalog.");
      return;
    }

    setProductActionLoading(true);
    setProductActionError(null);

    try {
      await vendorApi.createVendorProduct({
        vendorId: vendor.id,
        productId: Number(selectedProductId),
        vendorSku: productVendorSku.trim() || undefined,
        vendorPrice: productPrice ? Number(productPrice) : undefined,
        leadTimeDays: productLeadTime ? Number(productLeadTime) : undefined,
        minOrderQuantity: productMinQty ? Number(productMinQty) : undefined,
        isPreferred: productIsPreferred,
        notes: productNotes.trim() || undefined,
      });

      // Reset product form
      setShowAddProduct(false);
      setSelectedProductId("");
      setProductVendorSku("");
      setProductPrice("");
      setProductLeadTime("");
      setProductMinQty("");
      setProductIsPreferred(false);
      setProductNotes("");

      await loadVendorProducts();
      if (onSuccess) onSuccess();
      if (onVendorUpdated) onVendorUpdated();
    } catch (err: any) {
      setProductActionError(err?.message || "Failed to link product to vendor.");
    } finally {
      setProductActionLoading(false);
    }
  };

  const handleRemoveProduct = async (vpId: number) => {
    if (!window.confirm("Remove this product from this vendor's catalog?")) return;
    try {
      await vendorApi.deleteVendorProduct(vpId);
      await loadVendorProducts();
      if (onSuccess) onSuccess();
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
        backdropFilter: "blur(8px)",
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
          maxWidth: "680px",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "var(--bg-surface)",
          border: "1px solid var(--border-glow)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
          padding: 0,
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "1.25rem 1.75rem",
            borderBottom: "1px solid var(--border-subtle)",
            backgroundColor: "var(--bg-surface-elevated)",
          }}
        >
          <div>
            <h3 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-primary)" }}>
              Edit Vendor #{vendor.id}
            </h3>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
              Update company details, tier classification, and products they supply
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
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

        {/* Scrollable Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "1.75rem" }}>
          {error && (
            <div
              style={{
                padding: "0.75rem 1rem",
                backgroundColor: "rgba(239, 68, 68, 0.15)",
                border: "1px solid var(--accent-rose)",
                borderRadius: "var(--radius-md)",
                color: "var(--accent-rose)",
                fontSize: "0.875rem",
                marginBottom: "1.25rem",
              }}
            >
              {error}
            </div>
          )}

          <form id="edit-vendor-form" onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div>
                <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.25rem" }}>
                  Company / Vendor Name *
                </label>
                <Input
                  id="edit-vendor-firstName"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="e.g. PT Mitra Logistik"
                />
              </div>
              <div>
                <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.25rem" }}>
                  Contact Person / Branch
                </label>
                <Input
                  id="edit-vendor-lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="e.g. Sales Division"
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div>
                <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.25rem" }}>
                  Phone Number
                </label>
                <Input
                  id="edit-vendor-phone"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="e.g. 08123456789"
                />
              </div>
              <div>
                <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.25rem" }}>
                  Vendor Tier / Group
                </label>
                <select
                  id="edit-vendor-group"
                  value={vendorGroup}
                  onChange={(e) => setVendorGroup(Number(e.target.value))}
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
                  {VENDOR_GROUPS.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.25rem" }}>
                Address
              </label>
              <Input
                id="edit-vendor-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. Jl. Industri No. 45"
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }}>
              <div>
                <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.25rem" }}>
                  City
                </label>
                <Input
                  id="edit-vendor-city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Surabaya"
                />
              </div>
              <div>
                <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.25rem" }}>
                  Province
                </label>
                <Input
                  id="edit-vendor-province"
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  placeholder="e.g. Jawa Timur"
                />
              </div>
              <div>
                <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.25rem" }}>
                  Postal Code
                </label>
                <Input
                  id="edit-vendor-postal"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  placeholder="e.g. 60119"
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.25rem" }}>
                Notes / Departure Reason
              </label>
              <Input
                id="edit-vendor-depart-reason"
                value={departReason}
                onChange={(e) => setDepartReason(e.target.value)}
                placeholder="e.g. Primary paper supplier, active contract"
              />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <input
                type="checkbox"
                id="edit-vendor-isCompany"
                checked={isCompany}
                onChange={(e) => setIsCompany(e.target.checked)}
                style={{ cursor: "pointer" }}
              />
              <label htmlFor="edit-vendor-isCompany" style={{ fontSize: "0.85rem", color: "var(--text-primary)", cursor: "pointer" }}>
                Corporate Entity / Company
              </label>
            </div>
          </form>

          {/* ── PRODUCTS THEY SELL SECTION ─────────────────────────────────── */}
          <div
            style={{
              marginTop: "1.75rem",
              paddingTop: "1.5rem",
              borderTop: "1px solid var(--border-subtle)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <div>
                <h4 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span>📦 Products They Sell</span>
                  <Badge variant="info">{vendorProducts.length}</Badge>
                </h4>
                <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
                  Manage the product lines and wholesale prices offered by this vendor
                </p>
              </div>

              {!showAddProduct && (
                <Button
                  id="edit-vendor-add-product-btn"
                  size="sm"
                  variant="secondary"
                  onClick={() => setShowAddProduct(true)}
                  style={{ fontSize: "0.8rem" }}
                >
                  + Add Product
                </Button>
              )}
            </div>

            {/* Inline Add Product Form */}
            {showAddProduct && (
              <div
                style={{
                  backgroundColor: "var(--bg-surface-elevated)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-glow)",
                  padding: "1rem",
                  marginBottom: "1rem",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                  <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--primary)" }}>
                    Add Product Sourced from this Vendor
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowAddProduct(false)}
                    style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "0.8rem" }}
                  >
                    Cancel ✕
                  </button>
                </div>

                {productActionError && (
                  <div
                    style={{
                      padding: "0.5rem 0.75rem",
                      backgroundColor: "rgba(239, 68, 68, 0.15)",
                      border: "1px solid var(--accent-rose)",
                      borderRadius: "var(--radius-sm)",
                      color: "var(--accent-rose)",
                      fontSize: "0.78rem",
                      marginBottom: "0.75rem",
                    }}
                  >
                    {productActionError}
                  </div>
                )}

                <form onSubmit={handleAddProduct} style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                  <div>
                    <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.2rem" }}>
                      Select Product from Catalog *
                    </label>
                    <select
                      id="edit-vendor-select-product"
                      required
                      value={selectedProductId}
                      onChange={(e) => setSelectedProductId(e.target.value ? Number(e.target.value) : "")}
                      style={{
                        width: "100%",
                        padding: "0.5rem 0.75rem",
                        backgroundColor: "var(--bg-surface)",
                        border: "1px solid var(--border-subtle)",
                        borderRadius: "var(--radius-sm)",
                        color: "var(--text-primary)",
                        fontSize: "0.85rem",
                        outline: "none",
                      }}
                    >
                      <option value="">-- Choose a Product --</option>
                      {catalogProducts.map((cp) => (
                        <option key={cp.id} value={cp.id}>
                          {cp.productName} {cp.sku ? `(${cp.sku})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                    <div>
                      <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.2rem" }}>
                        Vendor SKU / Code
                      </label>
                      <Input
                        id="edit-vendor-prod-sku"
                        placeholder="e.g. VND-A101"
                        value={productVendorSku}
                        onChange={(e) => setProductVendorSku(e.target.value)}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.2rem" }}>
                        Wholesale Price (IDR)
                      </label>
                      <Input
                        id="edit-vendor-prod-price"
                        type="number"
                        placeholder="e.g. 50000"
                        value={productPrice}
                        onChange={(e) => setProductPrice(e.target.value)}
                      />
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                    <div>
                      <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.2rem" }}>
                        Lead Time (Days)
                      </label>
                      <Input
                        id="edit-vendor-prod-leadtime"
                        type="number"
                        placeholder="e.g. 3"
                        value={productLeadTime}
                        onChange={(e) => setProductLeadTime(e.target.value)}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.2rem" }}>
                        Min Order Qty (MOQ)
                      </label>
                      <Input
                        id="edit-vendor-prod-moq"
                        type="number"
                        placeholder="e.g. 10"
                        value={productMinQty}
                        onChange={(e) => setProductMinQty(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.2rem" }}>
                      Notes / Terms
                    </label>
                    <Input
                      id="edit-vendor-prod-notes"
                      placeholder="e.g. Includes packaging, minimum 5 boxes"
                      value={productNotes}
                      onChange={(e) => setProductNotes(e.target.value)}
                    />
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.3rem" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.8rem", color: "var(--text-secondary)", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={productIsPreferred}
                        onChange={(e) => setProductIsPreferred(e.target.checked)}
                      />
                      Preferred Supplier for this Product
                    </label>

                    <Button id="edit-vendor-save-product-btn" size="sm" variant="primary" type="submit" isLoading={productActionLoading}>
                      Save Product Link
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {/* List of Current Products */}
            {loadingProducts ? (
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", textAlign: "center", padding: "1rem" }}>
                Loading product offerings...
              </p>
            ) : vendorProducts.length === 0 ? (
              <div
                style={{
                  padding: "1.25rem",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "var(--bg-surface-elevated)",
                  border: "1px dashed var(--border-subtle)",
                  textAlign: "center",
                  color: "var(--text-muted)",
                  fontSize: "0.85rem",
                }}
              >
                No products currently registered for this vendor. Click <strong>+ Add Product</strong> above to link products they sell.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {vendorProducts.map((vp) => (
                  <div
                    key={vp.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "0.65rem 0.85rem",
                      borderRadius: "var(--radius-sm)",
                      backgroundColor: "var(--bg-surface-elevated)",
                      border: "1px solid var(--border-subtle)",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span style={{ fontWeight: 600, fontSize: "0.875rem", color: "var(--text-primary)" }}>
                          {vp.product?.productName || `Product #${vp.productId}`}
                        </span>
                        {vp.isPreferred && <Badge variant="success">Preferred</Badge>}
                        {vp.vendorSku && (
                          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                            (SKU: {vp.vendorSku})
                          </span>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: "0.75rem", fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
                        <span>
                          Price: <strong>{vp.vendorPrice ? formatIDR(Number(vp.vendorPrice)) : "Not set"}</strong>
                        </span>
                        {vp.leadTimeDays != null && <span>Lead Time: {vp.leadTimeDays}d</span>}
                        {vp.minOrderQuantity != null && <span>MOQ: {vp.minOrderQuantity}</span>}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveProduct(vp.id)}
                      title="Unlink product"
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--accent-rose)",
                        fontSize: "0.8rem",
                        cursor: "pointer",
                        padding: "0.25rem 0.5rem",
                        borderRadius: "var(--radius-sm)",
                      }}
                    >
                      ✕ Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "0.75rem",
            padding: "1rem 1.75rem",
            borderTop: "1px solid var(--border-subtle)",
            backgroundColor: "var(--bg-surface-elevated)",
          }}
        >
          <Button variant="secondary" onClick={onClose} disabled={loading} type="button">
            Cancel
          </Button>
          <Button
            id="submit-edit-vendor-btn"
            variant="primary"
            type="submit"
            form="edit-vendor-form"
            isLoading={loading}
          >
            Save Changes
          </Button>
        </div>
      </Card>
    </div>
  );
}
