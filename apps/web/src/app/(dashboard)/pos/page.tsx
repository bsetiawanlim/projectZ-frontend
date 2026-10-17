"use client";

import React, { useState, useEffect } from "react";
import { ProductPicker } from "@/components/pos/ProductPicker";
import { CartPanel } from "@/components/pos/CartPanel";
import { PaymentModal } from "@/components/pos/PaymentModal";
import { ReceiptModal } from "@/components/pos/ReceiptModal";
import { cartStore, type SalesOrderRecord } from "@pz/shared";
import { useDevice } from "@/lib/useDevice";

interface PaymentEntry {
  method: any;
  amount: number;
  referenceNumber: string;
}

export default function PosPage() {
  const device = useDevice();
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<SalesOrderRecord | null>(null);
  const [completedPayments, setCompletedPayments] = useState<PaymentEntry[]>([]);
  const [completedChange, setCompletedChange] = useState<number>(0);

  // Responsive tab for small screens (Android, iPhone)
  const [activeMobileTab, setActiveMobileTab] = useState<"catalog" | "cart">("catalog");
  const [cartItemCount, setCartItemCount] = useState<number>(() =>
    cartStore.getState().items.reduce((acc, it) => acc + it.quantity, 0)
  );

  useEffect(() => {
    const unsub = cartStore.subscribe((state) => {
      setCartItemCount(state.items.reduce((acc, it) => acc + it.quantity, 0));
    });
    return () => unsub();
  }, []);

  // Global hotkeys (F2 search, F8 pay, Escape close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F2") {
        e.preventDefault();
        const searchInput = document.getElementById("pos-product-search-input") as HTMLInputElement | null;
        searchInput?.focus();
      } else if (e.key === "F8") {
        e.preventDefault();
        if (cartStore.getState().items.length > 0 && !isPaymentOpen && !isReceiptOpen) {
          setIsPaymentOpen(true);
        }
      } else if (e.key === "Escape") {
        if (isPaymentOpen) setIsPaymentOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPaymentOpen, isReceiptOpen]);

  const handleOrderCompleted = (
    order: SalesOrderRecord,
    payments: PaymentEntry[],
    changeAmount: number
  ) => {
    setIsPaymentOpen(false);
    setCompletedOrder(order);
    setCompletedPayments(payments);
    setCompletedChange(changeAmount);
    setIsReceiptOpen(true);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", position: "relative" }}>
      {/* 📱 Mobile Screen View Switcher (Android, iPhone, screen <= 768px) */}
      {device.isSmallScreen && (
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            marginBottom: "0.75rem",
            backgroundColor: "var(--bg-surface)",
            padding: "0.25rem",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <button
            id="mobile-tab-catalog-btn"
            onClick={() => setActiveMobileTab("catalog")}
            style={{
              flex: 1,
              padding: "0.45rem 0.5rem",
              borderRadius: "var(--radius-sm)",
              fontWeight: 700,
              fontSize: "0.82rem",
              backgroundColor: activeMobileTab === "catalog" ? "var(--primary)" : "transparent",
              color: activeMobileTab === "catalog" ? "#ffffff" : "var(--text-secondary)",
              border: "none",
              cursor: "pointer",
              transition: "all var(--transition-fast)",
            }}
          >
            🍽️ Catalog Menu
          </button>
          <button
            id="mobile-tab-cart-btn"
            onClick={() => setActiveMobileTab("cart")}
            style={{
              flex: 1,
              padding: "0.45rem 0.5rem",
              borderRadius: "var(--radius-sm)",
              fontWeight: 700,
              fontSize: "0.82rem",
              backgroundColor: activeMobileTab === "cart" ? "var(--primary)" : "transparent",
              color: activeMobileTab === "cart" ? "#ffffff" : "var(--text-secondary)",
              border: "none",
              cursor: "pointer",
              transition: "all var(--transition-fast)",
            }}
          >
            🛒 Cart ({cartItemCount})
          </button>
        </div>
      )}

      {/* POS Terminal Workspace */}
      <div
        style={{
          display: device.isSmallScreen ? "flex" : "grid",
          flexDirection: "column",
          gridTemplateColumns: device.isSmallScreen ? "1fr" : "1fr 400px",
          gap: device.isSmallScreen ? "0.75rem" : "1.5rem",
          height: device.isSmallScreen ? "calc(100vh - 145px)" : "calc(100vh - 110px)",
          flex: 1,
          overflow: "hidden",
        }}
      >
        {/* Product Catalog Picker (Left 2/3 on desktop, or active tab on mobile) */}
        {(!device.isSmallScreen || activeMobileTab === "catalog") && (
          <div style={{ flex: 1, height: "100%", overflow: "hidden" }}>
            <ProductPicker />
          </div>
        )}

        {/* Cart & Checkout Panel (Right 1/3 on desktop, or active tab on mobile) */}
        {(!device.isSmallScreen || activeMobileTab === "cart") && (
          <div style={{ flex: 1, height: "100%", overflow: "hidden" }}>
            <CartPanel onProceedToPayment={() => setIsPaymentOpen(true)} />
          </div>
        )}

        {/* Floating Quick Cart Bar on Mobile when viewing Catalog */}
        {device.isSmallScreen && activeMobileTab === "catalog" && cartItemCount > 0 && (
          <button
            onClick={() => setActiveMobileTab("cart")}
            style={{
              position: "fixed",
              bottom: "1rem",
              left: "1rem",
              right: "1rem",
              padding: "0.75rem 1.25rem",
              borderRadius: "var(--radius-full)",
              backgroundColor: "var(--primary)",
              color: "#ffffff",
              fontWeight: 700,
              fontSize: "0.88rem",
              border: "1px solid var(--border-glow)",
              boxShadow: "0 8px 24px rgba(99, 102, 241, 0.4)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              zIndex: 30,
              cursor: "pointer",
            }}
          >
            <span>🛒 Active Cart: {cartItemCount} items</span>
            <span style={{ textDecoration: "underline" }}>View Cart & Pay →</span>
          </button>
        )}

        {/* Payment & Split Tender Modal */}
        <PaymentModal
          isOpen={isPaymentOpen}
          onClose={() => setIsPaymentOpen(false)}
          onOrderCompleted={handleOrderCompleted}
        />

        {/* Printable Receipt Modal */}
        <ReceiptModal
          isOpen={isReceiptOpen}
          order={completedOrder}
          payments={completedPayments}
          changeAmount={completedChange}
          onClose={() => {
            setIsReceiptOpen(false);
            setCompletedOrder(null);
          }}
        />
      </div>
    </div>
  );
}