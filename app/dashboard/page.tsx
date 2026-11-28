"use client";

/**
 * app/dashboard/page.tsx
 *
 * Main dashboard: live AQI gauge, safe-outdoor-window strip, the personalized
 * daily plan, and the personal exposure meter. Fetches the plan via /api/plan.
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Settings, RefreshCw, AlertCircle, MessageCircle, Map as MapIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AQIGauge } from "@/components/aqi/AQIGauge";
import { SafeWindowStrip } from "@/components/aqi/SafeWindowStrip";
import { PlanTimeline } from "@/components/plan/PlanTimeline";
import { PlanTomorrowCard } from "@/components/forecast/PlanTomorrowCard";
import { ExposureMeter } from "@/components/exposure/ExposureMeter";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { useProfile } from "@/hooks/useProfile";
import { useAQI } from "@/hooks/useAQI";
import { getLocalizedBand } from "@/lib/cpcb-bands";
import { useLocale, useT } from "@/lib/LocaleContext";
import { translateCity } from "@/lib/i18n";
import type { PlanResponse } from "@/lib/types";

export default function DashboardPage() {
  const router = useRouter();
  const { locale } = useLocale();
  const tStr = useT();
  const { profile, isLoaded } = useProfile();

  const {
    snapshot,
    isLoading: aqiLoading,
    error: aqiError,
    refresh,
  } = useAQI(profile?.lat ?? null, profile?.lng ?? null);

  const [plan, setPlan] = useState<PlanResponse | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);

  // Redirect to onboarding if no profile
  useEffect(() => {
    if (isLoaded && !profile) router.replace("/onboarding");
  }, [isLoaded, profile, router]);

  // Fetch plan when AQI + profile + locale are available or locale changes
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastPlanLocaleRef = useRef<string | null>(null);

  const fetchPlan = useCallback(async (targetLocale: string = locale) => {
    if (!profile || !snapshot) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setPlanLoading(true);
    setPlanError(null);
    lastPlanLocaleRef.current = targetLocale;

    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 15000);

    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: { ...profile, locale: targetLocale },
          aqiSnapshot: snapshot,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Plan generation failed");
      }
      const data: PlanResponse = await res.json();
      setPlan(data);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError" && lastPlanLocaleRef.current !== targetLocale) {
        // Ignore superseded abort
        return;
      }
      setPlanError(
        err instanceof Error && err.name === "AbortError"
          ? "Plan generation timed out. Please try again."
          : err instanceof Error
          ? err.message
          : "Could not generate plan"
      );
    } finally {
      clearTimeout(timeoutId);
      setPlanLoading(false);
    }
  }, [profile, snapshot, locale]);

  useEffect(() => {
    if (snapshot && profile) {
      if (!plan && !planLoading && !planError) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- starts async plan fetch when live data first arrives
        fetchPlan(locale);
      } else if (lastPlanLocaleRef.current && lastPlanLocaleRef.current !== locale) {
        // Locale toggled: re-fetch plan & morning brief in the new language
        fetchPlan(locale);
      }
    }
  }, [snapshot, profile, locale, plan, planLoading, planError, fetchPlan]);

  if (!isLoaded || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground text-sm animate-pulse">{tStr("loadingProfile")}</div>
      </div>
    );
  }

  const band = snapshot ? getLocalizedBand(snapshot.aqi, locale) : null;

  // Build a household-specific health note from the AQI data (fully localized for Hindi)
  function buildHealthNote(): string {
    if (!snapshot || !band || !profile) return "";
    const { healthRecs } = snapshot;
    const { household } = profile;

    if (locale === "hi") {
      const severeOrPoor = snapshot.aqi >= 201;
      if (household.conditions.includes("asthma") || household.conditions.includes("copd")) {
        return severeOrPoor
          ? "अस्थमा/श्वसन रोगियों के लिए उच्च जोखिम: घर के अंदर ही रहें, खिड़कियाँ बंद रखें और यदि संभव हो तो एयर प्यूरीफायर चलाएँ।"
          : band.localizedAdvice;
      }
      if (household.elderly > 0 && severeOrPoor) {
        return "बुजुर्ग सदस्यों को आज बाहर जाने और भारी परिश्रम से बचने की सलाह है। घर के अंदर स्वच्छ हवा बनाए रखें।";
      }
      if (household.kids > 0 && severeOrPoor) {
        return "बच्चों के लिए बाहर खेलना सीमित रखें; यदि बाहर जाना आवश्यक हो तो N95 मास्क का उपयोग करें।";
      }
      return band.localizedAdvice;
    }

    if (household.conditions.includes("asthma") || household.conditions.includes("copd")) {
      return healthRecs.lungDisease ?? healthRecs.generalPopulation ?? band.advice;
    }
    if (household.elderly > 0) {
      return healthRecs.elderly ?? healthRecs.generalPopulation ?? band.advice;
    }
    if (household.kids > 0) {
      return healthRecs.children ?? healthRecs.generalPopulation ?? band.advice;
    }
    return healthRecs.generalPopulation ?? band.advice;
  }

  const formattedTime = snapshot
    ? new Date(snapshot.fetchedAt).toLocaleTimeString(locale === "hi" ? "hi-IN" : "en-IN")
    : "";

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-md px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-base">{tStr("appName")}</h1>
          <p className="text-xs text-muted-foreground">{translateCity(locale, profile.city)}</p>
        </div>
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/map")}
            title={tStr("mapTitle")}
          >
            <MapIcon className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={refresh} title={tStr("refresh")}>
            <RefreshCw className={`w-4 h-4 ${aqiLoading ? "animate-spin" : ""}`} />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => router.push("/onboarding")} title="Settings">
            <Settings className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => router.push("/chat")} title={tStr("chatTitle")}>
            <MessageCircle className="w-4 h-4" />
          </Button>
        </div>
      </nav>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-8 pb-20">
        {/* Morning brief (if present) */}
        {planLoading ? (
          <div className="bg-muted/40 border border-border rounded-xl p-4 space-y-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : plan?.morningBrief ? (
          <motion.div
            key={`${locale}-${plan.generatedAt}`}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-muted/40 border border-border rounded-xl p-4 text-sm text-muted-foreground leading-relaxed"
          >
            <p className="text-xs font-medium text-foreground mb-1">{tStr("todaysAirStory")}</p>
            {plan.morningBrief}
          </motion.div>
        ) : null}

        {/* AQI section */}
        <section className="space-y-4">
          {aqiError ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <AlertCircle className="w-8 h-8 text-destructive" />
              <p className="text-sm text-muted-foreground">
                {tStr("aqiLoadErrorLine1")}
                <br />
                {tStr("aqiLoadErrorLine2")}
              </p>
              <Button size="sm" variant="outline" onClick={refresh}>
                {tStr("retry")}
              </Button>
            </div>
          ) : aqiLoading || !snapshot ? (
            <div className="flex flex-col items-center gap-4">
              <Skeleton className="w-52 h-40 rounded-full" />
              <Skeleton className="w-32 h-4" />
              <Skeleton className="w-48 h-3" />
            </div>
          ) : (
            <>
              <AQIGauge aqi={snapshot.aqi} pm25={snapshot.pm25} size={220} className="mx-auto" />

              {/* Personalised health note */}
              <div
                className="rounded-xl border p-4 text-sm leading-relaxed"
                style={{ borderColor: band?.hex + "40", backgroundColor: band?.hex + "10" }}
              >
                <p style={{ color: band?.hex }}>{buildHealthNote()}</p>
              </div>

              {/* Data source + timestamp */}
              <p className="text-[11px] text-muted-foreground/60 text-center">
                {tStr("sourceLabel")}: {snapshot.source} · {tStr("fetchedLabel")} {formattedTime}
              </p>
            </>
          )}
        </section>

        {/* Safe outdoor window */}
        {snapshot && snapshot.forecast.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold mb-3">{tStr("safeWindow")}</h2>
            <SafeWindowStrip forecast={snapshot.forecast.slice(0, 24)} />
          </section>
        )}

        {/* Plan Tomorrow */}
        {snapshot && snapshot.forecast.length > 0 && profile && (
          <section>
            <PlanTomorrowCard forecast={snapshot.forecast} profile={profile} />
          </section>
        )}

        {/* Personal Exposure Meter */}
        {snapshot && snapshot.forecast.length > 0 && profile && (
          <section>
            <ExposureMeter profile={profile} snapshot={snapshot} />
          </section>
        )}

        {/* Clean-Air Plan */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">{tStr("planTitle")}</h2>
            {plan && !planLoading && (
              <button
                onClick={() => fetchPlan(locale)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                {tStr("refresh")}
              </button>
            )}
          </div>

          {planError ? (
            <div className="text-sm text-muted-foreground bg-muted/40 border border-border rounded-xl p-5 text-center space-y-3">
              <p className="text-foreground font-medium">{tStr("planErrorTitle")}</p>
              <p className="text-xs text-muted-foreground">{planError}</p>
              <Button size="sm" variant="outline" onClick={() => fetchPlan(locale)} className="gap-2 mx-auto">
                <RefreshCw className="size-3.5" />
                {tStr("retryPlan")}
              </Button>
            </div>
          ) : (
            <PlanTimeline items={plan?.items ?? []} isLoading={planLoading} />
          )}
        </section>

        {/* What-if link */}
        <section className="text-center">
          <Button variant="outline" onClick={() => router.push("/simulate")} className="w-full">
            {tStr("whatIf")}
          </Button>
        </section>
      </main>

      {/* Disclaimer footer */}
      <footer className="fixed bottom-0 left-0 right-0 border-t border-border bg-background/80 backdrop-blur-md px-4 py-2 text-center">
        <p className="text-[10px] text-muted-foreground">
          {tStr("disclaimer")}
        </p>
      </footer>
    </div>
  );
}
