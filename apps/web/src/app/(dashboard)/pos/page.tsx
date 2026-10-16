"use client";

import React, { useState, useEffect } from "react";
import { ProductPicker } from "@/components/pos/ProductPicker";
import { CartPanel } from "@/components/pos/CartPanel";
import { PaymentModal } from "@/components/pos/PaymentModal";
import { ReceiptModal } from "@/components/pos/ReceiptModal";
import { cartStore, type SalesOrderRecord } from "@pz/shared";

interface PaymentEntry {
  method: any;
  amount: number;
  referenceNumber: string;
}

export default function PosPage() {
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<SalesOrderRecord | null>(null);
  const [completedPayments, setCompletedPayments] = useState<PaymentEntry[]>([]);
  const [completedChange, setCompletedChange] = useState<number>(0);

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
    <div style={{ display: "grid", gridTemplateColumns: "1fr 400px", gap: "1.5rem", height: "calc(100vh - 110px)" }}>
      {/* Product Catalog Picker (Left 2/3) */}
      <ProductPicker />

      {/* Cart & Checkout Panel (Right 1/3) */}
      <CartPanel onProceedToPayment={() => setIsPaymentOpen(true)} />

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
  );
}