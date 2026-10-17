"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/authContext";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ALL_DASHBOARD_MODULES } from "@/lib/permissions";
import { LanguageSwitcher } from "@/components/common/LanguageSwitcher";
import { useI18n } from "@/lib/i18nContext";
import { useDevice } from "@/lib/useDevice";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, role, isLoading, logout, canAccess } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const device = useDevice();

  // Mobile menu drawer state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // User-selectable or device-inferred compact mode
  // If the user's screen is smaller (Android, iPhone, small viewport), menu defaults to compact
  const [manualCompact, setManualCompact] = useState<boolean | null>(null);
  const isCompact = manualCompact !== null ? manualCompact : device.compactMenuPreferred;

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

  // Auto-close mobile drawer whenever pathname changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

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

  // Sidebar navigation content component
  const sidebarContent = (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        overflow: "hidden",
      }}
    >
      {/* Brand / Logo + Language + Close/Compact controls */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: isCompact ? "0.85rem" : "1.25rem",
          paddingBottom: "0.5rem",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <Link
          href="/"
          onClick={() => setIsMobileMenuOpen(false)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            textDecoration: "none",
          }}
        >
          <img
            src="/logo.png"
            alt="CRONO Logo"
            style={{
              height: isCompact ? "28px" : "36px",
              width: "auto",
              objectFit: "contain",
              filter: "drop-shadow(0 2px 8px rgba(212, 175, 55, 0.25))",
              transition: "height var(--transition-fast)",
            }}
          />
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
          {/* Menu Density Toggle */}
          <button
            onClick={() => setManualCompact(!isCompact)}
            title={isCompact ? "Switch to Regular Menu Size" : "Switch to Compact Menu Size (Mobile-friendly)"}
            style={{
              fontSize: "0.85rem",
              padding: "0.25rem 0.45rem",
              borderRadius: "var(--radius-sm)",
              backgroundColor: isCompact ? "rgba(99, 102, 241, 0.15)" : "transparent",
              color: isCompact ? "var(--primary)" : "var(--text-muted)",
              border: isCompact ? "1px solid var(--border-glow)" : "1px solid transparent",
              cursor: "pointer",
            }}
          >
            {isCompact ? "📱 Compact" : "🖥️ Normal"}
          </button>

          <LanguageSwitcher />

          {/* Close drawer button on mobile */}
          {device.isSmallScreen && (
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              aria-label="Close menu"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "28px",
                height: "28px",
                borderRadius: "var(--radius-sm)",
                backgroundColor: "var(--bg-surface-elevated)",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-secondary)",
                cursor: "pointer",
                fontSize: "0.9rem",
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Dynamic Nav Items filtered by Permissions */}
      <nav
        className="custom-scrollbar"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: isCompact ? "0.2rem" : "0.35rem",
          flex: 1,
          overflowY: "auto",
          paddingRight: "0.15rem",
        }}
      >
        {navItems.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              id={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
              onClick={() => {
                if (device.isSmallScreen) setIsMobileMenuOpen(false);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: isCompact ? "0.38rem 0.65rem" : "0.6rem 0.85rem",
                borderRadius: "var(--radius-md)",
                fontSize: isCompact ? "0.81rem" : "0.9rem",
                fontWeight: active ? 600 : 500,
                backgroundColor: active ? "var(--bg-surface-elevated)" : "transparent",
                color: active ? "var(--primary)" : "var(--text-secondary)",
                border: active ? "1px solid var(--border-glow)" : "1px solid transparent",
                transition: "all var(--transition-fast)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: isCompact ? "0.5rem" : "0.75rem", overflow: "hidden" }}>
                <span style={{ fontSize: isCompact ? "0.95rem" : "1.05rem", flexShrink: 0 }}>{item.icon}</span>
                <span
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {isCompact ? item.shortLabel || item.label : item.label}
                </span>
              </div>
              {item.badge && (
                <span
                  style={{
                    fontSize: isCompact ? "0.6rem" : "0.65rem",
                    padding: isCompact ? "0.05rem 0.35rem" : "0.1rem 0.4rem",
                    borderRadius: "var(--radius-full)",
                    backgroundColor: "rgba(245, 158, 11, 0.15)",
                    color: "var(--accent-amber)",
                    border: "1px solid rgba(245, 158, 11, 0.3)",
                    flexShrink: 0,
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
          padding: isCompact ? "0.55rem 0.65rem" : "0.85rem",
          backgroundColor: "var(--bg-surface-elevated)",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--border-subtle)",
          marginTop: isCompact ? "0.5rem" : "1rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: isCompact ? "0.35rem" : "0.6rem" }}>
          <div style={{ overflow: "hidden" }}>
            <p
              style={{
                fontSize: isCompact ? "0.78rem" : "0.85rem",
                fontWeight: 600,
                color: "var(--text-primary)",
                textOverflow: "ellipsis",
                overflow: "hidden",
                whiteSpace: "nowrap",
              }}
            >
              {user.name || user.email}
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", marginTop: "0.1rem" }}>
              <span
                style={{
                  fontSize: isCompact ? "0.68rem" : "0.725rem",
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
          style={{ width: "100%", justifyContent: "center", fontSize: isCompact ? "0.75rem" : "0.8rem", padding: isCompact ? "0.3rem 0.5rem" : undefined }}
        >
          {t("auth.signOut")}
        </Button>
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", position: "relative" }}>
      {/* 🖥️ Desktop Sidebar Navigation (Hidden on small mobile screens) */}
      {!device.isSmallScreen && (
        <aside
          style={{
            width: isCompact ? "210px" : "250px",
            backgroundColor: "var(--bg-surface)",
            borderRight: "1px solid var(--border-subtle)",
            display: "flex",
            flexDirection: "column",
            padding: isCompact ? "1rem 0.75rem" : "1.25rem 1rem",
            transition: "width var(--transition-smooth), padding var(--transition-smooth)",
            flexShrink: 0,
          }}
        >
          {sidebarContent}
        </aside>
      )}

      {/* 📱 Mobile Drawer Overlay for Small Screens (Android, iPhone, Small Viewport) */}
      {device.isSmallScreen && isMobileMenuOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100 }}>
          {/* Backdrop Blur */}
          <div
            className="animate-fade-in"
            onClick={() => setIsMobileMenuOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(0, 0, 0, 0.65)",
              backdropFilter: "blur(6px)",
              WebkitBackdropFilter: "blur(6px)",
            }}
          />

          {/* Slide-out Drawer */}
          <aside
            className="animate-slide-in"
            style={{
              position: "fixed",
              top: 0,
              bottom: 0,
              left: 0,
              width: "min(280px, 80vw)",
              backgroundColor: "var(--bg-surface)",
              borderRight: "1px solid var(--border-glow)",
              boxShadow: "var(--shadow-lg)",
              display: "flex",
              flexDirection: "column",
              padding: "1rem 0.85rem",
              zIndex: 101,
            }}
          >
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
        {/* Header */}
        <header
          style={{
            height: isCompact ? "56px" : "64px",
            borderBottom: "1px solid var(--border-subtle)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: isCompact ? "0 1rem" : "0 1.5rem",
            backgroundColor: "var(--bg-glass)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            transition: "height var(--transition-fast)",
            flexShrink: 0,
          }}
        >
          {/* Left: Mobile Menu Toggle Button & Page Title */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", minWidth: 0 }}>
            {device.isSmallScreen && (
              <button
                id="mobile-menu-toggle-btn"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label="Toggle navigation menu"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  padding: "0.38rem 0.65rem",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "var(--bg-surface-elevated)",
                  border: "1px solid var(--border-subtle)",
                  color: "var(--primary)",
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  cursor: "pointer",
                }}
              >
                <span style={{ fontSize: "1.1rem", lineHeight: 1 }}>☰</span>
                <span style={{ fontSize: "0.8rem", color: "var(--text-primary)" }}>Menu</span>
              </button>
            )}

            <h1
              style={{
                fontSize: isCompact ? "1rem" : "1.15rem",
                fontWeight: 600,
                color: "var(--text-primary)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {currentModule?.label || "Console"}
            </h1>
          </div>

          {/* Right: Backend indicator (desktop) + User profile */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexShrink: 0 }}>
            <span
              className="desktop-only"
              style={{ fontSize: "0.8rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}
            >
              Backend: <code style={{ color: "var(--accent-emerald)" }}>Ready (:3000)</code>
            </span>

            {/* Current Logged-in User Profile in Toolbar */}
            <div
              id="toolbar-current-user"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.25rem 0.55rem",
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

              {/* User Email & Role (Hidden or truncated on smaller screens) */}
              <div
                className="desktop-only"
                style={{ display: "flex", flexDirection: "column", lineHeight: 1.15, maxWidth: "120px" }}
              >
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
                  marginLeft: "0.1rem",
                }}
              >
                🚪
              </Button>
            </div>
          </div>
        </header>

        {/* Dynamic Route View or Route Guard Access Restricted Fallback */}
        <main
          style={{
            flex: 1,
            overflowY: "auto",
            padding: isCompact || device.isSmallScreen ? "1rem" : "1.5rem",
            backgroundColor: "var(--bg-primary)",
          }}
        >
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