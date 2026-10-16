"use client";

import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import {
  formatIDR,
  CUSTOMER_GROUPS,
  getCustomerGroupName,
  getCustomerGroupBadgeVariant,
} from "@pz/shared";
import type { ProductPriceItem } from "@pz/shared";

export interface PendingPriceItem {
  id?: number;
  tempId?: string;
  customerGroup: number | null;
  priceType: "retail" | "wholesale" | "special";
  amount: number;
  currency: string;
  startDate?: string;
  endDate?: string | null;
}

interface ProductPriceManagerProps {
  prices: (ProductPriceItem | PendingPriceItem)[];
  onAddPrice: (price: Omit<PendingPriceItem, "id">) => void;
  onDeletePrice: (idOrTempId: string | number) => void;
  loading?: boolean;
}

const PRICE_TYPE_LABELS: Record<
  string,
  { label: string; badge: "success" | "warning" | "info" | "default" }
> = {
  retail: { label: "Retail", badge: "success" },
  wholesale: { label: "Wholesale", badge: "warning" },
  special: { label: "Special / Promo", badge: "info" },
};

export function ProductPriceManager({
  prices,
  onAddPrice,
  onDeletePrice,
  loading = false,
}: ProductPriceManagerProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>("ALL");

  // Form State
  const [priceType, setPriceType] = useState<"retail" | "wholesale" | "special">("retail");
  const [customerGroup, setCustomerGroup] = useState<string>(""); // "" = General / All
  const [amount, setAmount] = useState<string>("");
  const [currency, setCurrency] = useState<string>("IDR");
  const [startDate, setStartDate] = useState<string>(
    () => new Date().toISOString().split("T")[0] || ""
  );
  const [endDate, setEndDate] = useState<string>("");

  const resetForm = () => {
    setPriceType("retail");
    setCustomerGroup("");
    setAmount("");
    setCurrency("IDR");
    setStartDate(new Date().toISOString().split("T")[0] || "");
    setEndDate("");
  };

  const handleAddPrice = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      alert("Please enter a valid price amount greater than 0");
      return;
    }

    onAddPrice({
      customerGroup: customerGroup ? Number(customerGroup) : null,
      priceType,
      amount: numAmount,
      currency: currency || "IDR",
      startDate: startDate || undefined,
      endDate: endDate.trim() ? endDate : null,
    });

    resetForm();
    setShowAddForm(false);
  };

  const filteredPrices = useMemo(() => {
    if (selectedGroupFilter === "ALL") return prices;
    if (selectedGroupFilter === "DEFAULT") {
      return prices.filter((p) => p.customerGroup == null);
    }
    const targetGroupId = Number(selectedGroupFilter);
    return prices.filter((p) => p.customerGroup === targetGroupId);
  }, [prices, selectedGroupFilter]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
        backgroundColor: "var(--bg-surface-elevated)",
        padding: "1.25rem",
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--border-subtle)",
      }}
    >
      {/* Title & Toolbar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "0.5rem",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "1.1rem" }}>🏷️</span>
            <span style={{ fontWeight: 600, fontSize: "0.95rem", color: "var(--text-primary)" }}>
              Customer Group Pricing Tiers
            </span>
            <Badge variant="info">{prices.length} Tier{prices.length !== 1 ? "s" : ""}</Badge>
          </div>
          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
            Configure custom prices for Regular, VIP, Wholesale B2B, Corporate, or Distributors
          </p>
        </div>

        <Button
          type="button"
          size="sm"
          variant={showAddForm ? "ghost" : "secondary"}
          onClick={() => setShowAddForm(!showAddForm)}
          style={{ fontSize: "0.8rem", padding: "0.3rem 0.65rem" }}
        >
          {showAddForm ? "✕ Cancel Tier" : "+ Add Group Price"}
        </Button>
      </div>

      {/* Filter Tabs */}
      {prices.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", flexWrap: "wrap" }}>
          <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>View:</span>
          <button
            type="button"
            onClick={() => setSelectedGroupFilter("ALL")}
            style={{
              background: selectedGroupFilter === "ALL" ? "var(--primary)" : "var(--bg-surface)",
              color: selectedGroupFilter === "ALL" ? "#fff" : "var(--text-secondary)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-sm)",
              padding: "0.2rem 0.5rem",
              fontSize: "0.72rem",
              cursor: "pointer",
            }}
          >
            All ({prices.length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedGroupFilter("DEFAULT")}
            style={{
              background: selectedGroupFilter === "DEFAULT" ? "var(--primary)" : "var(--bg-surface)",
              color: selectedGroupFilter === "DEFAULT" ? "#fff" : "var(--text-secondary)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-sm)",
              padding: "0.2rem 0.5rem",
              fontSize: "0.72rem",
              cursor: "pointer",
            }}
          >
            General ({prices.filter((p) => p.customerGroup == null).length})
          </button>
          {CUSTOMER_GROUPS.map((grp) => {
            const count = prices.filter((p) => p.customerGroup === grp.id).length;
            if (count === 0 && selectedGroupFilter !== String(grp.id)) return null;
            return (
              <button
                key={grp.id}
                type="button"
                onClick={() => setSelectedGroupFilter(String(grp.id))}
                style={{
                  background: selectedGroupFilter === String(grp.id) ? "var(--primary)" : "var(--bg-surface)",
                  color: selectedGroupFilter === String(grp.id) ? "#fff" : "var(--text-secondary)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-sm)",
                  padding: "0.2rem 0.5rem",
                  fontSize: "0.72rem",
                  cursor: "pointer",
                }}
              >
                {grp.name} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Inline Add Price Form */}
      {showAddForm && (
        <div
          style={{
            backgroundColor: "var(--bg-primary)",
            padding: "1rem",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border-glow)",
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.75rem" }}>
            {/* Customer Group */}
            <div>
              <label style={{ display: "block", fontSize: "0.75rem", color: "var(--accent-cyan)", fontWeight: 600, marginBottom: "0.25rem" }}>
                Target Customer Group *
              </label>
              <select
                value={customerGroup}
                onChange={(e) => setCustomerGroup(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.5rem 0.65rem",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "var(--bg-surface)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border-subtle)",
                  fontSize: "0.825rem",
                }}
              >
                <option value="">🌐 General / All Groups</option>
                {CUSTOMER_GROUPS.map((grp) => (
                  <option key={grp.id} value={grp.id}>
                    👥 {grp.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Price Type */}
            <div>
              <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>
                Price Type *
              </label>
              <select
                value={priceType}
                onChange={(e) => setPriceType(e.target.value as any)}
                style={{
                  width: "100%",
                  padding: "0.5rem 0.65rem",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "var(--bg-surface)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border-subtle)",
                  fontSize: "0.825rem",
                }}
                required
              >
                <option value="retail">Retail</option>
                <option value="wholesale">Wholesale</option>
                <option value="special">Special / Promotional</option>
              </select>
            </div>

            {/* Amount */}
            <div>
              <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>
                Price Rate (IDR) *
              </label>
              <Input
                type="number"
                min="0"
                step="500"
                placeholder="e.g. 45000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>

            {/* Effective Start Date */}
            <div>
              <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>
                Start Date (Optional)
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowAddForm(false)}>
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={handleAddPrice}>
              Add Tier Rate
            </Button>
          </div>
        </div>
      )}

      {/* Prices List Table */}
      {loading ? (
        <div style={{ padding: "1.5rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem" }}>
          Loading price tiers...
        </div>
      ) : filteredPrices.length === 0 ? (
        <div
          style={{
            padding: "1.25rem",
            textAlign: "center",
            color: "var(--text-muted)",
            fontSize: "0.825rem",
            backgroundColor: "var(--bg-surface)",
            borderRadius: "var(--radius-md)",
            border: "1px dashed var(--border-subtle)",
          }}
        >
          {prices.length === 0
            ? "No customer group price tiers configured yet. Standard retail price applies to all customers."
            : "No pricing records match the selected group filter."}
        </div>
      ) : (
        <div style={{ overflowX: "auto", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.825rem", textAlign: "left" }}>
            <thead>
              <tr
                style={{
                  backgroundColor: "var(--bg-primary)",
                  borderBottom: "1px solid var(--border-subtle)",
                  color: "var(--text-muted)",
                  fontSize: "0.72rem",
                  textTransform: "uppercase",
                }}
              >
                <th style={{ padding: "0.6rem 0.85rem" }}>Customer Group</th>
                <th style={{ padding: "0.6rem 0.85rem" }}>Price Type</th>
                <th style={{ padding: "0.6rem 0.85rem" }}>Price Rate</th>
                <th style={{ padding: "0.6rem 0.85rem" }}>Period</th>
                <th style={{ padding: "0.6rem 0.85rem", textAlign: "right" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredPrices.map((p, idx) => {
                const groupName = p.customerGroup
                  ? getCustomerGroupName(p.customerGroup)
                  : "General (All Groups)";
                const groupBadgeVariant = p.customerGroup
                  ? getCustomerGroupBadgeVariant(p.customerGroup)
                  : "default";
                const typeMeta = PRICE_TYPE_LABELS[p.priceType] || { label: p.priceType, badge: "default" };

                const key = (p as any).id ?? (p as any).tempId ?? `price-${idx}`;
                const deleteId = (p as any).id ?? (p as any).tempId ?? idx;

                return (
                  <tr
                    key={key}
                    style={{
                      borderBottom: "1px solid var(--border-subtle)",
                      backgroundColor: "var(--bg-surface)",
                    }}
                  >
                    <td style={{ padding: "0.6rem 0.85rem" }}>
                      <Badge variant={groupBadgeVariant}>{groupName}</Badge>
                    </td>
                    <td style={{ padding: "0.6rem 0.85rem" }}>
                      <Badge variant={typeMeta.badge}>{typeMeta.label}</Badge>
                    </td>
                    <td style={{ padding: "0.6rem 0.85rem", fontWeight: 700, color: "var(--accent-emerald)" }}>
                      {formatIDR(p.amount)}
                    </td>
                    <td style={{ padding: "0.6rem 0.85rem", color: "var(--text-muted)", fontSize: "0.75rem" }}>
                      {p.startDate ? new Date(p.startDate).toLocaleDateString() : "Ongoing"}
                      {p.endDate ? ` - ${new Date(p.endDate).toLocaleDateString()}` : ""}
                    </td>
                    <td style={{ padding: "0.6rem 0.85rem", textAlign: "right" }}>
                      <button
                        type="button"
                        onClick={() => onDeletePrice(deleteId)}
                        style={{
                          background: "transparent",
                          border: "none",
                          cursor: "pointer",
                          color: "var(--accent-rose)",
                          fontSize: "0.95rem",
                          padding: "0.2rem",
                        }}
                        title="Remove price tier"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
