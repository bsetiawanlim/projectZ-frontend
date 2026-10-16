import React, { Suspense } from "react";
import { TableOrderClient } from "@/components/table-order/TableOrderClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Table Order | Quick Self-Service Menu",
  description: "Browse menu items, customize options, and order directly from your table via barcode.",
};

export default function DirectTableOrderPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "var(--bg-primary)",
            color: "var(--text-muted)",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🍽️</div>
            <p>Loading table menu...</p>
          </div>
        </div>
      }
    >
      <TableOrderClient />
    </Suspense>
  );
}
