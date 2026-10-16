"use client";

import React from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, style, id, ...props }: InputProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", width: "100%" }}>
      {label && (
        <label
          htmlFor={id}
          style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--text-secondary)" }}
        >
          {label}
        </label>
      )}
      <input
        id={id}
        style={{
          width: "100%",
          padding: "0.6rem 0.9rem",
          backgroundColor: "var(--bg-surface)",
          border: error ? "1px solid var(--accent-rose)" : "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-md)",
          color: "var(--text-primary)",
          fontSize: "0.925rem",
          outline: "none",
          transition: "border-color var(--transition-fast)",
          ...style,
        }}
        {...props}
      />
      {error && (
        <span style={{ fontSize: "0.75rem", color: "var(--accent-rose)" }}>{error}</span>
      )}
    </div>
  );
}
