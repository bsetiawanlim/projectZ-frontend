"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/authContext";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
      router.push("/pos");
    } catch (err: any) {
      setError(err?.message || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      style={{
        display: "flex",
        minHeight: "100vh",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        background: "radial-gradient(ellipse at top, #1e1b4b 0%, #0a0d14 60%)",
      }}
    >
      <div style={{ width: "100%", maxWidth: "420px" }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{ display: "inline-block", marginBottom: "1rem" }}>
            <img
              src="/logo.png"
              alt="CRONO Logo"
              style={{
                height: "60px",
                width: "auto",
                objectFit: "contain",
                filter: "drop-shadow(0 4px 16px rgba(212, 175, 55, 0.35))",
              }}
            />
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", marginTop: "0.25rem" }}>
            Sign in to access your terminal & ERP
          </p>
        </div>


        <Card glass style={{ padding: "2rem" }}>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {error && (
              <div
                id="login-error-banner"
                style={{
                  padding: "0.75rem 1rem",
                  backgroundColor: "rgba(244, 63, 94, 0.15)",
                  border: "1px solid rgba(244, 63, 94, 0.3)",
                  borderRadius: "var(--radius-md)",
                  color: "var(--accent-rose)",
                  fontSize: "0.875rem",
                }}
              >
                {error}
              </div>
            )}

            <Input
              id="login-email"
              label="Email Address"
              type="email"
              required
              placeholder="operator@projectz.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <Input
              id="login-password"
              label="Password"
              type="password"
              required
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <Button
              id="login-submit-btn"
              type="submit"
              size="lg"
              isLoading={loading}
              style={{ width: "100%", marginTop: "0.5rem" }}
            >
              Sign In
            </Button>
          </form>
        </Card>

        <p
          style={{
            textAlign: "center",
            marginTop: "1.5rem",
            color: "var(--text-muted)",
            fontSize: "0.85rem",
          }}
        >
          Protected system. Authorized access only.
        </p>
      </div>
    </main>
  );
}
