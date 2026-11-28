"use client";

/**
 * app/onboarding/page.tsx
 *
 * Three-step profile setup (location, household health, home & commute) that
 * captures the context behind every AirWise recommendation.
 */

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Users, Home, ChevronRight, ChevronLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createDefaultProfile, saveProfile } from "@/lib/profile";
import { SUPPORTED_CITIES } from "@/lib/constants";
import type { Profile, HealthCondition, CommuteModeType, KitchenFuel, HomeType } from "@/lib/types";

type Step = "location" | "household" | "home-commute";
const STEPS: Step[] = ["location", "household", "home-commute"];

export default function OnboardingWizard() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>("location");
  const [profile, setProfile] = useState<Profile>(createDefaultProfile());
  const [geoLoading, setGeoLoading] = useState(false);

  const stepIndex = STEPS.indexOf(currentStep);

  const update = useCallback(<K extends keyof Profile>(key: K, value: Profile[K]) => {
    setProfile((p) => ({ ...p, [key]: value }));
  }, []);

  const handleDetectLocation = () => {
    if (!navigator.geolocation) return;
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        update("lat", pos.coords.latitude);
        update("lng", pos.coords.longitude);
        // Find nearest city
        const nearest = SUPPORTED_CITIES.reduce((best, city) => {
          const d = Math.hypot(city.lat - pos.coords.latitude, city.lng - pos.coords.longitude);
          const bd = Math.hypot(best.lat - pos.coords.latitude, best.lng - pos.coords.longitude);
          return d < bd ? city : best;
        });
        update("city", nearest.name);
        setGeoLoading(false);
      },
      () => setGeoLoading(false)
    );
  };

  const handleNext = () => {
    const idx = STEPS.indexOf(currentStep);
    if (idx < STEPS.length - 1) setCurrentStep(STEPS[idx + 1]);
  };

  const handleBack = () => {
    const idx = STEPS.indexOf(currentStep);
    if (idx > 0) setCurrentStep(STEPS[idx - 1]);
  };

  const handleFinish = () => {
    const finalProfile: Profile = { ...profile, updatedAt: new Date().toISOString() };
    saveProfile(finalProfile);
    router.replace("/dashboard");
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 bg-background overflow-x-hidden">
      <div className="w-full max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold">AirWise</h1>
          <p className="text-muted-foreground text-sm">Your personalised air quality assistant</p>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-2">
          {STEPS.map((step, i) => (
            <div
              key={step}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                i === stepIndex ? "bg-primary w-6" : i < stepIndex ? "bg-primary/60" : "bg-muted"
              }`}
            />
          ))}
        </div>

        {/* Step content */}
        <div className="w-full overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="w-full bg-card border border-border rounded-xl p-6 space-y-5"
            >
              {currentStep === "location" && (
                <LocationStep
                  profile={profile}
                  onUpdate={update}
                  onDetect={handleDetectLocation}
                  geoLoading={geoLoading}
                />
              )}
              {currentStep === "household" && (
                <HouseholdStep profile={profile} onUpdate={update} />
              )}
              {currentStep === "home-commute" && (
                <HomeCommuteStep profile={profile} onUpdate={update} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <div className="flex justify-between gap-3">
          {stepIndex > 0 ? (
            <Button variant="outline" onClick={handleBack} className="flex-1">
              <ChevronLeft className="w-4 h-4 mr-1" /> Back
            </Button>
          ) : (
            <div className="flex-1" />
          )}

          {stepIndex < STEPS.length - 1 ? (
            <Button onClick={handleNext} className="flex-1">
              Continue <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleFinish} className="flex-1">
              See my air quality →
            </Button>
          )}
        </div>

        {/* Disclaimer */}
        <p className="text-[11px] text-muted-foreground text-center px-4 leading-relaxed">
          General guidance only — not medical advice. Consult a doctor for health conditions.
          Your location is used only for the AQI lookup and never stored beyond this session.
        </p>
      </div>
    </div>
  );
}

// ─── Step 1: Location ─────────────────────────────────────────────────────────

function LocationStep({
  profile,
  onUpdate,
  onDetect,
  geoLoading,
}: {
  profile: Profile;
  onUpdate: <K extends keyof Profile>(k: K, v: Profile[K]) => void;
  onDetect: () => void;
  geoLoading: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-foreground">
        <MapPin className="w-5 h-5 text-primary" />
        <h2 className="font-semibold">Where are you?</h2>
      </div>

      <Button
        variant="outline"
        className="w-full"
        onClick={onDetect}
        disabled={geoLoading}
      >
        {geoLoading ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <MapPin className="w-4 h-4 mr-2" />
        )}
        Auto-detect my location
      </Button>

      <div className="relative flex items-center">
        <div className="flex-1 border-t border-border" />
        <span className="mx-3 text-xs text-muted-foreground">or choose a city</span>
        <div className="flex-1 border-t border-border" />
      </div>

      <div className="grid grid-cols-2 gap-2">
        {SUPPORTED_CITIES.map((city) => (
          <button
            key={city.name}
            onClick={() => {
              onUpdate("city", city.name);
              onUpdate("lat", city.lat);
              onUpdate("lng", city.lng);
            }}
            className={`text-sm px-3 py-2 rounded-lg border transition-colors text-left ${
              profile.city === city.name
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border hover:border-muted-foreground/50 bg-muted/30"
            }`}
          >
            {city.name}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Step 2: Household ────────────────────────────────────────────────────────

type HouseholdKey = "adults" | "kids" | "elderly";

function HouseholdStep({
  profile,
  onUpdate,
}: {
  profile: Profile;
  onUpdate: <K extends keyof Profile>(k: K, v: Profile[K]) => void;
}) {
  const setHousehold = (key: HouseholdKey, value: number) => {
    onUpdate("household", { ...profile.household, [key]: Math.max(0, value) });
  };

  const toggleCondition = (cond: HealthCondition) => {
    const current = profile.household.conditions;
    const updated = current.includes(cond)
      ? current.filter((c) => c !== cond)
      : [...current, cond];
    onUpdate("household", { ...profile.household, conditions: updated });
  };

  const conditions: { id: HealthCondition; label: string }[] = [
    { id: "asthma", label: "Asthma" },
    { id: "copd", label: "COPD" },
    { id: "heart", label: "Heart condition" },
    { id: "lung", label: "Lung condition" },
    { id: "pregnant", label: "Pregnant" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Users className="w-5 h-5 text-primary" />
        <h2 className="font-semibold">Who lives with you?</h2>
      </div>

      {(["adults", "kids", "elderly"] as HouseholdKey[]).map((key) => (
        <div key={key} className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium capitalize">
              {key === "kids" ? "Children under 12" : key === "elderly" ? "Elderly (60+)" : "Adults"}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setHousehold(key, (profile.household[key] as number) - 1)}
              className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-muted text-lg leading-none"
            >
              −
            </button>
            <span className="text-sm font-semibold w-4 text-center">{profile.household[key]}</span>
            <button
              onClick={() => setHousehold(key, (profile.household[key] as number) + 1)}
              className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-muted text-lg leading-none"
            >
              +
            </button>
          </div>
        </div>
      ))}

      <div className="pt-1">
        <p className="text-xs text-muted-foreground mb-2">Health conditions (select all that apply)</p>
        <div className="flex flex-wrap gap-2">
          {conditions.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => toggleCondition(id)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                profile.household.conditions.includes(id)
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border hover:border-muted-foreground/50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Step 3: Home + Commute ───────────────────────────────────────────────────

function HomeCommuteStep({
  profile,
  onUpdate,
}: {
  profile: Profile;
  onUpdate: <K extends keyof Profile>(k: K, v: Profile[K]) => void;
}) {
  const setHome = <K extends keyof typeof profile.home>(k: K, v: (typeof profile.home)[K]) =>
    onUpdate("home", { ...profile.home, [k]: v });
  const setCommute = <K extends keyof typeof profile.commute>(k: K, v: (typeof profile.commute)[K]) =>
    onUpdate("commute", { ...profile.commute, [k]: v });

  const commuteModes: { value: CommuteModeType; label: string }[] = [
    { value: "car_petrol", label: "🚗 Car (petrol)" },
    { value: "car_diesel", label: "🚗 Car (diesel)" },
    { value: "auto", label: "🛺 Auto-rickshaw" },
    { value: "bus", label: "🚌 Bus" },
    { value: "metro", label: "🚇 Metro" },
    { value: "bike", label: "🚲 Cycle/bike" },
    { value: "walk", label: "🚶 Walk" },
    { value: "wfh", label: "🏠 Work from home" },
  ];

  const kitchenFuels: { value: KitchenFuel; label: string }[] = [
    { value: "lpg", label: "LPG" },
    { value: "induction", label: "Induction" },
    { value: "biomass", label: "Wood/biomass" },
    { value: "kerosene", label: "Kerosene" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Home className="w-5 h-5 text-primary" />
        <h2 className="font-semibold">Your home & commute</h2>
      </div>

      {/* Home type */}
      <div className="grid grid-cols-2 gap-2">
        {(["apartment", "independent"] as HomeType[]).map((t) => (
          <button
            key={t}
            onClick={() => setHome("type", t)}
            className={`text-sm px-3 py-2 rounded-lg border capitalize transition-colors ${
              profile.home.type === t
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border hover:border-muted-foreground/50 bg-muted/30"
            }`}
          >
            {t === "apartment" ? "🏢 Apartment" : "🏡 Independent house"}
          </button>
        ))}
      </div>

      {/* Toggles */}
      <div className="space-y-2">
        {[
          { key: "hasPurifier" as const, label: "Have an air purifier" },
          { key: "hasAC" as const, label: "Have AC" },
          { key: "hasChimney" as const, label: "Kitchen chimney / exhaust" },
        ].map(({ key, label }) => (
          <label key={key} className="flex items-center justify-between cursor-pointer">
            <span className="text-sm">{label}</span>
            <div
              onClick={() => setHome(key, !profile.home[key])}
              className={`w-10 h-5 rounded-full transition-colors relative ${
                profile.home[key] ? "bg-primary" : "bg-muted"
              }`}
            >
              <div
                className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                  profile.home[key] ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </div>
          </label>
        ))}
      </div>

      {/* Kitchen fuel */}
      <div>
        <p className="text-xs text-muted-foreground mb-2">Kitchen fuel</p>
        <div className="flex gap-2 flex-wrap">
          {kitchenFuels.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setHome("kitchenFuel", value)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                profile.home.kitchenFuel === value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border hover:border-muted-foreground/50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Commute mode */}
      <div>
        <p className="text-xs text-muted-foreground mb-2">How do you commute?</p>
        <div className="grid grid-cols-2 gap-1.5">
          {commuteModes.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setCommute("mode", value)}
              className={`text-xs px-2 py-2 rounded-lg border text-left transition-colors ${
                profile.commute.mode === value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border hover:border-muted-foreground/50 bg-muted/30"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Commute distance */}
      {profile.commute.mode !== "wfh" && (
        <div>
          <p className="text-xs text-muted-foreground mb-1">One-way distance (km)</p>
          <input
            type="number"
            min={0}
            max={200}
            value={profile.commute.distanceKm}
            onChange={(e) => setCommute("distanceKm", Number(e.target.value))}
            className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm"
          />
        </div>
      )}
    </div>
  );
}
