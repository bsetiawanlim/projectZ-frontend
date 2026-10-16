import enJson from './en.json';
import idJson from './id.json';
import zhJson from './zh.json';

export type SupportedLocale = 'en' | 'id' | 'zh';

export interface LocaleOption {
  code: SupportedLocale;
  label: string;
  flag: string;
}

export const SUPPORTED_LOCALES: LocaleOption[] = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'id', label: 'Bahasa Indonesia', flag: '🇮🇩' },
  { code: 'zh', label: '中文 (简体)', flag: '🇨🇳' },
];

export const DEFAULT_LOCALE: SupportedLocale = 'en';

export const translations = {
  en: enJson,
  id: idJson,
  zh: zhJson,
} as const;

export type TranslationSchema = typeof enJson;

export function getTranslation(
  locale: SupportedLocale,
  keyPath: string,
  params?: Record<string, string | number>
): string {
  const dict = translations[locale] || translations.en;
  const parts = keyPath.split('.');
  let current: any = dict;

  for (const p of parts) {
    if (current && typeof current === 'object' && p in current) {
      current = current[p];
    } else {
      let fallback: any = translations.en;
      for (const fp of parts) {
        if (fallback && typeof fallback === 'object' && fp in fallback) {
          fallback = fallback[fp];
        } else {
          return keyPath;
        }
      }
      current = fallback;
      break;
    }
  }

  if (typeof current !== 'string') {
    return keyPath;
  }

  if (params) {
    return current.replace(/\{(\w+)\}/g, (_, k) => (params[k] !== undefined ? String(params[k]) : '{' + k + '}'));
  }

  return current;
}
