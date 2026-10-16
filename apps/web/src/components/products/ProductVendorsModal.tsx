"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { productApi, vendorApi } from "@/lib/api";
import { formatIDR, getVendorGroupName, getVendorGroupBadgeVariant, type ProductItem, type VendorProductRecord, type VendorRecord } from "@pz/shared";

interface ProductVendorsModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: ProductItem | null;
  onUpdated?: () => void;
}

export function ProductVendorsModal({
  isOpen,
  onClose,
  product,
  onUpdated,
}: ProductVendorsModalProps) {
  const [links, setLinks] = useState<VendorProductRecord[]>([]);
  const [allVendors, setAllVendors] = useState<VendorRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Link Form State
  const [selectedVendorId, setSelectedVendorId] = useState<string>("");
  const [vendorPrice, setVendorPrice] = useState<string>("");
  const [vendorSku, setVendorSku] = useState<string>("");
  const [leadTimeDays, setLeadTimeDays] = useState<string>("");
  const [isPreferred, setIsPreferred] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>("");
  const [showAddForm, setShowAddForm] = useState(false);

  const loadData = useCallback(async () => {
    if (!product) return;
    setLoading(true);
    setError(null);
    try {
      const [linksRes, vendorsRes] = await Promise.all([
        productApi.getVendorsByProduct(product.id),
        vendorApi.listVendors({ limit: 100 }),
      ]);
      setLinks(linksRes.data || []);
      setAllVendors(vendorsRes.items || []);
    } catch (err: any) {
      setError(err?.message || "Failed to load product vendors");
    } finally {
      setLoading(false);
    }
  }, [product]);

  useEffect(() => {
    if (isOpen && product) {
      loadData();
      setShowAddForm(false);
      setSelectedVendorId("");
      setVendorPrice("");
      setVendorSku("");
      setLeadTimeDays("");
      setIsPreferred(false);
      setNotes("");
    }
  }, [isOpen, product, loadData]);

  if (!isOpen || !product) return null;

  const linkedVendorIds = new Set(links.map((l) => l.vendorId));
  const availableVendors = allVendors.filter((v) => !linkedVendorIds.has(v.id));

  const handleLinkVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVendorId) {
      setError("Please select a vendor to link.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await vendorApi.createVendorProduct({
        productId: product.id,
        vendorId: Number(selectedVendorId),
        vendorPrice: vendorPrice ? Number(vendorPrice) : null,
        vendorSku: vendorSku.trim() || null,
        leadTimeDays: leadTimeDays ? Number(leadTimeDays) : null,
        isPreferred,
        notes: notes.trim() || null,
      });

      // Reset form
      setSelectedVendorId("");
      setVendorPrice("");
      setVendorSku("");
      setLeadTimeDays("");
      setIsPreferred(false);
      setNotes("");
      setShowAddForm(false);

      await loadData();
      onUpdated?.();
    } catch (err: any) {
      setError(err?.message || "Failed to link vendor to product");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnlink = async (linkId: number) => {
    if (!confirm("Are you sure you want to unlink this vendor from this product?")) return;
    try {
      await vendorApi.deleteVendorProduct(linkId);
      await loadData();
      onUpdated?.();
    } catch (err: any) {
      setError(err?.message || "Failed to unlink vendor");
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "1rem",
      }}
    >
      <Card
        style={{
          width: "100%",
          maxWidth: "800px",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem",
          overflowY: "auto",
        }}
      >
        {/* Modal Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "1rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "1.5rem" }}>📦</span>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 700 }}>
                Vendors for {product.productName}
              </h2>
            </div>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "0.25rem" }}>
              SKU: {product.sku || "—"} • Current Stock: {product.currentStock ?? 0} • {links.length} supplier{links.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              fontSize: "1.5rem",
              cursor: "pointer",
              color: "var(--text-muted)",
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {error && (
          <div style={{ padding: "0.75rem 1rem", backgroundColor: "rgba(239, 68, 68, 0.1)", border: "1px solid var(--danger)", borderRadius: "6px", color: "var(--danger)", fontSize: "0.875rem" }}>
            {error}
          </div>
        )}

        {/* Action Bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text-secondary)" }}>
            Suppliers Selling This Product ({links.length})
          </div>
          <Button
            id="toggle-link-vendor-btn"
            size="sm"
            variant={showAddForm ? "secondary" : "primary"}
            onClick={() => setShowAddForm(!showAddForm)}
          >
            {showAddForm ? "Cancel Adding" : "+ Link Another Supplier"}
          </Button>
        </div>

        {/* Add / Link Form */}
        {showAddForm && (
          <form
            onSubmit={handleLinkVendor}
            style={{
              padding: "1rem",
              borderRadius: "8px",
              border: "1px solid var(--border-subtle)",
              backgroundColor: "rgba(255, 255, 255, 0.03)",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
            }}
          >
            <h4 style={{ fontSize: "0.95rem", fontWeight: 600 }}>Link Supplier / Vendor to Product</h4>

            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.35rem" }}>
                Select Vendor / Supplier *
              </label>
              {availableVendors.length === 0 ? (
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                  All vendors are already linked to this product.
                </p>
              ) : (
                <select
                  id="link-vendor-select"
                  value={selectedVendorId}
                  onChange={(e) => setSelectedVendorId(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    padding: "0.55rem 0.75rem",
                    borderRadius: "6px",
                    border: "1px solid var(--border-subtle)",
                    backgroundColor: "var(--bg-card)",
                    color: "inherit",
                    fontSize: "0.875rem",
                  }}
                >
                  <option value="">-- Choose a vendor to link --</option>
                  {availableVendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.profile ? `${v.profile.firstName} ${v.profile.lastName || ""}` : `Vendor #${v.id}`}
                      {v.profile?.isCompany ? " (Company)" : ""} — ${getVendorGroupName(v.vendorgroup)}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.35rem" }}>
                  Supplier Cost Price (IDR)
                </label>
                <Input
                  id="link-supplier-price"
                  type="number"
                  placeholder="e.g. 150000"
                  value={vendorPrice}
                  onChange={(e) => setVendorPrice(e.target.value)}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.35rem" }}>
                  Vendor SKU / Catalog Code
                </label>
                <Input
                  id="link-supplier-sku"
                  placeholder="e.g. SUP-1002"
                  value={vendorSku}
                  onChange={(e) => setVendorSku(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.35rem" }}>
                  Lead Time (Days)
                </label>
                <Input
                  id="link-supplier-lead-time"
                  type="number"
                  placeholder="e.g. 3"
                  value={leadTimeDays}
                  onChange={(e) => setLeadTimeDays(e.target.value)}
                />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "1.5rem" }}>
                <input
                  id="link-supplier-is-preferred"
                  type="checkbox"
                  checked={isPreferred}
                  onChange={(e) => setIsPreferred(e.target.checked)}
                  style={{ width: "16px", height: "16px", cursor: "pointer" }}
                />
                <label htmlFor="link-supplier-is-preferred" style={{ fontSize: "0.85rem", cursor: "pointer", fontWeight: 500 }}>
                  Mark as Preferred Supplier for this product
                </label>
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.35rem" }}>
                Notes / Terms
              </label>
              <Input
                id="link-supplier-notes"
                placeholder="e.g. Contract valid through 2027"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
              <Button type="button" variant="secondary" size="sm" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
              <Button id="submit-link-vendor-btn" type="submit" size="sm" disabled={submitting || availableVendors.length === 0}>
                {submitting ? "Linking..." : "Link Supplier"}
              </Button>
            </div>
          </form>
        )}

        {/* Linked Vendors Table / Cards */}
        {loading ? (
          <p style={{ color: "var(--text-muted)", padding: "1.5rem", textAlign: "center" }}>
            Loading product suppliers...
          </p>
        ) : links.length === 0 ? (
          <div
            style={{
              padding: "2.5rem 1rem",
              textAlign: "center",
              borderRadius: "8px",
              border: "1px dashed var(--border-subtle)",
              color: "var(--text-secondary)",
            }}
          >
            <span style={{ fontSize: "2rem", display: "block", marginBottom: "0.5rem" }}>🏭</span>
            <p style={{ fontWeight: 600 }}>No suppliers linked to this product yet.</p>
            <p style={{ fontSize: "0.85rem", marginTop: "0.25rem", color: "var(--text-muted)" }}>
              Link vendors who supply this product to track purchase costs and lead times.
            </p>
            <Button
              size="sm"
              style={{ marginTop: "1rem" }}
              onClick={() => setShowAddForm(true)}
            >
              + Link First Supplier
            </Button>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-subtle)", color: "var(--text-muted)", fontSize: "0.8rem" }}>
                  <th style={{ padding: "0.75rem 0" }}>SUPPLIER / VENDOR</th>
                  <th>VENDOR SKU</th>
                  <th>SUPPLY PRICE</th>
                  <th>LEAD TIME</th>
                  <th>STATUS</th>
                  <th style={{ textAlign: "right" }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {links.map((link) => {
                  const vName = link.vendor?.profile
                    ? `${link.vendor.profile.firstName} ${link.vendor.profile.lastName || ""}`.trim()
                    : `Vendor #${link.vendorId}`;
                  return (
                    <tr key={link.id} style={{ borderBottom: "1px solid var(--border-subtle)", fontSize: "0.875rem" }}>
                      <td style={{ padding: "0.75rem 0" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                          <span style={{ fontWeight: 600 }}>{vName}</span>
                          {link.vendor?.profile?.isCompany && <Badge variant="warning">Company</Badge>}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.15rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                          <span>${getVendorGroupName(link.vendor?.vendorgroup)}</span>
                          {link.vendor?.profile?.phoneNumber ? <span>• 📞 {link.vendor.profile.phoneNumber}</span> : null}
                        </div>
                      </td>
                      <td style={{ color: "var(--text-secondary)", fontFamily: "monospace" }}>
                        {link.vendorSku || "—"}
                      </td>
                      <td style={{ fontWeight: 600, color: "var(--success)" }}>
                        {link.vendorPrice ? formatIDR(Number(link.vendorPrice)) : "—"}
                      </td>
                      <td style={{ color: "var(--text-secondary)" }}>
                        {link.leadTimeDays ? `🚚 ${link.leadTimeDays} days` : "—"}
                      </td>
                      <td>
                        {link.isPreferred ? (
                          <Badge variant="success">⭐ Preferred</Badge>
                        ) : (
                          <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>Secondary</span>
                        )}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleUnlink(link.id)}
                        >
                          Unlink
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Modal Footer */}
        <div style={{ display: "flex", justifyContent: "flex-end", borderTop: "1px solid var(--border-subtle)", paddingTop: "1rem" }}>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </Card>
    </div>
  );
}
