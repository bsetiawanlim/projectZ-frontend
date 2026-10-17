"use client";

import React, { useEffect, useState, useCallback, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { SortableTh } from "@/components/ui/SortableTh";
import {
  posApi,
  facilityApi,
  payrollApi,
  equipmentApi,
  productApi,
} from "@/lib/api";
import {
  formatIDR,
  type FacilityRecord,
  type DailySalesSummaryResult,
  type DailySalesTrendPoint,
  type ProductSalesItemReport,
  type PayrollPeriodRecord,
  type SalaryRecordItem,
  type EquipmentEntityRecord,
  type FacilityEquipmentRecord,
  type ProductItem,
  type FacilitySectionRecord,
} from "@pz/shared";

// ==========================================
// Types & Helper Functions
// ==========================================

type ReportTab = "sales" | "payroll" | "equipment" | "products" | "opname";
type SalesPresetType = "DAILY" | "WEEKLY" | "MONTHLY" | "CUSTOM";
type OpnameMode = "stock" | "equipment";

function formatShortDate(dStr?: string | Date | null) {
  if (!dStr) return "-";
  try {
    const d = new Date(dStr);
    return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return String(dStr);
  }
}

function ReportHubContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Active Tab from URL search params or default to "sales"
  const rawTab = searchParams.get("tab") as ReportTab | null;
  const activeTab: ReportTab =
    rawTab && ["sales", "payroll", "equipment", "products", "opname"].includes(rawTab)
      ? rawTab
      : "sales";

  const handleTabChange = (t: ReportTab) => {
    router.push(`/report?tab=${t}`);
  };

  // Shared state: Facilities list
  const [facilities, setFacilities] = useState<FacilityRecord[]>([]);
  const [facilitiesLoading, setFacilitiesLoading] = useState(true);

  useEffect(() => {
    facilityApi
      .listFacilities({ limit: 100 })
      .then((res) => {
        const list = res?.items || (res as any)?.data || [];
        setFacilities(list);
      })
      .catch(() => setFacilities([]))
      .finally(() => setFacilitiesLoading(false));
  }, []);

  // ==========================================
  // TAB 1: SALES REPORT STATE & LOGIC
  // ==========================================
  const getTodayStr = () => new Date().toISOString().split("T")[0]!;
  const [salesPreset, setSalesPreset] = useState<SalesPresetType>("DAILY");
  const [salesStartDate, setSalesStartDate] = useState<string>(getTodayStr());
  const [salesEndDate, setSalesEndDate] = useState<string>(getTodayStr());
  const [salesFacilityId, setSalesFacilityId] = useState<string>("ALL");
  const [salesCategory, setSalesCategory] = useState<string>("ALL");
  const [salesSearch, setSalesSearch] = useState<string>("");
  const [salesSummary, setSalesSummary] = useState<DailySalesSummaryResult | null>(null);
  const [salesTopProducts, setSalesTopProducts] = useState<ProductSalesItemReport[]>([]);
  const [salesLoading, setSalesLoading] = useState(false);
  const [chartMetric, setChartMetric] = useState<"revenue" | "orders">("revenue");
  const [hoveredPoint, setHoveredPoint] = useState<DailySalesTrendPoint | null>(null);

  type SalesSortField = "rank" | "product" | "category" | "volume" | "avgPrice" | "revenue";
  const [salesSortField, setSalesSortField] = useState<SalesSortField>("revenue");
  const [salesSortOrder, setSalesSortOrder] = useState<"asc" | "desc">("desc");

  const handleSalesSort = (field: SalesSortField) => {
    if (salesSortField === field) {
      setSalesSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSalesSortField(field);
      setSalesSortOrder("desc");
    }
  };

  const applySalesPreset = (p: SalesPresetType) => {
    setSalesPreset(p);
    const now = new Date();
    const today = now.toISOString().split("T")[0]!;
    if (p === "DAILY") {
      setSalesStartDate(today);
      setSalesEndDate(today);
    } else if (p === "WEEKLY") {
      const d = new Date(now);
      d.setDate(d.getDate() - 6);
      setSalesStartDate(d.toISOString().split("T")[0]!);
      setSalesEndDate(today);
    } else if (p === "MONTHLY") {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setSalesStartDate(firstDay.toISOString().split("T")[0]!);
      setSalesEndDate(today);
    }
  };

  const loadSalesData = useCallback(async () => {
    setSalesLoading(true);
    try {
      const facId = salesFacilityId !== "ALL" ? Number(salesFacilityId) : undefined;
      const [sumRes, topRes] = await Promise.all([
        posApi.getDailySummary({ startDate: salesStartDate, endDate: salesEndDate, facilityId: facId }).catch(() => ({ data: null })),
        posApi.getProductSalesReport({ startDate: salesStartDate, endDate: salesEndDate, limit: 100, facilityId: facId }).catch(() => ({ data: [] })),
      ]);
      setSalesSummary(sumRes?.data ?? null);

      const raw = topRes?.data ?? topRes;
      let list: ProductSalesItemReport[] = [];
      if (Array.isArray(raw)) list = raw;
      else if (Array.isArray((raw as any)?.products)) list = (raw as any).products;
      else if (Array.isArray((raw as any)?.items)) list = (raw as any).items;
      else if (Array.isArray((raw as any)?.data)) list = (raw as any).data;
      setSalesTopProducts(list);
    } catch (err) {
      console.error("Failed to load sales report", err);
      setSalesTopProducts([]);
    } finally {
      setSalesLoading(false);
    }
  }, [salesStartDate, salesEndDate, salesFacilityId]);

  useEffect(() => {
    if (activeTab === "sales") {
      loadSalesData();
    }
  }, [activeTab, loadSalesData]);

  const salesCategories = useMemo(() => {
    const set = new Set<string>();
    salesTopProducts.forEach((p) => {
      if (p.categoryName) set.add(p.categoryName);
    });
    return Array.from(set);
  }, [salesTopProducts]);

  const filteredSalesProducts = useMemo(() => {
    return salesTopProducts
      .filter((p) => {
        const matchCat = salesCategory === "ALL" || p.categoryName === salesCategory;
        const q = salesSearch.toLowerCase().trim();
        const matchSearch =
          !q ||
          p.productName.toLowerCase().includes(q) ||
          (p.sku && p.sku.toLowerCase().includes(q)) ||
          (p.categoryName && p.categoryName.toLowerCase().includes(q));
        return matchCat && matchSearch;
      })
      .sort((a, b) => {
        const aVol = a.totalQuantitySold ?? a.totalQuantity ?? 0;
        const bVol = b.totalQuantitySold ?? b.totalQuantity ?? 0;
        const aPrice = a.averagePrice ?? 0;
        const bPrice = b.averagePrice ?? 0;

        let diff = 0;
        if (salesSortField === "revenue") diff = a.totalRevenue - b.totalRevenue;
        else if (salesSortField === "volume") diff = aVol - bVol;
        else if (salesSortField === "avgPrice") diff = aPrice - bPrice;
        else if (salesSortField === "product") diff = a.productName.localeCompare(b.productName);
        else if (salesSortField === "category") diff = (a.categoryName || "").localeCompare(b.categoryName || "");
        return salesSortOrder === "asc" ? diff : -diff;
      });
  }, [salesTopProducts, salesCategory, salesSearch, salesSortField, salesSortOrder]);

  // ==========================================
  // TAB 2: PAYROLL REPORT STATE & LOGIC
  // ==========================================
  const [payrollFacilityId, setPayrollFacilityId] = useState<string>("ALL");
  const [payrollPeriodId, setPayrollPeriodId] = useState<string>("ALL");
  const [payrollStatus, setPayrollStatus] = useState<string>("ALL");
  const [payrollSearch, setPayrollSearch] = useState<string>("");
  const [payrollPeriods, setPayrollPeriods] = useState<PayrollPeriodRecord[]>([]);
  const [salaryRecords, setSalaryRecords] = useState<SalaryRecordItem[]>([]);
  const [payrollLoading, setPayrollLoading] = useState(false);
  const [selectedSalaryRecord, setSelectedSalaryRecord] = useState<SalaryRecordItem | null>(null);

  const loadPayrollPeriods = useCallback(async () => {
    try {
      const res = await payrollApi.listPeriods({ limit: 100 });
      const items = res?.items || (res as any)?.data || [];
      setPayrollPeriods(items);
    } catch (err) {
      console.error("Failed to load payroll periods", err);
    }
  }, []);

  const loadSalaryRecords = useCallback(async () => {
    setPayrollLoading(true);
    try {
      const res = await payrollApi.listSalaryRecords({
        limit: 200,
        facilityId: payrollFacilityId !== "ALL" ? payrollFacilityId : undefined,
        periodId: payrollPeriodId !== "ALL" ? payrollPeriodId : undefined,
        status: payrollStatus !== "ALL" ? payrollStatus : undefined,
        search: payrollSearch.trim() || undefined,
      });
      const items = res?.items || (res as any)?.data || [];
      setSalaryRecords(items);
    } catch (err) {
      console.error("Failed to load salary records", err);
      setSalaryRecords([]);
    } finally {
      setPayrollLoading(false);
    }
  }, [payrollFacilityId, payrollPeriodId, payrollStatus, payrollSearch]);

  useEffect(() => {
    if (activeTab === "payroll") {
      loadPayrollPeriods();
      loadSalaryRecords();
    }
  }, [activeTab, loadPayrollPeriods, loadSalaryRecords]);

  const payrollTotals = useMemo(() => {
    let totalNet = 0;
    let totalBasic = 0;
    let totalAllowances = 0;
    let totalDeductions = 0;
    let paidCount = 0;
    let pendingCount = 0;

    salaryRecords.forEach((r) => {
      totalNet += Number(r.netSalary || 0);
      totalBasic += Number(r.basicSalary || 0);
      totalAllowances += Number(r.totalAllowances || 0);
      totalDeductions += Number(r.totalDeductions || 0);
      if (r.status === "PAID") paidCount++;
      else if (r.status === "PENDING" || r.status === "APPROVED") pendingCount++;
    });

    return {
      totalNet,
      totalBasic,
      totalAllowances,
      totalDeductions,
      paidCount,
      pendingCount,
      employeeCount: salaryRecords.length,
    };
  }, [salaryRecords]);

  // ==========================================
  // TAB 3: EQUIPMENT REPORT STATE & LOGIC
  // ==========================================
  const [equipmentFacilityId, setEquipmentFacilityId] = useState<string>("ALL");
  const [equipmentStatus, setEquipmentStatus] = useState<string>("ALL");
  const [equipmentSearch, setEquipmentSearch] = useState<string>("");
  const [allEquipments, setAllEquipments] = useState<EquipmentEntityRecord[]>([]);
  const [stationedEquipments, setStationedEquipments] = useState<FacilityEquipmentRecord[]>([]);
  const [equipmentLoading, setEquipmentLoading] = useState(false);
  const [selectedEquipmentDetail, setSelectedEquipmentDetail] = useState<any | null>(null);

  const loadEquipmentData = useCallback(async () => {
    setEquipmentLoading(true);
    try {
      if (equipmentFacilityId !== "ALL") {
        const facId = Number(equipmentFacilityId);
        const res = await facilityApi.getEquipmentsByFacility(facId, {
          status: equipmentStatus !== "ALL" ? equipmentStatus : undefined,
          search: equipmentSearch.trim() || undefined,
        });
        const items = res?.data || [];
        setStationedEquipments(items);
        setAllEquipments([]);
      } else {
        const [eqRes, facList] = await Promise.all([
          equipmentApi.listEquipment({ limit: 200, search: equipmentSearch.trim() || undefined }),
          facilityApi.listFacilities({ limit: 100 }),
        ]);
        const eqItems = (eqRes as any)?.items || (eqRes as any)?.data || [];
        setAllEquipments(eqItems);

        // Fetch stationed equipment across facilities
        const facs = facList?.items || [];
        const promises = facs.map((f: FacilityRecord) =>
          facilityApi
            .getEquipmentsByFacility(f.id, { status: equipmentStatus !== "ALL" ? equipmentStatus : undefined })
            .then((r) => r.data || [])
            .catch(() => [])
        );
        const allStationed = (await Promise.all(promises)).flat();
        setStationedEquipments(allStationed);
      }
    } catch (err) {
      console.error("Failed to load equipment report", err);
      setAllEquipments([]);
      setStationedEquipments([]);
    } finally {
      setEquipmentLoading(false);
    }
  }, [equipmentFacilityId, equipmentStatus, equipmentSearch]);

  useEffect(() => {
    if (activeTab === "equipment") {
      loadEquipmentData();
    }
  }, [activeTab, loadEquipmentData]);

  const equipmentTotals = useMemo(() => {
    let totalUnits = 0;
    let totalValue = 0;
    let activeUnits = 0;
    let maintenanceUnits = 0;
    let standbyUnits = 0;
    let retiredUnits = 0;

    if (equipmentFacilityId !== "ALL" || stationedEquipments.length > 0) {
      stationedEquipments.forEach((item) => {
        const q = item.quantity || 1;
        const price = Number((item.equipmentEntity as any)?.unitPrice || 0);
        totalUnits += q;
        totalValue += price * q;
        if (item.status === "ACTIVE") activeUnits += q;
        else if (item.status === "MAINTENANCE") maintenanceUnits += q;
        else if (item.status === "STANDBY") standbyUnits += q;
        else if (item.status === "RETIRED" || item.status === "DECOMMISSIONED") retiredUnits += q;
      });
    } else {
      allEquipments.forEach((eq: any) => {
        const price = Number(eq.unitPrice || 0);
        totalUnits += 1;
        totalValue += price;
        activeUnits += 1;
      });
    }

    return {
      totalUnits,
      totalValue,
      activeUnits,
      maintenanceUnits,
      standbyUnits,
      retiredUnits,
    };
  }, [equipmentFacilityId, stationedEquipments, allEquipments]);

  // ==========================================
  // TAB 4: PRODUCT REPORT STATE & LOGIC
  // ==========================================
  const [productFacilityId, setProductFacilityId] = useState<string>("ALL");
  const [productCategoryFilter, setProductCategoryFilter] = useState<string>("ALL");
  const [productStockFilter, setProductStockFilter] = useState<"all" | "instock" | "lowstock" | "outofstock">("all");
  const [productSearchQuery, setProductSearchQuery] = useState<string>("");
  const [catalogProducts, setCatalogProducts] = useState<ProductItem[]>([]);
  const [productLoading, setProductLoading] = useState(false);

  const loadProductData = useCallback(async () => {
    setProductLoading(true);
    try {
      const facId = productFacilityId !== "ALL" ? Number(productFacilityId) : undefined;
      const res = await productApi.getProducts({
        limit: 250,
        ...(facId ? { facilityId: facId } : {}),
      });
      const items = res?.data || [];
      setCatalogProducts(items);
    } catch (err) {
      console.error("Failed to load products for report", err);
      setCatalogProducts([]);
    } finally {
      setProductLoading(false);
    }
  }, [productFacilityId]);

  useEffect(() => {
    if (activeTab === "products") {
      loadProductData();
    }
  }, [activeTab, loadProductData]);

  const productCategories = useMemo(() => {
    const set = new Set<string>();
    catalogProducts.forEach((p) => {
      if (p.category?.categoryName) set.add(p.category.categoryName);
    });
    return Array.from(set);
  }, [catalogProducts]);

  const filteredCatalogProducts = useMemo(() => {
    return catalogProducts.filter((p) => {
      const matchCat = productCategoryFilter === "ALL" || p.category?.categoryName === productCategoryFilter;
      const q = productSearchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        p.productName.toLowerCase().includes(q) ||
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        (p.barcode && p.barcode.toLowerCase().includes(q));

      const stock = Number(p.currentStock || 0);
      const minStock = Number(p.minStock || 0);
      let matchStock = true;
      if (productStockFilter === "instock") matchStock = stock > minStock;
      else if (productStockFilter === "lowstock") matchStock = stock > 0 && stock <= minStock;
      else if (productStockFilter === "outofstock") matchStock = stock <= 0;

      return matchCat && matchSearch && matchStock;
    });
  }, [catalogProducts, productCategoryFilter, productSearchQuery, productStockFilter]);

  const productTotals = useMemo(() => {
    let totalSKUs = filteredCatalogProducts.length;
    let totalValuation = 0;
    let healthyCount = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    filteredCatalogProducts.forEach((p) => {
      const stock = Number(p.currentStock || 0);
      const minStock = Number(p.minStock || 0);
      const price = Number(p.retailPrice || 0);
      totalValuation += stock * price;
      if (stock <= 0) outOfStockCount++;
      else if (stock <= minStock) lowStockCount++;
      else healthyCount++;
    });

    return { totalSKUs, totalValuation, healthyCount, lowStockCount, outOfStockCount };
  }, [filteredCatalogProducts]);

  // ==========================================
  // TAB 5: STOCK & EQUIPMENT OPNAME STATE & LOGIC
  // ==========================================
  const [opnameMode, setOpnameMode] = useState<OpnameMode>("stock");
  const [opnameFacilityId, setOpnameFacilityId] = useState<number | "">("");
  const [opnameSectionId, setOpnameSectionId] = useState<number | "">("");
  const [opnameSections, setOpnameSections] = useState<FacilitySectionRecord[]>([]);
  const [opnameRefCode, setOpnameRefCode] = useState<string>("");
  const [opnameDate, setOpnameDate] = useState<string>(getTodayStr());
  const [opnameSearch, setOpnameSearch] = useState<string>("");
  const [opnameOnlyDiscrepancies, setOpnameOnlyDiscrepancies] = useState<boolean>(false);
  const [opnameSubmitting, setOpnameSubmitting] = useState(false);
  const [opnameSuccessMsg, setOpnameSuccessMsg] = useState<string | null>(null);

  // Stock Opname Form Map: [productId]: { physicalCount: string, notes: string }
  const [stockCounts, setStockCounts] = useState<{ [productId: number]: { physicalCount: string; notes: string } }>({});
  // Equipment Opname Form Map: [facilityEquipmentId]: { physicalCount: string, status: string, sectionId: number | "", notes: string, verified: boolean }
  const [equipmentCounts, setEquipmentCounts] = useState<{
    [eqRecordId: number]: {
      physicalCount: string;
      status: string;
      sectionId: number | "";
      notes: string;
      verified: boolean;
    };
  }>({});

  // Auto-select first facility when facilities load
  useEffect(() => {
    if (facilities.length > 0 && opnameFacilityId === "") {
      setOpnameFacilityId(facilities[0]!.id);
      setOpnameRefCode(`OPN-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${facilities[0]!.facilityCode}`);
    }
  }, [facilities, opnameFacilityId]);

  // Load sections when facility changes
  useEffect(() => {
    if (opnameFacilityId !== "") {
      const fac = facilities.find((f) => f.id === opnameFacilityId);
      if (fac) {
        setOpnameSections(fac.sections || []);
        setOpnameRefCode(`OPN-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${fac.facilityCode}`);
      }
    } else {
      setOpnameSections([]);
    }
  }, [opnameFacilityId, facilities]);

  // Load Items to audit for selected facility
  const [opnameProducts, setOpnameProducts] = useState<ProductItem[]>([]);
  const [opnameEquipments, setOpnameEquipments] = useState<FacilityEquipmentRecord[]>([]);
  const [opnameLoadingItems, setOpnameLoadingItems] = useState(false);

  const loadOpnameItems = useCallback(async () => {
    if (opnameFacilityId === "") return;
    setOpnameLoadingItems(true);
    try {
      const [prodRes, eqRes] = await Promise.all([
        productApi.getProducts({ facilityId: Number(opnameFacilityId), limit: 300 }),
        facilityApi.getEquipmentsByFacility(Number(opnameFacilityId)),
      ]);
      const pItems: ProductItem[] = prodRes?.data || [];
      const eqItems: FacilityEquipmentRecord[] = eqRes?.data || [];
      setOpnameProducts(pItems);
      setOpnameEquipments(eqItems);

      // Pre-initialize maps
      const newStockMap: { [productId: number]: { physicalCount: string; notes: string } } = {};
      pItems.forEach((p) => {
        newStockMap[p.id] = { physicalCount: String(p.currentStock ?? 0), notes: "" };
      });
      setStockCounts(newStockMap);

      const newEqMap: { [eqRecordId: number]: any } = {};
      eqItems.forEach((eq) => {
        newEqMap[eq.id] = {
          physicalCount: String(eq.quantity || 1),
          status: eq.status || "ACTIVE",
          sectionId: eq.sectionId || "",
          notes: eq.notes || "",
          verified: true,
        };
      });
      setEquipmentCounts(newEqMap);
    } catch (err) {
      console.error("Failed to load opname items", err);
    } finally {
      setOpnameLoadingItems(false);
    }
  }, [opnameFacilityId]);

  useEffect(() => {
    if (activeTab === "opname" && opnameFacilityId !== "") {
      loadOpnameItems();
    }
  }, [activeTab, opnameFacilityId, loadOpnameItems]);

  // Stock Opname Submit
  const handleStockOpnameSubmit = async () => {
    if (opnameFacilityId === "") {
      alert("Please select a facility for the opname audit.");
      return;
    }

    const itemsToAdjust = opnameProducts.filter((p) => {
      const entered = stockCounts[p.id];
      if (!entered || entered.physicalCount.trim() === "") return false;
      const countNum = Number(entered.physicalCount);
      const systemStock = Number(p.currentStock ?? 0);
      return countNum !== systemStock; // Only submit discrepancies or adjustments
    });

    if (itemsToAdjust.length === 0) {
      alert("All physical counts match the system recorded stock. No adjustments needed!");
      return;
    }

    if (
      !confirm(
        `Are you sure you want to commit stock adjustments for ${itemsToAdjust.length} items with discrepancies in this facility?`
      )
    ) {
      return;
    }

    setOpnameSubmitting(true);
    setOpnameSuccessMsg(null);
    try {
      let updatedCount = 0;
      for (const p of itemsToAdjust) {
        const countNum = Number(stockCounts[p.id]?.physicalCount);
        const reason = stockCounts[p.id]?.notes || `Opname Audit (${opnameRefCode || "OPNAME"})`;
        await productApi.createInventory({
          productId: p.id,
          facilityId: Number(opnameFacilityId),
          sectionId: opnameSectionId !== "" ? Number(opnameSectionId) : undefined,
          transactionType: "ADJUSTMENT",
          quantity: Math.max(0, countNum),
          reference: opnameRefCode || `OPN-${opnameDate}`,
          notes: reason,
        });
        updatedCount++;
      }

      setOpnameSuccessMsg(`Successfully audited and updated stock for ${updatedCount} products.`);
      await loadOpnameItems();
    } catch (err: any) {
      alert(err.message || "Failed to commit stock opname adjustments.");
    } finally {
      setOpnameSubmitting(false);
    }
  };

  // Equipment Opname Submit
  const handleEquipmentOpnameSubmit = async () => {
    if (opnameFacilityId === "") {
      alert("Please select a facility for the opname audit.");
      return;
    }

    if (
      !confirm(
        `Are you sure you want to commit physical audit records for ${opnameEquipments.length} stationed equipment units?`
      )
    ) {
      return;
    }

    setOpnameSubmitting(true);
    setOpnameSuccessMsg(null);
    try {
      let updatedCount = 0;
      for (const eq of opnameEquipments) {
        const audited = equipmentCounts[eq.id];
        if (!audited) continue;

        await facilityApi.updateEquipment({
          id: eq.id,
          quantity: Math.max(0, Number(audited.physicalCount) || 1),
          status: audited.status,
          sectionId: audited.sectionId !== "" ? Number(audited.sectionId) : null,
          notes: audited.notes ? `${audited.notes} [Audit: ${opnameRefCode || "OPN"}]` : `Verified on ${opnameDate}`,
          isActive: audited.verified,
        });
        updatedCount++;
      }

      setOpnameSuccessMsg(`Successfully audited and updated ${updatedCount} equipment records.`);
      await loadOpnameItems();
    } catch (err: any) {
      alert(err.message || "Failed to commit equipment opname.");
    } finally {
      setOpnameSubmitting(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", paddingBottom: "2rem" }}>
      {/* Top Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h2 style={{ fontSize: "1.35rem", fontWeight: 700, color: "var(--text-primary)" }}>
            📊 Reports & Analytics Hub
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "0.2rem" }}>
            Consolidated operational reports across Sales, Payroll, Equipment fleet, Inventory stock, and Physical Opname audits.
          </p>
        </div>

        {/* Global Export / Print Action */}
        <Button variant="secondary" size="sm" onClick={() => window.print()}>
          🖨️ Print Report
        </Button>
      </div>

      {/* Main Tab Navigation Bar */}
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          borderBottom: "1px solid var(--border-subtle)",
          paddingBottom: "0.5rem",
          overflowX: "auto",
        }}
      >
        <button
          onClick={() => handleTabChange("sales")}
          style={{
            padding: "0.55rem 1rem",
            borderRadius: "var(--radius-md)",
            border: "none",
            backgroundColor: activeTab === "sales" ? "var(--primary)" : "transparent",
            color: activeTab === "sales" ? "#ffffff" : "var(--text-secondary)",
            fontSize: "0.85rem",
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            whiteSpace: "nowrap",
            transition: "all var(--transition-fast)",
          }}
        >
          <span>💳</span> Sales Report
        </button>

        <button
          onClick={() => handleTabChange("payroll")}
          style={{
            padding: "0.55rem 1rem",
            borderRadius: "var(--radius-md)",
            border: "none",
            backgroundColor: activeTab === "payroll" ? "var(--primary)" : "transparent",
            color: activeTab === "payroll" ? "#ffffff" : "var(--text-secondary)",
            fontSize: "0.85rem",
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            whiteSpace: "nowrap",
            transition: "all var(--transition-fast)",
          }}
        >
          <span>💵</span> Payroll Report
        </button>

        <button
          onClick={() => handleTabChange("equipment")}
          style={{
            padding: "0.55rem 1rem",
            borderRadius: "var(--radius-md)",
            border: "none",
            backgroundColor: activeTab === "equipment" ? "var(--primary)" : "transparent",
            color: activeTab === "equipment" ? "#ffffff" : "var(--text-secondary)",
            fontSize: "0.85rem",
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            whiteSpace: "nowrap",
            transition: "all var(--transition-fast)",
          }}
        >
          <span>🚜</span> Equipment Report
        </button>

        <button
          onClick={() => handleTabChange("products")}
          style={{
            padding: "0.55rem 1rem",
            borderRadius: "var(--radius-md)",
            border: "none",
            backgroundColor: activeTab === "products" ? "var(--primary)" : "transparent",
            color: activeTab === "products" ? "#ffffff" : "var(--text-secondary)",
            fontSize: "0.85rem",
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            whiteSpace: "nowrap",
            transition: "all var(--transition-fast)",
          }}
        >
          <span>📦</span> Product Stock Report
        </button>

        <button
          onClick={() => handleTabChange("opname")}
          style={{
            padding: "0.55rem 1rem",
            borderRadius: "var(--radius-md)",
            border: "none",
            backgroundColor: activeTab === "opname" ? "var(--primary)" : "transparent",
            color: activeTab === "opname" ? "#ffffff" : "var(--text-secondary)",
            fontSize: "0.85rem",
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            whiteSpace: "nowrap",
            transition: "all var(--transition-fast)",
          }}
        >
          <span>📋</span> Stock & Equipment Opname
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: SALES REPORT VIEW                                                 */}
      {/* ========================================================================= */}
      {activeTab === "sales" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Sales Filter Bar */}
          <Card style={{ padding: "1.25rem" }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "flex-end" }}>
              {/* Presets */}
              <div>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                  Date Period
                </label>
                <div style={{ display: "flex", gap: "0.25rem" }}>
                  {(["DAILY", "WEEKLY", "MONTHLY", "CUSTOM"] as SalesPresetType[]).map((p) => (
                    <Button
                      key={p}
                      size="sm"
                      variant={salesPreset === p ? "primary" : "secondary"}
                      onClick={() => applySalesPreset(p)}
                    >
                      {p === "DAILY" ? "Today" : p === "WEEKLY" ? "Last 7 Days" : p === "MONTHLY" ? "Month to Date" : "Custom"}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Start & End Dates */}
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <div>
                  <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                    From Date
                  </label>
                  <Input
                    type="date"
                    value={salesStartDate}
                    onChange={(e) => {
                      setSalesStartDate(e.target.value);
                      setSalesPreset("CUSTOM");
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                    To Date
                  </label>
                  <Input
                    type="date"
                    value={salesEndDate}
                    onChange={(e) => {
                      setSalesEndDate(e.target.value);
                      setSalesPreset("CUSTOM");
                    }}
                  />
                </div>
              </div>

              {/* Facility Filter */}
              <div style={{ minWidth: "200px" }}>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                  Outlet / Facility
                </label>
                <select
                  style={{
                    width: "100%",
                    padding: "0.5rem 0.75rem",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: "var(--bg-surface-elevated)",
                    border: "1px solid var(--border-subtle)",
                    color: "var(--text-primary)",
                    fontSize: "0.85rem",
                  }}
                  value={salesFacilityId}
                  onChange={(e) => setSalesFacilityId(e.target.value)}
                >
                  <option value="ALL">All Facilities & Outlets</option>
                  {facilities.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.facilityName} ({f.facilityCode})
                    </option>
                  ))}
                </select>
              </div>

              {/* Apply / Refresh */}
              <Button size="sm" onClick={loadSalesData} disabled={salesLoading}>
                {salesLoading ? "Refreshing..." : "🔄 Refresh"}
              </Button>
            </div>
          </Card>

          {/* Sales Summary Metrics */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
            <Card style={{ padding: "1.25rem" }}>
              <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 600 }}>TOTAL REVENUE</span>
              <h3 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--accent-emerald)", marginTop: "0.25rem" }}>
                {formatIDR(salesSummary?.totalRevenue ?? 0)}
              </h3>
              <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>Gross registered sales</p>
            </Card>

            <Card style={{ padding: "1.25rem" }}>
              <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 600 }}>COMPLETED ORDERS</span>
              <h3 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--accent-cyan)", marginTop: "0.25rem" }}>
                {salesSummary?.totalOrders ?? salesSummary?.orderCount ?? 0}
              </h3>
              <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>Transactions recorded</p>
            </Card>

            <Card style={{ padding: "1.25rem" }}>
              <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 600 }}>AVERAGE ORDER VALUE</span>
              <h3 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--primary)", marginTop: "0.25rem" }}>
                {formatIDR(salesSummary?.averageOrderValue ?? 0)}
              </h3>
              <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>Per ticket average</p>
            </Card>

            <Card style={{ padding: "1.25rem" }}>
              <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 600 }}>ITEMS SOLD</span>
              <h3 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--accent-amber)", marginTop: "0.25rem" }}>
                {salesTopProducts.reduce((acc, p) => acc + (p.totalQuantitySold ?? p.totalQuantity ?? 0), 0)}
              </h3>
              <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>Quantity dispensed</p>
            </Card>
          </div>

          {/* Sales Trend Bar Chart */}
          <Card style={{ padding: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <div>
                <h4 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)" }}>Sales Revenue & Volume Trend</h4>
                <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                  Daily breakdown across {salesStartDate} to {salesEndDate}
                </p>
              </div>
              <div style={{ display: "flex", gap: "0.25rem" }}>
                <Button
                  size="sm"
                  variant={chartMetric === "revenue" ? "primary" : "secondary"}
                  onClick={() => setChartMetric("revenue")}
                >
                  Revenue (IDR)
                </Button>
                <Button
                  size="sm"
                  variant={chartMetric === "orders" ? "primary" : "secondary"}
                  onClick={() => setChartMetric("orders")}
                >
                  Order Count
                </Button>
              </div>
            </div>

            {salesLoading ? (
              <div style={{ height: "180px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
                Loading sales trend...
              </div>
            ) : !salesSummary?.dailyTrend || salesSummary.dailyTrend.length === 0 ? (
              <div style={{ height: "180px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
                No trend data for this date range.
              </div>
            ) : (
              <div style={{ height: "200px", display: "flex", alignItems: "flex-end", gap: "0.5rem", paddingBottom: "1.5rem", position: "relative" }}>
                {(() => {
                  const trendList = salesSummary.dailyTrend || [];
                  const maxVal = Math.max(
                    ...trendList.map((pt: DailySalesTrendPoint) => (chartMetric === "revenue" ? pt.revenue : pt.orderCount)),
                    1
                  );
                  return trendList.map((pt: DailySalesTrendPoint, idx: number) => {
                    const val = chartMetric === "revenue" ? pt.revenue : pt.orderCount;
                    const heightPercent = Math.max(8, Math.round((val / maxVal) * 100));
                    const isHovered = hoveredPoint?.date === pt.date;

                    return (
                      <div
                        key={idx}
                        style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", height: "100%", justifyContent: "flex-end" }}
                        onMouseEnter={() => setHoveredPoint(pt)}
                        onMouseLeave={() => setHoveredPoint(null)}
                      >
                        <div
                          style={{
                            width: "100%",
                            maxWidth: "40px",
                            height: `${heightPercent}%`,
                            backgroundColor: isHovered ? "var(--accent-cyan)" : "var(--primary)",
                            borderRadius: "var(--radius-sm) var(--radius-sm) 0 0",
                            transition: "all var(--transition-fast)",
                            cursor: "pointer",
                          }}
                        />
                        <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.4rem", whiteSpace: "nowrap" }}>
                          {formatShortDate(pt.date).slice(0, 6)}
                        </span>
                      </div>
                    );
                  });
                })()}

                {hoveredPoint && (
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      right: 0,
                      backgroundColor: "var(--bg-surface-elevated)",
                      padding: "0.5rem 0.75rem",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--border-subtle)",
                      fontSize: "0.75rem",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                    }}
                  >
                    <div><strong>Date:</strong> {hoveredPoint.date}</div>
                    <div><strong>Revenue:</strong> {formatIDR(hoveredPoint.revenue)}</div>
                    <div><strong>Orders:</strong> {hoveredPoint.orderCount}</div>
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Top Selling Products Table */}
          <Card style={{ padding: "1.25rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.75rem" }}>
              <div>
                <h4 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)" }}>Top Selling Products & Revenue</h4>
                <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                  Itemized sales breakdown by volume and total gross revenue
                </p>
              </div>

              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <Input
                  placeholder="Search products..."
                  value={salesSearch}
                  onChange={(e) => setSalesSearch(e.target.value)}
                  style={{ width: "200px" }}
                />
                <select
                  style={{
                    padding: "0.4rem 0.65rem",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: "var(--bg-surface-elevated)",
                    border: "1px solid var(--border-subtle)",
                    color: "var(--text-primary)",
                    fontSize: "0.82rem",
                  }}
                  value={salesCategory}
                  onChange={(e) => setSalesCategory(e.target.value)}
                >
                  <option value="ALL">All Categories</option>
                  {salesCategories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem", textAlign: "left" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-subtle)", color: "var(--text-muted)" }}>
                    <th style={{ padding: "0.6rem" }}>#</th>
                    <SortableTh field="product" currentSortField={salesSortField} currentSortOrder={salesSortOrder} onSort={handleSalesSort}>
                      Product Name
                    </SortableTh>
                    <SortableTh field="category" currentSortField={salesSortField} currentSortOrder={salesSortOrder} onSort={handleSalesSort}>
                      Category
                    </SortableTh>
                    <SortableTh field="volume" currentSortField={salesSortField} currentSortOrder={salesSortOrder} onSort={handleSalesSort} align="right">
                      Qty Sold
                    </SortableTh>
                    <SortableTh field="avgPrice" currentSortField={salesSortField} currentSortOrder={salesSortOrder} onSort={handleSalesSort} align="right">
                      Avg Price
                    </SortableTh>
                    <SortableTh field="revenue" currentSortField={salesSortField} currentSortOrder={salesSortOrder} onSort={handleSalesSort} align="right">
                      Total Revenue
                    </SortableTh>
                  </tr>
                </thead>
                <tbody>
                  {filteredSalesProducts.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>
                        No product sales recorded for this period.
                      </td>
                    </tr>
                  ) : (
                    filteredSalesProducts.map((p, idx) => (
                      <tr key={p.productId || idx} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                        <td style={{ padding: "0.6rem", color: "var(--text-muted)" }}>{idx + 1}</td>
                        <td style={{ padding: "0.6rem", fontWeight: 600, color: "var(--text-primary)" }}>
                          {p.productName}
                          {p.sku && <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "block" }}>{p.sku}</span>}
                        </td>
                        <td style={{ padding: "0.6rem" }}>
                          <Badge variant="default">{p.categoryName || "General"}</Badge>
                        </td>
                        <td style={{ padding: "0.6rem", textAlign: "right", fontWeight: 600 }}>
                          {p.totalQuantitySold ?? p.totalQuantity ?? 0}
                        </td>
                        <td style={{ padding: "0.6rem", textAlign: "right", color: "var(--text-secondary)" }}>
                          {formatIDR(p.averagePrice ?? 0)}
                        </td>
                        <td style={{ padding: "0.6rem", textAlign: "right", fontWeight: 700, color: "var(--accent-emerald)" }}>
                          {formatIDR(p.totalRevenue)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: PAYROLL REPORT VIEW                                               */}
      {/* ========================================================================= */}
      {activeTab === "payroll" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Payroll Filter Bar */}
          <Card style={{ padding: "1.25rem" }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "flex-end" }}>
              {/* Facility Filter */}
              <div style={{ minWidth: "200px" }}>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                  Assigned Facility
                </label>
                <select
                  style={{
                    width: "100%",
                    padding: "0.5rem 0.75rem",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: "var(--bg-surface-elevated)",
                    border: "1px solid var(--border-subtle)",
                    color: "var(--text-primary)",
                    fontSize: "0.85rem",
                  }}
                  value={payrollFacilityId}
                  onChange={(e) => setPayrollFacilityId(e.target.value)}
                >
                  <option value="ALL">All Facilities (Global)</option>
                  {facilities.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.facilityName} ({f.facilityCode})
                    </option>
                  ))}
                </select>
              </div>

              {/* Period Filter */}
              <div style={{ minWidth: "220px" }}>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                  Payroll Period
                </label>
                <select
                  style={{
                    width: "100%",
                    padding: "0.5rem 0.75rem",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: "var(--bg-surface-elevated)",
                    border: "1px solid var(--border-subtle)",
                    color: "var(--text-primary)",
                    fontSize: "0.85rem",
                  }}
                  value={payrollPeriodId}
                  onChange={(e) => setPayrollPeriodId(e.target.value)}
                >
                  <option value="ALL">All Periods</option>
                  {payrollPeriods.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({formatShortDate(p.startDate)} - {formatShortDate(p.endDate)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div style={{ minWidth: "150px" }}>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                  Record Status
                </label>
                <select
                  style={{
                    width: "100%",
                    padding: "0.5rem 0.75rem",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: "var(--bg-surface-elevated)",
                    border: "1px solid var(--border-subtle)",
                    color: "var(--text-primary)",
                    fontSize: "0.85rem",
                  }}
                  value={payrollStatus}
                  onChange={(e) => setPayrollStatus(e.target.value)}
                >
                  <option value="ALL">All Statuses</option>
                  <option value="PAID">PAID (Disbursed)</option>
                  <option value="APPROVED">APPROVED (Ready)</option>
                  <option value="PENDING">PENDING (Review)</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>

              {/* Search Employee */}
              <div style={{ flex: 1, minWidth: "200px" }}>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                  Employee Search
                </label>
                <Input
                  placeholder="Search staff name or NIK..."
                  value={payrollSearch}
                  onChange={(e) => setPayrollSearch(e.target.value)}
                />
              </div>

              <Button size="sm" onClick={loadSalaryRecords} disabled={payrollLoading}>
                {payrollLoading ? "Loading..." : "🔄 Refresh"}
              </Button>
            </div>
          </Card>

          {/* Payroll Metric Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "1rem" }}>
            <Card style={{ padding: "1.25rem" }}>
              <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 600 }}>TOTAL NET PAYOUT</span>
              <h3 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--accent-emerald)", marginTop: "0.25rem" }}>
                {formatIDR(payrollTotals.totalNet)}
              </h3>
              <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>Disbursement liability</p>
            </Card>

            <Card style={{ padding: "1.25rem" }}>
              <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 600 }}>BASIC SALARY POOL</span>
              <h3 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--accent-cyan)", marginTop: "0.25rem" }}>
                {formatIDR(payrollTotals.totalBasic)}
              </h3>
              <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>Base contract wages</p>
            </Card>

            <Card style={{ padding: "1.25rem" }}>
              <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 600 }}>ALLOWANCES ADDED</span>
              <h3 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--primary)", marginTop: "0.25rem" }}>
                +{formatIDR(payrollTotals.totalAllowances)}
              </h3>
              <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>Bonuses, transport, overtime</p>
            </Card>

            <Card style={{ padding: "1.25rem" }}>
              <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 600 }}>DEDUCTIONS / WITHHOLDING</span>
              <h3 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--accent-rose)", marginTop: "0.25rem" }}>
                -{formatIDR(payrollTotals.totalDeductions)}
              </h3>
              <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>Taxes, BPJS, fines</p>
            </Card>

            <Card style={{ padding: "1.25rem" }}>
              <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 600 }}>STAFF HEADCOUNT</span>
              <h3 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)", marginTop: "0.25rem" }}>
                {payrollTotals.employeeCount}
              </h3>
              <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
                {payrollTotals.paidCount} Paid • {payrollTotals.pendingCount} Pending
              </p>
            </Card>
          </div>

          {/* Payroll Records Table */}
          <Card style={{ padding: "1.25rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <div>
                <h4 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)" }}>Employee Compensation Records</h4>
                <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                  Facility-filtered salary slips and net compensation breakdown
                </p>
              </div>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem", textAlign: "left" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-subtle)", color: "var(--text-muted)" }}>
                    <th style={{ padding: "0.6rem" }}>Employee Name</th>
                    <th style={{ padding: "0.6rem" }}>Facility / Position</th>
                    <th style={{ padding: "0.6rem" }}>Period</th>
                    <th style={{ padding: "0.6rem", textAlign: "right" }}>Basic Salary</th>
                    <th style={{ padding: "0.6rem", textAlign: "right" }}>Allowances</th>
                    <th style={{ padding: "0.6rem", textAlign: "right" }}>Deductions</th>
                    <th style={{ padding: "0.6rem", textAlign: "right" }}>Net Payout</th>
                    <th style={{ padding: "0.6rem", textAlign: "center" }}>Status</th>
                    <th style={{ padding: "0.6rem", textAlign: "center" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {payrollLoading ? (
                    <tr>
                      <td colSpan={9} style={{ padding: "2.5rem", textAlign: "center", color: "var(--text-muted)" }}>
                        Loading payroll records...
                      </td>
                    </tr>
                  ) : salaryRecords.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ padding: "2.5rem", textAlign: "center", color: "var(--text-muted)" }}>
                        No payroll records found matching the selected filters.
                      </td>
                    </tr>
                  ) : (
                    salaryRecords.map((r) => {
                      const emp = r.employee;
                      const profile = emp?.profile;
                      const empName = profile ? `${profile.firstName} ${profile.lastName || ""}`.trim() : `Employee #${r.employeeId}`;
                      const posName = emp?.position?.name || "Staff";
                      const facName =
                        emp?.facility?.facilityName ||
                        (emp as any)?.facilityEmployees?.[0]?.facility?.facilityName ||
                        "Unassigned";

                      return (
                        <tr key={r.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                          <td style={{ padding: "0.6rem" }}>
                            <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{empName}</div>
                            {(profile as any)?.email && <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{(profile as any).email}</div>}
                          </td>
                          <td style={{ padding: "0.6rem" }}>
                            <div style={{ fontSize: "0.75rem", color: "var(--text-primary)" }}>{posName}</div>
                            <Badge variant="default" style={{ fontSize: "0.68rem" }}>📍 {facName}</Badge>
                          </td>
                          <td style={{ padding: "0.6rem" }}>
                            <div style={{ fontSize: "0.78rem", color: "var(--text-primary)" }}>{r.period?.name || `Period #${r.periodId}`}</div>
                            {r.period?.endDate && (
                              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                                {formatShortDate(r.period.endDate)}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: "0.6rem", textAlign: "right" }}>
                            {formatIDR(r.basicSalary)}
                          </td>
                          <td style={{ padding: "0.6rem", textAlign: "right", color: "var(--accent-emerald)" }}>
                            +{formatIDR(r.totalAllowances)}
                          </td>
                          <td style={{ padding: "0.6rem", textAlign: "right", color: "var(--accent-rose)" }}>
                            -{formatIDR(r.totalDeductions)}
                          </td>
                          <td style={{ padding: "0.6rem", textAlign: "right", fontWeight: 700, color: "var(--text-primary)" }}>
                            {formatIDR(r.netSalary)}
                          </td>
                          <td style={{ padding: "0.6rem", textAlign: "center" }}>
                            <Badge variant={r.status === "PAID" ? "success" : r.status === "APPROVED" ? "info" : "warning"}>
                              {r.status}
                            </Badge>
                          </td>
                          <td style={{ padding: "0.6rem", textAlign: "center" }}>
                            <Button size="sm" variant="ghost" onClick={() => setSelectedSalaryRecord(r)}>
                              🔍 Details
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: EQUIPMENT REPORT VIEW                                             */}
      {/* ========================================================================= */}
      {activeTab === "equipment" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Equipment Filter Bar */}
          <Card style={{ padding: "1.25rem" }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "flex-end" }}>
              {/* Facility Filter */}
              <div style={{ minWidth: "220px" }}>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                  Location / Facility
                </label>
                <select
                  style={{
                    width: "100%",
                    padding: "0.5rem 0.75rem",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: "var(--bg-surface-elevated)",
                    border: "1px solid var(--border-subtle)",
                    color: "var(--text-primary)",
                    fontSize: "0.85rem",
                  }}
                  value={equipmentFacilityId}
                  onChange={(e) => setEquipmentFacilityId(e.target.value)}
                >
                  <option value="ALL">All Stationed & Master Equipment</option>
                  {facilities.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.facilityName} ({f.facilityCode})
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div style={{ minWidth: "180px" }}>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                  Operational Status
                </label>
                <select
                  style={{
                    width: "100%",
                    padding: "0.5rem 0.75rem",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: "var(--bg-surface-elevated)",
                    border: "1px solid var(--border-subtle)",
                    color: "var(--text-primary)",
                    fontSize: "0.85rem",
                  }}
                  value={equipmentStatus}
                  onChange={(e) => setEquipmentStatus(e.target.value)}
                >
                  <option value="ALL">All Operational Statuses</option>
                  <option value="ACTIVE">ACTIVE (🟢 Operational)</option>
                  <option value="MAINTENANCE">MAINTENANCE (🔴 Repair)</option>
                  <option value="STANDBY">STANDBY (🟡 Reserve)</option>
                  <option value="RETIRED">RETIRED (⚪ Out of service)</option>
                </select>
              </div>

              {/* Search Query */}
              <div style={{ flex: 1, minWidth: "200px" }}>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                  Search Equipment
                </label>
                <Input
                  placeholder="Search machinery, tool code, model..."
                  value={equipmentSearch}
                  onChange={(e) => setEquipmentSearch(e.target.value)}
                />
              </div>

              <Button size="sm" onClick={loadEquipmentData} disabled={equipmentLoading}>
                {equipmentLoading ? "Loading..." : "🔄 Refresh"}
              </Button>
            </div>
          </Card>

          {/* Equipment Metrics */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "1rem" }}>
            <Card style={{ padding: "1.25rem" }}>
              <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 600 }}>TOTAL ASSET VALUE</span>
              <h3 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--accent-emerald)", marginTop: "0.25rem" }}>
                {formatIDR(equipmentTotals.totalValue)}
              </h3>
              <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>Acquisition / replacement base</p>
            </Card>

            <Card style={{ padding: "1.25rem" }}>
              <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 600 }}>TOTAL UNITS STATIONED</span>
              <h3 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--accent-cyan)", marginTop: "0.25rem" }}>
                {equipmentTotals.totalUnits}
              </h3>
              <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>Tracked physical assets</p>
            </Card>

            <Card style={{ padding: "1.25rem" }}>
              <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 600 }}>OPERATIONAL (ACTIVE)</span>
              <h3 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--accent-emerald)", marginTop: "0.25rem" }}>
                {equipmentTotals.activeUnits}
              </h3>
              <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>In active daily workflow</p>
            </Card>

            <Card style={{ padding: "1.25rem" }}>
              <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 600 }}>IN MAINTENANCE / REPAIR</span>
              <h3 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--accent-rose)", marginTop: "0.25rem" }}>
                {equipmentTotals.maintenanceUnits}
              </h3>
              <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>Offline for service</p>
            </Card>

            <Card style={{ padding: "1.25rem" }}>
              <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 600 }}>STANDBY / RESERVE</span>
              <h3 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--accent-amber)", marginTop: "0.25rem" }}>
                {equipmentTotals.standbyUnits}
              </h3>
              <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>Available for deployment</p>
            </Card>
          </div>

          {/* Equipment Table */}
          <Card style={{ padding: "1.25rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <div>
                <h4 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)" }}>Equipment Assets & Fleet Directory</h4>
                <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                  Stationed equipment items, model specifications, and operational readiness
                </p>
              </div>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem", textAlign: "left" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-subtle)", color: "var(--text-muted)" }}>
                    <th style={{ padding: "0.6rem" }}>Code & Name</th>
                    <th style={{ padding: "0.6rem" }}>Brand & Model</th>
                    <th style={{ padding: "0.6rem" }}>Facility & Location</th>
                    <th style={{ padding: "0.6rem", textAlign: "center" }}>Qty</th>
                    <th style={{ padding: "0.6rem", textAlign: "right" }}>Unit Price</th>
                    <th style={{ padding: "0.6rem", textAlign: "right" }}>Asset Valuation</th>
                    <th style={{ padding: "0.6rem", textAlign: "center" }}>Status</th>
                    <th style={{ padding: "0.6rem", textAlign: "center" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {equipmentLoading ? (
                    <tr>
                      <td colSpan={8} style={{ padding: "2.5rem", textAlign: "center", color: "var(--text-muted)" }}>
                        Loading equipment fleet records...
                      </td>
                    </tr>
                  ) : (equipmentFacilityId !== "ALL" ? stationedEquipments : (stationedEquipments.length > 0 ? stationedEquipments : allEquipments)).length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ padding: "2.5rem", textAlign: "center", color: "var(--text-muted)" }}>
                        No equipment records found matching the filters.
                      </td>
                    </tr>
                  ) : (
                    (equipmentFacilityId !== "ALL" ? stationedEquipments : (stationedEquipments.length > 0 ? stationedEquipments : allEquipments)).map((row: any, idx: number) => {
                      const isStationed = Boolean(row.equipmentEntity);
                      const eq = isStationed ? row.equipmentEntity : row;
                      const q = isStationed ? (row.quantity || 1) : 1;
                      const price = Number(eq?.unitPrice || 0);
                      const statusVal = isStationed ? (row.status || "ACTIVE") : "ACTIVE";
                      const facObj = isStationed ? facilities.find((f) => f.id === row.facilityId) : null;
                      const secObj = isStationed ? row.section : null;

                      return (
                        <tr key={row.id || idx} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                          <td style={{ padding: "0.6rem" }}>
                            <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{eq?.name || "Equipment"}</div>
                            {eq?.code && <div style={{ fontSize: "0.72rem", color: "var(--accent-cyan)", fontFamily: "monospace" }}>{eq.code}</div>}
                          </td>
                          <td style={{ padding: "0.6rem" }}>
                            <div style={{ color: "var(--text-primary)" }}>{eq?.brand?.name || "Generic"}</div>
                            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{eq?.model?.name || "Standard"}</div>
                          </td>
                          <td style={{ padding: "0.6rem" }}>
                            <Badge variant="default">
                              📍 {facObj?.facilityName || "Central / Unassigned"}
                            </Badge>
                            {secObj && (
                              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
                                Section: {secObj.sectionName} ({secObj.sectionCode})
                              </div>
                            )}
                          </td>
                          <td style={{ padding: "0.6rem", textAlign: "center", fontWeight: 600 }}>
                            {q}
                          </td>
                          <td style={{ padding: "0.6rem", textAlign: "right", color: "var(--text-secondary)" }}>
                            {formatIDR(price)}
                          </td>
                          <td style={{ padding: "0.6rem", textAlign: "right", fontWeight: 700, color: "var(--accent-emerald)" }}>
                            {formatIDR(price * q)}
                          </td>
                          <td style={{ padding: "0.6rem", textAlign: "center" }}>
                            <Badge
                              variant={
                                statusVal === "ACTIVE"
                                  ? "success"
                                  : statusVal === "MAINTENANCE"
                                  ? "danger"
                                  : statusVal === "STANDBY"
                                  ? "warning"
                                  : "default"
                              }
                            >
                              {statusVal}
                            </Badge>
                          </td>
                          <td style={{ padding: "0.6rem", textAlign: "center" }}>
                            <Button size="sm" variant="ghost" onClick={() => setSelectedEquipmentDetail({ row, eq })}>
                              🔍 Details
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: PRODUCT STOCK REPORT VIEW                                         */}
      {/* ========================================================================= */}
      {activeTab === "products" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Product Filter Bar */}
          <Card style={{ padding: "1.25rem" }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "flex-end" }}>
              {/* Facility Filter */}
              <div style={{ minWidth: "200px" }}>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                  Storage Facility
                </label>
                <select
                  style={{
                    width: "100%",
                    padding: "0.5rem 0.75rem",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: "var(--bg-surface-elevated)",
                    border: "1px solid var(--border-subtle)",
                    color: "var(--text-primary)",
                    fontSize: "0.85rem",
                  }}
                  value={productFacilityId}
                  onChange={(e) => setProductFacilityId(e.target.value)}
                >
                  <option value="ALL">All Facilities (Global Stock)</option>
                  {facilities.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.facilityName} ({f.facilityCode})
                    </option>
                  ))}
                </select>
              </div>

              {/* Category Filter */}
              <div style={{ minWidth: "180px" }}>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                  Product Category
                </label>
                <select
                  style={{
                    width: "100%",
                    padding: "0.5rem 0.75rem",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: "var(--bg-surface-elevated)",
                    border: "1px solid var(--border-subtle)",
                    color: "var(--text-primary)",
                    fontSize: "0.85rem",
                  }}
                  value={productCategoryFilter}
                  onChange={(e) => setProductCategoryFilter(e.target.value)}
                >
                  <option value="ALL">All Categories</option>
                  {productCategories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Stock Status Filter */}
              <div style={{ minWidth: "160px" }}>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                  Stock Level
                </label>
                <select
                  style={{
                    width: "100%",
                    padding: "0.5rem 0.75rem",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: "var(--bg-surface-elevated)",
                    border: "1px solid var(--border-subtle)",
                    color: "var(--text-primary)",
                    fontSize: "0.85rem",
                  }}
                  value={productStockFilter}
                  onChange={(e) => setProductStockFilter(e.target.value as any)}
                >
                  <option value="all">All Levels</option>
                  <option value="instock">🟢 In Stock (Healthy)</option>
                  <option value="lowstock">🟡 Low Stock Warning</option>
                  <option value="outofstock">🔴 Out of Stock</option>
                </select>
              </div>

              {/* Search Query */}
              <div style={{ flex: 1, minWidth: "200px" }}>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                  Search Catalog
                </label>
                <Input
                  placeholder="Search product name, SKU, barcode..."
                  value={productSearchQuery}
                  onChange={(e) => setProductSearchQuery(e.target.value)}
                />
              </div>

              <Button size="sm" onClick={loadProductData} disabled={productLoading}>
                {productLoading ? "Loading..." : "🔄 Refresh"}
              </Button>
            </div>
          </Card>

          {/* Product Metrics */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "1rem" }}>
            <Card style={{ padding: "1.25rem" }}>
              <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 600 }}>INVENTORY VALUATION</span>
              <h3 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--accent-emerald)", marginTop: "0.25rem" }}>
                {formatIDR(productTotals.totalValuation)}
              </h3>
              <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>Stock value at retail price</p>
            </Card>

            <Card style={{ padding: "1.25rem" }}>
              <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 600 }}>TOTAL CATALOG SKUs</span>
              <h3 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--accent-cyan)", marginTop: "0.25rem" }}>
                {productTotals.totalSKUs}
              </h3>
              <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>Active products registered</p>
            </Card>

            <Card style={{ padding: "1.25rem" }}>
              <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 600 }}>HEALTHY STOCK ITEMS</span>
              <h3 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--accent-emerald)", marginTop: "0.25rem" }}>
                {productTotals.healthyCount}
              </h3>
              <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>Sufficient inventory levels</p>
            </Card>

            <Card style={{ padding: "1.25rem" }}>
              <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 600 }}>LOW STOCK WARNINGS</span>
              <h3 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--accent-amber)", marginTop: "0.25rem" }}>
                {productTotals.lowStockCount}
              </h3>
              <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>At or below min threshold</p>
            </Card>

            <Card style={{ padding: "1.25rem" }}>
              <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 600 }}>OUT OF STOCK</span>
              <h3 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--accent-rose)", marginTop: "0.25rem" }}>
                {productTotals.outOfStockCount}
              </h3>
              <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>Zero inventory in stock</p>
            </Card>
          </div>

          {/* Product Stock Table */}
          <Card style={{ padding: "1.25rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <div>
                <h4 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)" }}>Product Inventory Stock Levels</h4>
                <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                  Current inventory balance, min thresholds, and estimated stock value
                </p>
              </div>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem", textAlign: "left" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-subtle)", color: "var(--text-muted)" }}>
                    <th style={{ padding: "0.6rem" }}>Product Name & SKU</th>
                    <th style={{ padding: "0.6rem" }}>Category</th>
                    <th style={{ padding: "0.6rem", textAlign: "right" }}>Current Stock</th>
                    <th style={{ padding: "0.6rem", textAlign: "right" }}>Min Stock</th>
                    <th style={{ padding: "0.6rem", textAlign: "right" }}>Retail Price</th>
                    <th style={{ padding: "0.6rem", textAlign: "right" }}>Stock Valuation</th>
                    <th style={{ padding: "0.6rem", textAlign: "center" }}>Stock Status</th>
                    <th style={{ padding: "0.6rem", textAlign: "center" }}>POS Ready</th>
                  </tr>
                </thead>
                <tbody>
                  {productLoading ? (
                    <tr>
                      <td colSpan={8} style={{ padding: "2.5rem", textAlign: "center", color: "var(--text-muted)" }}>
                        Loading catalog products...
                      </td>
                    </tr>
                  ) : filteredCatalogProducts.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ padding: "2.5rem", textAlign: "center", color: "var(--text-muted)" }}>
                        No products match the selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredCatalogProducts.map((p) => {
                      const stock = Number(p.currentStock || 0);
                      const minStock = Number(p.minStock || 0);
                      const price = Number(p.retailPrice || 0);
                      const isLow = stock > 0 && stock <= minStock;
                      const isOut = stock <= 0;

                      return (
                        <tr key={p.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                          <td style={{ padding: "0.6rem" }}>
                            <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{p.productName}</div>
                            <div style={{ display: "flex", gap: "0.4rem", fontSize: "0.72rem", color: "var(--text-muted)" }}>
                              {p.sku && <span>SKU: {p.sku}</span>}
                              {p.barcode && <span>• 🏷️ {p.barcode}</span>}
                            </div>
                          </td>
                          <td style={{ padding: "0.6rem" }}>
                            <Badge variant="default">{p.category?.categoryName || "General"}</Badge>
                          </td>
                          <td style={{ padding: "0.6rem", textAlign: "right", fontWeight: 700, color: isOut ? "var(--accent-rose)" : isLow ? "var(--accent-amber)" : "var(--accent-emerald)" }}>
                            {stock} {p.unitLabel || "pcs"}
                          </td>
                          <td style={{ padding: "0.6rem", textAlign: "right", color: "var(--text-muted)" }}>
                            {minStock}
                          </td>
                          <td style={{ padding: "0.6rem", textAlign: "right", color: "var(--text-secondary)" }}>
                            {formatIDR(price)}
                          </td>
                          <td style={{ padding: "0.6rem", textAlign: "right", fontWeight: 700, color: "var(--accent-emerald)" }}>
                            {formatIDR(stock * price)}
                          </td>
                          <td style={{ padding: "0.6rem", textAlign: "center" }}>
                            <Badge variant={isOut ? "danger" : isLow ? "warning" : "success"}>
                              {isOut ? "OUT OF STOCK" : isLow ? "LOW STOCK" : "IN STOCK"}
                            </Badge>
                          </td>
                          <td style={{ padding: "0.6rem", textAlign: "center" }}>
                            <Badge variant={p.isTradeable !== false ? "success" : "default"} style={{ fontSize: "0.68rem" }}>
                              {p.isTradeable !== false ? "Tradeable" : "Internal"}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: FACILITY STOCK & EQUIPMENT OPNAME AUDIT FORM                      */}
      {/* ========================================================================= */}
      {activeTab === "opname" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Opname Control Banner */}
          <Card style={{ padding: "1.25rem", backgroundColor: "var(--bg-surface-elevated)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
              <div>
                <h3 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--text-primary)" }}>
                  📋 Physical Stocktake & Equipment Opname
                </h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.82rem", marginTop: "0.2rem" }}>
                  Conduct physical count audits for products and equipment stationed in a facility, identify shrinkage or surplus, and commit adjustments.
                </p>
              </div>

              {/* Mode Toggle */}
              <div style={{ display: "flex", gap: "0.3rem", backgroundColor: "var(--bg-primary)", padding: "0.25rem", borderRadius: "var(--radius-md)" }}>
                <button
                  onClick={() => setOpnameMode("stock")}
                  style={{
                    padding: "0.4rem 0.85rem",
                    borderRadius: "var(--radius-sm)",
                    border: "none",
                    backgroundColor: opnameMode === "stock" ? "var(--primary)" : "transparent",
                    color: opnameMode === "stock" ? "#ffffff" : "var(--text-secondary)",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  📦 Product Stock Opname
                </button>
                <button
                  onClick={() => setOpnameMode("equipment")}
                  style={{
                    padding: "0.4rem 0.85rem",
                    borderRadius: "var(--radius-sm)",
                    border: "none",
                    backgroundColor: opnameMode === "equipment" ? "var(--primary)" : "transparent",
                    color: opnameMode === "equipment" ? "#ffffff" : "var(--text-secondary)",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  🚜 Equipment Opname
                </button>
              </div>
            </div>

            {/* Opname Form Header Inputs */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.85rem", marginTop: "1.25rem", borderTop: "1px solid var(--border-subtle)", paddingTop: "1rem" }}>
              {/* Facility Selector */}
              <div>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                  Audited Facility *
                </label>
                <select
                  style={{
                    width: "100%",
                    padding: "0.5rem 0.75rem",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: "var(--bg-surface)",
                    border: "1px solid var(--border-subtle)",
                    color: "var(--text-primary)",
                    fontSize: "0.85rem",
                  }}
                  value={opnameFacilityId}
                  onChange={(e) => setOpnameFacilityId(e.target.value ? Number(e.target.value) : "")}
                >
                  <option value="">-- Choose Facility --</option>
                  {facilities.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.facilityName} ({f.facilityCode}) [{f.type}]
                    </option>
                  ))}
                </select>
              </div>

              {/* Section Filter */}
              <div>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                  Storage Section (Optional)
                </label>
                <select
                  style={{
                    width: "100%",
                    padding: "0.5rem 0.75rem",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: "var(--bg-surface)",
                    border: "1px solid var(--border-subtle)",
                    color: "var(--text-primary)",
                    fontSize: "0.85rem",
                  }}
                  value={opnameSectionId}
                  onChange={(e) => setOpnameSectionId(e.target.value ? Number(e.target.value) : "")}
                  disabled={opnameSections.length === 0}
                >
                  <option value="">All Facility Sections / Zones</option>
                  {opnameSections.map((sec) => (
                    <option key={sec.id} value={sec.id}>
                      {sec.sectionName} ({sec.sectionCode}) [{sec.type}]
                    </option>
                  ))}
                </select>
              </div>

              {/* Opname Reference Code */}
              <div>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                  Opname Reference Code
                </label>
                <Input
                  value={opnameRefCode}
                  onChange={(e) => setOpnameRefCode(e.target.value.toUpperCase())}
                  placeholder="e.g. OPN-202610-WH1"
                />
              </div>

              {/* Opname Date */}
              <div>
                <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "0.3rem" }}>
                  Audit Date
                </label>
                <Input
                  type="date"
                  value={opnameDate}
                  onChange={(e) => setOpnameDate(e.target.value)}
                />
              </div>
            </div>
          </Card>

          {opnameSuccessMsg && (
            <div style={{ padding: "0.75rem 1rem", backgroundColor: "rgba(16, 185, 129, 0.15)", color: "var(--accent-emerald)", borderRadius: "var(--radius-md)", fontSize: "0.85rem", fontWeight: 600 }}>
              ✓ {opnameSuccessMsg}
            </div>
          )}

          {/* ========================================================================= */}
          {/* 5A: PRODUCT STOCK OPNAME FORM & TABLE                                    */}
          {/* ========================================================================= */}
          {opnameMode === "stock" && (
            <Card style={{ padding: "1.25rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.75rem" }}>
                <div>
                  <h4 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)" }}>
                    Physical Inventory Count Sheet
                  </h4>
                  <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                    Enter physically counted quantities to compute shrinkage or surplus discrepancies
                  </p>
                </div>

                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
                  <Input
                    placeholder="Search item in opname..."
                    value={opnameSearch}
                    onChange={(e) => setOpnameSearch(e.target.value)}
                    style={{ width: "200px" }}
                  />

                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      const newMap: any = {};
                      opnameProducts.forEach((p) => {
                        newMap[p.id] = { physicalCount: String(p.currentStock ?? 0), notes: "Count verified" };
                      });
                      setStockCounts(newMap);
                    }}
                  >
                    ⚡ Match All with System
                  </Button>

                  <Button
                    size="sm"
                    variant={opnameOnlyDiscrepancies ? "primary" : "secondary"}
                    onClick={() => setOpnameOnlyDiscrepancies(!opnameOnlyDiscrepancies)}
                  >
                    {opnameOnlyDiscrepancies ? "Show All Items" : "🔍 Only Discrepancies"}
                  </Button>
                </div>
              </div>

              {/* Table of items to count */}
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem", textAlign: "left" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border-subtle)", color: "var(--text-muted)" }}>
                      <th style={{ padding: "0.6rem" }}>Product & SKU</th>
                      <th style={{ padding: "0.6rem", textAlign: "right" }}>System Stock</th>
                      <th style={{ padding: "0.6rem", width: "130px", textAlign: "center" }}>Physical Count *</th>
                      <th style={{ padding: "0.6rem", textAlign: "center" }}>Discrepancy (±)</th>
                      <th style={{ padding: "0.6rem", textAlign: "right" }}>Variance Value</th>
                      <th style={{ padding: "0.6rem" }}>Discrepancy Notes / Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {opnameLoadingItems ? (
                      <tr>
                        <td colSpan={6} style={{ padding: "2.5rem", textAlign: "center", color: "var(--text-muted)" }}>
                          Loading facility inventory items...
                        </td>
                      </tr>
                    ) : opnameProducts.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ padding: "2.5rem", textAlign: "center", color: "var(--text-muted)" }}>
                          {opnameFacilityId === "" ? "Please select a facility above." : "No products found in this facility."}
                        </td>
                      </tr>
                    ) : (
                      opnameProducts
                        .filter((p) => {
                          const q = opnameSearch.toLowerCase().trim();
                          if (q && !p.productName.toLowerCase().includes(q) && !(p.sku && p.sku.toLowerCase().includes(q))) {
                            return false;
                          }
                          if (opnameOnlyDiscrepancies) {
                            const entered = Number(stockCounts[p.id]?.physicalCount ?? p.currentStock ?? 0);
                            const system = Number(p.currentStock ?? 0);
                            if (entered === system) return false;
                          }
                          return true;
                        })
                        .map((p) => {
                          const system = Number(p.currentStock ?? 0);
                          const entry = stockCounts[p.id] || { physicalCount: String(system), notes: "" };
                          const physical = entry.physicalCount === "" ? system : Number(entry.physicalCount);
                          const diff = physical - system;
                          const price = Number(p.retailPrice || 0);
                          const varianceVal = diff * price;

                          return (
                            <tr key={p.id} style={{ borderBottom: "1px solid var(--border-subtle)", backgroundColor: diff !== 0 ? "rgba(244, 63, 94, 0.04)" : undefined }}>
                              <td style={{ padding: "0.6rem" }}>
                                <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{p.productName}</div>
                                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                                  {p.sku || `#${p.id}`} • {p.category?.categoryName || "General"}
                                </div>
                              </td>
                              <td style={{ padding: "0.6rem", textAlign: "right", fontWeight: 600 }}>
                                {system} {p.unitLabel || "pcs"}
                              </td>
                              <td style={{ padding: "0.6rem", textAlign: "center" }}>
                                <Input
                                  type="number"
                                  min="0"
                                  value={entry.physicalCount}
                                  onChange={(e) => {
                                    setStockCounts({
                                      ...stockCounts,
                                      [p.id]: { ...entry, physicalCount: e.target.value },
                                    });
                                  }}
                                  style={{
                                    width: "90px",
                                    textAlign: "center",
                                    padding: "0.3rem",
                                    borderColor: diff !== 0 ? "var(--accent-rose)" : undefined,
                                  }}
                                />
                              </td>
                              <td style={{ padding: "0.6rem", textAlign: "center" }}>
                                <Badge
                                  variant={diff === 0 ? "default" : diff > 0 ? "info" : "danger"}
                                  style={{ fontWeight: 700 }}
                                >
                                  {diff > 0 ? `+${diff}` : diff}
                                </Badge>
                              </td>
                              <td style={{ padding: "0.6rem", textAlign: "right", fontWeight: 600, color: diff === 0 ? "var(--text-muted)" : diff > 0 ? "var(--accent-cyan)" : "var(--accent-rose)" }}>
                                {formatIDR(varianceVal)}
                              </td>
                              <td style={{ padding: "0.6rem" }}>
                                <Input
                                  placeholder={diff !== 0 ? "e.g. Broken package / count loss" : "Audit notes (optional)"}
                                  value={entry.notes}
                                  onChange={(e) => {
                                    setStockCounts({
                                      ...stockCounts,
                                      [p.id]: { ...entry, notes: e.target.value },
                                    });
                                  }}
                                  style={{ fontSize: "0.78rem", padding: "0.3rem 0.5rem" }}
                                />
                              </td>
                            </tr>
                          );
                        })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Submit Stock Opname Button */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1.5rem", borderTop: "1px solid var(--border-subtle)", paddingTop: "1rem" }}>
                <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                  Total Items Audited: <strong>{opnameProducts.length}</strong>
                </div>

                <Button
                  onClick={handleStockOpnameSubmit}
                  disabled={opnameSubmitting || opnameProducts.length === 0}
                  variant="primary"
                >
                  {opnameSubmitting ? "Committing Opname Adjustments..." : "💾 Commit Stock Opname & Adjust Inventory"}
                </Button>
              </div>
            </Card>
          )}

          {/* ========================================================================= */}
          {/* 5B: EQUIPMENT OPNAME FORM & TABLE                                         */}
          {/* ========================================================================= */}
          {opnameMode === "equipment" && (
            <Card style={{ padding: "1.25rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.75rem" }}>
                <div>
                  <h4 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)" }}>
                    Equipment Physical Audit & Condition Verification
                  </h4>
                  <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                    Verify stationed quantity, operational readiness status, and section placement
                  </p>
                </div>

                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    const newMap: any = {};
                    opnameEquipments.forEach((eq) => {
                      newMap[eq.id] = {
                        physicalCount: String(eq.quantity || 1),
                        status: eq.status || "ACTIVE",
                        sectionId: eq.sectionId || "",
                        notes: "Verified operational",
                        verified: true,
                      };
                    });
                    setEquipmentCounts(newMap);
                  }}
                >
                  ⚡ Mark All Verified (Operational)
                </Button>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem", textAlign: "left" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border-subtle)", color: "var(--text-muted)" }}>
                      <th style={{ padding: "0.6rem" }}>Equipment & Model</th>
                      <th style={{ padding: "0.6rem" }}>Section Location</th>
                      <th style={{ padding: "0.6rem", textAlign: "right" }}>Registered Qty</th>
                      <th style={{ padding: "0.6rem", width: "110px", textAlign: "center" }}>Audited Qty</th>
                      <th style={{ padding: "0.6rem" }}>Operational Status</th>
                      <th style={{ padding: "0.6rem", textAlign: "center" }}>Verified</th>
                      <th style={{ padding: "0.6rem" }}>Condition / Audit Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {opnameLoadingItems ? (
                      <tr>
                        <td colSpan={7} style={{ padding: "2.5rem", textAlign: "center", color: "var(--text-muted)" }}>
                          Loading facility equipment items...
                        </td>
                      </tr>
                    ) : opnameEquipments.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ padding: "2.5rem", textAlign: "center", color: "var(--text-muted)" }}>
                          {opnameFacilityId === "" ? "Please select a facility above." : "No equipment stationed at this facility."}
                        </td>
                      </tr>
                    ) : (
                      opnameEquipments.map((eq) => {
                        const entry = equipmentCounts[eq.id] || {
                          physicalCount: String(eq.quantity || 1),
                          status: eq.status || "ACTIVE",
                          sectionId: eq.sectionId || "",
                          notes: eq.notes || "",
                          verified: true,
                        };

                        return (
                          <tr key={eq.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                            <td style={{ padding: "0.6rem" }}>
                              <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{eq.equipmentEntity?.name}</div>
                              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                                {eq.equipmentEntity?.code && <span style={{ fontFamily: "monospace" }}>{eq.equipmentEntity.code} • </span>}
                                {eq.equipmentEntity?.brand?.name || "Generic"}
                              </div>
                            </td>
                            <td style={{ padding: "0.6rem" }}>
                              <select
                                style={{
                                  padding: "0.3rem 0.5rem",
                                  borderRadius: "var(--radius-sm)",
                                  backgroundColor: "var(--bg-surface)",
                                  border: "1px solid var(--border-subtle)",
                                  color: "var(--text-primary)",
                                  fontSize: "0.78rem",
                                }}
                                value={entry.sectionId}
                                onChange={(e) => {
                                  setEquipmentCounts({
                                    ...equipmentCounts,
                                    [eq.id]: { ...entry, sectionId: e.target.value ? Number(e.target.value) : "" },
                                  });
                                }}
                              >
                                <option value="">-- General Facility --</option>
                                {opnameSections.map((sec) => (
                                  <option key={sec.id} value={sec.id}>
                                    {sec.sectionName} ({sec.sectionCode})
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td style={{ padding: "0.6rem", textAlign: "right", fontWeight: 600 }}>
                              {eq.quantity || 1}
                            </td>
                            <td style={{ padding: "0.6rem", textAlign: "center" }}>
                              <Input
                                type="number"
                                min="0"
                                value={entry.physicalCount}
                                onChange={(e) => {
                                  setEquipmentCounts({
                                    ...equipmentCounts,
                                    [eq.id]: { ...entry, physicalCount: e.target.value },
                                  });
                                }}
                                style={{ width: "80px", textAlign: "center", padding: "0.3rem" }}
                              />
                            </td>
                            <td style={{ padding: "0.6rem" }}>
                              <select
                                style={{
                                  padding: "0.3rem 0.5rem",
                                  borderRadius: "var(--radius-sm)",
                                  backgroundColor: "var(--bg-surface)",
                                  border: "1px solid var(--border-subtle)",
                                  color: "var(--text-primary)",
                                  fontSize: "0.78rem",
                                }}
                                value={entry.status}
                                onChange={(e) => {
                                  setEquipmentCounts({
                                    ...equipmentCounts,
                                    [eq.id]: { ...entry, status: e.target.value },
                                  });
                                }}
                              >
                                <option value="ACTIVE">ACTIVE (🟢)</option>
                                <option value="MAINTENANCE">MAINTENANCE (🔴)</option>
                                <option value="STANDBY">STANDBY (🟡)</option>
                                <option value="RETIRED">RETIRED (⚪)</option>
                              </select>
                            </td>
                            <td style={{ padding: "0.6rem", textAlign: "center" }}>
                              <input
                                type="checkbox"
                                checked={entry.verified}
                                onChange={(e) => {
                                  setEquipmentCounts({
                                    ...equipmentCounts,
                                    [eq.id]: { ...entry, verified: e.target.checked },
                                  });
                                }}
                                style={{ cursor: "pointer", width: "16px", height: "16px" }}
                              />
                            </td>
                            <td style={{ padding: "0.6rem" }}>
                              <Input
                                placeholder="Audit notes / maintenance details..."
                                value={entry.notes}
                                onChange={(e) => {
                                  setEquipmentCounts({
                                    ...equipmentCounts,
                                    [eq.id]: { ...entry, notes: e.target.value },
                                  });
                                }}
                                style={{ fontSize: "0.78rem", padding: "0.3rem 0.5rem" }}
                              />
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Submit Equipment Opname Button */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1.5rem", borderTop: "1px solid var(--border-subtle)", paddingTop: "1rem" }}>
                <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                  Stationed Units Audited: <strong>{opnameEquipments.length}</strong>
                </div>

                <Button
                  onClick={handleEquipmentOpnameSubmit}
                  disabled={opnameSubmitting || opnameEquipments.length === 0}
                  variant="primary"
                >
                  {opnameSubmitting ? "Committing Equipment Audit..." : "💾 Commit Equipment Opname"}
                </Button>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* PAYSLIP DETAILS MODAL                                                    */}
      {/* ========================================================================= */}
      {selectedSalaryRecord && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: "1rem",
          }}
        >
          <Card style={{ width: "100%", maxWidth: "520px", padding: "1.75rem", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
              <div>
                <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--text-primary)" }}>
                  Employee Payslip Breakdown
                </h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.82rem" }}>
                  {selectedSalaryRecord.employee?.profile?.firstName} {selectedSalaryRecord.employee?.profile?.lastName} • {selectedSalaryRecord.period?.name}
                </p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setSelectedSalaryRecord(null)}>✕</Button>
            </div>

            <div style={{ backgroundColor: "var(--bg-surface)", padding: "1rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)", marginBottom: "1.25rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                <span style={{ color: "var(--text-secondary)" }}>Basic / Contract Salary:</span>
                <strong>{formatIDR(selectedSalaryRecord.basicSalary)}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem", color: "var(--accent-emerald)" }}>
                <span>Total Allowances:</span>
                <strong>+{formatIDR(selectedSalaryRecord.totalAllowances)}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem", color: "var(--accent-rose)" }}>
                <span>Total Deductions:</span>
                <strong>-{formatIDR(selectedSalaryRecord.totalDeductions)}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px dashed var(--border-subtle)", paddingTop: "0.5rem", fontSize: "1rem" }}>
                <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>Net Payout:</span>
                <span style={{ fontWeight: 700, color: "var(--accent-emerald)" }}>{formatIDR(selectedSalaryRecord.netSalary)}</span>
              </div>
            </div>

            {/* Components detail breakdown */}
            <h4 style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.5rem" }}>
              Itemized Allowances & Deductions
            </h4>
            {(!selectedSalaryRecord.details || selectedSalaryRecord.details.length === 0) ? (
              <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                No custom component breakdown recorded for this salary slip.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                {selectedSalaryRecord.details.map((d: any, idx: number) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "0.4rem 0.6rem",
                      borderRadius: "var(--radius-sm)",
                      backgroundColor: "var(--bg-surface)",
                      fontSize: "0.8rem",
                    }}
                  >
                    <span>{d.component?.name || "Component"}</span>
                    <strong style={{ color: d.component?.type === "deduction" ? "var(--accent-rose)" : "var(--accent-emerald)" }}>
                      {d.component?.type === "deduction" ? "-" : "+"}{formatIDR(d.amount)}
                    </strong>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "1.5rem" }}>
              <Button size="sm" variant="secondary" onClick={() => setSelectedSalaryRecord(null)}>
                Close
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* EQUIPMENT DETAILS MODAL                                                  */}
      {/* ========================================================================= */}
      {selectedEquipmentDetail && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: "1rem",
          }}
        >
          <Card style={{ width: "100%", maxWidth: "480px", padding: "1.75rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
              <div>
                <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--text-primary)" }}>
                  {selectedEquipmentDetail.eq?.name || "Equipment Details"}
                </h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.82rem" }}>
                  {selectedEquipmentDetail.eq?.code && `${selectedEquipmentDetail.eq.code} • `}
                  {selectedEquipmentDetail.eq?.brand?.name} {selectedEquipmentDetail.eq?.model?.name}
                </p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setSelectedEquipmentDetail(null)}>✕</Button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", fontSize: "0.82rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-secondary)" }}>Unit Price:</span>
                <strong>{formatIDR(selectedEquipmentDetail.eq?.unitPrice || 0)}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-secondary)" }}>Useful Life:</span>
                <strong>{selectedEquipmentDetail.eq?.usefulLifeYears || 5} Years</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-secondary)" }}>Depreciation Method:</span>
                <strong>{selectedEquipmentDetail.eq?.depreciationMethod || "STRAIGHT_LINE"}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-secondary)" }}>Current Book Value:</span>
                <strong style={{ color: "var(--accent-emerald)" }}>
                  {formatIDR(selectedEquipmentDetail.eq?.depreciation?.currentBookValue || selectedEquipmentDetail.eq?.unitPrice || 0)}
                </strong>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1.5rem" }}>
              <Button size="sm" variant="secondary" onClick={() => setSelectedEquipmentDetail(null)}>
                Close
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

export default function ReportsHubPage() {
  return (
    <Suspense fallback={<div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>Loading Reports Hub...</div>}>
      <ReportHubContent />
    </Suspense>
  );
}
