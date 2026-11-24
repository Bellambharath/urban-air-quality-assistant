// TODO: When GOOGLE_AIR_QUALITY_API_KEY is set in .env.local, replace static AQI estimates
// with Google Maps Air Quality heatmap tiles:
// https://airquality.googleapis.com/v1/mapTypes/UAQI_INDIGO_PERSIAN/heatmapTiles/{zoom}/{x}/{y}?key=KEY
// Add as <image> or CSS background tiles within the view at the appropriate zoom level.

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Check, Sparkles } from "lucide-react";
import { SUPPORTED_CITIES } from "@/lib/constants";
import { getBand } from "@/lib/cpcb-bands";
import { useProfile } from "@/hooks/useProfile";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

// ─── Static AQI estimates (fallback when live AQI is unavailable) ───────────
// Only the user's selected/current city is fetched live from /api/aqi.
const STATIC_AQI: Record<string, number> = {
  Delhi: 300,
  Mumbai: 150,
  Bengaluru: 100,
  Hyderabad: 120,
  Chennai: 80,
  Kolkata: 200,
  Pune: 130,
  Ahmedabad: 180,
  Lucknow: 280,
  Jaipur: 220,
};

export default function MapPage() {
  const router = useRouter();
  const { profile, isLoaded, updateProfile } = useProfile();

  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [liveAQI, setLiveAQI] = useState<number | null>(null);
  const [loadingAQI, setLoadingAQI] = useState(false);
  const [aqiError, setAqiError] = useState<string | null>(null);

  // Active highlighted city: defaults to user profile city, or fallback to Delhi
  const activeCity = selectedCity ?? profile?.city ?? "Delhi";

  // ── Fetch live AQI for user's city on mount ──────────────────────────────
  useEffect(() => {
    if (!isLoaded || !profile) return;
    setLoadingAQI(true);
    setAqiError(null);
    fetch(`/api/aqi?lat=${profile.lat}&lng=${profile.lng}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: { aqi?: number; indexes?: Array<{ aqi: number }> }) => {
        const value =
          typeof data.aqi === "number"
            ? data.aqi
            : Array.isArray(data.indexes) && data.indexes[0]?.aqi != null
            ? data.indexes[0].aqi
            : null;
        setLiveAQI(value);
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        setAqiError(msg);
      })
      .finally(() => setLoadingAQI(false));
  }, [isLoaded, profile]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  function getAQIForCity(cityName: string): number {
    if (cityName === profile?.city && liveAQI !== null) return liveAQI;
    return STATIC_AQI[cityName] ?? 100;
  }

  function handleSetCityAndNavigate(cityName: string) {
    const city = SUPPORTED_CITIES.find((c) => c.name === cityName);
    if (!city) return;
    updateProfile({ city: city.name, lat: city.lat, lng: city.lng });
    router.push("/dashboard");
  }

  // Sort cities worst-to-best (highest AQI first)
  const sortedCities = [...SUPPORTED_CITIES].sort((a, b) => {
    const aqiA = getAQIForCity(a.name);
    const aqiB = getAQIForCity(b.name);
    return aqiB - aqiA; // Worst (highest AQI) first
  });

  const activeCityAQI = getAQIForCity(activeCity);
  const activeCityBand = getBand(activeCityAQI);
  const isActiveLive = activeCity === profile?.city && liveAQI !== null;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top Nav */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/dashboard")}
            className="gap-1.5"
          >
            <ArrowLeft className="size-4" />
            Dashboard
          </Button>
          <h1 className="text-sm font-semibold tracking-tight text-center">
            City AQI Comparison 🗺️
          </h1>
          <div className="w-20" /> {/* Spacer for centering */}
        </div>
      </header>

      <main className="flex flex-col items-center gap-6 px-4 py-6 max-w-3xl mx-auto">
        {/* Dynamic Active City Header Strip — strictly matches active/highlighted city */}
        <div className="w-full rounded-xl border border-border bg-card/60 p-4 text-center">
          {loadingAQI && activeCity === profile?.city ? (
            <Skeleton className="h-5 w-56 mx-auto" />
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-sm">
              <div className="flex items-center gap-2">
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full shrink-0 animate-pulse"
                  style={{ backgroundColor: activeCityBand.hex }}
                />
                <span className="text-muted-foreground">
                  {isActiveLive ? "Live AQI" : "AQI"} for{" "}
                  <strong className="text-foreground">{activeCity}</strong>:
                </span>
                <span
                  style={{ color: activeCityBand.hex }}
                  className="font-bold tabular-nums text-base"
                >
                  {activeCityAQI}
                </span>
                <span
                  className="px-2 py-0.5 rounded-full text-xs font-semibold"
                  style={{
                    backgroundColor: `${activeCityBand.hex}22`,
                    color: activeCityBand.hex,
                    border: `1px solid ${activeCityBand.hex}44`,
                  }}
                >
                  {activeCityBand.name}
                </span>
              </div>

              {activeCity !== profile?.city ? (
                <button
                  onClick={() => handleSetCityAndNavigate(activeCity)}
                  className="text-xs text-primary hover:underline font-medium cursor-pointer ml-1"
                >
                  Switch to {activeCity} & view dashboard →
                </button>
              ) : (
                <span className="text-xs text-muted-foreground/80">
                  (Your current city)
                </span>
              )}
            </div>
          )}

          {aqiError && activeCity === profile?.city && (
            <p className="text-xs text-destructive mt-1">
              Could not refresh live station: {aqiError} (showing baseline estimate)
            </p>
          )}
        </div>

        {/* Section Heading */}
        <div className="w-full flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">10-City Comparison Grid</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              CPCB National Ambient Air Quality Standard · Sorted worst to best
            </p>
          </div>
          <span className="text-xs text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-full border border-border">
            Worst → Best
          </span>
        </div>

        {/* Clean Worst-to-Best Comparison Grid (No hand-drawn boundary) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full">
          {sortedCities.map((city, index) => {
            const aqi = getAQIForCity(city.name);
            const band = getBand(aqi);
            const isUserCity = profile?.city === city.name;
            const isActive = activeCity === city.name;
            const isLive = isUserCity && liveAQI !== null;

            return (
              <motion.div
                key={city.name}
                layout
                onClick={() => setSelectedCity(city.name)}
                className={`relative rounded-xl border p-4 cursor-pointer transition-all duration-200 flex flex-col justify-between gap-3 ${
                  isActive
                    ? "bg-card shadow-md ring-2 ring-offset-2 ring-offset-background"
                    : "bg-card/60 hover:bg-card border-border hover:border-foreground/20"
                }`}
                style={{
                  borderColor: isActive ? band.hex : undefined,
                  boxShadow: isActive ? `0 0 16px ${band.hex}25` : undefined,
                }}
              >
                {/* Header row: City name + tags */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs font-bold text-muted-foreground w-4 tabular-nums"
                      title={`Rank #${index + 1}`}
                    >
                      #{index + 1}
                    </span>
                    <span className="font-semibold text-base text-foreground">
                      {city.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    {isUserCity && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/30 px-2 py-0.5 text-[11px] font-medium text-primary">
                        <Check className="size-3" />
                        Your City {isLive ? "· Live" : ""}
                      </span>
                    )}
                    {isActive && !isUserCity && (
                      <span className="rounded-full bg-muted border border-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                        Selected
                      </span>
                    )}
                  </div>
                </div>

                {/* AQI Metric & CPCB Band */}
                <div className="flex items-baseline justify-between gap-2">
                  <div className="flex items-baseline gap-2">
                    <span
                      className="text-3xl font-black tracking-tight tabular-nums"
                      style={{ color: band.hex }}
                    >
                      {loadingAQI && isUserCity ? "…" : aqi}
                    </span>
                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                      AQI
                    </span>
                  </div>

                  <span
                    className="rounded-full px-2.5 py-0.5 text-xs font-bold"
                    style={{
                      backgroundColor: `${band.hex}18`,
                      color: band.hex,
                      border: `1px solid ${band.hex}40`,
                    }}
                  >
                    {band.name}
                  </span>
                </div>

                {/* Advisory guidance */}
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                  {band.advice}
                </p>

                {/* Action button on active card */}
                {isActive && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="pt-1 border-t border-border/60"
                  >
                    <Button
                      size="sm"
                      className="w-full gap-1.5 text-xs font-medium"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSetCityAndNavigate(city.name);
                      }}
                    >
                      <Sparkles className="size-3.5" />
                      Set as my city & view dashboard →
                    </Button>
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="w-full rounded-xl border border-border bg-card/40 p-4 text-xs text-muted-foreground">
          <p className="font-semibold text-foreground mb-2">CPCB AQI Scale Reference</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { name: "Good (0–50)", hex: "#22c55e" },
              { name: "Satisfactory (51–100)", hex: "#a3e635" },
              { name: "Moderate (101–200)", hex: "#facc15" },
              { name: "Poor (201–300)", hex: "#f97316" },
              { name: "Very Poor (301–400)", hex: "#ef4444" },
              { name: "Severe (401–500)", hex: "#7f1d1d" },
            ].map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: item.hex }}
                />
                <span className="text-[11px] truncate">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
