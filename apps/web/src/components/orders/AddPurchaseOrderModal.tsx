"use client";

import React, { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { PersonPicker } from "@/components/common/PersonPicker";
import { orderApi, vendorApi, productApi, facilityApi } from "@/lib/api";
import type { FacilityRecord } from "@/lib/api";
import { parseRecipeMeta } from "@/components/products/ProductRecipeModal";
import { formatIDR, VENDOR_GROUPS, getVendorGroupName } from "@pz/shared";
import type { PurchaseOrderRecord, VendorRecord, RfqRecord, ProfileRecord, ProductItem, ProductRecipeItem } from "@pz/shared";

interface AddPurchaseOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderCreated: (order: PurchaseOrderRecord) => void;
  initialProductId?: number;
}

interface OrderLineItem {
  id: string;
  productId: number;
  productName: string;
  sku?: string;
  unitId?: number | null;
  unitLabel?: string;
  quantity: number;
  price: number;
  notes?: string;
}

export function AddPurchaseOrderModal({ isOpen, onClose, onOrderCreated, initialProductId }: AddPurchaseOrderModalProps) {
  const [number, setNumber] = useState("");
  const [title, setTitle] = useState("");
  const [vendorId, setVendorId] = useState<number | undefined>(undefined);
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState<"DRAFT" | "PENDING" | "APPROVED">("PENDING");
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [notes, setNotes] = useState("");
  const [destinationFacilityId, setDestinationFacilityId] = useState<number | undefined>(undefined);
  const [facilities, setFacilities] = useState<FacilityRecord[]>([]);

  // Product Line Items State
  const [catalogProducts, setCatalogProducts] = useState<ProductItem[]>([]);
  const [lineItems, setLineItems] = useState<OrderLineItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<number | "">("");
  const [itemQty, setItemQty] = useState<number>(1);
  const [itemPrice, setItemPrice] = useState<number>(0);

  const computedTotal = lineItems.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.price)), 0);

  const [vendors, setVendors] = useState<VendorRecord[]>([]);
  const [rfqs, setRfqs] = useState<RfqRecord[]>([]);
  const [selectedRfqId, setSelectedRfqId] = useState<number | undefined>(undefined);

  // Vendor feature states
  const [vendorMode, setVendorMode] = useState<"existing" | "new">("existing");
  const [vendorNotice, setVendorNotice] = useState<string | null>(null);
  const [vendorCreationMethod, setVendorCreationMethod] = useState<"manual" | "profile">("manual");
  const [newVendorProfile, setNewVendorProfile] = useState<ProfileRecord | null>(null);
  const [newVendorFirstName, setNewVendorFirstName] = useState("");
  const [newVendorLastName, setNewVendorLastName] = useState("");
  const [newVendorPhone, setNewVendorPhone] = useState("");
  const [newVendorAddress, setNewVendorAddress] = useState("");
  const [newVendorGroup, setNewVendorGroup] = useState<number>(1);
  const [newVendorIsCompany, setNewVendorIsCompany] = useState<boolean>(true);
  const [creatingVendor, setCreatingVendor] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const modalScrollRef = useRef<HTMLDivElement>(null);

  const displayError = (msg: string | null) => {
    setError(msg);
    if (msg && modalScrollRef.current) {
      modalScrollRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  useEffect(() => {
    if (isOpen) {
      const generatedNumber = `PO-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}-${Math.floor(1000 + Math.random() * 9000)}`;
      const defaultDue = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0] || "";

      setNumber(generatedNumber);
      setTitle("");
      setVendorId(undefined);
      setDueDate(defaultDue);
      setStatus("PENDING");
      setTotalAmount(0);
      setNotes("");
      setDestinationFacilityId(undefined);
      setLineItems([]);
      setSelectedProductId("");
      setItemQty(1);
      setItemPrice(0);

      // Fetch both catalog products and recipes to filter out formula products
      Promise.all([
        productApi.getProducts({ limit: 200 }),
        productApi.getAllRecipes({ limit: 500 }).catch(() => ({ items: [] })),
      ])
        .then(([prodRes, recipeRes]: any) => {
          const list: ProductItem[] = Array.isArray(prodRes?.data) ? prodRes.data : Array.isArray(prodRes) ? prodRes : [];
          const recipes: ProductRecipeItem[] = Array.isArray(recipeRes?.items) ? recipeRes.items : [];

          // Collect all product IDs configured as manufactured formula products (parent of recipe)
          const formulaProductIds = new Set<number>();
          recipes.forEach((r) => {
            if (r.productId) formulaProductIds.add(r.productId);
          });

          // Purchase Orders are only for raw materials, ingredients, and purchasable items — exclude all formula products
          const nonFormulaProducts = list.filter((p) => {
            if (formulaProductIds.has(p.id)) return false;
            if (p.recipes && p.recipes.length > 0) return false;
            const { meta } = parseRecipeMeta(p.description);
            const hasFormulaMeta =
              (meta.labor && meta.labor.length > 0) ||
              (meta.equipment && meta.equipment.length > 0) ||
              Boolean(meta.instructions && meta.instructions.trim().length > 0);
            if (hasFormulaMeta) return false;
            return true;
          });

          setCatalogProducts(nonFormulaProducts);

          if (initialProductId) {
            const initP = nonFormulaProducts.find((p) => p.id === initialProductId);
            if (initP) {
              const defaultLineItem: OrderLineItem = {
                id: "item-" + Date.now() + "-" + Math.random().toString(36).substr(2, 4),
                productId: initP.id,
                productName: initP.productName,
                sku: initP.sku || undefined,
                unitId: initP.unitId || null,
                unitLabel: initP.unitLabel || "pcs",
                quantity: 1,
                price: Number(initP.retailPrice || 0),
              };
              setLineItems([defaultLineItem]);
              setTitle((prev) => (prev ? prev : `Restock ${initP.productName}`));
              const defVendorId = initP.vendorProducts?.[0]?.vendorId;
              if (defVendorId) {
                setVendorId(defVendorId);
              }
            } else {
              const formulaMatch = list.find((p) => p.id === initialProductId);
              if (formulaMatch) {
                displayError(`Product "${formulaMatch.productName}" is a manufactured formula product. Purchase Orders can only be issued for raw materials and purchasable items.`);
              }
            }
          }
        })
        .catch(console.error);
      displayError(null);
      setSelectedRfqId(undefined);
      setVendorMode("existing");
      setVendorNotice(null);
      setVendorCreationMethod("manual");
      setNewVendorProfile(null);
      setNewVendorFirstName("");
      setNewVendorLastName("");
      setNewVendorPhone("");
      setNewVendorAddress("");
      setNewVendorGroup(1);
      setNewVendorIsCompany(true);

      // Fetch vendors and existing RFQs
      vendorApi
        .listVendors({ limit: 100 })
        .then((res) => {
          const list = res?.items || [];
          setVendors(list);
          if (list.length === 1 && list[0]) {
            setVendorId(list[0].id);
          }
        })
        .catch(() => setVendors([]));

      orderApi
        .listRfqs({ limit: 50 })
        .then((res) => setRfqs(res?.items || []))
        .catch(() => setRfqs([]));

      facilityApi
        .listFacilities({ limit: 100 })
        .then((res) => {
          const facList = res?.items || (res as any)?.data || [];
          setFacilities(facList);
          const defaultWh = facList.find((f: any) => f.type === "WAREHOUSE") || facList[0];
          if (defaultWh) {
            setDestinationFacilityId(defaultWh.id);
          }
        })
        .catch(() => setFacilities([]));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const selectedVendor = vendors.find((v) => v.id === vendorId);


  const handleSelectProductChange = (prodIdNum: number) => {
    setSelectedProductId(prodIdNum);
    const prod = catalogProducts.find((p) => p.id === prodIdNum);
    if (prod) {
      const vendorProd = prod.vendorProducts?.find((vp) => vp.vendorId === vendorId);
      const defaultPrice = vendorProd?.vendorPrice ?? prod.retailPrice ?? 0;
      setItemPrice(Number(defaultPrice));
    }
  };

  const handleAddLineItem = () => {
    if (!selectedProductId) return;
    const prod = catalogProducts.find((p) => p.id === Number(selectedProductId));
    if (!prod) {
      displayError("Please select a valid raw material or purchasable product (formula products cannot be added to Purchase Orders).");
      return;
    }

    if (itemQty <= 0) {
      displayError("Item quantity must be greater than 0");
      return;
    }

    const existingIndex = lineItems.findIndex((it) => it.productId === prod.id);
    if (existingIndex >= 0) {
      setLineItems((prev) =>
        prev.map((it, idx) =>
          idx === existingIndex
            ? { ...it, quantity: it.quantity + Number(itemQty), price: Number(itemPrice) }
            : it
        )
      );
    } else {
      const newItem: OrderLineItem = {
        id: "item-" + Date.now() + "-" + Math.random().toString(36).substr(2, 4),
        productId: prod.id,
        productName: prod.productName,
        sku: prod.sku || undefined,
        unitId: prod.unitId || null,
        unitLabel: prod.unitLabel || "pcs",
        quantity: Number(itemQty),
        price: Number(itemPrice),
      };
      setLineItems((prev) => [...prev, newItem]);
    }

    setSelectedProductId("");
    setItemQty(1);
    setItemPrice(0);
    displayError(null);
  };

  const handleRemoveLineItem = (index: number) => {
    setLineItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleRegisterVendorInline = async (): Promise<number | null> => {
    if (vendorCreationMethod === "profile") {
      if (!newVendorProfile) {
        displayError("Please search and select an existing person/company profile.");
        return null;
      }
    } else {
      if (!newVendorFirstName.trim() || newVendorFirstName.trim().length < 2) {
        displayError("Company or vendor name must be at least 2 characters.");
        return null;
      }
    }

    setCreatingVendor(true);
    displayError(null);

    try {
      const payload =
        vendorCreationMethod === "profile" && newVendorProfile
          ? {
              profileId: newVendorProfile.id,
              vendorgroup: Number(newVendorGroup) || 1,
            }
          : {
              firstName: newVendorFirstName.trim(),
              lastName: newVendorLastName.trim() || undefined,
              phoneNumber: newVendorPhone.trim() || undefined,
              address: newVendorAddress.trim() || undefined,
              vendorgroup: Number(newVendorGroup) || 1,
              isCompany: newVendorIsCompany,
            };

      const res = await vendorApi.createVendor(payload);
      const createdVendor = res?.data;

      if (!createdVendor?.id) {
        throw new Error("Failed to receive created vendor record.");
      }

      setVendors((prev) => [createdVendor, ...prev.filter((v) => v.id !== createdVendor.id)]);
      setVendorId(createdVendor.id);

      const name = createdVendor.profile
        ? `${createdVendor.profile.firstName} ${createdVendor.profile.lastName || ""}`.trim()
        : newVendorFirstName.trim() || `Vendor #${createdVendor.id}`;

      setVendorNotice(`Vendor "${name}" registered and selected!`);
      setVendorMode("existing");

      // Reset new vendor form fields
      setNewVendorProfile(null);
      setNewVendorFirstName("");
      setNewVendorLastName("");
      setNewVendorPhone("");
      setNewVendorAddress("");
      setNewVendorGroup(1);
      setNewVendorIsCompany(true);

      return createdVendor.id;
    } catch (err: any) {
      console.error("Failed to create vendor inline:", err);
      displayError(err?.message || "Failed to create vendor record.");
      return null;
    } finally {
      setCreatingVendor(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    displayError(null);

    let activeVendorId = vendorId;

    // If user is currently on the new vendor tab, automatically register the vendor first
    if (vendorMode === "new") {
      const newlyCreatedId = await handleRegisterVendorInline();
      if (!newlyCreatedId) {
        return;
      }
      activeVendorId = newlyCreatedId;
    }

    if (!title.trim()) {
      displayError("Purchase order title is required.");
      return;
    }
    if (!activeVendorId) {
      displayError("Please select or register a vendor supplier.");
      return;
    }
    if (!dueDate) {
      displayError("Due delivery date is required.");
      return;
    }

    // Auto-incorporate item from adder bar if user selected product but forgot to click '+ Add Item'
    let finalLineItems = [...lineItems];
    if (selectedProductId) {
      const pendingProd = catalogProducts.find((p) => p.id === Number(selectedProductId));
      if (pendingProd && itemQty > 0) {
        const existingIndex = finalLineItems.findIndex((it) => it.productId === pendingProd.id);
        const existingItem = existingIndex >= 0 ? finalLineItems[existingIndex] : undefined;
        if (existingIndex >= 0 && existingItem) {
          finalLineItems[existingIndex] = {
            ...existingItem,
            quantity: existingItem.quantity + Number(itemQty),
            price: Number(itemPrice),
          };
        } else {
          finalLineItems.push({
            id: "item-" + Date.now() + "-" + Math.random().toString(36).substr(2, 4),
            productId: pendingProd.id,
            productName: pendingProd.productName,
            sku: pendingProd.sku || undefined,
            unitId: pendingProd.unitId || null,
            unitLabel: pendingProd.unitLabel || "pcs",
            quantity: Number(itemQty),
            price: Number(itemPrice),
          });
        }
      }
    }

    if (finalLineItems.length === 0 && (!totalAmount || Number(totalAmount) <= 0)) {
      displayError("Please add at least one product item or specify an order total amount.");
      return;
    }

    setLoading(true);

    try {
      let rfqIdToUse = selectedRfqId;

      // If no RFQ selected, auto-create an RFQ record for this vendor
      if (!rfqIdToUse) {
        const rfqNumber = `RFQ-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
        const rfqRes = await orderApi.createRfq({
          vendorId: Number(activeVendorId),
          number: rfqNumber,
          title: `Procurement for: ${title.trim()}`,
          dueDate: new Date(dueDate).toISOString(),
          status: "APPROVED",
          notes: `Auto-generated procurement RFQ for ${number}`,
        });

        const createdRfq = (rfqRes as any)?.data?.rfq ?? (rfqRes as any)?.rfq;
        if (!createdRfq?.id) {
          throw new Error("Could not initialize procurement RFQ link.");
        }
        rfqIdToUse = createdRfq.id;
      }

      const calculatedLineTotal = finalLineItems.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.price)), 0);
      const finalAmount = calculatedLineTotal > 0 ? calculatedLineTotal : (Number(totalAmount) || 0);
      const productsPayload = finalLineItems.map((it) => ({
        productId: it.productId,
        unitId: it.unitId || undefined,
        quantity: it.quantity,
        price: it.price,
      }));

      const res = await orderApi.createPurchaseOrder({
        rfqId: Number(rfqIdToUse),
        vendorId: Number(activeVendorId),
        destinationFacilityId: destinationFacilityId ? Number(destinationFacilityId) : undefined,
        number: number.trim(),
        title: title.trim(),
        dueDate: new Date(dueDate).toISOString(),
        status,
        totalAmount: finalAmount,
        notes: notes.trim() || undefined,
        products: productsPayload.length > 0 ? productsPayload : undefined,
      });

      const newPO = (res as any)?.data?.purchaseOrder ?? (res as any)?.purchaseOrder;
      if (newPO) {
        onOrderCreated(newPO);
        onClose();
      }
    } catch (err: any) {
      displayError(err?.message || "Failed to create purchase order.");
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
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "1rem",
        overflowY: "auto",
      }}
    >
      <Card
        ref={modalScrollRef}
        style={{
          width: "100%",
          maxWidth: "600px",
          maxHeight: "92vh",
          overflowY: "auto",
          backgroundColor: "var(--bg-surface)",
          border: "1px solid var(--border-glow)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
          padding: "1.75rem",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <div>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--text-primary)" }}>
              Issue Purchase Order
            </h3>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
              Procurement commitment to vendor supplier
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

        {error && (
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
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.35rem" }}>
                PO Reference Number *
              </label>
              <Input
                id="po-number-input"
                required
                value={number}
                onChange={(e) => setNumber(e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.35rem" }}>
                Expected Due Date *
              </label>
              <Input
                id="po-duedate-input"
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.35rem" }}>
                Order Title / Description *
              </label>
              <Input
                id="po-title-input"
                placeholder="e.g. Q4 Raw Material Supply, Bulk Packaging Resupply"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.35rem" }}>
                Destination Facility / Warehouse
              </label>
              <select
                id="po-destination-facility-select"
                value={destinationFacilityId || ""}
                onChange={(e) => setDestinationFacilityId(e.target.value ? Number(e.target.value) : undefined)}
                style={{
                  width: "100%",
                  padding: "0.5rem 0.75rem",
                  fontSize: "0.85rem",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "var(--bg-primary)",
                  border: "1px solid var(--border-subtle)",
                  color: "var(--text-primary)",
                  outline: "none",
                }}
              >
                <option value="">-- Select Destination Location --</option>
                {facilities.map((fac) => (
                  <option key={fac.id} value={fac.id}>
                    {fac.type === "WAREHOUSE" ? "🏭" : fac.type === "STORE" ? "🏪" : "📍"} {fac.facilityName} ({fac.facilityCode})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Vendor Supplier Section */}
          <div
            style={{
              padding: "1rem",
              borderRadius: "var(--radius-md)",
              backgroundColor: "var(--bg-surface-elevated)",
              border: "1px solid var(--border-subtle)",
              display: "flex",
              flexDirection: "column",
              gap: "0.85rem",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
              <label style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)" }}>
                Vendor Supplier *
              </label>

              {/* Mode switch buttons */}
              <div
                style={{
                  display: "inline-flex",
                  padding: "2px",
                  backgroundColor: "var(--bg-surface)",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <button
                  type="button"
                  id="vendor-mode-existing-btn"
                  onClick={() => setVendorMode("existing")}
                  style={{
                    padding: "0.3rem 0.65rem",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    borderRadius: "var(--radius-xs)",
                    border: "none",
                    cursor: "pointer",
                    backgroundColor: vendorMode === "existing" ? "var(--primary)" : "transparent",
                    color: vendorMode === "existing" ? "#ffffff" : "var(--text-secondary)",
                    transition: "all 0.15s ease",
                  }}
                >
                  🏢 Choose Existing ({vendors.length})
                </button>
                <button
                  type="button"
                  id="vendor-mode-new-btn"
                  onClick={() => setVendorMode("new")}
                  style={{
                    padding: "0.3rem 0.65rem",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    borderRadius: "var(--radius-xs)",
                    border: "none",
                    cursor: "pointer",
                    backgroundColor: vendorMode === "new" ? "var(--primary)" : "transparent",
                    color: vendorMode === "new" ? "#ffffff" : "var(--text-secondary)",
                    transition: "all 0.15s ease",
                  }}
                >
                  ➕ Register New Vendor
                </button>
              </div>
            </div>

            {vendorNotice && (
              <div
                style={{
                  padding: "0.5rem 0.75rem",
                  backgroundColor: "rgba(16, 185, 129, 0.12)",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                  borderRadius: "var(--radius-sm)",
                  color: "var(--accent-emerald)",
                  fontSize: "0.8rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span>✓ {vendorNotice}</span>
                <button
                  type="button"
                  onClick={() => setVendorNotice(null)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--accent-emerald)",
                    cursor: "pointer",
                    fontSize: "0.8rem",
                  }}
                >
                  ✕
                </button>
              </div>
            )}

            {vendorMode === "existing" ? (
              <div>
                <select
                  id="po-vendor-select"
                  value={vendorId || ""}
                  onChange={(e) => setVendorId(e.target.value ? Number(e.target.value) : undefined)}
                  style={{
                    width: "100%",
                    padding: "0.6rem 0.85rem",
                    backgroundColor: "var(--bg-surface)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-md)",
                    color: "var(--text-primary)",
                    fontSize: "0.9rem",
                    outline: "none",
                  }}
                >
                  <option value="">— Select Registered Vendor Partner —</option>
                  {vendors.map((v) => {
                    const name = v.profile
                      ? `${v.profile.firstName} ${v.profile.lastName || ""}`.trim()
                      : `Vendor #${v.id}`;
                    return (
                      <option key={v.id} value={v.id}>
                        {name} ({v.profile?.isCompany ? "Company" : "Individual"}) — {getVendorGroupName(v.vendorgroup)}
                      </option>
                    );
                  })}
                </select>

                {/* Selected vendor summary card */}
                {selectedVendor && (
                  <div
                    style={{
                      marginTop: "0.75rem",
                      padding: "0.75rem 1rem",
                      backgroundColor: "rgba(99, 102, 241, 0.08)",
                      border: "1px solid var(--border-glow)",
                      borderRadius: "var(--radius-md)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "1rem",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <div
                        style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "var(--radius-full)",
                          backgroundColor: "var(--bg-surface)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "1.1rem",
                        }}
                      >
                        {selectedVendor.profile?.isCompany ? "🏢" : "👤"}
                      </div>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--text-primary)" }}>
                            {selectedVendor.profile
                              ? `${selectedVendor.profile.firstName} ${selectedVendor.profile.lastName || ""}`.trim()
                              : `Vendor #${selectedVendor.id}`}
                          </span>
                          <Badge variant={selectedVendor.profile?.isCompany ? "warning" : "default"}>
                            {selectedVendor.profile?.isCompany ? "Company" : "Individual"}
                          </Badge>
                          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                            {getVendorGroupName(selectedVendor.vendorgroup)}
                          </span>
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.15rem" }}>
                          {selectedVendor.profile?.phoneNumber ? `📞 ${selectedVendor.profile.phoneNumber}` : "No phone listed"}
                          {selectedVendor.profile?.address ? ` • 📍 ${selectedVendor.profile.address}` : ""}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setVendorId(undefined)}
                      style={{
                        padding: "0.25rem 0.5rem",
                        background: "transparent",
                        border: "1px solid var(--border-subtle)",
                        borderRadius: "var(--radius-sm)",
                        color: "var(--text-muted)",
                        fontSize: "0.75rem",
                        cursor: "pointer",
                      }}
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Register New Vendor Form */
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem",
                  padding: "0.75rem",
                  backgroundColor: "var(--bg-surface)",
                  border: "1px dashed var(--border-glow)",
                  borderRadius: "var(--radius-md)",
                }}
              >
                {/* Sub-mode switcher */}
                <div style={{ display: "flex", gap: "0.5rem", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "0.5rem" }}>
                  <button
                    type="button"
                    id="vendor-method-manual-btn"
                    onClick={() => setVendorCreationMethod("manual")}
                    style={{
                      padding: "0.25rem 0.6rem",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      borderRadius: "var(--radius-sm)",
                      border: "none",
                      cursor: "pointer",
                      backgroundColor: vendorCreationMethod === "manual" ? "rgba(99, 102, 241, 0.2)" : "transparent",
                      color: vendorCreationMethod === "manual" ? "var(--primary-light)" : "var(--text-muted)",
                    }}
                  >
                    ✨ New Company / Identity
                  </button>
                  <button
                    type="button"
                    id="vendor-method-profile-btn"
                    onClick={() => setVendorCreationMethod("profile")}
                    style={{
                      padding: "0.25rem 0.6rem",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      borderRadius: "var(--radius-sm)",
                      border: "none",
                      cursor: "pointer",
                      backgroundColor: vendorCreationMethod === "profile" ? "rgba(99, 102, 241, 0.2)" : "transparent",
                      color: vendorCreationMethod === "profile" ? "var(--primary-light)" : "var(--text-muted)",
                    }}
                  >
                    🔍 Link Existing Master Person
                  </button>
                </div>

                {vendorCreationMethod === "profile" ? (
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "0.35rem" }}>
                      Search & Pick Person or Organization from Master Directory:
                    </label>
                    <PersonPicker
                      selectedProfile={newVendorProfile}
                      onSelect={setNewVendorProfile}
                    />
                    <div style={{ marginTop: "0.5rem" }}>
                      <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "0.2rem" }}>
                        Vendor Tier / Group
                      </label>
                      <select
                        id="new-vendor-profile-group-input"
                        value={newVendorGroup}
                        onChange={(e) => setNewVendorGroup(Number(e.target.value) || 1)}
                        style={{
                          width: "100%",
                          padding: "0.55rem 0.75rem",
                          backgroundColor: "var(--bg-surface)",
                          border: "1px solid var(--border-subtle)",
                          borderRadius: "var(--radius-md)",
                          color: "var(--text-primary)",
                          fontSize: "0.85rem",
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
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <input
                        id="new-vendor-is-company-checkbox"
                        type="checkbox"
                        checked={newVendorIsCompany}
                        onChange={(e) => setNewVendorIsCompany(e.target.checked)}
                        style={{ accentColor: "var(--primary)", cursor: "pointer", width: "16px", height: "16px" }}
                      />
                      <label
                        htmlFor="new-vendor-is-company-checkbox"
                        style={{ fontSize: "0.8rem", color: "var(--text-primary)", cursor: "pointer", fontWeight: 500 }}
                      >
                        Corporate / Business Entity (Company)
                      </label>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: newVendorIsCompany ? "1fr" : "1fr 1fr", gap: "0.5rem" }}>
                      <div>
                        <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "0.2rem" }}>
                          {newVendorIsCompany ? "Company / Legal Business Name *" : "First Name *"}
                        </label>
                        <Input
                          id="new-vendor-name-input"
                          placeholder={newVendorIsCompany ? "e.g. PT Mitra Logistik Utama" : "e.g. Budi"}
                          value={newVendorFirstName}
                          onChange={(e) => setNewVendorFirstName(e.target.value)}
                        />
                      </div>
                      {!newVendorIsCompany && (
                        <div>
                          <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "0.2rem" }}>
                            Last Name (Optional)
                          </label>
                          <Input
                            id="new-vendor-lastname-input"
                            placeholder="e.g. Santoso"
                            value={newVendorLastName}
                            onChange={(e) => setNewVendorLastName(e.target.value)}
                          />
                        </div>
                      )}
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "0.5rem" }}>
                      <div>
                        <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "0.2rem" }}>
                          Contact Phone Number
                        </label>
                        <Input
                          id="new-vendor-phone-input"
                          placeholder="e.g. +62 812-3456-7890"
                          value={newVendorPhone}
                          onChange={(e) => setNewVendorPhone(e.target.value)}
                        />
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "0.2rem" }}>
                          Vendor Group
                        </label>
                        <select
                          id="new-vendor-group-input"
                          value={newVendorGroup}
                          onChange={(e) => setNewVendorGroup(Number(e.target.value) || 1)}
                          style={{
                            width: "100%",
                            padding: "0.55rem 0.75rem",
                            backgroundColor: "var(--bg-surface)",
                            border: "1px solid var(--border-subtle)",
                            borderRadius: "var(--radius-md)",
                            color: "var(--text-primary)",
                            fontSize: "0.85rem",
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
                      <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "0.2rem" }}>
                        Supplier Facility / Office Address
                      </label>
                      <Input
                        id="new-vendor-address-input"
                        placeholder="e.g. Kawasan Industri MM2100 Blok B, Cikarang"
                        value={newVendorAddress}
                        onChange={(e) => setNewVendorAddress(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {/* Inline Action Buttons */}
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.25rem" }}>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    id="cancel-new-vendor-btn"
                    onClick={() => setVendorMode("existing")}
                    disabled={creatingVendor}
                  >
                    Cancel New Vendor
                  </Button>
                  <Button
                    type="button"
                    id="save-new-vendor-btn"
                    size="sm"
                    onClick={handleRegisterVendorInline}
                    isLoading={creatingVendor}
                  >
                    ✓ Register & Select Vendor
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* ── Product Line Items Section ── */}
          <div
            style={{
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-md)",
              padding: "1rem",
              backgroundColor: "var(--bg-surface-elevated)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <label style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)" }}>
                    📦 Purchase Order Items ({lineItems.length})
                  </label>
                  <Badge variant="info" style={{ fontSize: "0.7rem", padding: "0.15rem 0.5rem" }}>
                    Raw Materials & Goods Only
                  </Badge>
                </div>
                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.1rem" }}>
                  Add raw materials and inventory goods to order from suppliers (manufactured formula products are excluded)
                </p>
              </div>

              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Total Value: </span>
                <span style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--accent-emerald)" }}>
                  {formatIDR(computedTotal > 0 ? computedTotal : totalAmount)}
                </span>
              </div>
            </div>

            {/* Line Item Adder Bar */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 1fr 1.2fr auto",
                gap: "0.5rem",
                alignItems: "flex-end",
                backgroundColor: "var(--bg-surface)",
                padding: "0.75rem",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-subtle)",
                marginBottom: "0.75rem",
              }}
            >
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.25rem" }}>
                  <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                    Select Product *
                  </label>
                  <span style={{ fontSize: "0.68rem", color: "var(--accent-emerald)", fontWeight: 500 }}>
                    ✓ Formula products excluded
                  </span>
                </div>
                <select
                  id="add-item-product-select"
                  value={selectedProductId}
                  onChange={(e) => handleSelectProductChange(Number(e.target.value))}
                  style={{
                    width: "100%",
                    padding: "0.5rem 0.75rem",
                    backgroundColor: "var(--bg-surface-elevated)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-sm)",
                    color: "var(--text-primary)",
                    fontSize: "0.85rem",
                    outline: "none",
                  }}
                >
                  <option value="">— Pick raw material / purchasable item —</option>
                  {catalogProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.productName} {p.sku ? `(${p.sku})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>
                  Quantity *
                </label>
                <Input
                  id="add-item-qty-input"
                  type="number"
                  min="1"
                  step="1"
                  value={itemQty}
                  onChange={(e) => setItemQty(Number(e.target.value))}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>
                  Unit Price (IDR)
                </label>
                <Input
                  id="add-item-price-input"
                  type="number"
                  min="0"
                  step="1000"
                  value={itemPrice || ""}
                  onChange={(e) => setItemPrice(Number(e.target.value))}
                  placeholder="0"
                />
              </div>

              <Button
                type="button"
                id="add-line-item-btn"
                size="sm"
                variant="secondary"
                disabled={!selectedProductId}
                onClick={handleAddLineItem}
                style={{
                  height: "38px",
                  backgroundColor: "rgba(99, 102, 241, 0.15)",
                  color: "var(--primary-light)",
                  border: "1px solid var(--border-glow)",
                }}
              >
                + Add Item
              </Button>
            </div>

            {/* Line Items Table */}
            {lineItems.length === 0 ? (
              <div
                style={{
                  padding: "0.85rem",
                  textAlign: "center",
                  color: "var(--text-muted)",
                  fontSize: "0.8rem",
                  border: "1px dashed var(--border-subtle)",
                  borderRadius: "var(--radius-sm)",
                }}
              >
                No products added yet. Select a product above or enter manual total value below.
              </div>
            ) : (
              <div
                style={{
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-sm)",
                  overflow: "hidden",
                }}
              >
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                  <thead>
                    <tr
                      style={{
                        backgroundColor: "var(--bg-surface)",
                        borderBottom: "1px solid var(--border-subtle)",
                        color: "var(--text-muted)",
                        fontSize: "0.75rem",
                        textTransform: "uppercase",
                      }}
                    >
                      <th style={{ padding: "0.5rem 0.75rem", textAlign: "left" }}>Product</th>
                      <th style={{ padding: "0.5rem 0.75rem", textAlign: "right" }}>Qty</th>
                      <th style={{ padding: "0.5rem 0.75rem", textAlign: "right" }}>Price</th>
                      <th style={{ padding: "0.5rem 0.75rem", textAlign: "right" }}>Subtotal</th>
                      <th style={{ padding: "0.5rem 0.75rem", textAlign: "center", width: "40px" }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map((it, idx) => (
                      <tr
                        key={it.id}
                        style={{
                          borderBottom: idx < lineItems.length - 1 ? "1px solid var(--border-subtle)" : "none",
                          backgroundColor: "var(--bg-primary)",
                        }}
                      >
                        <td style={{ padding: "0.5rem 0.75rem" }}>
                          <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{it.productName}</span>
                          {it.sku && (
                            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginLeft: "0.4rem" }}>
                              ({it.sku})
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "0.5rem 0.75rem", textAlign: "right", color: "var(--text-primary)" }}>
                          {it.quantity} <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{it.unitLabel}</span>
                        </td>
                        <td style={{ padding: "0.5rem 0.75rem", textAlign: "right", color: "var(--text-secondary)" }}>
                          {formatIDR(it.price)}
                        </td>
                        <td style={{ padding: "0.5rem 0.75rem", textAlign: "right", fontWeight: 600, color: "var(--accent-emerald)" }}>
                          {formatIDR(it.quantity * it.price)}
                        </td>
                        <td style={{ padding: "0.5rem 0.75rem", textAlign: "center" }}>
                          <button
                            type="button"
                            onClick={() => handleRemoveLineItem(idx)}
                            style={{
                              background: "transparent",
                              border: "none",
                              color: "var(--accent-rose)",
                              fontSize: "0.9rem",
                              cursor: "pointer",
                            }}
                            title="Remove item"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ backgroundColor: "var(--bg-surface)", borderTop: "1px solid var(--border-subtle)" }}>
                      <td colSpan={3} style={{ padding: "0.5rem 0.75rem", textAlign: "right", fontWeight: 700, color: "var(--text-secondary)" }}>
                        Calculated Items Total:
                      </td>
                      <td style={{ padding: "0.5rem 0.75rem", textAlign: "right", fontWeight: 700, color: "var(--accent-emerald)" }}>
                        {formatIDR(computedTotal)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.35rem" }}>
                Total Order Value (IDR) {computedTotal > 0 && <span style={{ fontSize: "0.75rem", color: "var(--accent-emerald)" }}>(Auto-calculated)</span>}
              </label>
              <Input
                id="po-amount-input"
                type="number"
                min="0"
                step="1000"
                value={computedTotal > 0 ? computedTotal : (totalAmount || "")}
                onChange={(e) => setTotalAmount(Number(e.target.value))}
                placeholder="0"
                disabled={computedTotal > 0}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.35rem" }}>
                Initial Status
              </label>
              <select
                id="po-status-select"
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
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
                <option value="DRAFT">📝 Draft</option>
                <option value="PENDING">⏳ Pending Approval</option>
                <option value="APPROVED">✅ Approved</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.35rem" }}>
              Procurement Terms & Notes (Optional)
            </label>
            <Input
              id="po-notes-input"
              placeholder="e.g. Net 30 payment terms upon warehouse receipt"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {error && (
            <div
              style={{
                padding: "0.6rem 0.85rem",
                backgroundColor: "rgba(239, 68, 68, 0.15)",
                border: "1px solid var(--accent-rose)",
                borderRadius: "var(--radius-md)",
                color: "var(--accent-rose)",
                fontSize: "0.85rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.75rem" }}>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button id="submit-po-btn" type="submit" isLoading={loading}>
              Create Purchase Order
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
