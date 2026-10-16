"use client";

import React, { useState, useEffect } from "react";
import QRCode from "qrcode";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { facilityApi, type FacilityRecord } from "@/lib/api";

interface TableQrModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TableCardData {
  tableNumber: string;
  url: string;
  qrDataUrl: string;
}

export function TableQrModal({ isOpen, onClose }: TableQrModalProps) {
  const [facilities, setFacilities] = useState<FacilityRecord[]>([]);
  const [selectedFacilityId, setSelectedFacilityId] = useState<number | null>(null);
  const [tableInput, setTableInput] = useState<string>("T-01, T-02, T-03, T-04, T-05");
  const [baseUrl, setBaseUrl] = useState<string>("");
  const [cards, setCards] = useState<TableCardData[]>([]);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setBaseUrl(window.location.origin);
    }
    facilityApi
      .getFacilities({ limit: 50 })
      .then((res: any) => {
        const facs = res?.data || res?.items || (Array.isArray(res) ? res : []);
        setFacilities(facs);
        if (facs.length > 0) {
          const store = facs.find((f: any) => f.type === "STORE") || facs[0];
          setSelectedFacilityId(store.id);
        }
      })
      .catch((err) => console.error("Failed to load facilities for QR", err));
  }, []);

  const selectedFacility = facilities.find((f) => f.id === selectedFacilityId);

  useEffect(() => {
    if (!isOpen || !selectedFacilityId || !baseUrl) return;

    let isMounted = true;
    setGenerating(true);

    const parseTables = () => {
      return tableInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
    };

    const tables = parseTables();
    if (tables.length === 0) {
      setCards([]);
      setGenerating(false);
      return;
    }

    Promise.all(
      tables.map(async (tableNumber) => {
        const url = `${baseUrl}/order/table?facilityId=${selectedFacilityId}&tableNumber=${encodeURIComponent(
          tableNumber
        )}`;
        const qrDataUrl = await QRCode.toDataURL(url, {
          width: 256,
          margin: 1,
          color: {
            dark: "#0f172a",
            light: "#ffffff",
          },
        });
        return { tableNumber, url, qrDataUrl };
      })
    )
      .then((generatedCards) => {
        if (isMounted) {
          setCards(generatedCards);
          setGenerating(false);
        }
      })
      .catch((err) => {
        console.error("Failed to generate QR codes", err);
        if (isMounted) setGenerating(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, selectedFacilityId, tableInput, baseUrl]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 70,
        padding: "1.5rem",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "850px",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "var(--bg-surface)",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--border-subtle)",
          overflow: "hidden",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: "1.25rem 1.5rem",
            borderBottom: "1px solid var(--border-subtle)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            backgroundColor: "var(--bg-surface-elevated)",
          }}
        >
          <div>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--text-primary)" }}>
              🪑 Table QR Barcode Placard Generator
            </h3>
            <p style={{ fontSize: "0.825rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
              Generate & print table tent placards. Diners scan with phone to self-order from that table.
            </p>
          </div>
          <button
            onClick={onClose}
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

        {/* Configuration Controls */}
        <div
          style={{
            padding: "1.25rem 1.5rem",
            borderBottom: "1px solid var(--border-subtle)",
            display: "grid",
            gridTemplateColumns: "1fr 1.5fr auto",
            gap: "1rem",
            alignItems: "flex-end",
            backgroundColor: "var(--bg-surface)",
          }}
        >
          <div>
            <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-secondary)" }}>
              Outlet / Facility:
            </label>
            <select
              value={selectedFacilityId ?? ""}
              onChange={(e) => setSelectedFacilityId(Number(e.target.value))}
              style={{
                width: "100%",
                marginTop: "0.35rem",
                padding: "0.5rem 0.65rem",
                backgroundColor: "var(--bg-surface-elevated)",
                color: "var(--text-primary)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-md)",
                fontSize: "0.85rem",
                outline: "none",
              }}
            >
              {facilities.map((f) => (
                <option key={f.id} value={f.id}>
                  🏪 {f.facilityName} ({f.facilityCode})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-secondary)" }}>
              Table Numbers (comma separated):
            </label>
            <Input
              type="text"
              value={tableInput}
              onChange={(e) => setTableInput(e.target.value)}
              placeholder="e.g. 1, 2, 3, 4, 5 or T-01, T-02"
              style={{ marginTop: "0.35rem", fontSize: "0.85rem" }}
            />
          </div>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <Button
              variant="primary"
              onClick={handlePrint}
              disabled={cards.length === 0}
              style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
            >
              🖨️ Print Placards
            </Button>
          </div>
        </div>

        {/* QR Code Cards Preview Grid (Printable Area) */}
        <div
          id="printable-qr-placards"
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "1.5rem",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: "1.25rem",
            backgroundColor: "var(--bg-primary)",
          }}
        >
          {generating ? (
            <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
              Generating QR barcodes...
            </div>
          ) : cards.length === 0 ? (
            <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
              Please enter at least one table number above.
            </div>
          ) : (
            cards.map((card) => (
              <div
                key={card.tableNumber}
                className="qr-table-placard"
                style={{
                  backgroundColor: "#ffffff",
                  color: "#0f172a",
                  borderRadius: "12px",
                  padding: "1.25rem 1rem",
                  textAlign: "center",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                  border: "2px solid #e2e8f0",
                  pageBreakInside: "avoid",
                }}
              >
                <div style={{ fontSize: "0.7rem", fontWeight: 800, letterSpacing: "0.08em", color: "#6366f1", textTransform: "uppercase" }}>
                  {selectedFacility?.facilityName || "PROJECT Z"}
                </div>
                <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#1e293b", marginTop: "0.15rem" }}>
                  Scan to Order
                </div>

                <div
                  style={{
                    backgroundColor: "#f8fafc",
                    padding: "0.5rem",
                    borderRadius: "8px",
                    margin: "0.75rem 0",
                    border: "1px solid #cbd5e1",
                  }}
                >
                  <img
                    src={card.qrDataUrl}
                    alt={`Table ${card.tableNumber} QR`}
                    style={{ width: "160px", height: "160px", display: "block" }}
                  />
                </div>

                <div
                  style={{
                    fontSize: "1.15rem",
                    fontWeight: 900,
                    color: "#0f172a",
                    letterSpacing: "-0.02em",
                  }}
                >
                  TABLE {card.tableNumber}
                </div>
                <div style={{ fontSize: "0.68rem", color: "#64748b", marginTop: "0.2rem", maxWidth: "180px", lineHeight: 1.25 }}>
                  Point your phone camera to browse menu & place order
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: "1rem 1.5rem",
            borderTop: "1px solid var(--border-subtle)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            backgroundColor: "var(--bg-surface-elevated)",
          }}
        >
          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
            Tip: Print on cardstock paper and display in acrylic table tents.
          </span>
          <Button variant="secondary" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
