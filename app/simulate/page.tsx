"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, FlaskConical, Wind, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getLocalizedBand } from "@/lib/cpcb-bands";
import { useLocale, useT } from "@/lib/LocaleContext";
import { formatLocalizedHour } from "@/lib/i18n";
import type { CommuteModeType, SimulateResult } from "@/lib/types";
import { useProfile } from "@/hooks/useProfile";
import { useAQI } from "@/hooks/useAQI";

// ─── Sub-components ────────────────────────────────────────────────────────────

interface MetricCardProps {
  label: string;
  value: string;
  sub: string;
  hidden?: boolean;
}

function MetricCard({ label, value, sub, hidden }: MetricCardProps) {
  if (hidden) return null;
  return (
    <div className="rounded-xl border border-border bg-card/60 p-4 flex flex-col gap-1">
      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
      <p className="text-xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function SimulatePage() {
  const router = useRouter();
  const { locale } = useLocale();
  const t = useT();
  const { profile, isLoaded } = useProfile();
  const { snapshot } = useAQI(
    profile?.lat ?? null,
    profile?.lng ?? null
  );

  // ── State ──────────────────────────────────────────────────────────────────
  const [purifierOn, setPurifierOn] = useState(false);
  const [commuteMode, setCommuteMode] = useState<CommuteModeType>("metro");
  const [activityHour, setActivityHour] = useState(7);
  const [activityDurationMin, setActivityDurationMin] = useState(60);
  const [result, setResult] = useState<SimulateResult | null>(null);
  const [computing, setComputing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const commuteModes: { mode: CommuteModeType; label: string; emoji: string }[] = [
    { mode: "metro", label: locale === "hi" ? "मेट्रो" : "Metro", emoji: "🚇" },
    { mode: "bus", label: locale === "hi" ? "बस" : "Bus", emoji: "🚌" },
    { mode: "bike", label: locale === "hi" ? "बाइक" : "Bike", emoji: "🚲" },
    { mode: "wfh", label: locale === "hi" ? "घर से काम" : "WFH", emoji: "🏠" },
    { mode: "car_petrol", label: locale === "hi" ? "कार" : "Car", emoji: "🚗" },
  ];

  // Initialise commute mode from profile once loaded
  useEffect(() => {
    if (profile?.commute?.mode) {
      setCommuteMode(profile.commute.mode);
    }
  }, [profile]);

  // Initialise activity hour to the cleanest forecast hour on load
  const initialHourSet = useRef(false);
  useEffect(() => {
    if (!snapshot?.forecast || snapshot.forecast.length === 0 || initialHourSet.current) return;
    const eligible = snapshot.forecast.filter((h) => h.hour >= 5 && h.hour <= 22);
    if (eligible.length > 0) {
      const cleanest = eligible.reduce((min, h) => (h.pm25 < min.pm25 ? h : min), eligible[0]);
      setActivityHour(cleanest.hour);
      initialHourSet.current = true;
    }
  }, [snapshot]);

  // Redirect if no profile after loading
  useEffect(() => {
    if (isLoaded && !profile) {
      router.replace("/dashboard");
    }
  }, [isLoaded, profile, router]);

  // ── Debounced compute ──────────────────────────────────────────────────────
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!snapshot || !profile) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      setComputing(true);
      setError(null);
      try {
        const res = await fetch("/api/simulate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            profile,
            aqiSnapshot: snapshot,
            toggles: {
              purifierOn,
              commuteMode,
              activityHour,
              activityDurationMin,
            },
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? "Simulation failed");
        }
        const data: SimulateResult = await res.json();
        setResult(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setComputing(false);
      }
    }, 300);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [purifierOn, commuteMode, activityHour, activityDurationMin, snapshot, profile]);

  // ── Loading / guard ────────────────────────────────────────────────────────
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!profile) return null; // redirect in-flight

  // ── AQI at selected hour ───────────────────────────────────────────────────
  const hourlyAQI = snapshot?.forecast.find((h) => h.hour === activityHour)?.aqi;
  const hourBand = hourlyAQI != null ? getLocalizedBand(hourlyAQI, locale) : null;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => router.push("/dashboard")}
            aria-label={t("backDashboard")}
          >
            <ArrowLeft className="size-4" />
          </Button>
          <div className="flex items-center gap-2">
            <FlaskConical className="size-5 text-primary" />
            <h1 className="font-semibold text-sm">{t("whatIfTitle")}</h1>
          </div>
        </div>
      </nav>

      {/* Main */}
      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">

        {/* Controls card */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-5">
          <h2 className="font-semibold text-base">{t("exploreImpact")}</h2>

          {/* Toggle: Air purifier */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">
                {profile?.home?.hasPurifier ? t("runPurifier") : t("addPurifier")}
              </p>
              <p className="text-muted-foreground text-xs mt-0.5">
                {t("purifierSub")}
              </p>
            </div>
            <button
              role="switch"
              aria-checked={purifierOn}
              onClick={() => setPurifierOn((v) => !v)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                purifierOn ? "bg-primary" : "bg-muted"
              }`}
            >
              <span
                className={`pointer-events-none absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                  purifierOn ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>

          {/* Commute mode pills */}
          <div>
            <p className="text-sm font-medium mb-2">{t("commuteMode")}</p>
            <div className="flex gap-2 flex-wrap">
              {commuteModes.map(({ mode, label, emoji }) => (
                <button
                  key={mode}
                  onClick={() => setCommuteMode(mode)}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
                    commuteMode === mode
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
                  }`}
                >
                  <span>{emoji}</span>
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Activity hour slider */}
          <div className="space-y-2">
            <p className="text-sm font-medium">{t("activityHour")}</p>
            <input
              type="range"
              min={5}
              max={22}
              step={1}
              value={activityHour}
              onChange={(e) => setActivityHour(Number(e.target.value))}
              className="w-full accent-primary h-2 rounded-full cursor-pointer"
              aria-label={t("activityHour")}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{formatLocalizedHour(activityHour, locale)}</span>
              <span>
                {snapshot
                  ? hourlyAQI != null
                    ? (
                        <span className={hourBand?.color}>
                          AQI {hourlyAQI} · {hourBand?.localizedName}
                        </span>
                      )
                    : "AQI: —"
                  : t("loading")}
              </span>
            </div>
          </div>

          {/* Activity duration */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <p className="text-sm font-medium">{t("activityDuration")}</p>
              <span className="text-xs text-muted-foreground font-medium">
                {activityDurationMin} {t("minUnit")}
              </span>
            </div>
            <input
              type="range"
              min={15}
              max={180}
              step={15}
              value={activityDurationMin}
              onChange={(e) => setActivityDurationMin(Number(e.target.value))}
              className="w-full accent-primary h-2 rounded-full cursor-pointer"
              aria-label={t("activityDuration")}
            />
          </div>
        </div>

        {/* Results */}
        <AnimatePresence mode="wait">
          {computing ? (
            <motion.div
              key="skeleton"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              <Skeleton className="h-8 w-40 rounded-full" />
              <div className="grid grid-cols-2 gap-3">
                <Skeleton className="h-24 rounded-xl" />
                <Skeleton className="h-24 rounded-xl" />
                <Skeleton className="h-24 rounded-xl" />
                <Skeleton className="h-24 rounded-xl" />
              </div>
            </motion.div>
          ) : error ? (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive"
            >
              {error}
            </motion.div>
          ) : result ? (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-4"
            >
              {result.pctExposureCut > 0 && (
                <div className="inline-flex items-center gap-1.5 rounded-full bg-green-500/20 px-3 py-1 text-green-400 text-sm font-bold">
                  <Wind className="size-3.5" />
                  {result.pctExposureCut}% {t("doseCut")}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <MetricCard
                  label={t("indoorPm25Label")}
                  value={`${result.indoorPM25After} µg`}
                  sub={result.pctIndoorDrop > 0 ? `↓${result.pctIndoorDrop}%` : t("noChange")}
                />
                <MetricCard
                  label={t("co2SavedLabel")}
                  value={`${result.co2SavedKgWeek} kg`}
                  sub={t("perWeek")}
                  hidden={result.co2SavedKgWeek === 0}
                />
                <MetricCard
                  label={t("baseline")}
                  value={`${result.baselineCigEq.toFixed(1)} 🚬`}
                  sub={t("cigaretteEq")}
                />
                <MetricCard
                  label={t("optimized")}
                  value={`${result.optimizedCigEq.toFixed(1)} 🚬`}
                  sub={t("cigaretteEq")}
                />
              </div>

              {result.exposureAvoidedUg > 0 && (
                <p className="text-sm text-muted-foreground px-1">
                  🌿 <span className="text-foreground font-medium">{result.exposureAvoidedUg} µg</span> {t("avoidedByTiming")}
                </p>
              )}
            </motion.div>
          ) : (
            <motion.p
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-muted-foreground text-sm text-center py-8"
            >
              {t("adjustControls")}
            </motion.p>
          )}
        </AnimatePresence>

        {/* How we calculate */}
        <details className="rounded-xl border border-border bg-card/40 overflow-hidden">
          <summary className="cursor-pointer px-5 py-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors select-none list-none flex items-center gap-2">
            <span>📐</span>
            {t("howWeCalculate")}
          </summary>
          <div className="px-5 pb-4 pt-1">
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t("howWeCalculateBody")}
            </p>
          </div>
        </details>

        {/* Footer disclaimer */}
        <footer className="text-center pb-4">
          <p className="text-xs text-muted-foreground/60">
            {t("disclaimer")}
          </p>
        </footer>
      </main>
    </div>
  );
}
