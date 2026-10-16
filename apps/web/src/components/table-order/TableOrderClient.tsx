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
  type MidtransConfigResponse,
  type MidtransSnapTokenResult,
  type MidtransChargeResult,
} from "@pz/shared";

declare global {
  interface Window {
    snap?: {
      pay: (
        token: string,
        options?: {
          onSuccess?: (result: any) => void;
          onPending?: (result: any) => void;
          onError?: (result: any) => void;
          onClose?: () => void;
        }
      ) => void;
      embed?: (token: string, options?: any) => void;
    };
  }
}

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

  // Online Payment modal & state
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<"SNAP" | "EWALLET" | "BANK_TRANSFER" | "CARD">("SNAP");
  const [selectedVaBank, setSelectedVaBank] = useState<"BCA" | "MANDIRI" | "BRI" | "BNI">("BCA");
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [paymentTimer, setPaymentTimer] = useState(900); // 15 mins
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [copiedVa, setCopiedVa] = useState(false);

  // Midtrans State
  const [midtransConfig, setMidtransConfig] = useState<MidtransConfigResponse | null>(null);
  const [midtransLoading, setMidtransLoading] = useState(false);
  const [activeDraftOrder, setActiveDraftOrder] = useState<SalesOrderRecord | null>(null);
  const [snapTokenData, setSnapTokenData] = useState<MidtransSnapTokenResult | null>(null);
  const [midtransChargeData, setMidtransChargeData] = useState<MidtransChargeResult | null>(null);

  // Load Midtrans Configuration and inject Snap script
  useEffect(() => {
    let isMounted = true;
    posApi
      .getMidtransConfig()
      .then((res) => {
        if (!isMounted || !res.data) return;
        setMidtransConfig(res.data);
        if (typeof window !== "undefined" && !document.getElementById("midtrans-snap-script")) {
          const script = document.createElement("script");
          script.id = "midtrans-snap-script";
          script.src = res.data.snapScriptUrl;
          script.setAttribute("data-client-key", res.data.clientKey);
          script.async = true;
          document.body.appendChild(script);
        }
      })
      .catch((err) => {
        console.warn("Could not load Midtrans config", err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Card mock fields
  const [cardNumber, setCardNumber] = useState("4532 8190 2841 8821");
  const [cardExpiry, setCardExpiry] = useState("08/28");
  const [cardCvv, setCardCvv] = useState("892");
  const [cardHolder, setCardHolder] = useState("");

  const vaNumbers: Record<string, string> = {
    BCA: "8808 2910 4019 3321",
    MANDIRI: "8950 1829 4019 2201",
    BRI: "1029 8839 2019 4410",
    BNI: "9880 1829 4910 2239",
  };

  // Payment timer
  useEffect(() => {
    if (!isPaymentModalOpen) return;
    const timer = setInterval(() => {
      setPaymentTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [isPaymentModalOpen]);

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

  // Handle Proceeding to Payment
  const handleOpenPaymentModal = () => {
    if (!facilityId || !tableNumber) {
      alert("Invalid table session. Please scan your table barcode.");
      return;
    }
    if (cart.length === 0) {
      alert("Your cart is empty. Please select items from the menu.");
      return;
    }
    setPaymentError(null);
    setIsPaymentModalOpen(true);
  };

  // Helper to ensure draft order exists in DB awaiting payment
  const ensureDraftOrder = async (): Promise<SalesOrderRecord> => {
    if (activeDraftOrder) return activeDraftOrder;

    const res = await posApi.createTableOrder({
      facilityId: facilityId!,
      tableNumber: tableNumber!,
      customerName: customerName.trim() || undefined,
      customerPhone: customerPhone.trim() || undefined,
      notes: orderNotes.trim() || undefined,
      paymentMethod: selectedPaymentMethod === "SNAP" ? "EWALLET" : selectedPaymentMethod,
      paymentProvider: selectedPaymentMethod === "SNAP" ? "Midtrans Snap Gateway" : "Online Gateway",
      isPaid: false,
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
    setActiveDraftOrder(order);
    return order;
  };

  // Pay with Midtrans Snap Gateway (all-in-one modal)
  const handlePayWithMidtransSnap = async () => {
    if (!facilityId || !tableNumber || cart.length === 0) return;
    setMidtransLoading(true);
    setPaymentError(null);

    try {
      const order = await ensureDraftOrder();

      const snapRes = await posApi.createMidtransSnapToken({
        salesOrderId: order.id,
        customerDetails: {
          name: customerName.trim() || `Table ${tableNumber}`,
          phone: customerPhone.trim() || undefined,
        },
      });

      const snapData = snapRes.data;
      setSnapTokenData(snapData);

      if (typeof window !== "undefined" && window.snap && !snapData?.isSimulated) {
        window.snap.pay(snapData.token, {
          onSuccess: async () => {
            const statusRes = await posApi.getTableOrderStatus(order.id);
            const finishedOrder = (statusRes as any).data?.order || order;
            setSubmittedOrder(finishedOrder);
            setCart([]);
            setIsPaymentModalOpen(false);
            setIsReviewOpen(false);
          },
          onPending: async () => {
            const statusRes = await posApi.getTableOrderStatus(order.id);
            const finishedOrder = (statusRes as any).data?.order || order;
            setSubmittedOrder(finishedOrder);
            setCart([]);
            setIsPaymentModalOpen(false);
            setIsReviewOpen(false);
          },
          onError: () => {
            setPaymentError("Midtrans transaction was declined or failed. Please try another method.");
          },
          onClose: () => {
            console.log("Customer closed Midtrans Snap popup without completing payment.");
          },
        });
      }
    } catch (err: any) {
      console.error("Midtrans Snap error", err);
      setPaymentError(err.message || "Unable to initiate Midtrans Snap payment.");
    } finally {
      setMidtransLoading(false);
    }
  };

  // Generate Core API Direct QRIS / VA Charge
  const handleGenerateCoreCharge = async (paymentType: "qris" | "bank_transfer", bank?: string) => {
    setMidtransLoading(true);
    setPaymentError(null);
    try {
      const order = await ensureDraftOrder();
      const res = await posApi.createMidtransCharge({
        salesOrderId: order.id,
        paymentType,
        bank: (bank?.toLowerCase() || undefined) as any,
        customerDetails: {
          name: customerName.trim() || `Table ${tableNumber}`,
          phone: customerPhone.trim() || undefined,
        },
      });
      setMidtransChargeData(res.data);
    } catch (err: any) {
      console.error("Midtrans charge error", err);
      setPaymentError(err.message || "Failed to generate payment details.");
    } finally {
      setMidtransLoading(false);
    }
  };

  // Simulate Instant Settlement (Sandbox/Test helper)
  const handleSimulateMidtransSettlement = async (method = "qris") => {
    setVerifyingPayment(true);
    setPaymentError(null);
    try {
      const order = await ensureDraftOrder();
      await posApi.simulateMidtransPayment(order.id, method);
      const statusRes = await posApi.getTableOrderStatus(order.id);
      const finishedOrder = (statusRes as any).data?.order || order;
      setSubmittedOrder(finishedOrder);
      setCart([]);
      setIsPaymentModalOpen(false);
      setIsReviewOpen(false);
    } catch (err: any) {
      console.error("Simulation error", err);
      setPaymentError(err.message || "Simulation failed. Please try again.");
    } finally {
      setVerifyingPayment(false);
    }
  };

  // Handle Online Payment Settlement fallback (direct settlement)
  const handleExecuteOnlinePayment = async () => {
    if (!facilityId || !tableNumber) {
      alert("Invalid table session. Please scan your table barcode.");
      return;
    }
    if (cart.length === 0) {
      alert("Your cart is empty. Please select items from the menu.");
      return;
    }

    try {
      setVerifyingPayment(true);
      setPaymentError(null);

      const refNumber = `PAY-${Date.now().toString().slice(-8)}`;
      const providerName =
        selectedPaymentMethod === "SNAP"
          ? "Midtrans Snap Gateway"
          : selectedPaymentMethod === "EWALLET"
          ? "QRIS (GoPay/OVO/Dana/BCA)"
          : selectedPaymentMethod === "BANK_TRANSFER"
          ? `${selectedVaBank} Virtual Account`
          : "Credit/Debit Card Online";

      const methodEnum = selectedPaymentMethod === "SNAP" ? "EWALLET" : selectedPaymentMethod;

      const res = await posApi.createTableOrder({
        facilityId,
        tableNumber,
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        notes: orderNotes.trim() || undefined,
        paymentMethod: methodEnum,
        paymentProvider: providerName,
        referenceNumber: refNumber,
        isPaid: true,
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
      setIsPaymentModalOpen(false);
      setIsReviewOpen(false);
    } catch (err: any) {
      console.error("Payment settlement error", err);
      setPaymentError(err.message || "Online payment verification failed. Please try again or alert a staff member.");
    } finally {
      setVerifyingPayment(false);
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
    const paymentInfo = (submittedOrder as any).payments?.[0];
    const paymentMethodLabel = paymentInfo?.notes || paymentInfo?.method || "Online Payment";

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
            maxWidth: "480px",
            backgroundColor: "var(--bg-surface)",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--border-glow)",
            padding: "2rem 1.5rem",
            textAlign: "center",
            boxShadow: "var(--shadow-glass)",
          }}
        >
          {/* Animated Green Badge */}
          <div
            style={{
              width: "76px",
              height: "76px",
              borderRadius: "50%",
              backgroundColor: "rgba(16, 185, 129, 0.15)",
              border: "3px solid var(--accent-emerald)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1.25rem",
              fontSize: "2.4rem",
              boxShadow: "0 0 20px rgba(16, 185, 129, 0.35)",
            }}
          >
            ✅
          </div>

          <h2 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--text-primary)" }}>
            Payment Verified &amp; Settled!
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: "0.35rem", lineHeight: 1.5 }}>
            Your meal order has been paid online and received by the kitchen. Preparation has begun!
          </p>

          {/* Kitchen Status Pill */}
          <div
            style={{
              margin: "1.25rem auto 1.5rem",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.45rem 1rem",
              borderRadius: "var(--radius-full)",
              backgroundColor: "rgba(245, 158, 11, 0.12)",
              border: "1px solid rgba(245, 158, 11, 0.4)",
              color: "var(--accent-amber)",
              fontWeight: 700,
              fontSize: "0.85rem",
            }}
          >
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: "var(--accent-amber)",
                display: "inline-block",
                boxShadow: "0 0 8px var(--accent-amber)",
              }}
            />
            <span>🍳 In Kitchen • Being Cooked Now</span>
          </div>

          {/* Order & Payment Summary Card */}
          <div
            style={{
              margin: "0 0 1.5rem 0",
              padding: "1.2rem",
              borderRadius: "var(--radius-md)",
              backgroundColor: "var(--bg-surface-elevated)",
              border: "1px solid var(--border-subtle)",
              textAlign: "left",
              display: "flex",
              flexDirection: "column",
              gap: "0.6rem",
              fontSize: "0.85rem",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>Order Reference:</span>
              <span style={{ fontWeight: 700, color: "var(--primary)" }}>{submittedOrder.orderNumber}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>Dining Table:</span>
              <span style={{ fontWeight: 800, color: "var(--text-primary)" }}>
                🪑 Table {submittedOrder.tableNumber || tableNumber}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>Store Outlet:</span>
              <span>{facilityInfo?.facilityName || "Main Outlet"}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>Payment Method:</span>
              <span style={{ fontWeight: 600 }}>{paymentMethodLabel}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>Payment Status:</span>
              <span style={{ fontWeight: 800, color: "var(--accent-emerald)" }}>PAID (SETTLED)</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>Kitchen Order Status:</span>
              <span style={{ fontWeight: 800, color: "var(--accent-amber)" }}>COMPLETED &amp; PROCESSING</span>
            </div>

            {/* Items Breakdown */}
            {submittedOrder.items && submittedOrder.items.length > 0 && (
              <div
                style={{
                  borderTop: "1px dashed var(--border-subtle)",
                  paddingTop: "0.6rem",
                  marginTop: "0.2rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.4rem",
                }}
              >
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 700 }}>
                  Items Ordered:
                </div>
                {submittedOrder.items.map((item: any, idx: number) => (
                  <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
                    <span>
                      {item.quantity}x {item.productName || item.product?.productName}
                    </span>
                    <span style={{ fontWeight: 600 }}>{formatIDR(Number(item.totalPrice))}</span>
                  </div>
                ))}
              </div>
            )}

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                borderTop: "1px solid var(--border-subtle)",
                paddingTop: "0.6rem",
                marginTop: "0.2rem",
                fontWeight: 800,
                fontSize: "1rem",
              }}
            >
              <span>Grand Total Paid:</span>
              <span style={{ color: "var(--accent-emerald)" }}>{formatIDR(submittedOrder.grandTotal)}</span>
            </div>
          </div>

          <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "1.25rem", lineHeight: 1.5 }}>
            Staff will deliver your freshly prepared order directly to <strong>Table {tableNumber}</strong>. Sit back and enjoy!
          </p>

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
            + Order Additional Food &amp; Drinks
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
                onClick={handleOpenPaymentModal}
                style={{
                  width: "100%",
                  padding: "0.9rem",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "var(--primary)",
                  color: "#ffffff",
                  fontSize: "1rem",
                  fontWeight: 800,
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                  boxShadow: "0 4px 14px rgba(99, 102, 241, 0.4)",
                }}
              >
                💳 Proceed to Online Payment • {formatIDR(grandTotal)}
              </button>
              <div
                style={{
                  textAlign: "center",
                  fontSize: "0.72rem",
                  color: "var(--text-muted)",
                  marginTop: "0.5rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.3rem",
                }}
              >
                <span>🔒</span>
                <span>Online payment required • Kitchen prepares order upon settlement</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Online Payment Modal ── */}
      {isPaymentModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            backdropFilter: "blur(10px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 70,
            padding: "1rem",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "460px",
              maxHeight: "92vh",
              display: "flex",
              flexDirection: "column",
              backgroundColor: "var(--bg-surface)",
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--border-glow)",
              boxShadow: "0 20px 50px rgba(0, 0, 0, 0.6)",
              overflow: "hidden",
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "1.1rem 1.25rem",
                borderBottom: "1px solid var(--border-subtle)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                backgroundColor: "var(--bg-surface-elevated)",
              }}
            >
              <div>
                <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--text-primary)" }}>
                  Online Payment Checkout
                </div>
                <div style={{ fontSize: "0.8rem", color: "var(--primary)", fontWeight: 700 }}>
                  🪑 Table {tableNumber} • {totalItemCount} Items
                </div>
              </div>
              <button
                disabled={verifyingPayment}
                onClick={() => setIsPaymentModalOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "1.25rem",
                  color: "var(--text-muted)",
                  cursor: verifyingPayment ? "not-allowed" : "pointer",
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ flex: 1, overflowY: "auto", padding: "1.25rem" }}>
              {/* Total Due Banner */}
              <div
                style={{
                  padding: "0.9rem 1rem",
                  borderRadius: "var(--radius-md)",
                  background: "linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(16, 185, 129, 0.15) 100%)",
                  border: "1px solid rgba(99, 102, 241, 0.3)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "1.25rem",
                }}
              >
                <div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Total Payment Due
                  </div>
                  <div style={{ fontSize: "1.5rem", fontWeight: 900, color: "var(--accent-emerald)" }}>
                    {formatIDR(grandTotal)}
                  </div>
                </div>
                <div
                  style={{
                    backgroundColor: "rgba(16, 185, 129, 0.2)",
                    border: "1px solid var(--accent-emerald)",
                    borderRadius: "var(--radius-full)",
                    padding: "0.3rem 0.65rem",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    color: "var(--accent-emerald)",
                  }}
                >
                  ⚡ Direct Settlement
                </div>
              </div>

              {/* Payment Method Selector Tabs */}
              <div style={{ marginBottom: "1.25rem" }}>
                <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "0.5rem" }}>
                  Select Payment Method
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr 1fr",
                    gap: "0.35rem",
                    backgroundColor: "var(--bg-surface-elevated)",
                    padding: "0.3rem",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedPaymentMethod("SNAP")}
                    style={{
                      padding: "0.55rem 0.3rem",
                      borderRadius: "var(--radius-sm)",
                      border: "none",
                      backgroundColor: selectedPaymentMethod === "SNAP" ? "var(--primary)" : "transparent",
                      color: selectedPaymentMethod === "SNAP" ? "#ffffff" : "var(--text-secondary)",
                      fontWeight: 700,
                      fontSize: "0.75rem",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "0.2rem",
                      transition: "all var(--transition-fast)",
                    }}
                  >
                    <span>✨</span>
                    <span>Midtrans</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedPaymentMethod("EWALLET")}
                    style={{
                      padding: "0.55rem 0.3rem",
                      borderRadius: "var(--radius-sm)",
                      border: "none",
                      backgroundColor: selectedPaymentMethod === "EWALLET" ? "var(--primary)" : "transparent",
                      color: selectedPaymentMethod === "EWALLET" ? "#ffffff" : "var(--text-secondary)",
                      fontWeight: 700,
                      fontSize: "0.75rem",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "0.2rem",
                      transition: "all var(--transition-fast)",
                    }}
                  >
                    <span>📱</span>
                    <span>QRIS</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedPaymentMethod("BANK_TRANSFER")}
                    style={{
                      padding: "0.55rem 0.3rem",
                      borderRadius: "var(--radius-sm)",
                      border: "none",
                      backgroundColor: selectedPaymentMethod === "BANK_TRANSFER" ? "var(--primary)" : "transparent",
                      color: selectedPaymentMethod === "BANK_TRANSFER" ? "#ffffff" : "var(--text-secondary)",
                      fontWeight: 700,
                      fontSize: "0.75rem",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "0.2rem",
                      transition: "all var(--transition-fast)",
                    }}
                  >
                    <span>🏛️</span>
                    <span>VA Bank</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedPaymentMethod("CARD")}
                    style={{
                      padding: "0.55rem 0.3rem",
                      borderRadius: "var(--radius-sm)",
                      border: "none",
                      backgroundColor: selectedPaymentMethod === "CARD" ? "var(--primary)" : "transparent",
                      color: selectedPaymentMethod === "CARD" ? "#ffffff" : "var(--text-secondary)",
                      fontWeight: 700,
                      fontSize: "0.75rem",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "0.2rem",
                      transition: "all var(--transition-fast)",
                    }}
                  >
                    <span>💳</span>
                    <span>Card</span>
                  </button>
                </div>
              </div>

              {/* Payment Error Alert */}
              {paymentError && (
                <div
                  style={{
                    padding: "0.75rem",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: "rgba(239, 68, 68, 0.15)",
                    border: "1px solid var(--accent-rose)",
                    color: "var(--accent-rose)",
                    fontSize: "0.8rem",
                    marginBottom: "1rem",
                  }}
                >
                  ⚠️ {paymentError}
                </div>
              )}

              {/* Tab 0: Midtrans Snap Gateway */}
              {selectedPaymentMethod === "SNAP" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div
                    style={{
                      padding: "1rem",
                      borderRadius: "var(--radius-md)",
                      backgroundColor: "var(--bg-surface-elevated)",
                      border: "1px solid var(--border-glow)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.6rem",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span style={{ fontSize: "1.4rem" }}>⚡</span>
                        <div>
                          <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--text-primary)" }}>
                            Midtrans Snap Gateway
                          </div>
                          <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>
                            All-in-one payment checkout for Indonesia
                          </div>
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: "0.68rem",
                          fontWeight: 700,
                          padding: "0.25rem 0.5rem",
                          borderRadius: "var(--radius-full)",
                          backgroundColor: midtransConfig?.isConfigured
                            ? "rgba(16, 185, 129, 0.15)"
                            : "rgba(99, 102, 241, 0.15)",
                          color: midtransConfig?.isConfigured ? "var(--accent-emerald)" : "var(--primary)",
                          border: `1px solid ${midtransConfig?.isConfigured ? "var(--accent-emerald)" : "var(--primary)"}`,
                        }}
                      >
                        {midtransConfig?.isConfigured ? "Live Sandbox" : "Simulation Mode"}
                      </span>
                    </div>

                    <div
                      style={{
                        fontSize: "0.76rem",
                        color: "var(--text-secondary)",
                        lineHeight: 1.45,
                        backgroundColor: "var(--bg-surface)",
                        padding: "0.65rem",
                        borderRadius: "var(--radius-sm)",
                        border: "1px solid var(--border-subtle)",
                      }}
                    >
                      Supports <strong>GoPay, ShopeePay, QRIS, BCA/Mandiri/BNI/BRI/Permata Virtual Account</strong>, and <strong>Cards</strong>.
                    </div>
                  </div>

                  {/* Midtrans Snap Action Button */}
                  <button
                    id="midtrans-snap-pay-btn"
                    disabled={midtransLoading || verifyingPayment}
                    onClick={handlePayWithMidtransSnap}
                    style={{
                      width: "100%",
                      padding: "0.9rem",
                      borderRadius: "var(--radius-md)",
                      backgroundColor: "var(--primary)",
                      color: "#ffffff",
                      fontSize: "1rem",
                      fontWeight: 800,
                      border: "none",
                      cursor: midtransLoading || verifyingPayment ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.5rem",
                      boxShadow: "0 4px 14px rgba(99, 102, 241, 0.4)",
                      opacity: midtransLoading || verifyingPayment ? 0.7 : 1,
                    }}
                  >
                    {midtransLoading ? (
                      <>
                        <span style={{ animation: "spin 1s linear infinite" }}>🔄</span>
                        <span>Connecting to Midtrans...</span>
                      </>
                    ) : (
                      <>
                        <span>💳</span>
                        <span>Open Midtrans Snap • {formatIDR(grandTotal)}</span>
                      </>
                    )}
                  </button>

                  {/* Sandbox Instant Simulation Settlement Button */}
                  <div
                    style={{
                      padding: "0.85rem",
                      borderRadius: "var(--radius-md)",
                      backgroundColor: "rgba(16, 185, 129, 0.08)",
                      border: "1px dashed var(--accent-emerald)",
                      textAlign: "center",
                    }}
                  >
                    <div style={{ fontSize: "0.75rem", color: "var(--accent-emerald)", fontWeight: 700, marginBottom: "0.45rem" }}>
                      🧪 Developer &amp; QA Sandbox Test Action
                    </div>
                    <button
                      id="midtrans-simulate-instant-settlement-btn"
                      disabled={verifyingPayment}
                      onClick={() => handleSimulateMidtransSettlement("midtrans_snap")}
                      style={{
                        width: "100%",
                        padding: "0.65rem",
                        borderRadius: "var(--radius-sm)",
                        backgroundColor: "var(--accent-emerald)",
                        color: "#ffffff",
                        fontSize: "0.85rem",
                        fontWeight: 700,
                        border: "none",
                        cursor: verifyingPayment ? "not-allowed" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "0.4rem",
                      }}
                    >
                      {verifyingPayment ? (
                        <>
                          <span style={{ animation: "spin 1s linear infinite" }}>🔄</span>
                          <span>Settling &amp; Deducting Recipe Stock...</span>
                        </>
                      ) : (
                        <>
                          <span>⚡</span>
                          <span>Simulate Instant Midtrans Settlement</span>
                        </>
                      )}
                    </button>
                    <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginTop: "0.4rem" }}>
                      Emulates Midtrans webhook callback: Marks order COMPLETED &amp; deducts ingredients.
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 1: QRIS Payment */}
              {selectedPaymentMethod === "EWALLET" && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  {/* Authentic QRIS Card Frame */}
                  <div
                    style={{
                      width: "100%",
                      maxWidth: "280px",
                      backgroundColor: "#ffffff",
                      borderRadius: "12px",
                      overflow: "hidden",
                      boxShadow: "0 8px 30px rgba(0, 0, 0, 0.35)",
                      border: "2px solid #e2e8f0",
                      marginBottom: "1rem",
                      textAlign: "center",
                      color: "#1e293b",
                    }}
                  >
                    {/* QRIS Red Header */}
                    <div
                      style={{
                        backgroundColor: "#c5161d",
                        color: "#ffffff",
                        padding: "0.45rem 0.75rem",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <div style={{ fontWeight: 900, fontSize: "1.1rem", letterSpacing: "1px" }}>QRIS</div>
                      <div style={{ fontSize: "0.62rem", fontWeight: 700, opacity: 0.9 }}>
                        PEMBAYARAN DIGITAL NASIONAL
                      </div>
                    </div>

                    <div style={{ padding: "0.75rem 0.5rem 0.35rem" }}>
                      <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "#0f172a" }}>
                        {facilityInfo?.facilityName?.toUpperCase() || "PROJECTZ FLAGSHIP STORE"}
                      </div>
                      <div style={{ fontSize: "0.65rem", color: "#64748b", marginTop: "0.1rem" }}>
                        NMID: ID1020261984023 • A01
                      </div>

                      {/* QR Matrix SVG Graphic */}
                      <div
                        style={{
                          margin: "0.6rem auto 0.4rem",
                          width: "180px",
                          height: "180px",
                          padding: "8px",
                          backgroundColor: "#ffffff",
                          borderRadius: "8px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          position: "relative",
                        }}
                      >
                        <svg
                          viewBox="0 0 100 100"
                          style={{ width: "100%", height: "100%", shapeRendering: "crispEdges" }}
                        >
                          {/* Top-left Finder Pattern */}
                          <rect x="5" y="5" width="28" height="28" fill="#0f172a" rx="2" />
                          <rect x="9" y="9" width="20" height="20" fill="#ffffff" rx="1" />
                          <rect x="13" y="13" width="12" height="12" fill="#0f172a" rx="1" />

                          {/* Top-right Finder Pattern */}
                          <rect x="67" y="5" width="28" height="28" fill="#0f172a" rx="2" />
                          <rect x="71" y="9" width="20" height="20" fill="#ffffff" rx="1" />
                          <rect x="75" y="13" width="12" height="12" fill="#0f172a" rx="1" />

                          {/* Bottom-left Finder Pattern */}
                          <rect x="5" y="67" width="28" height="28" fill="#0f172a" rx="2" />
                          <rect x="9" y="71" width="20" height="20" fill="#ffffff" rx="1" />
                          <rect x="13" y="75" width="12" height="12" fill="#0f172a" rx="1" />

                          {/* Timing Patterns */}
                          <rect x="36" y="9" width="4" height="4" fill="#0f172a" />
                          <rect x="44" y="9" width="4" height="4" fill="#0f172a" />
                          <rect x="52" y="9" width="4" height="4" fill="#0f172a" />
                          <rect x="60" y="9" width="4" height="4" fill="#0f172a" />
                          <rect x="9" y="36" width="4" height="4" fill="#0f172a" />
                          <rect x="9" y="44" width="4" height="4" fill="#0f172a" />
                          <rect x="9" y="52" width="4" height="4" fill="#0f172a" />
                          <rect x="9" y="60" width="4" height="4" fill="#0f172a" />

                          {/* Data Modules */}
                          <rect x="37" y="20" width="4" height="8" fill="#0f172a" />
                          <rect x="45" y="17" width="8" height="4" fill="#0f172a" />
                          <rect x="57" y="20" width="4" height="8" fill="#0f172a" />
                          <rect x="40" y="30" width="6" height="6" fill="#0f172a" />
                          <rect x="54" y="32" width="6" height="4" fill="#0f172a" />
                          <rect x="20" y="37" width="8" height="4" fill="#0f172a" />
                          <rect x="20" y="45" width="4" height="8" fill="#0f172a" />
                          <rect x="28" y="54" width="4" height="6" fill="#0f172a" />
                          <rect x="68" y="37" width="6" height="8" fill="#0f172a" />
                          <rect x="78" y="40" width="8" height="4" fill="#0f172a" />
                          <rect x="88" y="37" width="4" height="8" fill="#0f172a" />
                          <rect x="72" y="52" width="6" height="6" fill="#0f172a" />
                          <rect x="82" y="50" width="8" height="4" fill="#0f172a" />
                          <rect x="37" y="68" width="6" height="6" fill="#0f172a" />
                          <rect x="47" y="68" width="8" height="4" fill="#0f172a" />
                          <rect x="59" y="70" width="4" height="8" fill="#0f172a" />
                          <rect x="40" y="78" width="8" height="4" fill="#0f172a" />
                          <rect x="52" y="82" width="8" height="6" fill="#0f172a" />
                          <rect x="68" y="72" width="6" height="8" fill="#0f172a" />
                          <rect x="78" y="68" width="4" height="8" fill="#0f172a" />
                          <rect x="86" y="74" width="6" height="6" fill="#0f172a" />
                          <rect x="70" y="84" width="8" height="6" fill="#0f172a" />
                          <rect x="82" y="86" width="6" height="4" fill="#0f172a" />

                          {/* Center QRIS Badge */}
                          <circle cx="50" cy="50" r="10" fill="#ffffff" stroke="#c5161d" strokeWidth="1.5" />
                          <text
                            x="50"
                            y="53.5"
                            textAnchor="middle"
                            fontSize="7.5"
                            fontWeight="900"
                            fill="#c5161d"
                          >
                            QR
                          </text>
                        </svg>
                      </div>

                      <div
                        style={{
                          fontSize: "0.85rem",
                          fontWeight: 800,
                          color: "#c5161d",
                          letterSpacing: "0.2px",
                        }}
                      >
                        {formatIDR(grandTotal)}
                      </div>
                    </div>

                    {/* Supported Wallets Footer */}
                    <div
                      style={{
                        backgroundColor: "#f8fafc",
                        borderTop: "1px solid #e2e8f0",
                        padding: "0.45rem 0.5rem",
                        fontSize: "0.62rem",
                        fontWeight: 700,
                        color: "#64748b",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "0.35rem",
                        flexWrap: "wrap",
                      }}
                    >
                      <span>GoPay</span> • <span>OVO</span> • <span>DANA</span> • <span>ShopeePay</span> • <span>BCA</span> • <span>Livin</span>
                    </div>
                  </div>

                  {/* Countdown Timer */}
                  <div
                    style={{
                      fontSize: "0.78rem",
                      color: "var(--accent-amber)",
                      fontWeight: 600,
                      marginBottom: "1rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.35rem",
                    }}
                  >
                    <span>⏱️</span>
                    <span>
                      QR expires in {Math.floor(paymentTimer / 60)}:
                      {(paymentTimer % 60).toString().padStart(2, "0")}
                    </span>
                  </div>

                  {/* Simulated QRIS Payment Button */}
                  <button
                    id="simulate-qris-payment-btn"
                    disabled={verifyingPayment}
                    onClick={handleExecuteOnlinePayment}
                    style={{
                      width: "100%",
                      padding: "0.85rem",
                      borderRadius: "var(--radius-md)",
                      backgroundColor: "var(--accent-emerald)",
                      color: "#ffffff",
                      fontSize: "0.95rem",
                      fontWeight: 800,
                      border: "none",
                      cursor: verifyingPayment ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.5rem",
                      boxShadow: "0 4px 14px rgba(16, 185, 129, 0.4)",
                      opacity: verifyingPayment ? 0.7 : 1,
                    }}
                  >
                    {verifyingPayment ? (
                      <>
                        <span style={{ animation: "spin 1s linear infinite" }}>🔄</span>
                        <span>Verifying QRIS Settlement...</span>
                      </>
                    ) : (
                      <>
                        <span>⚡</span>
                        <span>Simulate &amp; Confirm QRIS Payment</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Tab 2: Virtual Account */}
              {selectedPaymentMethod === "BANK_TRANSFER" && (
                <div>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
                    Select Your Bank:
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "0.4rem", marginBottom: "1rem" }}>
                    {(["BCA", "MANDIRI", "BRI", "BNI"] as const).map((b) => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => setSelectedVaBank(b)}
                        style={{
                          padding: "0.5rem 0.2rem",
                          borderRadius: "var(--radius-sm)",
                          border: `1px solid ${selectedVaBank === b ? "var(--primary)" : "var(--border-subtle)"}`,
                          backgroundColor: selectedVaBank === b ? "rgba(99, 102, 241, 0.15)" : "var(--bg-surface-elevated)",
                          color: selectedVaBank === b ? "var(--primary)" : "var(--text-primary)",
                          fontWeight: 700,
                          fontSize: "0.78rem",
                          cursor: "pointer",
                        }}
                      >
                        {b}
                      </button>
                    ))}
                  </div>

                  {/* VA Number Card */}
                  <div
                    style={{
                      padding: "1rem",
                      borderRadius: "var(--radius-md)",
                      backgroundColor: "var(--bg-surface-elevated)",
                      border: "1px solid var(--border-glow)",
                      marginBottom: "1rem",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        {selectedVaBank} Virtual Account Number:
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard?.writeText(vaNumbers[selectedVaBank] || "");
                          setCopiedVa(true);
                          setTimeout(() => setCopiedVa(false), 2000);
                        }}
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--primary)",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        {copiedVa ? "✓ Copied!" : "📋 Copy"}
                      </button>
                    </div>
                    <div
                      style={{
                        fontFamily: "monospace",
                        fontSize: "1.25rem",
                        fontWeight: 800,
                        letterSpacing: "1.5px",
                        color: "var(--text-primary)",
                      }}
                    >
                      {vaNumbers[selectedVaBank]}
                    </div>
                  </div>

                  {/* Instructions */}
                  <div
                    style={{
                      fontSize: "0.78rem",
                      color: "var(--text-secondary)",
                      lineHeight: 1.5,
                      marginBottom: "1.25rem",
                      backgroundColor: "var(--bg-surface)",
                      padding: "0.75rem",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--border-subtle)",
                    }}
                  >
                    <strong>How to transfer:</strong>
                    <ol style={{ paddingLeft: "1.2rem", marginTop: "0.35rem", marginBottom: 0 }}>
                      <li>Open your {selectedVaBank} Mobile Banking or ATM.</li>
                      <li>Go to Transfer &gt; Virtual Account.</li>
                      <li>Paste the number above and verify amount of {formatIDR(grandTotal)}.</li>
                    </ol>
                  </div>

                  <button
                    disabled={verifyingPayment}
                    onClick={handleExecuteOnlinePayment}
                    style={{
                      width: "100%",
                      padding: "0.85rem",
                      borderRadius: "var(--radius-md)",
                      backgroundColor: "var(--primary)",
                      color: "#ffffff",
                      fontSize: "0.95rem",
                      fontWeight: 800,
                      border: "none",
                      cursor: verifyingPayment ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.5rem",
                      boxShadow: "0 4px 14px rgba(99, 102, 241, 0.4)",
                      opacity: verifyingPayment ? 0.7 : 1,
                    }}
                  >
                    {verifyingPayment ? "Checking VA Transfer..." : "Confirm VA Transfer Completed"}
                  </button>
                </div>
              )}

              {/* Tab 3: Credit / Debit Card */}
              {selectedPaymentMethod === "CARD" && (
                <div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.25rem" }}>
                    <div>
                      <label style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Card Number:</label>
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        placeholder="4532 •••• •••• 8821"
                        style={{
                          width: "100%",
                          marginTop: "0.2rem",
                          padding: "0.55rem 0.65rem",
                          borderRadius: "var(--radius-sm)",
                          backgroundColor: "var(--bg-surface-elevated)",
                          border: "1px solid var(--border-subtle)",
                          color: "var(--text-primary)",
                          fontSize: "0.85rem",
                          outline: "none",
                        }}
                      />
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                      <div>
                        <label style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Valid Thru:</label>
                        <input
                          type="text"
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                          placeholder="MM/YY"
                          style={{
                            width: "100%",
                            marginTop: "0.2rem",
                            padding: "0.55rem 0.65rem",
                            borderRadius: "var(--radius-sm)",
                            backgroundColor: "var(--bg-surface-elevated)",
                            border: "1px solid var(--border-subtle)",
                            color: "var(--text-primary)",
                            fontSize: "0.85rem",
                            outline: "none",
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>CVV / CVC:</label>
                        <input
                          type="password"
                          maxLength={4}
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value)}
                          placeholder="•••"
                          style={{
                            width: "100%",
                            marginTop: "0.2rem",
                            padding: "0.55rem 0.65rem",
                            borderRadius: "var(--radius-sm)",
                            backgroundColor: "var(--bg-surface-elevated)",
                            border: "1px solid var(--border-subtle)",
                            color: "var(--text-primary)",
                            fontSize: "0.85rem",
                            outline: "none",
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Cardholder Name:</label>
                      <input
                        type="text"
                        value={cardHolder || customerName}
                        onChange={(e) => setCardHolder(e.target.value)}
                        placeholder="Name on card"
                        style={{
                          width: "100%",
                          marginTop: "0.2rem",
                          padding: "0.55rem 0.65rem",
                          borderRadius: "var(--radius-sm)",
                          backgroundColor: "var(--bg-surface-elevated)",
                          border: "1px solid var(--border-subtle)",
                          color: "var(--text-primary)",
                          fontSize: "0.85rem",
                          outline: "none",
                        }}
                      />
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.5rem",
                      fontSize: "0.72rem",
                      color: "var(--text-muted)",
                      marginBottom: "1rem",
                    }}
                  >
                    <span>🔒 256-bit Encrypted • Verified by Visa &amp; Mastercard ID Check</span>
                  </div>

                  <button
                    disabled={verifyingPayment}
                    onClick={handleExecuteOnlinePayment}
                    style={{
                      width: "100%",
                      padding: "0.85rem",
                      borderRadius: "var(--radius-md)",
                      backgroundColor: "var(--primary)",
                      color: "#ffffff",
                      fontSize: "0.95rem",
                      fontWeight: 800,
                      border: "none",
                      cursor: verifyingPayment ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.5rem",
                      boxShadow: "0 4px 14px rgba(99, 102, 241, 0.4)",
                      opacity: verifyingPayment ? 0.7 : 1,
                    }}
                  >
                    {verifyingPayment ? "Processing Card Payment..." : `Pay ${formatIDR(grandTotal)}`}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
