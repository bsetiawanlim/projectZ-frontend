"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default function PosReportsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/report?tab=sales");
  }, [router]);

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
      <Card style={{ padding: "2rem", textAlign: "center", maxWidth: "420px" }}>
        <span style={{ fontSize: "2.5rem" }}>📊</span>
        <h3 style={{ margin: "1rem 0 0.5rem", color: "var(--text-primary)" }}>
          Redirecting to Reports Hub...
        </h3>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "1.5rem" }}>
          Sales reports have been consolidated into the unified Reports Hub alongside Payroll, Equipment, and Product Opname.
        </p>
        <Button onClick={() => router.replace("/report?tab=sales")}>
          Go to Sales Report →
        </Button>
      </Card>
    </div>
  );
}
