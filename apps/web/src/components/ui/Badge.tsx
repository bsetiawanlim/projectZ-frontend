import React from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "danger" | "info";
}

export function Badge({ children, variant = "default", style, ...props }: BadgeProps) {
  const variantStyles: Record<string, React.CSSProperties> = {
    default: {
      backgroundColor: "var(--bg-surface-elevated)",
      color: "var(--text-secondary)",
      border: "1px solid var(--border-subtle)",
    },
    success: {
      backgroundColor: "rgba(16, 185, 129, 0.15)",
      color: "var(--accent-emerald)",
      border: "1px solid rgba(16, 185, 129, 0.3)",
    },
    warning: {
      backgroundColor: "rgba(245, 158, 11, 0.15)",
      color: "var(--accent-amber)",
      border: "1px solid rgba(245, 158, 11, 0.3)",
    },
    danger: {
      backgroundColor: "rgba(244, 63, 94, 0.15)",
      color: "var(--accent-rose)",
      border: "1px solid rgba(244, 63, 94, 0.3)",
    },
    info: {
      backgroundColor: "rgba(6, 182, 212, 0.15)",
      color: "var(--accent-cyan)",
      border: "1px solid rgba(6, 182, 212, 0.3)",
    },
  };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "0.2rem 0.6rem",
        borderRadius: "var(--radius-full)",
        fontSize: "0.75rem",
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.03em",
        ...variantStyles[variant],
        ...style,
      }}
      {...props}
    >
      {children}
    </span>
  );
}
