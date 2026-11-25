"use client";

/**
 * components/ui/LanguageToggle.tsx
 *
 * Language switcher: EN / हि
 * Uses LocaleContext to read and update the active locale.
 */

import type { Locale } from "@/lib/i18n";
import { LOCALE_LABELS } from "@/lib/i18n";
import { useLocale } from "@/lib/LocaleContext";

const LOCALES: Locale[] = ["en", "hi"];

export function LanguageToggle() {
  const { locale, setLocale } = useLocale();

  return (
    <div className="flex items-center gap-1 rounded-full bg-muted/30 p-0.5">
      {LOCALES.map((l) => {
        const isActive = locale === l;
        return (
          <button
            key={l}
            onClick={() => setLocale(l)}
            className={[
              "rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors cursor-pointer",
              isActive
                ? "bg-primary text-primary-foreground"
                : "bg-muted/50 text-muted-foreground hover:bg-muted",
            ].join(" ")}
            aria-label={`Switch language to ${l === "hi" ? "Hindi" : "English"}`}
            aria-pressed={isActive}
          >
            {LOCALE_LABELS[l]}
          </button>
        );
      })}
    </div>
  );
}
