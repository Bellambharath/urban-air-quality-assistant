"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, MapPin, RefreshCw, Check, ArrowRight, ShieldAlert } from "lucide-react";
import { SUPPORTED_CITIES, type CityName } from "@/lib/constants";
import { getBand, type CPCBBand } from "@/lib/cpcb-bands";
import { useProfile } from "@/hooks/useProfile";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

// ─── Default seed AQI estimates for Indian metros ─────────────────────────────
// Updated live via /api/aqi as cities are selected or loaded.
const SEED_AQI: Record<string, number> = {
  Delhi: 325,
  Lucknow: 280,
  Jaipur: 220,
  Kolkata: 200,
  Ahmedabad: 180,
  Mumbai: 150,
  Pune: 130,
  Hyderabad: 120,
  Bengaluru: 95,
  Chennai: 75,
};

export default function CityComparisonPage() {
  const router = useRouter();
  const { profile, isLoaded, updateProfile } = useProfile();

  // Selected city defaults to profile city or Delhi
  const [selectedCityName, setSelectedCityName] = useState<string>("Delhi");
  const [cityAQIs, setCityAQIs] = useState<Record<string, number>>(SEED_AQI);
  const [loadingCity, setLoadingCity] = useState<string | null>(null);
  const [errorCity, setErrorCity] = useState<string | null>(null);

  // Sync selected city with profile once loaded
  useEffect(() => {
    if (profile?.city) {
      setSelectedCityName(profile.city);
    }
  }, [profile?.city]);

  // Fetch live AQI for a specific city
  const fetchCityAQI = useCallback(async (cityName: string, lat: number, lng: number) => {
    setLoadingCity(cityName);
    setErrorCity(null);
    try {
      const res = await fetch(`/api/aqi?lat=${lat}&lng=${lng}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (typeof data.aqi === "number") {
        setCityAQIs((prev) => ({ ...prev, [cityName]: data.aqi }));
      }
    } catch (err) {
      setErrorCity(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoadingCity(null);
    }
  }, []);

  // Fetch live AQI for user's profile city on mount
  useEffect(() => {
    if (!isLoaded || !profile) return;
    const targetCity = SUPPORTED_CITIES.find((c) => c.name === profile.city) ?? SUPPORTED_CITIES[0];
    fetchCityAQI(targetCity.name, targetCity.lat, targetCity.lng);
  }, [isLoaded, profile, fetchCityAQI]);

  // When user selects a different city, fetch its live data if not yet fetched
  const handleSelectCity = (city: (typeof SUPPORTED_CITIES)[number]) => {
    setSelectedCityName(city.name);
    fetchCityAQI(city.name, city.lat, city.lng);
  };

  const handleSetAsMyCity = (cityName: string) => {
    const city = SUPPORTED_CITIES.find((c) => c.name === cityName);
    if (!city) return;
    updateProfile({ city: city.name, lat: city.lat, lng: city.lng });
    router.push("/dashboard");
  };

  // Helper to get AQI for city
  const getAQI = useCallback(
    (name: string) => cityAQIs[name] ?? SEED_AQI[name] ?? 100,
    [cityAQIs]
  );

  // Active city info — guaranteed to match the header and pulsing card
  const activeCity = useMemo(() => {
    return SUPPORTED_CITIES.find((c) => c.name === selectedCityName) ?? SUPPORTED_CITIES[0];
  }, [selectedCityName]);

  const activeAQI = getAQI(activeCity.name);
  const activeBand = getBand(activeAQI);
  const isUserCity = profile?.city === activeCity.name;

  // Sorted cities: Worst (highest AQI) to Best (lowest AQI)
  const sortedCities = useMemo(() => {
    return [...SUPPORTED_CITIES].sort((a, b) => getAQI(b.name) - getAQI(a.name));
  }, [getAQI]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header navigation */}
      <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur-md px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/dashboard")}
            className="gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Dashboard</span>
          </Button>
          <div className="h-4 w-px bg-border" />
          <h1 className="text-sm font-semibold tracking-tight">City AQI Comparison</h1>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchCityAQI(activeCity.name, activeCity.lat, activeCity.lng)}
          disabled={loadingCity === activeCity.name}
          className="text-xs gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loadingCity === activeCity.name ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </Button>
      </header>

      <main className="max-w-2xl mx-auto w-full px-4 py-6 space-y-6 flex-1 pb-28">
        {/* Active city live banner — exactly matches highlighted card */}
        <motion.div
          key={activeCity.name}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border p-5 space-y-3 relative overflow-hidden shadow-sm"
          style={{
            borderColor: `${activeBand.hex}50`,
            backgroundColor: `${activeBand.hex}12`,
          }}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span
                  className="relative flex h-3 w-3 shrink-0"
                >
                  <span
                    className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                    style={{ backgroundColor: activeBand.hex }}
                  />
                  <span
                    className="relative inline-flex rounded-full h-3 w-3"
                    style={{ backgroundColor: activeBand.hex }}
                  />
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Active Selected City
                </span>
                {isUserCity && (
                  <span className="text-[11px] font-medium bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                    Your Saved Location
                  </span>
                )}
              </div>
              <h2 className="text-xl font-bold tracking-tight">
                Live AQI for <span className="underline decoration-2" style={{ textDecorationColor: activeBand.hex }}>{activeCity.name}</span>
              </h2>
            </div>

            <div className="text-right shrink-0">
              <div
                className="text-3xl font-black tabular-nums leading-none"
                style={{ color: activeBand.hex }}
              >
                {loadingCity === activeCity.name ? (
                  <Skeleton className="h-8 w-16 ml-auto" />
                ) : (
                  activeAQI
                )}
              </div>
              <span
                className="text-xs font-semibold inline-block mt-1 px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: `${activeBand.hex}25`,
                  color: activeBand.hex,
                }}
              >
                {activeBand.name}
              </span>
            </div>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            {activeBand.advice}
          </p>

          {/* Action button: set as active city */}
          <div className="pt-1 flex items-center justify-between gap-3">
            <p className="text-[11px] text-muted-foreground/75">
              Lat: {activeCity.lat.toFixed(2)}°, Lng: {activeCity.lng.toFixed(2)}°
            </p>
            {!isUserCity ? (
              <Button
                size="sm"
                onClick={() => handleSetAsMyCity(activeCity.name)}
                className="text-xs gap-1.5"
              >
                <span>Set as my city & open Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/dashboard")}
                className="text-xs gap-1.5"
              >
                <Check className="w-3.5 h-3.5 text-primary" />
                <span>Return to my Dashboard</span>
              </Button>
            )}
          </div>
        </motion.div>

        {/* Section title & sorting note */}
        <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
          <span className="font-semibold uppercase tracking-wider">
            All 10 Metros (Sorted Worst → Cleanest)
          </span>
          <span>Click any card to select</span>
        </div>

        {/* 10-City Comparison Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {sortedCities.map((city, idx) => {
            const aqi = getAQI(city.name);
            const band = getBand(aqi);
            const isActive = city.name === activeCity.name;
            const isUserSaved = profile?.city === city.name;
            const isLoading = loadingCity === city.name;

            return (
              <motion.button
                key={city.name}
                onClick={() => handleSelectCity(city)}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className={`relative w-full rounded-xl border p-4 text-left transition-all flex flex-col justify-between gap-3 ${
                  isActive
                    ? "ring-2 ring-primary ring-offset-2 ring-offset-background bg-card shadow-md"
                    : "bg-card/70 border-border hover:border-muted-foreground/40 hover:bg-card"
                }`}
                style={{
                  borderLeftWidth: "4px",
                  borderLeftColor: band.hex,
                }}
              >
                {/* Top row: Rank & City Name */}
                <div className="flex items-center justify-between w-full gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[11px] font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
                      #{idx + 1}
                    </span>
                    <span className="font-bold text-base truncate">
                      {city.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {isActive && (
                      <span
                        className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: `${band.hex}25`,
                          color: band.hex,
                        }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: band.hex }} />
                        Active
                      </span>
                    )}
                    {isUserSaved && !isActive && (
                      <span className="text-[10px] font-medium bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
                        Saved
                      </span>
                    )}
                  </div>
                </div>

                {/* Middle row: Big AQI and CPCB band badge */}
                <div className="flex items-end justify-between w-full">
                  <div>
                    <span
                      className="text-xs font-semibold inline-block px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: `${band.hex}20`,
                        color: band.hex,
                      }}
                    >
                      {band.name}
                    </span>
                    <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1">
                      {band.meaning}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <div
                      className="text-2xl font-black tabular-nums leading-none"
                      style={{ color: band.hex }}
                    >
                      {isLoading ? "…" : aqi}
                    </div>
                    <span className="text-[10px] text-muted-foreground">CPCB AQI</span>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* CPCB Scale Reference Strip */}
        <div className="rounded-xl border border-border bg-card/40 p-4 space-y-2.5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Official CPCB AQI Scale
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-[11px]">
            {[
              { name: "Good", range: "0–50", hex: "#22c55e" },
              { name: "Satisfactory", range: "51–100", hex: "#a3e635" },
              { name: "Moderate", range: "101–200", hex: "#facc15" },
              { name: "Poor", range: "201–300", hex: "#f97316" },
              { name: "Very Poor", range: "301–400", hex: "#ef4444" },
              { name: "Severe", range: "401–500", hex: "#7f1d1d" },
            ].map((b) => (
              <div key={b.name} className="flex flex-col items-center gap-1">
                <span
                  className="w-full h-1.5 rounded-full"
                  style={{ backgroundColor: b.hex }}
                />
                <span className="font-semibold text-[10px]" style={{ color: b.hex }}>
                  {b.name}
                </span>
                <span className="text-[9px] text-muted-foreground">{b.range}</span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
