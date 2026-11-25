/**
 * lib/impact-engine.ts
 *
 * Deterministic math functions — the AirWise differentiator.
 * Pure functions only. No side effects, no API calls, no Gemini.
 * Every assumption lives in lib/constants.ts with a source comment.
 *
 * Unit-tested in __tests__/impact-engine.test.ts
 */

import {
  VENTILATION_RATE,
  CIGARETTE_EQ_UGPM3_PER_24H,
  CO2_FACTORS_KG_PER_KM,
  DEFAULT_NATURAL_ACH,
  DEFAULT_CADR_M3H,
  DEFAULT_ROOM_VOLUME,
  OUTDOOR_THRESHOLDS,
  type ActivityLevel,
  type SensitivityGroup,
} from "./constants";
import type {
  HourlyAQI,
  Profile,
  DailyExposureResult,
  PersonalizedDoseBlock,
  CommuteModeType,
  AQISnapshot,
  SimulateToggles,
  SimulateResult,
} from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// 1. Inhaled PM2.5 Dose (µg)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Computes the inhaled PM2.5 dose for a person at a given activity level.
 * Formula: dose = concentration × minuteVentilation × duration
 *
 * @param concUgM3     Ambient PM2.5 concentration (µg/m³)
 * @param activity     Activity level key (see VENTILATION_RATE in constants.ts)
 * @param durationMin  Duration of exposure in minutes
 * @returns            Inhaled dose in µg
 */
export function computeInhaledDose(
  concUgM3: number,
  activity: ActivityLevel,
  durationMin: number
): number {
  if (concUgM3 < 0 || durationMin < 0) return 0;
  const ventRate = VENTILATION_RATE[activity]; // m³/min
  return concUgM3 * ventRate * durationMin;    // µg/m³ × m³/min × min = µg
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Exposure Avoided (µg)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Computes exposure avoided when switching from outdoor to an indoor/filtered alternative.
 *
 * @param outdoorDoseUg  Dose from the outdoor activity scenario (µg)
 * @param indoorDoseUg   Dose from the indoor alternative scenario (µg)
 * @returns              Exposure avoided (µg). Clamped to 0 if indoor is worse.
 */
export function computeExposureAvoided(
  outdoorDoseUg: number,
  indoorDoseUg: number
): number {
  return Math.max(0, outdoorDoseUg - indoorDoseUg);
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Cigarette Equivalence
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Converts a mean PM2.5 concentration over a period to cigarette equivalents.
 * Based on Berkeley Earth rule: ~22 µg/m³ × 24 h ≈ 1 cigarette.
 *
 * @param meanPM25  Mean PM2.5 concentration (µg/m³)
 * @param hours     Duration of exposure (hours)
 * @returns         Cigarette equivalent count (can be fractional)
 */
export function toCigaretteEquivalent(meanPM25: number, hours: number): number {
  if (meanPM25 <= 0 || hours <= 0) return 0;
  return (meanPM25 * hours) / (CIGARETTE_EQ_UGPM3_PER_24H * 24);
}

/**
 * Converts raw dose (µg) to cigarette equivalents.
 * Assumes the dose was inhaled at rest-equivalent ventilation over the given hours.
 * For display: cigEq = doseUg / (22 × 24 × VENTILATION_RATE.rest × 60)
 *
 * Simpler shortcut: use toCigaretteEquivalent(meanPM25, hours) wherever mean conc is known.
 */
export function doseUgToCigaretteEquivalent(doseUg: number): number {
  // 1 cig = 22 µg/m³ × 24 h × 7.5 L/min × 60 min/h × 10⁻³ m³/L
  const cigDoseUg =
    CIGARETTE_EQ_UGPM3_PER_24H *
    24 *
    VENTILATION_RATE.rest *
    60; // ≈ 237.6 µg
  if (cigDoseUg <= 0) return 0;
  return doseUg / cigDoseUg;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Commute CO₂ Savings (kg)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Computes weekly CO₂ saved by switching commute mode.
 *
 * @param currentMode     Current commute mode
 * @param alternativeMode Target commute mode
 * @param distanceKm      One-way trip distance (km)
 * @param tripsPerWeek    Round-trips per week (each = 2 × distanceKm)
 * @returns               kg CO₂ saved per week (0 if alternative is worse)
 */
export function computeCommuteCO2Saved(
  currentMode: CommuteModeType,
  alternativeMode: CommuteModeType,
  distanceKm: number,
  tripsPerWeek: number
): number {
  const currentFactor = CO2_FACTORS_KG_PER_KM[currentMode] ?? 0;
  const altFactor = CO2_FACTORS_KG_PER_KM[alternativeMode] ?? 0;
  const totalKmPerWeek = distanceKm * 2 * tripsPerWeek; // round-trips
  return Math.max(0, (currentFactor - altFactor) * totalKmPerWeek);
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Air Purifier Impact
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Models steady-state indoor PM2.5 fraction remaining after running a purifier.
 * Box model: fraction = ACH_natural / (ACH_natural + ACH_purifier)
 *
 * @param cadrM3h       Purifier CADR in m³/h (default: DEFAULT_CADR_M3H)
 * @param roomVolumeCbm Room volume in m³ (default: DEFAULT_ROOM_VOLUME)
 * @param naturalAch    Natural air changes per hour (default: DEFAULT_NATURAL_ACH)
 * @returns             Fraction of outdoor PM2.5 remaining indoors (0–1)
 */
export function computePurifierImpact(
  cadrM3h: number = DEFAULT_CADR_M3H,
  roomVolumeCbm: number = DEFAULT_ROOM_VOLUME,
  naturalAch: number = DEFAULT_NATURAL_ACH
): { fractionRemaining: number; pctReduction: number } {
  const achPurifier = cadrM3h / roomVolumeCbm;
  const fractionRemaining = naturalAch / (naturalAch + achPurifier);
  return {
    fractionRemaining,
    pctReduction: Math.round((1 - fractionRemaining) * 100),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 5b. What-If Simulator Impact Engine
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Computes live simulation results for the What-If Simulator.
 * Reflects both purifier benefits (for 24h indoor time) and activity hour / commute adjustments.
 */
export function computeSimulatedImpact(
  profile: Profile,
  aqiSnapshot: AQISnapshot,
  toggles: SimulateToggles
): SimulateResult {
  const pm25 = aqiSnapshot.pm25;
  const durationMin = toggles.activityDurationMin ?? 60;
  const outdoorHours = durationMin / 60;
  const indoorHours = Math.max(0, 24 - outdoorHours);

  // 1. Purifier impact (box model: 300 m³/h CADR in 30 m³ room yields ~95% drop)
  const { pctReduction: pctIndoorDrop, fractionRemaining } = computePurifierImpact();
  const indoorPM25After = toggles.purifierOn ? pm25 * fractionRemaining : pm25 * 0.75;

  // 2. Commute CO₂ saved
  const co2SavedKgWeek = computeCommuteCO2Saved(
    profile.commute.mode,
    toggles.commuteMode,
    profile.commute.distanceKm,
    profile.commute.tripsPerWeek
  );

  // 3. Activity hours
  const baselineOutdoorPM25 = pm25;
  const hourEntry = aqiSnapshot.forecast.find((h: HourlyAQI) => h.hour === toggles.activityHour);
  const optimizedOutdoorPM25 = hourEntry?.pm25 ?? pm25;

  // Baseline scenario: natural infiltration (0.75) without active purifier
  const baselineIndoorPM25 = pm25 * 0.75;
  const baselineIndoorDose = computeInhaledDose(baselineIndoorPM25, "light", indoorHours * 60);
  const baselineOutdoorDose = computeInhaledDose(baselineOutdoorPM25, "moderate", durationMin);
  const totalBaselineDose = baselineIndoorDose + baselineOutdoorDose;

  // Optimized scenario: user's chosen simulation toggles
  const optimizedIndoorDose = computeInhaledDose(indoorPM25After, "light", indoorHours * 60);
  const optimizedOutdoorDose = computeInhaledDose(optimizedOutdoorPM25, "moderate", durationMin);
  const totalOptimizedDose = optimizedIndoorDose + optimizedOutdoorDose;

  const exposureAvoidedUg = computeExposureAvoided(totalBaselineDose, totalOptimizedDose);

  // 4. Daily mean PM2.5 for cigarette-equivalents (reflects full 24h indoor + outdoor)
  const meanBaselinePM25 = (baselineIndoorPM25 * indoorHours + baselineOutdoorPM25 * outdoorHours) / 24;
  const meanOptimizedPM25 = (indoorPM25After * indoorHours + optimizedOutdoorPM25 * outdoorHours) / 24;

  const baselineCigEq = toCigaretteEquivalent(meanBaselinePM25, 24);
  const optimizedCigEq = toCigaretteEquivalent(meanOptimizedPM25, 24);

  const pctExposureCut =
    totalBaselineDose > 0
      ? Math.round(((totalBaselineDose - totalOptimizedDose) / totalBaselineDose) * 100)
      : 0;

  return {
    indoorPM25After: Math.round(indoorPM25After * 10) / 10,
    pctIndoorDrop: toggles.purifierOn ? pctIndoorDrop : 0,
    co2SavedKgWeek: Math.round(co2SavedKgWeek * 100) / 100,
    exposureAvoidedUg: Math.round(exposureAvoidedUg * 10) / 10,
    baselineCigEq: Math.round(baselineCigEq * 10) / 10,
    optimizedCigEq: Math.round(optimizedCigEq * 10) / 10,
    pctExposureCut,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Safe Ventilation Window
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Returns which hours are safe to open windows (outdoor PM2.5 is meaningfully
 * lower than estimated indoor PM2.5).
 *
 * @param hourlyOutdoor  Array of HourlyAQI for the next 24 h
 * @param currentIndoorPM25  Estimated current indoor PM2.5 (µg/m³)
 * @param thresholdRatio Outdoor must be below this fraction of indoor to open
 * @returns              Object with open (safe) and close (keep shut) hour arrays
 */
export function computeVentilationWindow(
  hourlyOutdoor: HourlyAQI[],
  currentIndoorPM25: number,
  thresholdRatio = 0.8
): { openHours: number[]; closeHours: number[] } {
  const openHours: number[] = [];
  const closeHours: number[] = [];

  for (const { hour, pm25 } of hourlyOutdoor) {
    if (hour < 5 || hour > 23) continue; // only 5 AM – 11 PM range
    if (pm25 < currentIndoorPM25 * thresholdRatio) {
      openHours.push(hour);
    } else {
      closeHours.push(hour);
    }
  }
  return { openHours, closeHours };
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. Personal Daily Exposure Meter
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Computes a household's total inhaled PM2.5 dose for today (baseline vs AirWise-optimized).
 *
 * Baseline: uses stated commute mode + no purifier adjustments
 * Optimized: applies best outdoor timing + purifier (if has one) + commute swap if applicable
 *
 * @param profile     User's household + home + commute profile
 * @param hourlyAQI   24-h hourly AQI forecast (at least 24 entries)
 * @returns           DailyExposureResult with baseline vs. optimized dose and % cut
 */
export function computePersonalDailyExposure(
  profile: Profile,
  hourlyAQI: HourlyAQI[]
): DailyExposureResult {
  return computePersonalDailyExposureV2(profile, hourlyAQI);
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function buildDayBlocks(profile: Profile, hourlyAQI: HourlyAQI[]): PersonalizedDoseBlock[] {
  const aqiByHour = new Map(hourlyAQI.map((h) => [h.hour, h.pm25]));
  const getPM25 = (h: number) => aqiByHour.get(h) ?? (aqiByHour.get(0) ?? 60);

  const commuteHour = 8;
  const commuteEndHour = 10;

  return [
    { label: "Sleep",   startHour: 23, endHour: 6,  activity: "sleep",    isOutdoor: false, pm25: getPM25(2),   doseUg: 0 },
    { label: "Morning", startHour: 6,  endHour: 9,  activity: "light",    isOutdoor: false, pm25: getPM25(7),   doseUg: 0 },
    { label: "Commute", startHour: commuteHour, endHour: commuteEndHour, activity: "moderate", isOutdoor: true, pm25: getPM25(commuteHour), doseUg: 0 },
    { label: "Work",    startHour: 10, endHour: 18, activity: "rest",     isOutdoor: false, pm25: getPM25(14),  doseUg: 0 },
    { label: "Evening", startHour: 18, endHour: 21, activity: "light",    isOutdoor: false, pm25: getPM25(19),  doseUg: 0 },
    { label: "Night",   startHour: 21, endHour: 23, activity: "rest",     isOutdoor: false, pm25: getPM25(22),  doseUg: 0 },
  ];
}

/** Checks whether outdoor activity is recommended for a sensitivity group at a given AQI. */
export function isOutdoorSafe(aqi: number, group: SensitivityGroup = "general"): boolean {
  return aqi < OUTDOOR_THRESHOLDS[group].caution;
}

export function outdoorRisk(aqi: number, group: SensitivityGroup = "general"): "safe" | "caution" | "avoid" | "stayIndoors" {
  const t = OUTDOOR_THRESHOLDS[group];
  if (aqi < t.caution) return "safe";
  if (aqi < t.avoid) return "caution";
  if (aqi < t.stayIndoors) return "avoid";
  return "stayIndoors";
}

// ─────────────────────────────────────────────────────────────────────────────
// 7b. Personal Daily Exposure V2 — profile-driven baseline vs optimized
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Realistic baseline vs optimized exposure computation.
 * Baseline = actual household routine (commute mode, default hours, windows closed).
 * Optimized = best timing + N95 mask + purifier (if owned) + commute swap.
 */
export function computePersonalDailyExposureV2(
  profile: Profile,
  hourlyAQI: HourlyAQI[]
): DailyExposureResult {
  if (hourlyAQI.length === 0) {
    return { baselineUg: 0, optimizedUg: 0, pctCut: 0, baselineCigEq: 0, optimizedCigEq: 0 };
  }

  const aqiByHour = new Map(hourlyAQI.map((h) => [h.hour, h.pm25]));
  const getPM25 = (h: number) => aqiByHour.get(h) ?? (aqiByHour.get(0) ?? 60);

  // Baseline indoor fraction: natural infiltration with windows closed / default routine, no purifier
  const baselineIndoorFraction = 0.75;

  // Optimized indoor fraction: purifier if owned (CADR box model ~0.05), else smart window closure (0.50)
  const optimizedIndoorFraction = profile.home.hasPurifier
    ? computePurifierImpact().fractionRemaining
    : 0.50;

  // Commute outdoor PM2.5 fraction based on mode
  const commuteModePM25Fraction: Record<string, number> = {
    car_petrol: 0.7, car_diesel: 0.7, auto: 0.85,
    bus: 0.8, metro: 0.75, bike: 1.0, walk: 1.0, wfh: baselineIndoorFraction,
  };
  const baselineCommuteFraction = commuteModePM25Fraction[profile.commute.mode] ?? 1.0;

  // Optimized commute: WFH stays indoor; bike/walk gets N95 (0.05); vehicle switches to clean metro
  const optimizedCommuteFraction = profile.commute.mode === "wfh"
    ? optimizedIndoorFraction
    : ["bike", "walk"].includes(profile.commute.mode)
      ? 0.05
      : 0.35;

  // Find the best outdoor hour (lowest PM2.5 between 5–21)
  const eligibleHours = hourlyAQI.filter((h) => h.hour >= 5 && h.hour <= 21);
  const bestHour = eligibleHours.reduce(
    (best, h) => (h.pm25 < best.pm25 ? h : best),
    eligibleHours[0] ?? { hour: 7, pm25: getPM25(7), aqi: 0 }
  );
  const bestPM25 = bestHour.pm25;

  const commuteHourPM25 = getPM25(8);
  const eveningPM25 = getPM25(19);

  const blocks: Array<{ label: string; durationMin: number; activity: ActivityLevel; baselinePM25: number; optimizedPM25: number }> = [
    // Sleep 23–6 = 7h
    { label: "Sleep", durationMin: 7 * 60, activity: "sleep",
      baselinePM25: getPM25(2) * baselineIndoorFraction,
      optimizedPM25: getPM25(2) * optimizedIndoorFraction },
    // Morning 6–8 = 2h
    { label: "Morning", durationMin: 2 * 60, activity: "light",
      baselinePM25: getPM25(7) * baselineIndoorFraction,
      optimizedPM25: getPM25(7) * optimizedIndoorFraction },
    // Commute 8–10 = 2h
    { label: "Commute", durationMin: 2 * 60, activity: "moderate",
      baselinePM25: commuteHourPM25 * baselineCommuteFraction,
      optimizedPM25: commuteHourPM25 * optimizedCommuteFraction },
    // Work 10–18 = 8h
    { label: "Work", durationMin: 8 * 60, activity: "rest",
      baselinePM25: getPM25(14) * baselineIndoorFraction,
      optimizedPM25: getPM25(14) * (profile.commute.mode === "wfh" ? optimizedIndoorFraction : 0.6) },
    // Evening 18–21 = 3h (elderly stay indoors in optimized)
    { label: "Evening", durationMin: 3 * 60, activity: "light",
      baselinePM25: eveningPM25 * (profile.household.elderly > 0 ? 0.85 : baselineIndoorFraction),
      optimizedPM25: eveningPM25 * optimizedIndoorFraction },
    // Night 21–23 = 2h
    { label: "Night", durationMin: 2 * 60, activity: "rest",
      baselinePM25: getPM25(22) * baselineIndoorFraction,
      optimizedPM25: getPM25(22) * optimizedIndoorFraction },
    // Outdoor activity block (timed to best hour in optimized with N95 mask)
    { label: "Outdoor", durationMin: 60, activity: "moderate",
      baselinePM25: getPM25(17),
      optimizedPM25: bestPM25 * 0.05 },
  ];

  let baselineUg = 0;
  let optimizedUg = 0;

  for (const block of blocks) {
    baselineUg += computeInhaledDose(block.baselinePM25, block.activity, block.durationMin);
    optimizedUg += computeInhaledDose(block.optimizedPM25, block.activity, block.durationMin);
  }

  const pctCut = baselineUg > 0 ? Math.round(((baselineUg - optimizedUg) / baselineUg) * 100) : 0;

  return {
    baselineUg: Math.round(baselineUg),
    optimizedUg: Math.round(optimizedUg),
    pctCut,
    baselineCigEq: Math.round(doseUgToCigaretteEquivalent(baselineUg) * 10) / 10,
    optimizedCigEq: Math.round(doseUgToCigaretteEquivalent(optimizedUg) * 10) / 10,
  };
}
