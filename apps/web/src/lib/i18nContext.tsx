"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import type { SupportedLocale, LocaleOption } from "@pz/shared";
import { SUPPORTED_LOCALES, DEFAULT_LOCALE, getTranslation } from "@pz/shared";

interface I18nContextType {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
  t: (keyPath: string, params?: Record<string, string | number>) => string;
  locales: LocaleOption[];
  currentLocaleOption: LocaleOption;
}

const I18nContext = createContext<I18nContextType | null>(null);

const STORAGE_KEY = "pz_app_locale";

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<SupportedLocale>(DEFAULT_LOCALE);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as SupportedLocale | null;
      if (saved && (saved === "en" || saved === "id" || saved === "zh")) {
        setLocaleState(saved);
      } else {
        // Detect browser language
        const browserLang = navigator.language.slice(0, 2);
        if (browserLang === "id") setLocaleState("id");
        else if (browserLang === "zh") setLocaleState("zh");
      }
    } catch {
      // Ignore localStorage errors
    } finally {
      setMounted(true);
    }
  }, []);

  const setLocale = useCallback((newLocale: SupportedLocale) => {
    setLocaleState(newLocale);
    try {
      localStorage.setItem(STORAGE_KEY, newLocale);
      document.documentElement.lang = newLocale;
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const t = useCallback(
    (keyPath: string, params?: Record<string, string | number>) => {
      return getTranslation(locale, keyPath, params);
    },
    [locale]
  );

  const currentLocaleOption = useMemo(() => {
    return SUPPORTED_LOCALES.find((l) => l.code === locale) ?? (SUPPORTED_LOCALES[0] as LocaleOption);
  }, [locale]);

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t,
      locales: SUPPORTED_LOCALES,
      currentLocaleOption,
    }),
    [locale, setLocale, t, currentLocaleOption]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return ctx;
}
