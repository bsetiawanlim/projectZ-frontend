"use client";

import React, { useState, useRef, useEffect } from "react";
import { useI18n } from "@/lib/i18nContext";
import type { SupportedLocale } from "@pz/shared";

export function LanguageSwitcher() {
  const { locale, setLocale, locales, currentLocaleOption } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.4rem",
          padding: "0.35rem 0.65rem",
          borderRadius: "var(--radius-md)",
          backgroundColor: "var(--bg-surface-elevated)",
          border: "1px solid var(--border-subtle)",
          color: "var(--text-primary)",
          fontSize: "0.825rem",
          fontWeight: 600,
          cursor: "pointer",
          transition: "all var(--transition-fast)",
        }}
        title="Change Language"
      >
        <span style={{ fontSize: "1rem" }}>{currentLocaleOption.flag}</span>
        <span>{currentLocaleOption.code.toUpperCase()}</span>
        <span style={{ fontSize: "0.7rem", opacity: 0.6 }}>▼</span>
      </button>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            right: 0,
            backgroundColor: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
            zIndex: 100,
            minWidth: "160px",
            padding: "0.35rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.2rem",
          }}
        >
          {locales.map((loc) => {
            const isSelected = loc.code === locale;
            return (
              <button
                key={loc.code}
                type="button"
                onClick={() => {
                  setLocale(loc.code as SupportedLocale);
                  setIsOpen(false);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.6rem",
                  width: "100%",
                  padding: "0.45rem 0.65rem",
                  borderRadius: "var(--radius-sm)",
                  border: "none",
                  backgroundColor: isSelected ? "var(--bg-surface-elevated)" : "transparent",
                  color: isSelected ? "var(--accent-cyan)" : "var(--text-secondary)",
                  fontWeight: isSelected ? 600 : 400,
                  fontSize: "0.825rem",
                  textAlign: "left",
                  cursor: "pointer",
                  transition: "background-color var(--transition-fast)",
                }}
              >
                <span style={{ fontSize: "1.1rem" }}>{loc.flag}</span>
                <span style={{ flex: 1 }}>{loc.label}</span>
                {isSelected && <span>✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
