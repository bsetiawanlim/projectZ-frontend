"use client";

import React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "glass";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  isLoading = false,
  disabled,
  style,
  id,
  ...props
}: ButtonProps) {
  const baseStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.5rem",
    fontWeight: 500,
    borderRadius: "var(--radius-md)",
    cursor: disabled || isLoading ? "not-allowed" : "pointer",
    opacity: disabled || isLoading ? 0.6 : 1,
    transition: "all var(--transition-fast)",
    outline: "none",
  };

  const sizeStyles: Record<string, React.CSSProperties> = {
    sm: { padding: "0.35rem 0.75rem", fontSize: "0.85rem" },
    md: { padding: "0.55rem 1.1rem", fontSize: "0.925rem" },
    lg: { padding: "0.75rem 1.5rem", fontSize: "1.05rem" },
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    primary: {
      backgroundColor: "var(--primary)",
      color: "#ffffff",
      boxShadow: "0 2px 8px var(--primary-glow)",
    },
    secondary: {
      backgroundColor: "var(--bg-surface-elevated)",
      color: "var(--text-primary)",
      border: "1px solid var(--border-subtle)",
    },
    danger: {
      backgroundColor: "var(--accent-rose)",
      color: "#ffffff",
    },
    ghost: {
      backgroundColor: "transparent",
      color: "var(--text-secondary)",
    },
    glass: {
      backgroundColor: "var(--bg-glass)",
      backdropFilter: "blur(12px)",
      border: "1px solid var(--border-subtle)",
      color: "var(--text-primary)",
    },
  };

  return (
    <button
      id={id}
      disabled={disabled || isLoading}
      style={{
        ...baseStyle,
        ...sizeStyles[size],
        ...variantStyles[variant],
        ...style,
      }}
      {...props}
    >
      {isLoading && (
        <span
          style={{
            display: "inline-block",
            width: "14px",
            height: "14px",
            border: "2px solid rgba(255,255,255,0.3)",
            borderTopColor: "#fff",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
          }}
        />
      )}
      {children}
    </button>
  );
}
