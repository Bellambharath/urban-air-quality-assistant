/**
 * app/api/simulate/route.ts
 *
 * POST /api/simulate
 * Body: { profile: Profile, aqiSnapshot: AQISnapshot, toggles: SimulateToggles }
 *
 * Pure computation — NO LLM call. Must be fast enough for live slider feedback.
 * Returns: SimulateResult JSON
 */

import { NextRequest, NextResponse } from "next/server";
import {
  computeInhaledDose,
  computeExposureAvoided,
  toCigaretteEquivalent,
  computeCommuteCO2Saved,
  computePurifierImpact,
} from "@/lib/impact-engine";
import type { Profile, AQISnapshot, SimulateToggles, SimulateResult } from "@/lib/types";

export async function POST(request: NextRequest) {
  let profile: Profile;
  let aqiSnapshot: AQISnapshot;
  let toggles: SimulateToggles;

  try {
    const body = await request.json();
    profile = body.profile;
    aqiSnapshot = body.aqiSnapshot;
    toggles = body.toggles;
    if (!profile || !aqiSnapshot || !toggles) throw new Error("Missing fields");
  } catch {
    return NextResponse.json(
      { error: "Invalid request body", code: "invalid_params" },
      { status: 400 }
    );
  }

  const pm25 = aqiSnapshot.pm25;

  // 1. Purifier impact
  const { pctReduction: pctIndoorDrop, fractionRemaining } = computePurifierImpact();
  const indoorPM25After = toggles.purifierOn ? pm25 * fractionRemaining : pm25;

  // 2. Commute CO₂ saved
  const co2SavedKgWeek = computeCommuteCO2Saved(
    profile.commute.mode,
    toggles.commuteMode,
    profile.commute.distanceKm,
    profile.commute.tripsPerWeek
  );

  // 3. Exposure avoided by timing outdoor activity
  const durationMin = toggles.activityDurationMin ?? 60;
  const baselinePM25 = pm25; // outdoor at current AQI
  const optimizedPM25 = (() => {
    // Use forecast if available to find PM2.5 at the chosen hour
    const hourEntry = aqiSnapshot.forecast.find((h) => h.hour === toggles.activityHour);
    return hourEntry?.pm25 ?? pm25;
  })();

  const baselineDose = computeInhaledDose(baselinePM25, "moderate", durationMin);
  const optimizedDose = computeInhaledDose(optimizedPM25, "moderate", durationMin);
  const exposureAvoidedUg = computeExposureAvoided(baselineDose, optimizedDose);

  // 4. Cigarette equivalents
  const hours = durationMin / 60;
  const baselineCigEq = toCigaretteEquivalent(baselinePM25, hours);
  const optimizedCigEq = toCigaretteEquivalent(optimizedPM25, hours);

  const pctExposureCut =
    baselineDose > 0
      ? Math.round(((baselineDose - optimizedDose) / baselineDose) * 100)
      : 0;

  const result: SimulateResult = {
    indoorPM25After: Math.round(indoorPM25After * 10) / 10,
    pctIndoorDrop: toggles.purifierOn ? pctIndoorDrop : 0,
    co2SavedKgWeek: Math.round(co2SavedKgWeek * 100) / 100,
    exposureAvoidedUg: Math.round(exposureAvoidedUg * 10) / 10,
    baselineCigEq: Math.round(baselineCigEq * 100) / 100,
    optimizedCigEq: Math.round(optimizedCigEq * 100) / 100,
    pctExposureCut,
  };

  return NextResponse.json(result);
}
