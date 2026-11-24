/**
 * lib/types.ts
 *
 * Shared TypeScript types for AirWise.
 * Import from here — never re-define these types in components or routes.
 */

import type { CPCBBand } from "./cpcb-bands";
import type { ActivityLevel, CityName } from "./constants";

// ─── AQI Data ──────────────────────────────────────────────────────────────────

export interface HourlyAQI {
  hour: number;   // 0–23
  aqi: number;
  pm25: number;   // µg/m³
  pm10?: number;
}

export interface HealthRecommendations {
  generalPopulation?: string;
  children?: string;
  elderly?: string;
  athletes?: string;
  lungDisease?: string;
  heartDisease?: string;
  pregnant?: string;
}

export interface AQISnapshot {
  aqi: number;              // India CPCB AQI (from WAQI or Google AQ local AQI)
  band: CPCBBand;
  dominantPollutant: string;
  pm25: number;             // µg/m³
  pm10: number;
  healthRecs: HealthRecommendations;
  forecast: HourlyAQI[];   // 48-h hourly (empty when using WAQI)
  history: HourlyAQI[];    // past 24-h hourly (empty when using WAQI)
  fetchedAt: string;       // ISO timestamp — always show this
  source: string;          // "WAQI" | "Google Air Quality API" | "*(cached)*"
  lat: number;
  lng: number;
  city?: string;
}

// ─── Profile ───────────────────────────────────────────────────────────────────

export type HealthCondition = "asthma" | "copd" | "heart" | "lung" | "pregnant";
export type CommuteModeType  = "car_petrol" | "car_diesel" | "auto" | "bus" | "metro" | "bike" | "walk" | "wfh";
export type HomeType         = "apartment" | "independent";
export type KitchenFuel      = "lpg" | "induction" | "biomass" | "kerosene";

export interface HouseholdProfile {
  adults: number;
  kids: number;        // children under 12
  elderly: number;     // 60+
  conditions: HealthCondition[];
}

export interface HomeProfile {
  type: HomeType;
  hasPurifier: boolean;
  hasAC: boolean;
  hasChimney: boolean;
  kitchenFuel: KitchenFuel;
}

export interface CommuteProfile {
  mode: CommuteModeType;
  distanceKm: number;
  tripsPerWeek: number;
  alternativeMode?: CommuteModeType;
}

export interface Profile {
  id: string;             // anonymous UUID, generated client-side
  city: CityName | string;
  lat: number;
  lng: number;
  household: HouseholdProfile;
  home: HomeProfile;
  commute: CommuteProfile;
  locale: "en" | "hi" | "kn";   // language preference
  createdAt: string;
  updatedAt: string;
}

// ─── Plan ──────────────────────────────────────────────────────────────────────

export type PlanCategory   = "routine" | "indoor" | "alternative";
export type ImpactMetric   = "pm25_exposure_avoided" | "co2_saved_kg" | "indoor_pm25_drop";
export type EffortLevel    = "low" | "medium" | "high";

export interface PlanItem {
  id: string;
  category: PlanCategory;
  title: string;
  when: string;                   // e.g. "2–4 PM today"
  explanation: string;            // household-specific, written by Gemini
  impact_metric: ImpactMetric;
  impact_value: number;           // SET BY IMPACT ENGINE — never by the model
  impact_unit: string;
  impact_cig_eq?: number;         // cigarette-equivalent (always computed)
  effort: EffortLevel;
  checklistItem?: boolean;
}

export interface PlanResponse {
  items: PlanItem[];
  morningBrief?: string;          // Gemini-generated "today's air story"
  generatedAt: string;
  profileId: string;
  aqiSnapshot: Pick<AQISnapshot, "aqi" | "pm25" | "source" | "fetchedAt">;
}

// ─── Simulate ──────────────────────────────────────────────────────────────────

export interface SimulateToggles {
  purifierOn: boolean;
  commuteMode: CommuteModeType;
  activityHour: number;    // 0–23 — hour to do outdoor activity
  activityDurationMin: number;
}

export interface SimulateResult {
  indoorPM25After: number;
  pctIndoorDrop: number;
  co2SavedKgWeek: number;
  exposureAvoidedUg: number;
  baselineCigEq: number;
  optimizedCigEq: number;
  pctExposureCut: number;
}

// ─── Chat ──────────────────────────────────────────────────────────────────────

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  timestamp: string;
}

// ─── Impact Engine internals ───────────────────────────────────────────────────

export interface DailyExposureResult {
  baselineUg: number;
  optimizedUg: number;
  pctCut: number;
  baselineCigEq: number;
  optimizedCigEq: number;
}

export interface PersonalizedDoseBlock {
  label: string;
  startHour: number;
  endHour: number;
  activity: ActivityLevel;
  isOutdoor: boolean;
  pm25: number;
  doseUg: number;
}
