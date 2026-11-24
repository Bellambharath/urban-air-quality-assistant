"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { RefreshCw, AlertCircle, Settings, MessageCircle, Map as MapIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AQIGauge } from "@/components/aqi/AQIGauge";
import { AQIBadge } from "@/components/aqi/AQIBadge";
import { SafeWindowStrip } from "@/components/aqi/SafeWindowStrip";
import { ExposureMeter } from "@/components/exposure/ExposureMeter";
import { PlanTomorrowCard } from "@/components/forecast/PlanTomorrowCard";
import { PlanTimeline } from "@/components/plan/PlanTimeline";
import { useProfile } from "@/hooks/useProfile";
import { useAQI } from "@/hooks/useAQI";
import { getBand } from "@/lib/cpcb-bands";
import type { PlanResponse } from "@/lib/types";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { useT } from "@/lib/LocaleContext";

export default function DashboardPage() {
  const router = useRouter();
  const tStr = useT();
  const { profile, isLoaded } = useProfile();
  const { snapshot, error: aqiError, isLoading: aqiLoading, refresh } = useAQI(
    profile?.lat ?? null,
    profile?.lng ?? null
  );

  const [plan, setPlan] = useState<PlanResponse | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);

  // Redirect to onboarding if no profile
  useEffect(() => {
    if (isLoaded && !profile) router.replace("/onboarding");
  }, [isLoaded, profile, router]);

  // Fetch plan when AQI + profile are available
  const fetchPlan = useCallback(async () => {
    if (!profile || !snapshot) return;
    setPlanLoading(true);
    setPlanError(null);
    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile, aqiSnapshot: snapshot }),
      });
      if (!res.ok) throw new Error("Plan generation failed");
      const data: PlanResponse = await res.json();
      setPlan(data);
    } catch (err) {
      setPlanError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setPlanLoading(false);
    }
  }, [profile, snapshot]);

  useEffect(() => {
    if (snapshot && profile && !plan && !planLoading) {
      fetchPlan();
    }
  }, [snapshot, profile, plan, planLoading, fetchPlan]);

  if (!isLoaded || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground text-sm animate-pulse">Loading your profile…</div>
      </div>
    );
  }

  const band = snapshot ? getBand(snapshot.aqi) : null;

  // Build a household-specific health note from the AQI data
  function buildHealthNote(): string {
    if (!snapshot || !band || !profile) return "";
    const { healthRecs } = snapshot;
    const { household } = profile;

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

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-md px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-base">AirWise</h1>
          <p className="text-xs text-muted-foreground">{profile.city}</p>
        </div>
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/map")}
            title="Air Quality Map"
          >
            <MapIcon className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={refresh}
            disabled={aqiLoading}
            title="Refresh AQI"
          >
            <RefreshCw className={`w-4 h-4 ${aqiLoading ? "animate-spin" : ""}`} />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => router.push("/onboarding")} title="Edit profile">
            <Settings className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => router.push("/chat")} title="Chat">
            <MessageCircle className="w-4 h-4" />
          </Button>
        </div>
      </nav>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-8 pb-20">
        {/* Morning brief (if present) */}
        {plan?.morningBrief && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-muted/40 border border-border rounded-xl p-4 text-sm text-muted-foreground leading-relaxed"
          >
            <p className="text-xs font-medium text-foreground mb-1">Today's air story ☀️</p>
            {plan.morningBrief}
          </motion.div>
        )}

        {/* AQI section */}
        <section className="space-y-4">
          {aqiError ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <AlertCircle className="w-8 h-8 text-destructive" />
              <p className="text-sm text-muted-foreground">
                Could not load air quality data.
                <br />
                Check your connection and try again.
              </p>
              <Button size="sm" variant="outline" onClick={refresh}>
                Retry
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
                Source: {snapshot.source} · Fetched {new Date(snapshot.fetchedAt).toLocaleTimeString()}
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
                onClick={fetchPlan}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Refresh
              </button>
            )}
          </div>

          {planError && (
            <div className="text-sm text-muted-foreground bg-muted/40 rounded-lg p-4 text-center space-y-2">
              <p>Could not generate your plan. The AI service may be unavailable.</p>
              <Button size="sm" variant="outline" onClick={fetchPlan}>
                Try again
              </Button>
            </div>
          )}

          <PlanTimeline items={plan?.items ?? []} isLoading={planLoading} />
        </section>

        {/* What-if link */}
        <section className="text-center">
          <Button variant="outline" onClick={() => router.push("/simulate")} className="w-full">
            🔬 What if I add an air purifier / change my commute?
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
