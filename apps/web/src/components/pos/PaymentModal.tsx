"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { posApi } from "@/lib/api";
import {
  cartStore,
  formatIDR,
  calculateChange,
  type PaymentMethod,
  type SalesOrderRecord,
  type SalesPaymentRecord,
} from "@pz/shared";

interface PaymentEntry {
  method: PaymentMethod;
  amount: number;
  referenceNumber: string;
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderCompleted: (order: SalesOrderRecord, payments: PaymentEntry[], changeAmount: number) => void;
}

export function PaymentModal({ isOpen, onClose, onOrderCompleted }: PaymentModalProps) {
  const cartState = cartStore.getState();
  const grandTotal = cartState.totals.grandTotal;

  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>("CASH");
  const [currentAmount, setCurrentAmount] = useState<number>(grandTotal);
  const [referenceNumber, setReferenceNumber] = useState("");
  const [payments, setPayments] = useState<PaymentEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0) + (currentAmount > 0 ? currentAmount : 0);
  const committedPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const remainingBalance = Math.max(0, grandTotal - committedPaid);
  const changeDue = calculateChange(committedPaid + currentAmount, grandTotal);

  const handleAddPayment = () => {
    if (currentAmount <= 0) return;
    setPayments([
      ...payments,
      {
        method: selectedMethod,
        amount: currentAmount,
        referenceNumber: referenceNumber.trim(),
      },
    ]);
    const nextCommitted = committedPaid + currentAmount;
    const nextRemaining = Math.max(0, grandTotal - nextCommitted);
    setCurrentAmount(nextRemaining);
    setReferenceNumber("");
  };

  const handleRemovePayment = (index: number) => {
    const next = [...payments];
    next.splice(index, 1);
    setPayments(next);
  };

  const handleCompleteOrder = async () => {
    setError(null);
    setLoading(true);

    try {
      // 1. Compile final list of payments
      const allPayments = [...payments];
      if (currentAmount > 0 && (payments.length === 0 || committedPaid + currentAmount >= grandTotal)) {
        allPayments.push({
          method: selectedMethod,
          amount: currentAmount,
          referenceNumber: referenceNumber.trim(),
        });
      }

      const sumPaid = allPayments.reduce((s, p) => s + p.amount, 0);
      if (sumPaid < grandTotal) {
        throw new Error(`Insufficient payment: paid ${formatIDR(sumPaid)} of ${formatIDR(grandTotal)} required`);
      }

      // 2. Create the Sales Order with items
      const payload = cartState.toCreateOrderPayload();
      const orderRes = await posApi.createSalesOrder(payload);
      const createdOrder = orderRes.data;

      // 3. Register payments
      for (const p of allPayments) {
        await posApi.createPayment({
          salesOrderId: createdOrder.id,
          method: p.method,
          amount: p.amount,
          status: "SETTLED",
          referenceNumber: p.referenceNumber || null,
        });
      }

      // 4. Complete the Sales Order (deducts stock)
      const completeRes = await posApi.completeSalesOrder(createdOrder.id);
      const finalOrder = completeRes.data;

      // 5. Clear cart
      cartStore.getState().clearCart();

      // 6. Callback for receipt
      onOrderCompleted(finalOrder, allPayments, changeDue);
    } catch (err: any) {
      console.error("Failed to complete sale", err);
      setError(err?.message || "Failed to process payment and complete order");
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
        zIndex: 50,
        padding: "1rem",
      }}
    >
      <div style={{ width: "100%", maxWidth: "600px" }}>
        <Card glass style={{ padding: "1.75rem", backgroundColor: "var(--bg-surface)" }}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
            <div>
              <h2 style={{ fontSize: "1.3rem", fontWeight: 700 }}>Checkout & Payment</h2>
              <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                Order Total: <strong style={{ color: "var(--text-primary)" }}>{formatIDR(grandTotal)}</strong>
              </span>
            </div>
            <button onClick={onClose} style={{ color: "var(--text-muted)", fontSize: "1.25rem", cursor: "pointer" }}>
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

          {/* Payment Method Selector */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.5rem", marginBottom: "1.25rem" }}>
            {(["CASH", "CARD", "BANK_TRANSFER", "EWALLET"] as PaymentMethod[]).map((m) => (
              <Button
                key={m}
                size="sm"
                variant={selectedMethod === m ? "primary" : "secondary"}
                onClick={() => setSelectedMethod(m)}
                style={{ fontSize: "0.8rem", padding: "0.5rem 0.25rem" }}
              >
                {m === "CASH" && "💵 Cash"}
                {m === "CARD" && "💳 Card"}
                {m === "BANK_TRANSFER" && "🏦 Transfer"}
                {m === "EWALLET" && "📱 E-Wallet"}
              </Button>
            ))}
          </div>

          {/* Quick Cash Buttons */}
          {selectedMethod === "CASH" && (
            <div style={{ display: "flex", gap: "0.4rem", marginBottom: "1rem", flexWrap: "wrap" }}>
              <Button size="sm" variant="secondary" onClick={() => setCurrentAmount(remainingBalance)}>
                Exact ({formatIDR(remainingBalance)})
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setCurrentAmount(50000)}>
                Rp 50.000
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setCurrentAmount(100000)}>
                Rp 100.000
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setCurrentAmount(200000)}>
                Rp 200.000
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setCurrentAmount(500000)}>
                Rp 500.000
              </Button>
            </div>
          )}

          {/* Amount & Reference Fields */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1rem" }}>
            <Input
              id="payment-amount-input"
              label="Amount (IDR)"
              type="number"
              value={currentAmount || ""}
              onChange={(e) => setCurrentAmount(Number(e.target.value) || 0)}
            />

            {selectedMethod !== "CASH" && (
              <Input
                id="payment-ref-input"
                label="Reference / Auth Number"
                placeholder="Approval code or txn ID"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
              />
            )}
          </div>

          {/* Split Payment Entries List */}
          {payments.length > 0 && (
            <div style={{ marginBottom: "1rem", backgroundColor: "var(--bg-surface-elevated)", padding: "0.75rem", borderRadius: "var(--radius-md)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.4rem" }}>
                <span>REGISTERED PAYMENTS ({payments.length})</span>
                <span>SUBTOTAL PAID</span>
              </div>
              {payments.map((p, idx) => (
                <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.9rem", padding: "0.25rem 0" }}>
                  <span>
                    <Badge variant="info">{p.method}</Badge> {p.referenceNumber && `(${p.referenceNumber})`}
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ fontWeight: 600 }}>{formatIDR(p.amount)}</span>
                    <button onClick={() => handleRemovePayment(idx)} style={{ color: "var(--accent-rose)", cursor: "pointer" }}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Split Payment Helper Button */}
          {remainingBalance > currentAmount && currentAmount > 0 && (
            <Button
              size="sm"
              variant="secondary"
              onClick={handleAddPayment}
              style={{ marginBottom: "1rem", width: "100%" }}
            >
              + Add Partial Payment of {formatIDR(currentAmount)} & Split Rest
            </Button>
          )}

          {/* Balance & Change Indicator */}
          <div
            style={{
              padding: "1rem",
              backgroundColor: "var(--bg-surface-elevated)",
              borderRadius: "var(--radius-md)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1.25rem",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <div>
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>TOTAL TENDERED</span>
              <h3 style={{ fontSize: "1.2rem", fontWeight: 700 }}>{formatIDR(committedPaid + currentAmount)}</h3>
            </div>

            <div style={{ textAlign: "right" }}>
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                {changeDue > 0 ? "CHANGE DUE" : "REMAINING"}
              </span>
              <h3
                style={{
                  fontSize: "1.2rem",
                  fontWeight: 700,
                  color: changeDue > 0 ? "var(--accent-cyan)" : remainingBalance > currentAmount ? "var(--accent-amber)" : "var(--accent-emerald)",
                }}
              >
                {changeDue > 0 ? formatIDR(changeDue) : formatIDR(Math.max(0, remainingBalance - currentAmount))}
              </h3>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <Button variant="secondary" size="md" onClick={onClose} style={{ flex: 1 }}>
              Back to Cart
            </Button>
            <Button
              id="confirm-complete-sale-btn"
              variant="primary"
              size="md"
              isLoading={loading}
              disabled={committedPaid + currentAmount < grandTotal}
              onClick={handleCompleteOrder}
              style={{ flex: 2, fontWeight: 700 }}
            >
              Complete Sale ({formatIDR(grandTotal)}) ✓
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}