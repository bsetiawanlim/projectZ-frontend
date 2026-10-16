"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { SortableTh } from "@/components/ui/SortableTh";
import { posApi, facilityApi } from "@/lib/api";
import type { FacilityRecord } from "@/lib/api";
import {
  formatIDR,
  type DailySalesSummaryResult,
  type DailySalesTrendPoint,
  type ProductSalesItemReport,
} from "@pz/shared";

type PresetType = "DAILY" | "WEEKLY" | "MONTHLY" | "CUSTOM";

function formatShortDate(dStr: string) {
  try {
    const d = new Date(dStr);
    return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
  } catch {
    return dStr;
  }
}

export default function PosReportsPage() {
  const getTodayStr = () => new Date().toISOString().split("T")[0]!;
  const [preset, setPreset] = useState<PresetType>("DAILY");
  
  // Custom or preset date ranges
  const [startDate, setStartDate] = useState<string>(getTodayStr());
  const [endDate, setEndDate] = useState<string>(getTodayStr());

  const [summary, setSummary] = useState<DailySalesSummaryResult | null>(null);
  const [topProducts, setTopProducts] = useState<ProductSalesItemReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>("ALL");
  const [facilities, setFacilities] = useState<FacilityRecord[]>([]);
  const [hoveredPoint, setHoveredPoint] = useState<DailySalesTrendPoint | null>(null);
  const [chartMetric, setChartMetric] = useState<"revenue" | "orders">("revenue");

  type PosReportSortField = "rank" | "product" | "category" | "volume" | "avgPrice" | "revenue";
  const [sortField, setSortField] = useState<PosReportSortField>("revenue");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const handleSort = (field: PosReportSortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };


  // Helper to calculate date presets
  const applyPreset = (p: PresetType) => {
    setPreset(p);
    const now = new Date();
    const today = now.toISOString().split("T")[0]!;

    if (p === "DAILY") {
      setStartDate(today);
      setEndDate(today);
    } else if (p === "WEEKLY") {
      // Past 7 days
      const d = new Date(now);
      d.setDate(d.getDate() - 6);
      setStartDate(d.toISOString().split("T")[0]!);
      setEndDate(today);
    } else if (p === "MONTHLY") {
      // Current month from 1st day to today
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(firstDay.toISOString().split("T")[0]!);
      setEndDate(today);
    }
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const facilityIdParam = selectedFacilityId !== "ALL" ? Number(selectedFacilityId) : undefined;
      const [sumRes, topRes] = await Promise.all([
        posApi.getDailySummary({ startDate, endDate, facilityId: facilityIdParam }).catch(() => ({ data: null })),
        posApi.getProductSalesReport({ startDate, endDate, limit: 50, facilityId: facilityIdParam }).catch(() => ({ data: [] })),
      ]);
      setSummary(sumRes?.data ?? null);

      const raw = topRes?.data ?? topRes;
      let list: ProductSalesItemReport[] = [];
      if (Array.isArray(raw)) {
        list = raw;
      } else if (Array.isArray((raw as any)?.products)) {
        list = (raw as any).products;
      } else if (Array.isArray((raw as any)?.items)) {
        list = (raw as any).items;
      } else if (Array.isArray((raw as any)?.data)) {
        list = (raw as any).data;
      }
      setTopProducts(list);
    } catch (err) {
      console.error("Failed to load reports", err);
      setTopProducts([]);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, selectedFacilityId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    facilityApi
      .listFacilities({ limit: 100 })
      .then((res) => {
        const list = res?.items || (res as any)?.data || [];
        setFacilities(list);
      })
      .catch(() => setFacilities([]));
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    topProducts.forEach((p) => {
      if (p.categoryName) set.add(p.categoryName);
    });
    return Array.from(set);
  }, [topProducts]);

  const filteredProducts = useMemo(() => {
    return topProducts.filter((p) => {
      const matchCat = selectedCategory === "ALL" || p.categoryName === selectedCategory;
      const q = searchTerm.toLowerCase().trim();
      const matchSearch =
        !q ||
        p.productName.toLowerCase().includes(q) ||
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        (p.categoryName && p.categoryName.toLowerCase().includes(q));
      return matchCat && matchSearch;
    });
  }, [topProducts, selectedCategory, searchTerm]);

  const orderCount = summary?.totalOrders ?? summary?.orderCount ?? 0;
  const totalRevenue = summary?.totalRevenue ?? 0;
  const itemsSold = summary?.totalItemsSold ?? 0;
  const aov = summary?.averageOrderValue ?? (orderCount > 0 ? totalRevenue / orderCount : 0);

  const paymentBreakdown = summary?.paymentBreakdown || {};
  const getPayAmount = (key: string): number => {
    const item = (paymentBreakdown as any)[key];
    if (typeof item === "number") return item;
    if (item && typeof item.totalAmount === "number") return item.totalAmount;
    return 0;
  };
  const getPayCount = (key: string): number => {
    const item = (paymentBreakdown as any)[key];
    if (item && typeof item.count === "number") return item.count;
    return 0;
  };

  const cashAmount = getPayAmount("CASH");
  const cashCount = getPayCount("CASH");
  const digitalAmount = getPayAmount("CARD") + getPayAmount("BANK_TRANSFER") + getPayAmount("EWALLET");

  const trendData: DailySalesTrendPoint[] = useMemo(() => {
    if (summary?.dailyTrend && summary.dailyTrend.length > 0) {
      return summary.dailyTrend;
    }
    // Fallback single bar for current date if no breakdown
    return [
      {
        date: startDate,
        revenue: totalRevenue,
        orderCount: orderCount,
        itemsSold: itemsSold,
      },
    ];
  }, [summary?.dailyTrend, startDate, totalRevenue, orderCount, itemsSold]);

  // Max value for chart scaling
  const maxMetricVal = useMemo(() => {
    const vals = trendData.map((d) => (chartMetric === "revenue" ? d.revenue : d.orderCount));
    const max = Math.max(...vals, 1);
    return max;
  }, [trendData, chartMetric]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Top Header & Range Controls */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--text-primary)" }}>
            POS Sales & Revenue Analytics
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: "0.25rem" }}>
            Real-time daily, weekly, monthly and date-filtered POS metrics with visual trends.
          </p>
        </div>

        {/* Date Filter Bar */}
        <Card glass style={{ padding: "0.6rem 0.85rem", display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
          {/* Preset Buttons */}
          <div style={{ display: "flex", gap: "0.3rem", backgroundColor: "rgba(255,255,255,0.04)", padding: "3px", borderRadius: "8px" }}>
            <Button
              size="sm"
              variant={preset === "DAILY" ? "primary" : "ghost"}
              onClick={() => applyPreset("DAILY")}
              style={{ fontSize: "0.78rem", padding: "0.35rem 0.65rem", borderRadius: "6px" }}
            >
              Daily
            </Button>
            <Button
              size="sm"
              variant={preset === "WEEKLY" ? "primary" : "ghost"}
              onClick={() => applyPreset("WEEKLY")}
              style={{ fontSize: "0.78rem", padding: "0.35rem 0.65rem", borderRadius: "6px" }}
            >
              Weekly (7D)
            </Button>
            <Button
              size="sm"
              variant={preset === "MONTHLY" ? "primary" : "ghost"}
              onClick={() => applyPreset("MONTHLY")}
              style={{ fontSize: "0.78rem", padding: "0.35rem 0.65rem", borderRadius: "6px" }}
            >
              This Month
            </Button>
            <Button
              size="sm"
              variant={preset === "CUSTOM" ? "primary" : "ghost"}
              onClick={() => setPreset("CUSTOM")}
              style={{ fontSize: "0.78rem", padding: "0.35rem 0.65rem", borderRadius: "6px" }}
            >
              Custom
            </Button>
          </div>

          {/* Store / Outlet Facility Filter */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>
              Outlet / Location
            </span>
            <select
              id="pos-report-facility-select"
              value={selectedFacilityId}
              onChange={(e) => setSelectedFacilityId(e.target.value)}
              style={{
                height: "32px",
                fontSize: "0.8rem",
                padding: "0 0.5rem",
                borderRadius: "var(--radius-md)",
                backgroundColor: "var(--bg-surface-elevated)",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-primary)",
                outline: "none",
                minWidth: "140px",
              }}
            >
              <option value="ALL">All Outlets & Stores</option>
              {facilities.map((fac) => (
                <option key={fac.id} value={fac.id}>
                  {fac.type === "STORE" ? "🏪" : fac.type === "WAREHOUSE" ? "🏭" : "📍"} {fac.facilityName}
                </option>
              ))}
            </select>
          </div>

          {/* Date Picker Inputs */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>
                From
              </span>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPreset("CUSTOM");
                }}
                style={{ fontSize: "0.8rem", padding: "0.3rem 0.5rem", height: "32px", width: "135px" }}
              />
            </div>

            <span style={{ color: "var(--text-muted)", marginTop: "14px", fontSize: "0.85rem" }}>—</span>

            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>
                To
              </span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPreset("CUSTOM");
                }}
                style={{ fontSize: "0.8rem", padding: "0.3rem 0.5rem", height: "32px", width: "135px" }}
              />
            </div>

            <Button
              size="sm"
              variant="secondary"
              onClick={loadData}
              disabled={loading}
              style={{ marginTop: "14px", height: "32px", fontSize: "0.8rem", padding: "0 0.75rem" }}
            >
              {loading ? "..." : "Apply"}
            </Button>
          </div>
        </Card>
      </div>

      {/* KPI Headline Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "1rem" }}>
        <Card glass style={{ padding: "1.2rem", borderLeft: "4px solid var(--accent-emerald, #10b981)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px" }}>
              TOTAL REVENUE
            </span>
            <span style={{ fontSize: "1.1rem" }}>💰</span>
          </div>
          <h3 style={{ fontSize: "1.65rem", fontWeight: 800, color: "var(--text-primary)", marginTop: "0.4rem" }}>
            {formatIDR(totalRevenue)}
          </h3>
          <span style={{ fontSize: "0.75rem", color: "var(--accent-emerald)" }}>
            Net settled POS transactions
          </span>
        </Card>

        <Card glass style={{ padding: "1.2rem", borderLeft: "4px solid var(--accent-blue, #3b82f6)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px" }}>
              COMPLETED ORDERS
            </span>
            <span style={{ fontSize: "1.1rem" }}>🧾</span>
          </div>
          <h3 style={{ fontSize: "1.65rem", fontWeight: 800, color: "var(--text-primary)", marginTop: "0.4rem" }}>
            {orderCount}
          </h3>
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
            Avg value: <strong style={{ color: "var(--text-secondary)" }}>{formatIDR(aov)}</strong>
          </span>
        </Card>

        <Card glass style={{ padding: "1.2rem", borderLeft: "4px solid var(--accent-purple, #a855f7)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px" }}>
              ITEMS DISPATCHED
            </span>
            <span style={{ fontSize: "1.1rem" }}>📦</span>
          </div>
          <h3 style={{ fontSize: "1.65rem", fontWeight: 800, color: "var(--text-primary)", marginTop: "0.4rem" }}>
            {itemsSold}
          </h3>
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
            Units sold and inventory deducted
          </span>
        </Card>

        <Card glass style={{ padding: "1.2rem", borderLeft: "4px solid var(--accent-amber, #f59e0b)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px" }}>
              CASH COLLECTED
            </span>
            <span style={{ fontSize: "1.1rem" }}>💵</span>
          </div>
          <h3 style={{ fontSize: "1.65rem", fontWeight: 800, color: "var(--accent-amber, #f59e0b)", marginTop: "0.4rem" }}>
            {formatIDR(cashAmount)}
          </h3>
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
            {cashCount} cash payments in drawer
          </span>
        </Card>

        <Card glass style={{ padding: "1.2rem", borderLeft: "4px solid var(--accent-indigo, #818cf8)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.5px" }}>
              DIGITAL & CARDS
            </span>
            <span style={{ fontSize: "1.1rem" }}>💳</span>
          </div>
          <h3 style={{ fontSize: "1.65rem", fontWeight: 800, color: "var(--accent-indigo, #818cf8)", marginTop: "0.4rem" }}>
            {formatIDR(digitalAmount)}
          </h3>
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
            QRIS, EDC & Bank settlements
          </span>
        </Card>
      </div>

      {/* Visual Analytics & Graphs Section */}
      <Card glass style={{ padding: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem", marginBottom: "1.25rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "1.25rem" }}>📈</span>
              <h2 style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--text-primary)" }}>
                Sales Trajectory & Trend Graph
              </h2>
            </div>
            <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
              Displaying {trendData.length} data points from {startDate} to {endDate}. Hover over columns to inspect details.
            </p>
          </div>

          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600 }}>Metric:</span>
            <Button
              size="sm"
              variant={chartMetric === "revenue" ? "primary" : "secondary"}
              onClick={() => setChartMetric("revenue")}
              style={{ fontSize: "0.78rem", padding: "0.3rem 0.75rem" }}
            >
              Revenue (IDR)
            </Button>
            <Button
              size="sm"
              variant={chartMetric === "orders" ? "primary" : "secondary"}
              onClick={() => setChartMetric("orders")}
              style={{ fontSize: "0.78rem", padding: "0.3rem 0.75rem" }}
            >
              Order Count
            </Button>
          </div>
        </div>

        {/* Chart View */}
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "260px",
            backgroundColor: "rgba(0, 0, 0, 0.2)",
            borderRadius: "12px",
            border: "1px solid var(--border-subtle)",
            padding: "1rem 1rem 2.2rem 1rem",
            display: "flex",
            alignItems: "flex-end",
            gap: trendData.length > 20 ? "4px" : trendData.length > 10 ? "8px" : "16px",
            boxSizing: "border-box",
          }}
        >
          {/* Grid lines */}
          <div
            style={{
              position: "absolute",
              top: "15%",
              left: "1rem",
              right: "1rem",
              borderTop: "1px dashed rgba(255, 255, 255, 0.08)",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "1rem",
              right: "1rem",
              borderTop: "1px dashed rgba(255, 255, 255, 0.08)",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: "85%",
              left: "1rem",
              right: "1rem",
              borderTop: "1px dashed rgba(255, 255, 255, 0.08)",
              pointerEvents: "none",
            }}
          />

          {/* Interactive Bars */}
          {trendData.map((pt, index) => {
            const val = chartMetric === "revenue" ? pt.revenue : pt.orderCount;
            const heightPercent = maxMetricVal > 0 ? Math.max((val / maxMetricVal) * 100, val > 0 ? 4 : 1) : 0;
            const isHovered = hoveredPoint?.date === pt.date;

            return (
              <div
                key={pt.date || index}
                onMouseEnter={() => setHoveredPoint(pt)}
                onMouseLeave={() => setHoveredPoint(null)}
                style={{
                  flex: 1,
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "flex-end",
                  alignItems: "center",
                  position: "relative",
                  cursor: "pointer",
                }}
              >
                {/* Visual Bar */}
                <div
                  style={{
                    width: "100%",
                    maxWidth: "38px",
                    height: `${heightPercent}%`,
                    minHeight: val > 0 ? "4px" : "2px",
                    borderRadius: "6px 6px 2px 2px",
                    background:
                      val === 0
                        ? "rgba(255, 255, 255, 0.06)"
                        : chartMetric === "revenue"
                        ? isHovered
                          ? "linear-gradient(180deg, #34d399 0%, #059669 100%)"
                          : "linear-gradient(180deg, #10b981 0%, #047857 100%)"
                        : isHovered
                        ? "linear-gradient(180deg, #60a5fa 0%, #2563eb 100%)"
                        : "linear-gradient(180deg, #3b82f6 0%, #1d4ed8 100%)",
                    boxShadow: isHovered && val > 0 ? "0 0 16px rgba(16, 185, 129, 0.45)" : "none",
                    transform: isHovered ? "scaleY(1.02)" : "scaleY(1)",
                    transformOrigin: "bottom",
                    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                  }}
                />

                {/* X-axis date label */}
                <span
                  style={{
                    position: "absolute",
                    bottom: "-22px",
                    fontSize: "0.68rem",
                    color: isHovered ? "var(--text-primary)" : "var(--text-muted)",
                    fontWeight: isHovered ? 700 : 500,
                    whiteSpace: "nowrap",
                    transform: trendData.length > 12 ? "rotate(-35deg)" : "none",
                    transformOrigin: "left bottom",
                    transition: "color 0.15s ease",
                  }}
                >
                  {formatShortDate(pt.date)}
                </span>
              </div>
            );
          })}

          {/* Active Tooltip Popover */}
          {hoveredPoint && (
            <div
              style={{
                position: "absolute",
                top: "14px",
                right: "14px",
                backgroundColor: "rgba(17, 24, 39, 0.95)",
                backdropFilter: "blur(8px)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "8px",
                padding: "0.65rem 0.9rem",
                boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5)",
                display: "flex",
                flexDirection: "column",
                gap: "0.2rem",
                zIndex: 10,
                pointerEvents: "none",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 600 }}>DATE</span>
                <span style={{ fontSize: "0.78rem", color: "var(--text-primary)", fontWeight: 700 }}>
                  {hoveredPoint.date}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                <span style={{ fontSize: "0.72rem", color: "var(--accent-emerald)", fontWeight: 600 }}>REVENUE</span>
                <span style={{ fontSize: "0.85rem", color: "var(--accent-emerald)", fontWeight: 800 }}>
                  {formatIDR(hoveredPoint.revenue)}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)", fontWeight: 500 }}>ORDERS</span>
                <span style={{ fontSize: "0.78rem", color: "var(--text-primary)", fontWeight: 700 }}>
                  {hoveredPoint.orderCount} orders
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)", fontWeight: 500 }}>ITEMS</span>
                <span style={{ fontSize: "0.78rem", color: "var(--text-primary)", fontWeight: 700 }}>
                  {hoveredPoint.itemsSold} units
                </span>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Best-Selling Products Performance Table */}
      <Card style={{ padding: "1.25rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem", marginBottom: "1.25rem" }}>
          <div>
            <h3 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--text-primary)" }}>
              Product Performance & Sales Volume
            </h3>
            <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginTop: "0.15rem" }}>
              Ranked by revenue generation between {startDate} and {endDate}.
            </p>
          </div>

          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <Input
              id="report-product-search"
              placeholder="Search product or SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: "220px", fontSize: "0.85rem" }}
            />
          </div>
        </div>

        {/* Category Filter Pills */}
        {categories.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", paddingBottom: "0.85rem", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Category:</span>
            <select
              id="filter-pos-reports-category-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{
                padding: "0.45rem 0.85rem",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-subtle)",
                backgroundColor: "var(--surface, var(--bg-surface-elevated))",
                color: "var(--text-primary)",
                fontSize: "0.85rem",
                cursor: "pointer",
                outline: "none",
              }}
            >
              <option value="ALL">All Categories ({topProducts.length})</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        )}

        {loading ? (
          <p style={{ color: "var(--text-muted)", textAlign: "center", padding: "2.5rem" }}>
            Loading sales statistics...
          </p>
        ) : filteredProducts.length === 0 ? (
          <div style={{ textAlign: "center", padding: "2.5rem 0", color: "var(--text-secondary)" }}>
            <span style={{ fontSize: "2rem" }}>📊</span>
            <p style={{ marginTop: "0.5rem", fontWeight: 600 }}>No sales data recorded for this period</p>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              {searchTerm ? "No products matched your search query." : "Try adjusting your date range filter or complete sales in the POS."}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-subtle)", color: "var(--text-muted)", fontSize: "0.75rem" }}>
                  <th style={{ padding: "0.6rem 0.5rem" }}>RANK</th>
                  <th style={{ padding: "0.6rem 0.5rem" }}>PRODUCT</th>
                  <th style={{ padding: "0.6rem 0.5rem" }}>CATEGORY</th>
                  <th style={{ padding: "0.6rem 0.5rem", textAlign: "right" }}>VOLUME SOLD</th>
                  <th style={{ padding: "0.6rem 0.5rem", textAlign: "right" }}>AVG PRICE</th>
                  <th style={{ padding: "0.6rem 0.5rem", textAlign: "right" }}>TOTAL REVENUE</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((p, idx) => {
                  const qty = p.totalQuantitySold ?? (p as any).totalQuantity ?? 0;
                  const uLabel = p.unitLabel || "pcs";
                  const avg = p.averagePrice ?? (qty > 0 ? p.totalRevenue / qty : 0);

                  return (
                    <tr
                      key={p.productId}
                      style={{
                        borderBottom: "1px solid var(--border-subtle)",
                        fontSize: "0.88rem",
                        transition: "background 0.15s ease",
                      }}
                    >
                      <td style={{ padding: "0.75rem 0.5rem", fontWeight: 700, color: idx < 3 ? "var(--accent-amber)" : "var(--text-muted)" }}>
                        #{idx + 1}
                      </td>

                      <td style={{ padding: "0.75rem 0.5rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                          {/* Product Thumbnail */}
                          <div
                            style={{
                              width: "38px",
                              height: "38px",
                              borderRadius: "6px",
                              overflow: "hidden",
                              backgroundColor: "var(--bg-surface-elevated)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            {p.imageUrl ? (
                              <img src={p.imageUrl} alt={p.productName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            ) : (
                              <span style={{ fontSize: "1.1rem" }}>☕</span>
                            )}
                          </div>
                          <div>
                            <span style={{ fontWeight: 600, color: "var(--text-primary)", display: "block" }}>
                              {p.productName}
                            </span>
                            {p.sku && (
                              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontFamily: "monospace" }}>
                                {p.sku}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: "0.75rem 0.5rem" }}>
                        <Badge variant="default" style={{ fontSize: "0.72rem" }}>
                          {p.categoryName || "General"}
                        </Badge>
                      </td>

                      <td style={{ padding: "0.75rem 0.5rem", textAlign: "right", fontWeight: 700, color: "var(--text-primary)" }}>
                        {qty} <span style={{ fontSize: "0.78rem", fontWeight: 500, color: "var(--text-muted)" }}>{uLabel}</span>
                      </td>

                      <td style={{ padding: "0.75rem 0.5rem", textAlign: "right", color: "var(--text-secondary)" }}>
                        {formatIDR(avg)}
                      </td>

                      <td style={{ padding: "0.75rem 0.5rem", textAlign: "right", fontWeight: 800, color: "var(--accent-emerald)" }}>
                        {formatIDR(p.totalRevenue)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
