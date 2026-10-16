"use client";

import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { customerApi, facilityApi, type FacilityRecord } from "@/lib/api";
import { AddCustomerModal } from "@/components/customers/AddCustomerModal";
import { useAuth } from "@/lib/authContext";
import { cartStore, formatIDR, type CustomerRecord, type CartState } from "@pz/shared";

interface CartPanelProps {
  onProceedToPayment: () => void;
}

export function CartPanel({ onProceedToPayment }: CartPanelProps) {
  const { user, canAccess } = useAuth();
  const [cartState, setCartState] = useState<CartState>(cartStore.getState());
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [facilities, setFacilities] = useState<FacilityRecord[]>([]);
  const [showDiscountInput, setShowDiscountInput] = useState(false);
  const [showTaxInput, setShowTaxInput] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);

  const canCreateCustomer = Boolean(
    user?.isSuperAdmin || canAccess("customer", "create") || canAccess("customer", "*")
  );

  useEffect(() => {
    const unsub = cartStore.subscribe((state) => setCartState(state));
    return () => unsub();
  }, []);

  useEffect(() => {
    async function loadData() {
      try {
        const [cRes, fRes] = await Promise.all([
          customerApi.listCustomers({ limit: 50 }),
          facilityApi.getFacilities({ limit: 50 }),
        ]);
        setCustomers(cRes.items || []);
        const facs = (fRes as any)?.data || (fRes as any)?.items || (Array.isArray(fRes) ? fRes : []);
        setFacilities(facs);
        // Default to first STORE/outlet facility if not set
        if (!cartStore.getState().facilityId && facs.length > 0) {
          const storeFac = facs.find((f: any) => f.type === "STORE") || facs[0];
          if (storeFac) {
            cartStore.getState().setFacility(storeFac.id);
          }
        }
      } catch (err) {
        console.error("Failed to load POS reference data", err);
      }
    }
    loadData();
  }, []);

  const handleQtyChange = (productId: number, delta: number) => {
    const item = cartState.items.find((i) => i.productId === productId);
    if (!item) return;
    const newQty = item.quantity + delta;
    cartStore.getState().updateItemQuantity(productId, newQty);
  };

  return (
    <Card
      glass
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        padding: "1.25rem",
        backgroundColor: "var(--bg-glass)",
      }}
    >
      {/* Header & Customer Picker */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: "1.15rem", fontWeight: 700 }}>Active Sale Cart</h2>
          <Button
            id="pos-cart-clear-btn"
            variant="ghost"
            size="sm"
            onClick={() => cartStore.getState().clearCart()}
            disabled={cartState.items.length === 0}
            style={{ fontSize: "0.8rem", color: "var(--accent-rose)" }}
          >
            Clear Cart
          </Button>
        </div>

        {/* POS Outlet / Facility & Table Number */}
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "0.5rem" }}>
          <div>
            <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 600 }}>
              POS Outlet:
            </label>
            <select
              id="pos-facility-select"
              value={cartState.facilityId ?? ""}
              onChange={(e) => {
                const val = e.target.value ? Number(e.target.value) : null;
                cartStore.getState().setFacility(val);
              }}
              style={{
                width: "100%",
                marginTop: "0.25rem",
                padding: "0.5rem 0.5rem",
                backgroundColor: "var(--bg-surface)",
                color: "var(--text-primary)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-md)",
                fontSize: "0.85rem",
                outline: "none",
              }}
            >
              <option value="">-- Facility --</option>
              {facilities.map((fac) => (
                <option key={fac.id} value={fac.id}>
                  🏪 {fac.facilityName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 600 }}>
              Table / Room:
            </label>
            <Input
              id="pos-table-number-input"
              type="text"
              placeholder="e.g. T-04"
              value={cartState.tableNumber ?? ""}
              onChange={(e) => cartStore.getState().setTableNumber(e.target.value || null)}
              style={{
                marginTop: "0.25rem",
                padding: "0.45rem 0.6rem",
                fontSize: "0.85rem",
              }}
            />
          </div>
        </div>

        {/* Customer Select */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>
              Customer Reference
            </label>
            {canCreateCustomer && (
              <button
                type="button"
                id="pos-add-customer-quick-btn"
                onClick={() => setIsCustomerModalOpen(true)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--primary)",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  padding: "2px 4px",
                }}
              >
                + New Customer
              </button>
            )}
          </div>
          <select
            id="pos-customer-select"
            value={cartState.customerId ?? ""}
            onChange={(e) => {
              const val = e.target.value ? Number(e.target.value) : null;
              cartStore.getState().setCustomer(val);
            }}
            style={{
              width: "100%",
              marginTop: "0.25rem",
              padding: "0.5rem 0.75rem",
              backgroundColor: "var(--bg-surface)",
              color: "var(--text-primary)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-md)",
              fontSize: "0.875rem",
              outline: "none",
            }}
          >
            <option value="">Walk-in Customer (General Public)</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                #{c.id} - {c.profile ? `${c.profile.firstName} ${c.profile.lastName || ""}` : "Unnamed Customer"}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Cart Items List */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
        {cartState.items.length === 0 ? (
          <div style={{ textAlign: "center", marginTop: "4rem", color: "var(--text-muted)" }}>
            <span style={{ fontSize: "2.5rem" }}>🛒</span>
            <p style={{ marginTop: "0.5rem", fontWeight: 500 }}>No items in cart</p>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
              Click products on the left or scan a barcode
            </p>
          </div>
        ) : (
          cartState.items.map((item) => (
            <div
              key={item.productId}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.4rem",
                padding: "0.75rem",
                backgroundColor: "var(--bg-surface-elevated)",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <h4 style={{ fontSize: "0.9rem", fontWeight: 600 }}>{item.productName}</h4>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    {formatIDR(item.unitPrice)} each
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => cartStore.getState().removeItem(item.productId)}
                  style={{ color: "var(--text-muted)", cursor: "pointer", padding: "2px 6px", background: "none", border: "none" }}
                  aria-label="Remove item"
                >
                  ✕
                </button>
              </div>

              {/* Quantity Controls & Line Total */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.25rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleQtyChange(item.productId, -1)}
                    style={{ padding: "0.2rem 0.5rem", minWidth: "24px" }}
                  >
                    -
                  </Button>
                  <span style={{ fontWeight: 600, fontSize: "0.9rem", minWidth: "24px", textAlign: "center" }}>
                    {item.quantity}
                  </span>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleQtyChange(item.productId, 1)}
                    style={{ padding: "0.2rem 0.5rem", minWidth: "24px" }}
                  >
                    +
                  </Button>
                </div>

                <div style={{ textAlign: "right" }}>
                  <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text-primary)" }}>
                    {formatIDR(item.totalPrice)}
                  </span>
                  {item.discountAmount > 0 && (
                    <div style={{ fontSize: "0.75rem", color: "var(--accent-emerald)" }}>
                      - {formatIDR(item.discountAmount)} ({item.discountPercentage}%)
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Cart Modifiers & Totals */}
      <div
        style={{
          borderTop: "1px solid var(--border-subtle)",
          paddingTop: "0.85rem",
          marginTop: "0.85rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
        }}
      >
        {/* Discount & Tax Toggles */}
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <Button
            size="sm"
            variant={cartState.includeDiscount ? "primary" : "secondary"}
            onClick={() => {
              const next = !cartState.includeDiscount;
              cartStore.getState().setOrderDiscount(next, next ? 5 : 0);
              setShowDiscountInput(next);
            }}
            style={{ flex: 1, fontSize: "0.75rem" }}
          >
            {cartState.includeDiscount ? `Discount (${cartState.discountPercentage}%)` : "+ Add Discount"}
          </Button>

          <Button
            size="sm"
            variant={cartState.includeTax ? "primary" : "secondary"}
            onClick={() => {
              const next = !cartState.includeTax;
              cartStore.getState().setOrderTax(next, next ? 11 : 0);
              setShowTaxInput(next);
            }}
            style={{ flex: 1, fontSize: "0.75rem" }}
          >
            {cartState.includeTax ? `Tax (${cartState.taxPercentage}%)` : "+ Add Tax (11%)"}
          </Button>
        </div>

        {/* Subtotal & Breakdown */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem", fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Subtotal</span>
            <span style={{ color: "var(--text-primary)" }}>{formatIDR(cartState.totals.subtotal)}</span>
          </div>

          {cartState.includeDiscount && (
            <div style={{ display: "flex", justifyContent: "space-between", color: "var(--accent-emerald)" }}>
              <span>Order Discount ({cartState.discountPercentage}%)</span>
              <span>- {formatIDR(cartState.totals.discountAmount)}</span>
            </div>
          )}

          {cartState.includeTax && (
            <div style={{ display: "flex", justifyContent: "space-between", color: "var(--accent-amber)" }}>
              <span>Tax / PPN ({cartState.taxPercentage}%)</span>
              <span>+ {formatIDR(cartState.totals.taxAmount)}</span>
            </div>
          )}

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: "0.4rem",
              paddingTop: "0.5rem",
              borderTop: "1px dashed var(--border-subtle)",
            }}
          >
            <span style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)" }}>
              Grand Total
            </span>
            <span style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--accent-emerald)" }}>
              {formatIDR(cartState.totals.grandTotal)}
            </span>
          </div>
        </div>

        {/* Checkout Button */}
        <Button
          id="pos-proceed-payment-modal-btn"
          size="lg"
          disabled={cartState.items.length === 0}
          onClick={onProceedToPayment}
          style={{ width: "100%", marginTop: "0.5rem", fontSize: "1rem", fontWeight: 700 }}
        >
          Proceed to Payment (F8) 💳
        </Button>
      </div>

      <AddCustomerModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        onCustomerCreated={(newCust) => {
          setCustomers((prev) => [newCust, ...prev]);
          cartStore.getState().setCustomer(newCust.id);
        }}
      />
    </Card>
  );
}
