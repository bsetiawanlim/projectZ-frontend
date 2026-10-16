"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { equipmentApi } from "@/lib/api";
import {
  formatIDR,
  CUSTOMER_GROUPS,
  getCustomerGroupName,
  getCustomerGroupBadgeVariant,
} from "@pz/shared";
import type {
  EquipmentEntityRecord,
  EquipmentPriceRecord,
  EquipmentPriceType,
} from "@pz/shared";

interface EquipmentPriceModalProps {
  isOpen: boolean;
  onClose: () => void;
  equipment: EquipmentEntityRecord | null;
}

const PRICE_TYPE_LABELS: Record<
  EquipmentPriceType,
  { label: string; badge: "success" | "info" | "warning" | "default" }
> = {
  SALE: { label: "Direct Sale", badge: "success" },
  LEASE_DAILY: { label: "Daily Lease", badge: "info" },
  LEASE_MONTHLY: { label: "Monthly Lease", badge: "warning" },
  LEASE_YEARLY: { label: "Yearly Lease", badge: "default" },
};

export function EquipmentPriceModal({
  isOpen,
  onClose,
  equipment,
}: EquipmentPriceModalProps) {
  const [prices, setPrices] = useState<EquipmentPriceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter tab / selection for Customer Group
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>("ALL");

  // Form State
  const [priceType, setPriceType] = useState<EquipmentPriceType>("LEASE_MONTHLY");
  const [customerGroup, setCustomerGroup] = useState<string>(""); // "" = General / All Customer Groups
  const [amount, setAmount] = useState<number | string>("");
  const [currency, setCurrency] = useState<string>("IDR");
  const [startDate, setStartDate] = useState<string>(
    () => new Date().toISOString().split("T")[0] || ""
  );
  const [endDate, setEndDate] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const loadPrices = useCallback(async () => {
    if (!equipment) return;
    setLoading(true);
    setError(null);
    try {
      const res = await equipmentApi.getEquipmentPrices(equipment.id);
      setPrices(res.data || []);
    } catch (err: any) {
      console.error("Failed to load equipment price table", err);
      setError(err?.message || "Failed to load price history");
    } finally {
      setLoading(false);
    }
  }, [equipment]);

  useEffect(() => {
    if (isOpen && equipment) {
      loadPrices();
      setShowAddForm(false);
      resetForm();
      setSelectedGroupFilter("ALL");
    }
  }, [isOpen, equipment, loadPrices]);

  const resetForm = () => {
    setPriceType("LEASE_MONTHLY");
    setCustomerGroup("");
    setAmount("");
    setCurrency("IDR");
    setStartDate(new Date().toISOString().split("T")[0] || "");
    setEndDate("");
    setNotes("");
  };

  const handleCreatePrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!equipment) return;

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      alert("Please enter a valid amount greater than 0");
      return;
    }

    if (!startDate) {
      alert("Please enter an effective start date");
      return;
    }

    const groupNum = customerGroup ? Number(customerGroup) : null;

    setSubmitting(true);
    try {
      await equipmentApi.createEquipmentPrice({
        equipmentEntityId: equipment.id,
        customerGroup: groupNum,
        priceType,
        amount: numAmount,
        currency: currency || "IDR",
        startDate: startDate,
        endDate: endDate.trim() ? endDate : null,
        notes: notes.trim() ? notes : null,
      });

      resetForm();
      setShowAddForm(false);
      await loadPrices();
    } catch (err: any) {
      alert(err?.message || "Failed to create price record");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePrice = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this price record?"))
      return;
    try {
      await equipmentApi.deleteEquipmentPrice(id);
      await loadPrices();
    } catch (err: any) {
      alert(err?.message || "Failed to delete price entry");
    }
  };

  // Filtered prices based on customer group tab
  const filteredPrices = useMemo(() => {
    if (selectedGroupFilter === "ALL") return prices;
    if (selectedGroupFilter === "DEFAULT") {
      return prices.filter((p) => p.customerGroup == null);
    }
    const targetGroupId = Number(selectedGroupFilter);
    return prices.filter((p) => p.customerGroup === targetGroupId);
  }, [prices, selectedGroupFilter]);

  if (!isOpen || !equipment) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "1rem",
        overflowY: "auto",
      }}
    >
      <Card
        style={{
          width: "100%",
          maxWidth: "880px",
          backgroundColor: "var(--bg-surface)",
          border: "1px solid var(--border-glow)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
          padding: "1.75rem",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "1.25rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "var(--radius-md)",
                backgroundColor: "rgba(16, 185, 129, 0.15)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.5rem",
              }}
            >
              💲
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <h3
                  style={{
                    fontSize: "1.25rem",
                    fontWeight: 700,
                    color: "var(--text-primary)",
                  }}
                >
                  Sale & Lease Pricing Tiers
                </h3>
                <Badge variant="warning">{equipment.name}</Badge>
              </div>
              <p
                style={{
                  fontSize: "0.85rem",
                  color: "var(--text-muted)",
                  marginTop: "0.15rem",
                }}
              >
                Track rates across Customer Groups (Retail, VIP, Wholesale B2B, Corporate, Distributor)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              fontSize: "1.25rem",
              color: "var(--text-muted)",
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        {/* Toolbar & Filter Tabs */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "0.75rem",
            marginBottom: "1rem",
            backgroundColor: "var(--bg-surface-elevated)",
            padding: "0.75rem 1rem",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          {/* Customer Group Filter Tabs */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginRight: "0.2rem" }}>
              Filter Tier:
            </span>
            <Button
              size="sm"
              variant={selectedGroupFilter === "ALL" ? "primary" : "ghost"}
              onClick={() => setSelectedGroupFilter("ALL")}
              style={{ fontSize: "0.75rem", padding: "0.25rem 0.6rem" }}
            >
              All Tiers ({prices.length})
            </Button>
            <Button
              size="sm"
              variant={selectedGroupFilter === "DEFAULT" ? "primary" : "ghost"}
              onClick={() => setSelectedGroupFilter("DEFAULT")}
              style={{ fontSize: "0.75rem", padding: "0.25rem 0.6rem" }}
            >
              General / Base ({prices.filter((p) => p.customerGroup == null).length})
            </Button>
            {CUSTOMER_GROUPS.map((grp) => {
              const count = prices.filter((p) => p.customerGroup === grp.id).length;
              if (count === 0 && selectedGroupFilter !== String(grp.id)) return null;
              return (
                <Button
                  key={grp.id}
                  size="sm"
                  variant={selectedGroupFilter === String(grp.id) ? "primary" : "ghost"}
                  onClick={() => setSelectedGroupFilter(String(grp.id))}
                  style={{ fontSize: "0.75rem", padding: "0.25rem 0.6rem" }}
                >
                  {grp.name} ({count})
                </Button>
              );
            })}
          </div>

          <Button
            size="sm"
            variant={showAddForm ? "ghost" : "primary"}
            onClick={() => setShowAddForm(!showAddForm)}
          >
            {showAddForm ? "✕ Close Form" : "+ Record New Price Point"}
          </Button>
        </div>

        {/* New Price Form */}
        {showAddForm && (
          <form
            onSubmit={handleCreatePrice}
            style={{
              backgroundColor: "var(--bg-primary)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-md)",
              padding: "1.25rem",
              marginBottom: "1.25rem",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h4 style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--text-primary)" }}>
                Add Sale / Lease Price Point
              </h4>
              <Badge variant="info">Tier Config</Badge>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "1rem",
              }}
            >
              {/* Customer Group Tier Selection */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.75rem",
                    color: "var(--accent-cyan)",
                    fontWeight: 600,
                    marginBottom: "0.3rem",
                  }}
                >
                  Customer Group Tier *
                </label>
                <select
                  value={customerGroup}
                  onChange={(e) => setCustomerGroup(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.55rem 0.75rem",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: "var(--bg-surface)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--border-subtle)",
                    fontSize: "0.875rem",
                  }}
                >
                  <option value="">🌐 General / All Customer Groups</option>
                  {CUSTOMER_GROUPS.map((grp) => (
                    <option key={grp.id} value={grp.id}>
                      👥 {grp.name} ({grp.description})
                    </option>
                  ))}
                </select>
                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.2rem", display: "block" }}>
                  Select specific customer group or leave as General/Base
                </span>
              </div>

              {/* Price Type */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.75rem",
                    color: "var(--text-muted)",
                    marginBottom: "0.3rem",
                  }}
                >
                  Price Type *
                </label>
                <select
                  value={priceType}
                  onChange={(e) =>
                    setPriceType(e.target.value as EquipmentPriceType)
                  }
                  style={{
                    width: "100%",
                    padding: "0.55rem 0.75rem",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: "var(--bg-surface)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--border-subtle)",
                    fontSize: "0.875rem",
                  }}
                  required
                >
                  <option value="SALE">Direct Sale</option>
                  <option value="LEASE_DAILY">Daily Lease Rate</option>
                  <option value="LEASE_MONTHLY">Monthly Lease Rate</option>
                  <option value="LEASE_YEARLY">Yearly Lease Rate</option>
                </select>
              </div>

              {/* Amount */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.75rem",
                    color: "var(--text-muted)",
                    marginBottom: "0.3rem",
                  }}
                >
                  Price Rate (IDR) *
                </label>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="e.g. 750000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>

              {/* Effective Start Date */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.75rem",
                    color: "var(--text-muted)",
                    marginBottom: "0.3rem",
                  }}
                >
                  Effective Start Date *
                </label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>

              {/* Effective End Date */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.75rem",
                    color: "var(--text-muted)",
                    marginBottom: "0.3rem",
                  }}
                >
                  Effective End Date (Optional)
                </label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "0.75rem",
                  color: "var(--text-muted)",
                  marginBottom: "0.3rem",
                }}
              >
                Contract Notes & Pricing Terms
              </label>
              <Input
                placeholder="e.g. Special contracted tier rate for Wholesale B2B, includes 6-month preventive maintenance"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "0.5rem",
              }}
            >
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowAddForm(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={submitting}>
                {submitting ? "Saving..." : "Save Price Point"}
              </Button>
            </div>
          </form>
        )}

        {/* Price Table Body */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
          }}
        >
          {loading ? (
            <div
              style={{
                padding: "2.5rem",
                textAlign: "center",
                color: "var(--text-muted)",
              }}
            >
              Loading price table...
            </div>
          ) : error ? (
            <div
              style={{
                padding: "2rem",
                textAlign: "center",
                color: "var(--accent-rose)",
              }}
            >
              {error}
            </div>
          ) : filteredPrices.length === 0 ? (
            <div
              style={{
                padding: "3rem 1.5rem",
                textAlign: "center",
                color: "var(--text-muted)",
              }}
            >
              <span style={{ fontSize: "2rem" }}>🏷️</span>
              <p
                style={{
                  marginTop: "0.5rem",
                  fontSize: "0.9rem",
                  color: "var(--text-secondary)",
                }}
              >
                {selectedGroupFilter !== "ALL"
                  ? "No prices configured for this customer group tier."
                  : "No sale or lease prices recorded for this equipment asset yet."}
              </p>
              <Button
                size="sm"
                variant="secondary"
                style={{ marginTop: "0.75rem" }}
                onClick={() => setShowAddForm(true)}
              >
                + Record First Price Point
              </Button>
            </div>
          ) : (
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                textAlign: "left",
                fontSize: "0.85rem",
              }}
            >
              <thead>
                <tr
                  style={{
                    backgroundColor: "var(--bg-surface-elevated)",
                    borderBottom: "1px solid var(--border-subtle)",
                    color: "var(--text-muted)",
                    fontSize: "0.75rem",
                    textTransform: "uppercase",
                  }}
                >
                  <th style={{ padding: "0.75rem 1rem" }}>Customer Group</th>
                  <th style={{ padding: "0.75rem 1rem" }}>Price Type</th>
                  <th style={{ padding: "0.75rem 1rem" }}>Amount Rate</th>
                  <th style={{ padding: "0.75rem 1rem" }}>Effective Period</th>
                  <th style={{ padding: "0.75rem 1rem" }}>Status</th>
                  <th style={{ padding: "0.75rem 1rem" }}>Notes</th>
                  <th style={{ padding: "0.75rem 1rem", textAlign: "right" }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredPrices.map((p) => {
                  const now = new Date();
                  const start = new Date(p.startDate);
                  const end = p.endDate ? new Date(p.endDate) : null;
                  const isActive = start <= now && (!end || end >= now);

                  const meta = PRICE_TYPE_LABELS[p.priceType] || {
                    label: p.priceType,
                    badge: "default",
                  };

                  const groupName = p.customerGroup
                    ? getCustomerGroupName(p.customerGroup)
                    : "General (All Groups)";
                  const groupBadgeVariant = p.customerGroup
                    ? getCustomerGroupBadgeVariant(p.customerGroup)
                    : "default";

                  return (
                    <tr
                      key={p.id}
                      style={{
                        borderBottom: "1px solid var(--border-subtle)",
                        transition: "background-color var(--transition-fast)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor =
                          "var(--bg-surface-elevated)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      {/* Customer Group */}
                      <td style={{ padding: "0.8rem 1rem" }}>
                        <Badge variant={groupBadgeVariant}>{groupName}</Badge>
                      </td>

                      {/* Price Type */}
                      <td style={{ padding: "0.8rem 1rem" }}>
                        <Badge variant={meta.badge}>{meta.label}</Badge>
                      </td>

                      {/* Amount */}
                      <td
                        style={{
                          padding: "0.8rem 1rem",
                          fontWeight: 700,
                          color: "var(--accent-emerald)",
                        }}
                      >
                        {formatIDR(p.amount)}
                      </td>

                      {/* Period */}
                      <td
                        style={{
                          padding: "0.8rem 1rem",
                          color: "var(--text-secondary)",
                        }}
                      >
                        <div>{new Date(p.startDate).toLocaleDateString()}</div>
                        {p.endDate ? (
                          <div
                            style={{
                              fontSize: "0.72rem",
                              color: "var(--text-muted)",
                            }}
                          >
                            until {new Date(p.endDate).toLocaleDateString()}
                          </div>
                        ) : (
                          <div
                            style={{
                              fontSize: "0.72rem",
                              color: "var(--accent-cyan)",
                            }}
                          >
                            Ongoing (Open-ended)
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td style={{ padding: "0.8rem 1rem" }}>
                        {isActive ? (
                          <Badge variant="success">Active</Badge>
                        ) : end && end < now ? (
                          <Badge variant="default">Expired</Badge>
                        ) : (
                          <Badge variant="warning">Upcoming</Badge>
                        )}
                      </td>

                      {/* Notes */}
                      <td
                        style={{
                          padding: "0.8rem 1rem",
                          color: "var(--text-secondary)",
                          maxWidth: "180px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={p.notes || undefined}
                      >
                        {p.notes || "—"}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: "0.8rem 1rem", textAlign: "right" }}>
                        <button
                          type="button"
                          onClick={() => handleDeletePrice(p.id)}
                          style={{
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                            fontSize: "1rem",
                            color: "var(--accent-rose)",
                            padding: "0.2rem 0.4rem",
                            borderRadius: "var(--radius-sm)",
                          }}
                          title="Delete price entry"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginTop: "1.25rem",
          }}
        >
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </Card>
    </div>
  );
}
