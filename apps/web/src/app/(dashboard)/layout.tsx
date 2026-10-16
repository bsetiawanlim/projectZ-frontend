"use client";

import React, { useEffect, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/authContext";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ALL_DASHBOARD_MODULES } from "@/lib/permissions";
import { LanguageSwitcher } from "@/components/common/LanguageSwitcher";
import { useI18n } from "@/lib/i18nContext";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, role, isLoading, logout, canAccess } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();

  // Filter navigation items strictly based on user permissions
  const navItems = useMemo(() => {
    return ALL_DASHBOARD_MODULES.filter((item) => item.isAuthorized(user, canAccess));
  }, [user, canAccess]);

  // Route-level protection for direct URL hits
  const currentModule = ALL_DASHBOARD_MODULES.find((m) =>
    m.exact ? pathname === m.href : pathname.startsWith(m.href)
  );
  const isUnauthorized = currentModule && !currentModule.isAuthorized(user, canAccess);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          height: "100vh",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "var(--bg-primary)",
        }}
      >
        <p style={{ color: "var(--text-muted)" }}>{t("common.loading")}</p>
      </div>
    );
  }

  if (!user) return null;

  const roleDisplayName = user.isSuperAdmin ? "Super Admin" : role?.roleName || "Operator";

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      {/* Sidebar */}
      <aside
        style={{
          width: "250px",
          backgroundColor: "var(--bg-surface)",
          borderRight: "1px solid var(--border-subtle)",
          display: "flex",
          flexDirection: "column",
          padding: "1.25rem 1rem",
        }}
      >
        {/* Brand / Logo */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
          <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            marginBottom: 0,
            padding: "0.25rem 0.5rem",
            textDecoration: "none",
          }}
        >
          <img
            src="/logo.png"
            alt="CRONO Logo"
            style={{
              height: "38px",
              width: "auto",
              objectFit: "contain",
              filter: "drop-shadow(0 2px 8px rgba(212, 175, 55, 0.25))",
            }}
          />
        </Link>
          <LanguageSwitcher />
        </div>


        {/* Dynamic Nav Items filtered by Permissions */}
        <nav style={{ display: "flex", flexDirection: "column", gap: "0.35rem", flex: 1, overflowY: "auto" }}>
          {navItems.map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                id={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0.6rem 0.85rem",
                  borderRadius: "var(--radius-md)",
                  fontSize: "0.9rem",
                  fontWeight: active ? 600 : 500,
                  backgroundColor: active ? "var(--bg-surface-elevated)" : "transparent",
                  color: active ? "var(--primary)" : "var(--text-secondary)",
                  border: active ? "1px solid var(--border-glow)" : "1px solid transparent",
                  transition: "all var(--transition-fast)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <span style={{ fontSize: "1.05rem" }}>{item.icon}</span>
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    style={{
                      fontSize: "0.65rem",
                      padding: "0.1rem 0.4rem",
                      borderRadius: "var(--radius-full)",
                      backgroundColor: "rgba(245, 158, 11, 0.15)",
                      color: "var(--accent-amber)",
                      border: "1px solid rgba(245, 158, 11, 0.3)",
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Card & Logout */}
        <div
          style={{
            padding: "0.85rem",
            backgroundColor: "var(--bg-surface-elevated)",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border-subtle)",
            marginTop: "1rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.6rem" }}>
            <div style={{ overflow: "hidden" }}>
              <p
                style={{
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  textOverflow: "ellipsis",
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                }}
              >
                {user.name || user.email}
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", marginTop: "0.15rem" }}>
                <span
                  style={{
                    fontSize: "0.725rem",
                    fontWeight: 600,
                    color: user.isSuperAdmin ? "var(--accent-amber)" : "var(--accent-cyan)",
                  }}
                >
                  {roleDisplayName}
                </span>
                {role?.roleAbbr && !user.isSuperAdmin && (
                  <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>
                    ({role.roleAbbr})
                  </span>
                )}
              </div>
            </div>
          </div>
          <Button
            id="dashboard-logout-btn"
            variant="secondary"
            size="sm"
            onClick={logout}
            style={{ width: "100%", justifyContent: "center", fontSize: "0.8rem" }}
          >
            {t("auth.signOut")}
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Header */}
        <header
          style={{
            height: "64px",
            borderBottom: "1px solid var(--border-subtle)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 1.5rem",
            backgroundColor: "var(--bg-glass)",
            backdropFilter: "blur(12px)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexShrink: 0 }}>
            <h1 style={{ fontSize: "1.15rem", fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap" }}>
              {currentModule?.label || "Console"}
            </h1>
          </div>



          <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexShrink: 0 }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
              Backend: <code style={{ color: "var(--accent-emerald)" }}>Ready (:3000)</code>
            </span>

            {/* Current Logged-in User Profile in Toolbar */}
            <div
              id="toolbar-current-user"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.6rem",
                padding: "0.3rem 0.65rem",
                borderRadius: "9999px",
                backgroundColor: "var(--bg-surface-elevated)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <div
                style={{
                  width: "26px",
                  height: "26px",
                  borderRadius: "50%",
                  background: user.isSuperAdmin
                    ? "linear-gradient(135deg, #f59e0b, #ef4444)"
                    : "linear-gradient(135deg, var(--primary), #818cf8)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  color: "#ffffff",
                  textTransform: "uppercase",
                  flexShrink: 0,
                }}
              >
                {user.email ? user.email.charAt(0) : "U"}
              </div>
              <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.15, maxWidth: "120px" }}>
                <span
                  style={{
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    color: "var(--text-primary)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  title={user.email}
                >
                  {user.name || user.email}
                </span>
                <span
                  style={{
                    fontSize: "0.68rem",
                    color: user.isSuperAdmin ? "var(--accent-amber)" : "var(--accent-emerald)",
                  }}
                >
                  {roleDisplayName}
                </span>
              </div>
              <Button
                id="toolbar-logout-btn"
                variant="ghost"
                size="sm"
                onClick={logout}
                title="Sign Out"
                style={{
                  padding: "0.15rem 0.35rem",
                  fontSize: "0.8rem",
                  color: "var(--text-muted)",
                  minWidth: "auto",
                  marginLeft: "0.15rem",
                }}
              >
                🚪
              </Button>
            </div>
          </div>
        </header>

        {/* Dynamic Route View or Route Guard Access Restricted Fallback */}
        <main style={{ flex: 1, overflowY: "auto", padding: "1.5rem", backgroundColor: "var(--bg-primary)" }}>
          {isUnauthorized ? (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
              <Card style={{ maxWidth: "480px", textAlign: "center", padding: "3rem 2rem" }}>
                <span style={{ fontSize: "3rem" }}>🔒</span>
                <h2 style={{ fontSize: "1.3rem", fontWeight: 700, marginTop: "1rem", color: "var(--accent-rose)" }}>
                  Access Restricted
                </h2>
                <p style={{ color: "var(--text-secondary)", marginTop: "0.6rem", fontSize: "0.9rem", lineHeight: 1.5 }}>
                  Your assigned role (<strong>{roleDisplayName}</strong>) does not have permission to view or manage the{" "}
                  <strong>{currentModule.label}</strong> domain.
                </p>
                <div style={{ marginTop: "1.75rem", display: "flex", justifyContent: "center", gap: "0.75rem" }}>
                  <Button onClick={() => router.push("/")}>
                    Return to Dashboard Overview
                  </Button>
                </div>
              </Card>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}