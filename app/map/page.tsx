// TODO: When GOOGLE_AIR_QUALITY_API_KEY is set in .env.local, replace static AQI estimates
// with Google Maps Air Quality heatmap tiles:
// https://airquality.googleapis.com/v1/mapTypes/UAQI_INDIGO_PERSIAN/heatmapTiles/{zoom}/{x}/{y}?key=KEY
// Add as <image> or CSS background tiles within the SVG at the appropriate zoom level.

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { SUPPORTED_CITIES } from "@/lib/constants";
import { getBand } from "@/lib/cpcb-bands";
import { useProfile } from "@/hooks/useProfile";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

// ─── Static AQI estimates (not fetched) ───────────────────────────────────────
// Only the user's own city is fetched live from /api/aqi.
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

// ─── Coordinate conversion ────────────────────────────────────────────────────
// SVG viewBox: "0 0 500 450"
// India bounding box roughly: lng 68–97, lat 8–37
function toSvgX(lng: number): number {
  return ((lng - 68) / 29) * 500;
}

function toSvgY(lat: number): number {
  return ((37 - lat) / 29) * 450;
}

// ─── Approximate India outline polygon ───────────────────────────────────────
// A simplified polygon tracing the Indian subcontinent border in SVG coords.
const INDIA_POLYGON_POINTS = [
  // NW corner (J&K region)
  [75, 37], [78, 36.5], [79.5, 35.5], [80.5, 34.5],
  // Punjab/Himachal
  [74, 34], [73.5, 33], [75.5, 32.5],
  // Gujarat coast / Rann of Kutch
  [68.5, 23.5], [68, 22], [69, 21], [70.5, 21.5], [72, 20.5],
  // Maharashtra / Konkan coast
  [72.6, 19], [72.8, 18], [74, 16.5], [74.5, 15.5], [73.5, 14.5],
  // Karnataka / Kerala coast
  [74.5, 13], [76.5, 11.5], [77, 10.5], [78, 8.5], [79, 8.1],
  // Tamil Nadu / Sri Lanka gap
  [80, 9], [80.2, 10.5],
  // Coromandel coast
  [80.3, 12], [80.1, 13.5], [80.3, 15], [80.3, 16.5],
  // Andhra / Odisha coast
  [82, 17.5], [83.5, 18.5], [85, 19.5], [86.5, 20.5],
  // West Bengal / Bangladesh border
  [87, 21.5], [88, 22.5], [88.5, 23.5],
  // NE region
  [89.5, 24], [90, 25.5], [91, 26], [92, 25.5], [93, 26.5],
  [95, 27.5], [96, 27.5], [97, 28],
  // back up along eastern Himalayas
  [96, 29], [94, 29.5], [92.5, 30], [90, 30.5],
  [88.5, 32], [86, 33], [83, 33.5], [81, 34],
  [79.5, 35.5],
]
  .map(([lng, lat]) => `${toSvgX(lng)},${toSvgY(lat)}`)
  .join(" ");

export default function MapPage() {
  const router = useRouter();
  const { profile, isLoaded, updateProfile } = useProfile();

  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [liveAQI, setLiveAQI] = useState<number | null>(null);
  const [loadingAQI, setLoadingAQI] = useState(false);
  const [aqiError, setAqiError] = useState<string | null>(null);

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
        // Support both flat { aqi } and Google Air Quality { indexes[0].aqi }
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

  function handleViewDashboard() {
    if (!selectedCity) return;
    const city = SUPPORTED_CITIES.find((c) => c.name === selectedCity);
    if (!city) return;
    updateProfile({ city: city.name, lat: city.lat, lng: city.lng });
    router.push("/dashboard");
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/dashboard")}
          className="shrink-0"
        >
          ← Dashboard
        </Button>
        <h1 className="text-lg font-semibold tracking-tight flex-1 text-center pr-16">
          Air Quality Map 🗺️
        </h1>
      </header>

      <main className="flex flex-col items-center gap-6 px-4 py-6 max-w-2xl mx-auto">

        {/* Live AQI status strip */}
        {isLoaded && profile && (
          <div className="w-full text-sm text-center text-muted-foreground">
            {loadingAQI && (
              <Skeleton className="h-4 w-48 mx-auto" />
            )}
            {!loadingAQI && liveAQI !== null && (
              <span>
                Live AQI for{" "}
                <strong className="text-foreground">{profile.city}</strong>:{" "}
                <span
                  style={{ color: getBand(liveAQI).hex }}
                  className="font-bold"
                >
                  {liveAQI} — {getBand(liveAQI).name}
                </span>
              </span>
            )}
            {!loadingAQI && aqiError && (
              <span className="text-destructive">
                Could not load live AQI: {aqiError}
              </span>
            )}
          </div>
        )}

        {/* SVG India dot map */}
        <div className="w-full max-w-md mx-auto rounded-xl border border-border overflow-hidden bg-card shadow-sm">
          <svg
            viewBox="0 0 500 450"
            className="w-full h-auto"
            aria-label="India air quality city map"
            role="img"
          >
            {/* India outline */}
            <polygon
              points={INDIA_POLYGON_POINTS}
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              className="text-muted-foreground/40"
            />

            {/* City dots */}
            {SUPPORTED_CITIES.map((city) => {
              const aqi = getAQIForCity(city.name);
              const band = getBand(aqi);
              const cx = toSvgX(city.lng);
              const cy = toSvgY(city.lat);
              const isUserCity = profile?.city === city.name;
              const isSelected = selectedCity === city.name;
              const r = isUserCity ? 14 : 8;

              return (
                <g key={city.name}>
                  {/* Pulse ring for user city */}
                  {isUserCity && (
                    <motion.circle
                      cx={cx}
                      cy={cy}
                      r={20}
                      fill={band.hex}
                      fillOpacity={0.2}
                      animate={{ r: [16, 24, 16], opacity: [0.3, 0, 0.3] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    />
                  )}

                  {/* Selection ring */}
                  {isSelected && (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={r + 5}
                      fill="none"
                      stroke={band.hex}
                      strokeWidth={2}
                      strokeDasharray="4 2"
                    />
                  )}

                  {/* Main city dot */}
                  <motion.circle
                    cx={cx}
                    cy={cy}
                    r={r}
                    fill={band.hex}
                    stroke={isSelected ? "#ffffff" : "transparent"}
                    strokeWidth={isSelected ? 2 : 0}
                    animate={
                      isUserCity
                        ? { scale: [1, 1.15, 1] }
                        : { scale: 1 }
                    }
                    transition={
                      isUserCity
                        ? { duration: 2, repeat: Infinity, ease: "easeInOut" }
                        : {}
                    }
                    onClick={() => setSelectedCity(city.name)}
                    style={{ cursor: "pointer" }}
                    aria-label={`${city.name} AQI ${aqi} — ${band.name}`}
                  >
                    <title>
                      {city.name}: AQI {aqi} — {band.name}
                    </title>
                  </motion.circle>

                  {/* City label */}
                  <text
                    x={cx}
                    y={cy - r - 4}
                    textAnchor="middle"
                    fontSize={isUserCity ? 11 : 9}
                    fontWeight={isUserCity ? "700" : "400"}
                    fill="currentColor"
                    className="pointer-events-none select-none"
                    style={{ fontSize: isUserCity ? 11 : 9 }}
                  >
                    {city.name}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Selected city panel */}
        {selectedCity && (
          <motion.div
            key={selectedCity}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md bg-card border border-border rounded-xl p-4 flex flex-col gap-3"
          >
            {(() => {
              const aqi = getAQIForCity(selectedCity);
              const band = getBand(aqi);
              const isLive =
                selectedCity === profile?.city && liveAQI !== null;
              return (
                <>
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: band.hex }}
                    />
                    <p className="font-bold text-base">{selectedCity}</p>
                    {isLive && (
                      <span className="text-xs text-muted-foreground ml-auto">
                        live
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    AQI{" "}
                    <span style={{ color: band.hex }} className="font-semibold">
                      {aqi}
                    </span>{" "}
                    — {band.name}
                  </p>
                  <p className="text-xs text-muted-foreground">{band.advice}</p>
                  <Button
                    onClick={handleViewDashboard}
                    className="w-full mt-1"
                    size="sm"
                  >
                    View dashboard for this city →
                  </Button>
                </>
              );
            })()}
          </motion.div>
        )}

        {/* City list (mobile-friendly grid) */}
        <div className="w-full max-w-md">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            All Cities
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {SUPPORTED_CITIES.map((city) => {
              const aqi = getAQIForCity(city.name);
              const band = getBand(aqi);
              const isUserCity = profile?.city === city.name;
              const isSelected = selectedCity === city.name;

              return (
                <button
                  key={city.name}
                  onClick={() => setSelectedCity(city.name)}
                  className={[
                    "flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                    isSelected
                      ? "border-foreground/40 bg-muted"
                      : "border-border bg-card hover:bg-muted/60",
                    isUserCity ? "ring-1 ring-offset-1" : "",
                  ].join(" ")}
                  style={
                    isUserCity ? { borderColor: band.hex } : undefined
                  }
                >
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: band.hex }}
                  />
                  <span className="flex-1 font-medium truncate">
                    {city.name}
                    {isUserCity && (
                      <span className="ml-1 text-muted-foreground font-normal text-xs">
                        (you)
                      </span>
                    )}
                  </span>
                  <span
                    className="text-xs font-semibold tabular-nums"
                    style={{ color: band.hex }}
                  >
                    {loadingAQI && isUserCity ? "…" : aqi}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
