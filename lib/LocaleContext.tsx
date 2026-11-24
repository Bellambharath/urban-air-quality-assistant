"use client";

/**
 * lib/LocaleContext.tsx
 *
 * React context for the active UI locale.
 * Syncs with the user's saved profile locale and persists changes via saveProfile.
 */

import { createContext, useContext, useState, useEffect } from "react";
import { useProfile } from "@/hooks/useProfile";
import { saveProfile } from "@/lib/profile";
import type { Locale, UIStrings } from "@/lib/i18n";
import { t } from "@/lib/i18n";

// ─── Context ──────────────────────────────────────────────────────────────────

interface LocaleContextValue {
  locale: Locale;
  setLocale: (_l: Locale) => void;
}

export const LocaleContext = createContext<LocaleContextValue>({
  locale: "en" as Locale,
  setLocale: (_l: Locale) => {},
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useProfile();
  const [locale, setLocaleState] = useState<Locale>("en");

  // Sync locale from profile when it loads / changes
  useEffect(() => {
    if (profile?.locale) {
      setLocaleState(profile.locale as Locale);
    }
  }, [profile?.locale]);

  function handleSetLocale(newLocale: Locale) {
    setLocaleState(newLocale);
    if (profile) {
      saveProfile({ ...profile, locale: newLocale, updatedAt: new Date().toISOString() });
    }
  }

  return (
    <LocaleContext.Provider value={{ locale, setLocale: handleSetLocale }}>
      {children}
    </LocaleContext.Provider>
  );
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useLocale(): LocaleContextValue {
  return useContext(LocaleContext);
}

export function useT(): (key: keyof UIStrings) => string {
  const { locale } = useLocale();
  return (key: keyof UIStrings) => t(locale, key);
}
