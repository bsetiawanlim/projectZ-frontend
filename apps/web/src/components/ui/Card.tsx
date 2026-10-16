import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  glass?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ children, glass = true, style, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={glass ? "glass-panel" : undefined}
        style={{
          padding: "1.5rem",
          backgroundColor: glass ? undefined : "var(--bg-surface)",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--border-subtle)",
          ...style,
        }}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Card.displayName = "Card";
