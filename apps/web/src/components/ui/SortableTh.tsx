"use client";

import React, { useState } from "react";

export interface SortableThProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  field: string;
  currentSortField: string;
  currentSortOrder: "asc" | "desc";
  onSort: (field: any) => void;
  align?: "left" | "center" | "right";
  children: React.ReactNode;
}

export function SortableTh({
  field,
  currentSortField,
  currentSortOrder,
  onSort,
  align = "left",
  children,
  style,
  title,
  ...props
}: SortableThProps) {
  const [isHovered, setIsHovered] = useState(false);
  const isActive = currentSortField === field;

  return (
    <th
      style={{
        cursor: "pointer",
        userSelect: "none",
        textAlign: align,
        transition: "color 0.15s ease",
        color: isActive ? "var(--text-primary, #fff)" : isHovered ? "var(--text-primary, #fff)" : undefined,
        ...style,
      }}
      onClick={() => onSort(field)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title={
        title ||
        (isActive
          ? `Sorted ${currentSortOrder === "asc" ? "Ascending" : "Descending"}. Click to toggle.`
          : `Click to sort by ${typeof children === "string" ? children : field}`)
      }
      {...props}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.35rem",
          justifyContent: align === "right" ? "flex-end" : align === "center" ? "center" : "flex-start",
        }}
      >
        <span>{children}</span>
        <span
          style={{
            fontSize: "0.75rem",
            opacity: isActive ? 1 : isHovered ? 0.75 : 0.35,
            color: isActive ? "var(--primary, #6366f1)" : "inherit",
            transition: "all 0.15s ease",
            transform: isActive && currentSortOrder === "desc" ? "translateY(1px)" : undefined,
          }}
        >
          {isActive ? (currentSortOrder === "asc" ? "▲" : "▼") : "↕"}
        </span>
      </span>
    </th>
  );
}
