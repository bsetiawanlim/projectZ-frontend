"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/lib/authContext";
import { ALL_DASHBOARD_MODULES } from "@/lib/permissions";
import { useDevice } from "@/lib/useDevice";
import { productApi, customerApi, employeeApi, vendorApi, userApi, profileApi, equipmentApi, orderApi } from "@/lib/api";

interface ModuleStats {
  productsCount?: number | null;
  customersCount?: number | null;
  employeesCount?: number | null;
  vendorsCount?: number | null;
  usersCount?: number | null;
  personsCount?: number | null;
  inventoryCount?: number | null;
  lowStockCount?: number | null;
  equipmentCount?: number | null;
  purchaseOrdersCount?: number | null;
  pendingPurchaseOrdersCount?: number | null;
  recipesCount?: number | null;
}

export default function DashboardHomePage() {
  const { user, role, canAccess } = useAuth();
  const device = useDevice();
  const [stats, setStats] = useState<ModuleStats>({});
  const [statsLoading, setStatsLoading] = useState(true);

  // Compute authorized modules dynamically according to user's permissions
  const authorizedModules = useMemo(() => {
    return ALL_DASHBOARD_MODULES.filter((m) => m.id !== "dashboard" && m.isAuthorized(user, canAccess));
  }, [user, canAccess]);

  const canViewProducts = useMemo(() => {
    return Boolean(user?.isSuperAdmin || canAccess("product", "get") || canAccess("product", "get-all") || canAccess("product", "*"));
  }, [user, canAccess]);

  const canViewRecipes = useMemo(() => {
    return Boolean(
      user?.isSuperAdmin ||
      canAccess("product", "get") ||
      canAccess("product", "get-all") ||
      canAccess("product", "*") ||
      canAccess("product-recipe", "*") ||
      canAccess("recipe", "*")
    );
  }, [user, canAccess]);

  const canViewInventory = useMemo(() => {
    return Boolean(
      user?.isSuperAdmin ||
      canAccess("product", "inventory") ||
      canAccess("product", "get-all") ||
      canAccess("product", "*") ||
      canAccess("item", "*")
    );
  }, [user, canAccess]);

  const canViewEquipment = useMemo(() => {
    return Boolean(
      user?.isSuperAdmin ||
      canAccess("equipment", "get") ||
      canAccess("equipment", "get-all") ||
      canAccess("equipment", "*")
    );
  }, [user, canAccess]);

  const canViewPurchaseOrders = useMemo(() => {
    return Boolean(
      user?.isSuperAdmin ||
      canAccess("purchase-order", "get") ||
      canAccess("purchase-order", "get-all") ||
      canAccess("purchase-order", "*") ||
      canAccess("rfq", "*")
    );
  }, [user, canAccess]);

  const canViewPersons = useMemo(() => {
    return Boolean(
      user?.isSuperAdmin ||
      canAccess("profile", "read") ||
      canAccess("profile", "get-all") ||
      canAccess("profile", "get") ||
      canAccess("profile", "*") ||
      canAccess("customer", "*") ||
      canAccess("employee", "*") ||
      canAccess("user", "*")
    );
  }, [user, canAccess]);

  const canViewCustomers = useMemo(() => {
    return Boolean(user?.isSuperAdmin || canAccess("customer", "read") || canAccess("customer", "get-all") || canAccess("customer", "*"));
  }, [user, canAccess]);

  const canViewEmployees = useMemo(() => {
    return Boolean(user?.isSuperAdmin || canAccess("employee", "read") || canAccess("employee", "get-all") || canAccess("employee", "*"));
  }, [user, canAccess]);

  const canViewVendors = useMemo(() => {
    return Boolean(user?.isSuperAdmin || canAccess("vendor", "read") || canAccess("vendor", "get-all") || canAccess("vendor", "*"));
  }, [user, canAccess]);

  const canViewUsers = useMemo(() => {
    return Boolean(user?.isSuperAdmin || canAccess("user", "get-all") || canAccess("user", "*"));
  }, [user, canAccess]);

  const canViewPOS = useMemo(() => {
    return Boolean(user?.isSuperAdmin || canAccess("pos", "*") || canAccess("sales-order", "*") || canAccess("pos", "create") || canAccess("sales-order", "create"));
  }, [user, canAccess]);

  // Load KPI stats only for domains the user has permission to see
  useEffect(() => {
    let active = true;
    setStatsLoading(true);

    const promises: Promise<void>[] = [];
    const newStats: ModuleStats = {};

    if (canViewProducts) {
      promises.push(
        productApi
          .getProducts({ limit: 1 })
          .then((res: any) => {
            if (active) newStats.productsCount = res?.data?.length ?? res?.pagination?.total ?? 0;
          })
          .catch(() => {})
      );
    }

    if (canViewRecipes) {
      promises.push(
        productApi
          .getAllRecipes({ limit: 1 })
          .then((res: any) => {
            if (active) newStats.recipesCount = res?.pagination?.total ?? res?.items?.length ?? 0;
          })
          .catch(() => {})
      );
    }

    if (canViewInventory) {
      promises.push(
        productApi
          .getProducts({ limit: 100 })
          .then((res: any) => {
            if (active) {
              const items = res?.data || [];
              newStats.inventoryCount = items.length;
              newStats.lowStockCount = items.filter((p: any) => (p.currentStock ?? 0) <= 5).length;
            }
          })
          .catch(() => {})
      );
    }

    if (canViewEquipment) {
      promises.push(
        equipmentApi
          .listEquipment({ limit: 1 })
          .then((res) => {
            if (active) newStats.equipmentCount = res?.pagination?.total ?? res?.items?.length ?? 0;
          })
          .catch(() => {})
      );
    }

    if (canViewPurchaseOrders) {
      promises.push(
        orderApi
          .listPurchaseOrders({ limit: 50 })
          .then((res) => {
            if (active) {
              const items = res?.items || [];
              newStats.purchaseOrdersCount = res?.pagination?.total ?? items.length;
              newStats.pendingPurchaseOrdersCount = items.filter(
                (o) => o.status === "PENDING" || o.status === "DRAFT"
              ).length;
            }
          })
          .catch(() => {})
      );
    }

    if (canViewPersons) {
      promises.push(
        profileApi
          .listProfiles({ limit: 1 })
          .then((res) => {
            if (active) newStats.personsCount = res?.pagination?.total ?? res?.items?.length ?? 0;
          })
          .catch(() => {})
      );
    }

    if (canViewCustomers) {
      promises.push(
        customerApi
          .listCustomers({ limit: 1 })
          .then((res) => {
            if (active) newStats.customersCount = res?.pagination?.total ?? res?.items?.length ?? 0;
          })
          .catch(() => {})
      );
    }

    if (canViewEmployees) {
      promises.push(
        employeeApi
          .listEmployees({ limit: 1 })
          .then((res) => {
            if (active) newStats.employeesCount = res?.pagination?.total ?? res?.items?.length ?? 0;
          })
          .catch(() => {})
      );
    }

    if (canViewVendors) {
      promises.push(
        vendorApi
          .listVendors({ limit: 1 })
          .then((res) => {
            if (active) newStats.vendorsCount = res?.pagination?.total ?? res?.items?.length ?? 0;
          })
          .catch(() => {})
      );
    }

    if (canViewUsers) {
      promises.push(
        userApi
          .listUsers()
          .then((res) => {
            if (active) newStats.usersCount = res?.items?.length ?? 0;
          })
          .catch(() => {})
      );
    }

    Promise.allSettled(promises).finally(() => {
      if (active) {
        setStats(newStats);
        setStatsLoading(false);
      }
    });

    return () => {
      active = false;
    };
  }, [canViewProducts, canViewInventory, canViewEquipment, canViewPurchaseOrders, canViewPersons, canViewCustomers, canViewEmployees, canViewVendors, canViewUsers]);

  const currentDate = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem", maxWidth: "1280px", margin: "0 auto" }}>
      {/* Hero Welcome Banner */}
      <div
        style={{
          position: "relative",
          padding: device.isSmallScreen ? "1.25rem 1rem" : "2rem 2.25rem",
          borderRadius: "var(--radius-lg)",
          background: user?.isSuperAdmin
            ? "linear-gradient(135deg, rgba(99, 102, 241, 0.22) 0%, rgba(245, 158, 11, 0.12) 100%)"
            : "linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(6, 182, 212, 0.12) 100%)",
          border: "1px solid var(--border-glow)",
          boxShadow: "0 12px 32px -10px rgba(0,0,0,0.5)",
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1.25rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.5rem", flexWrap: "wrap" }}>
              <Badge variant={user?.isSuperAdmin ? "warning" : "info"}>
                {user?.isSuperAdmin ? "👑 Super Administrator" : `🛡️ Role: ${role?.roleName || "Operator"}`}
              </Badge>
              <Badge variant="success">● System Operational</Badge>
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{currentDate}</span>
            </div>

            <h2
              style={{
                fontSize: device.isSmallScreen ? "1.35rem" : "1.85rem",
                fontWeight: 800,
                color: "var(--text-primary)",
                letterSpacing: "-0.02em",
              }}
            >
              Welcome back, {user?.name || user?.email?.split("@")[0]}!
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", marginTop: "0.35rem", maxWidth: "680px" }}>
              {user?.isSuperAdmin
                ? "You hold complete administrative clearance across all enterprise point-of-sale, catalog management, customer identities, and access control domains."
                : `Your personal workspace is configured with authorized access to ${authorizedModules.length} operational ${authorizedModules.length === 1 ? "module" : "modules"} based on your assigned role.`}
            </p>
          </div>

          {canViewPOS && (
            <Link href="/pos">
              <Button size="md" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
                <span>🛒</span>
                <span>Open POS Register</span>
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Permission-tailored Metrics Overview */}
      {(canViewPOS || canViewProducts || canViewInventory || canViewEquipment || canViewPurchaseOrders || canViewPersons || canViewCustomers || canViewEmployees || canViewVendors || canViewUsers) && (
        <div>
          <h3
            style={{
              fontSize: "0.85rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "var(--text-muted)",
              marginBottom: "0.85rem",
            }}
          >
            Authorized Operational Metrics
          </h3>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(160px, 100%), 1fr))",
              gap: device.isSmallScreen ? "0.75rem" : "1rem",
            }}
          >
            {canViewPOS && (
              <Card style={{ padding: "1.25rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Point of Sale</span>
                  <span style={{ fontSize: "1.2rem" }}>🛒</span>
                </div>
                <p style={{ fontSize: "1.5rem", fontWeight: 700, marginTop: "0.5rem", color: "var(--text-primary)" }}>Active</p>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.5rem" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--accent-emerald)" }}>Ready for orders</span>
                  <Link href="/pos" style={{ fontSize: "0.75rem", color: "var(--primary)", textDecoration: "underline" }}>
                    Launch →
                  </Link>
                </div>
              </Card>
            )}

            {canViewProducts && (
              <Card style={{ padding: "1.25rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Catalog SKUs</span>
                  <span style={{ fontSize: "1.2rem" }}>📦</span>
                </div>
                <p style={{ fontSize: "1.5rem", fontWeight: 700, marginTop: "0.5rem", color: "var(--text-primary)" }}>
                  {statsLoading ? "—" : stats.productsCount ?? "Catalog"}
                </p>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.5rem" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Products in inventory</span>
                  <Link href="/products" style={{ fontSize: "0.75rem", color: "var(--primary)", textDecoration: "underline" }}>
                    Browse →
                  </Link>
                </div>
              </Card>
            )}

            {canViewRecipes && (
              <Card style={{ padding: "1.25rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--accent-emerald)", textTransform: "uppercase" }}>Recipes & BOM</span>
                  <span style={{ fontSize: "1.2rem" }}>🧪</span>
                </div>
                <p style={{ fontSize: "1.5rem", fontWeight: 700, marginTop: "0.5rem", color: "var(--accent-emerald)" }}>
                  {statsLoading ? "—" : stats.recipesCount !== undefined && stats.recipesCount !== null ? stats.recipesCount : "Recipes"}
                </p>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.5rem" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Formulas & compositions</span>
                  <Link href="/recipes" style={{ fontSize: "0.75rem", color: "var(--primary)", textDecoration: "underline" }}>
                    Manage →
                  </Link>
                </div>
              </Card>
            )}

            {canViewInventory && (
              <Card style={{ padding: "1.25rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--accent-cyan)", textTransform: "uppercase" }}>Stock Ledger</span>
                  <span style={{ fontSize: "1.2rem" }}>📊</span>
                </div>
                <p style={{ fontSize: "1.5rem", fontWeight: 700, marginTop: "0.5rem", color: "var(--text-primary)" }}>
                  {statsLoading ? "—" : stats.inventoryCount ?? "Stock"}
                </p>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.5rem" }}>
                  <span style={{ fontSize: "0.75rem", color: stats.lowStockCount ? "var(--accent-amber)" : "var(--accent-emerald)" }}>
                    {stats.lowStockCount ? `${stats.lowStockCount} items low stock` : "Optimal levels"}
                  </span>
                  <Link href="/inventory" style={{ fontSize: "0.75rem", color: "var(--primary)", textDecoration: "underline" }}>
                    Audit →
                  </Link>
                </div>
              </Card>
            )}

            {canViewEquipment && (
              <Card style={{ padding: "1.25rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--accent-amber)", textTransform: "uppercase" }}>Machinery & Assets</span>
                  <span style={{ fontSize: "1.2rem" }}>🚜</span>
                </div>
                <p style={{ fontSize: "1.5rem", fontWeight: 700, marginTop: "0.5rem", color: "var(--accent-amber)" }}>
                  {statsLoading ? "—" : stats.equipmentCount ?? "Assets"}
                </p>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.5rem" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Equipment units</span>
                  <Link href="/equipment" style={{ fontSize: "0.75rem", color: "var(--primary)", textDecoration: "underline" }}>
                    Fleet →
                  </Link>
                </div>
              </Card>
            )}

            {canViewPurchaseOrders && (
              <Card style={{ padding: "1.25rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--accent-purple, #a855f7)", textTransform: "uppercase" }}>Purchase Orders</span>
                  <span style={{ fontSize: "1.2rem" }}>📑</span>
                </div>
                <p style={{ fontSize: "1.5rem", fontWeight: 700, marginTop: "0.5rem", color: "var(--accent-purple, #a855f7)" }}>
                  {statsLoading ? "—" : stats.purchaseOrdersCount ?? "Orders"}
                </p>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.5rem" }}>
                  <span style={{ fontSize: "0.75rem", color: stats.pendingPurchaseOrdersCount ? "var(--accent-amber)" : "var(--accent-emerald)" }}>
                    {stats.pendingPurchaseOrdersCount ? `${stats.pendingPurchaseOrdersCount} pending` : "Procurement"}
                  </span>
                  <Link href="/procurement/orders" style={{ fontSize: "0.75rem", color: "var(--primary)", textDecoration: "underline" }}>
                    Manage →
                  </Link>
                </div>
              </Card>
            )}

            {canViewPersons && (
              <Card style={{ padding: "1.25rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--accent-purple, #a855f7)", textTransform: "uppercase" }}>Master Persons</span>
                  <span style={{ fontSize: "1.2rem" }}>🪪</span>
                </div>
                <p style={{ fontSize: "1.5rem", fontWeight: 700, marginTop: "0.5rem", color: "var(--accent-purple, #a855f7)" }}>
                  {statsLoading ? "—" : stats.personsCount ?? "Profiles"}
                </p>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.5rem" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Master identity directory</span>
                  <Link href="/persons" style={{ fontSize: "0.75rem", color: "var(--primary)", textDecoration: "underline" }}>
                    Directory →
                  </Link>
                </div>
              </Card>
            )}

            {canViewCustomers && (
              <Card style={{ padding: "1.25rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Customer Directory</span>
                  <span style={{ fontSize: "1.2rem" }}>👥</span>
                </div>
                <p style={{ fontSize: "1.5rem", fontWeight: 700, marginTop: "0.5rem", color: "var(--accent-cyan)" }}>
                  {statsLoading ? "—" : stats.customersCount ?? "Directory"}
                </p>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.5rem" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Loyalty & clients</span>
                  <Link href="/customers" style={{ fontSize: "0.75rem", color: "var(--primary)", textDecoration: "underline" }}>
                    Directory →
                  </Link>
                </div>
              </Card>
            )}

            {canViewEmployees && (
              <Card style={{ padding: "1.25rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Workforce Staff</span>
                  <span style={{ fontSize: "1.2rem" }}>👔</span>
                </div>
                <p style={{ fontSize: "1.5rem", fontWeight: 700, marginTop: "0.5rem", color: "var(--text-primary)" }}>
                  {statsLoading ? "—" : stats.employeesCount ?? "Staff"}
                </p>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.5rem" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Active employees</span>
                  <Link href="/employees" style={{ fontSize: "0.75rem", color: "var(--primary)", textDecoration: "underline" }}>
                    View →
                  </Link>
                </div>
              </Card>
            )}

            {canViewVendors && (
              <Card style={{ padding: "1.25rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Vendors</span>
                  <span style={{ fontSize: "1.2rem" }}>🏢</span>
                </div>
                <p style={{ fontSize: "1.5rem", fontWeight: 700, marginTop: "0.5rem", color: "var(--text-primary)" }}>
                  {statsLoading ? "—" : stats.vendorsCount ?? "Suppliers"}
                </p>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.5rem" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Procurement partners</span>
                  <Link href="/vendors" style={{ fontSize: "0.75rem", color: "var(--primary)", textDecoration: "underline" }}>
                    View →
                  </Link>
                </div>
              </Card>
            )}

            {canViewUsers && (
              <Card style={{ padding: "1.25rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--accent-amber)", textTransform: "uppercase" }}>User Accounts</span>
                  <span style={{ fontSize: "1.2rem" }}>👤</span>
                </div>
                <p style={{ fontSize: "1.5rem", fontWeight: 700, marginTop: "0.5rem", color: "var(--accent-amber)" }}>
                  {statsLoading ? "—" : stats.usersCount ?? "Users"}
                </p>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.5rem" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Credentials & RBAC</span>
                  <Link href="/users" style={{ fontSize: "0.75rem", color: "var(--primary)", textDecoration: "underline" }}>
                    Manage →
                  </Link>
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Authorized Workspace Modules Launchpad */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem" }}>
          <h3
            style={{
              fontSize: "0.85rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "var(--text-muted)",
            }}
          >
            Authorized Workspaces ({authorizedModules.length})
          </h3>
          <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
            Access determined by security permissions
          </span>
        </div>

        {authorizedModules.length === 0 ? (
          <Card style={{ textAlign: "center", padding: "3rem" }}>
            <span style={{ fontSize: "2.5rem" }}>🔒</span>
            <h4 style={{ fontSize: "1.1rem", fontWeight: 700, marginTop: "1rem", color: "var(--accent-amber)" }}>
              No Operational Modules Assigned
            </h4>
            <p style={{ color: "var(--text-secondary)", marginTop: "0.5rem", fontSize: "0.9rem" }}>
              Your account is currently active, but does not have permissions granted to specific modules yet.
              Please contact your system administrator to assign an operational role.
            </p>
          </Card>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(260px, 100%), 1fr))",
              gap: device.isSmallScreen ? "0.85rem" : "1.25rem",
            }}
          >
            {authorizedModules.map((mod) => (
              <Link key={mod.id} href={mod.href} style={{ textDecoration: "none" }}>
                <Card
                  style={{
                    padding: device.isSmallScreen ? "1rem" : "1.5rem",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    transition: "all var(--transition-fast)",
                    border: "1px solid var(--border-subtle)",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--border-active)";
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 8px 24px -6px var(--primary-glow)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--border-subtle)";
                    e.currentTarget.style.transform = "none";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                      <div
                        style={{
                          width: "44px",
                          height: "44px",
                          borderRadius: "var(--radius-md)",
                          backgroundColor: "var(--bg-surface-elevated)",
                          border: "1px solid var(--border-glow)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "1.4rem",
                        }}
                      >
                        {mod.icon}
                      </div>
                      <Badge variant={mod.badge ? "warning" : "default"}>
                        {mod.badge || mod.category}
                      </Badge>
                    </div>

                    <h4 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)" }}>
                      {mod.label}
                    </h4>
                    <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.4rem", lineHeight: 1.45 }}>
                      {mod.description}
                    </p>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "var(--primary)", fontSize: "0.85rem", fontWeight: 600, marginTop: "1.25rem" }}>
                    <span>Launch Workspace</span>
                    <span>→</span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Security Clearance & Scope Footer Card */}
      <Card style={{ padding: "1.25rem 1.5rem", backgroundColor: "rgba(17, 22, 34, 0.6)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          <span style={{ fontSize: "1.2rem" }}>🛡️</span>
          <div>
            <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)" }}>
              Active Security Clearance:
            </span>
            <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginLeft: "0.4rem" }}>
              {user?.isSuperAdmin
                ? "Unrestricted Super-Administrator (RBAC restrictions bypassed)."
                : `Role: ${role?.roleName || "Standard User"} (${role?.roleAbbr || "ROLE"}). All queries and mutations are validated server-side.`}
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}
