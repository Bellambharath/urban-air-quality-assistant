/**
 * lib/constants.ts
 *
 * All numeric assumptions used by the Impact Engine.
 * Every constant has a source comment so the blog can cite them.
 * Keep this file as the single source — never hard-code these elsewhere.
 */

// ─── Minute Ventilation (m³/min) ──────────────────────────────────────────────
// Source: ICRP Publication 66 (1994), Table B.4 — reference values by activity
export const VENTILATION_RATE = {
  sleep: 0.005,       // 5 L/min
  rest: 0.0075,       // 7.5 L/min  (seated/standing)
  light: 0.012,       // 12 L/min   (slow walk, light housework)
  moderate: 0.025,    // 25 L/min   (brisk walk, cycling)
  exercise: 0.045,    // 45 L/min   (~6× rest; jogging / outdoor run)
} as const;

export type ActivityLevel = keyof typeof VENTILATION_RATE;

// ─── Cigarette Equivalence ────────────────────────────────────────────────────
// Source: Berkeley Earth Air Quality — "one cigarette ≈ 22 µg/m³ × 24 h of PM2.5"
// See: http://berkeleyearth.org/air-pollution-and-cigarette-equivalence/
export const CIGARETTE_EQ_UGPM3_PER_24H = 22; // µg/m³ · hr to equal 1 cigarette

// ─── CO₂ Emission Factors (kg per passenger-km) ─────────────────────────────
// Source: India-specific values from MNRE/MoEFCC Emission Factor reports 2023
// and Delhi TERI Urban Mobility study (2022)
export const CO2_FACTORS_KG_PER_KM: Record<string, number> = {
  car_petrol:   0.17,  // petrol car, single occupant
  car_diesel:   0.15,
  auto:         0.11,  // CNG auto-rickshaw
  bus:          0.05,  // city bus, avg occupancy
  metro:        0.03,  // metro rail (India grid mix)
  bike:         0.00,  // bicycle
  walk:         0.00,
  wfh:          0.00,
};

// ─── Air Purifier Model ───────────────────────────────────────────────────────
// Source: EPA guide "Residential Air Cleaners" (2018), Box model derivation
// Fraction remaining = ACH_natural / (ACH_natural + ACH_purifier)
// ACH_purifier = CADR (m³/h) / RoomVolume (m³)
export const DEFAULT_NATURAL_ACH = 0.5;    // typical Indian apartment, windows closed
export const DEFAULT_CADR_M3H    = 300;    // mid-range purifier (e.g. Xiaomi Air Purifier 3H)
export const DEFAULT_ROOM_VOLUME = 30;     // m³  (~3 m ceiling × 10 m² room)

// ─── Protective & Clean-Air Assumptions ───────────────────────────────────────
// NIOSH standard for N95: at least 95% filtration efficiency against 0.3 µm NaCl particles
export const MASK_EFFICIENCY_N95 = 0.95;

// Average diurnal reduction in PM2.5 during safe clean-air window (~40% lower than peak)
export const CLEAN_WINDOW_PM25_RATIO = 0.6;

// Typical Indian urban indoor/outdoor ratio with windows closed (no purifier)
// Source: CPCB & IIT Delhi indoor air quality studies (2020)
export const INDOOR_UNFILTERED_RATIO = 0.6;

// ─── Personal Daily Exposure Fractions ────────────────────────────────────────
// Indoor PM2.5 expressed as a fraction of the outdoor concentration, per scenario.
// Sources: CPCB & IIT Delhi indoor air-quality studies (2020); EPA residential
// air-cleaner guidance (2018); TERI Delhi commuter-exposure study (2022).

// Baseline: natural infiltration, windows closed, no purifier (default routine)
export const BASELINE_INDOOR_FRACTION = 0.75;

// Optimized without a purifier: smart window closure during peak-pollution hours
export const OPTIMIZED_INDOOR_FRACTION = 0.5;

// Fraction of PM2.5 remaining after an N95 mask (1 − filtration efficiency)
export const N95_FRACTION_REMAINING = 1 - MASK_EFFICIENCY_N95; // 0.05

// Indoor PM2.5 fraction during the work block (office / indoor, no purifier)
export const WORK_INDOOR_FRACTION = 0.6;

// Elderly stay indoors for the evening block: higher infiltration exposure
export const ELDERLY_EVENING_INDOOR_FRACTION = 0.85;

// Optimized commute: vehicle users switch to cleaner metro
export const OPTIMIZED_COMMUTE_SWAP_FRACTION = 0.35;

// Outdoor PM2.5 fraction experienced per commute mode (exposure vs ambient air)
export const COMMUTE_MODE_PM25_FRACTION: Record<string, number> = {
  car_petrol: 0.7, car_diesel: 0.7, auto: 0.85,
  bus: 0.8, metro: 0.75, bike: 1.0, walk: 1.0, wfh: BASELINE_INDOOR_FRACTION,
};

// Indoor PM2.5 reduction as a fraction of ambient PM2.5, by mitigation action.
// Source: CPCB / IIT Delhi indoor-intervention studies; WHO household air-pollution guidance.
export const INDOOR_ACTION_PM25_REDUCTION: Record<string, number> = {
  "close-windows-peak": 0.35,
  "ventilate-clean-hours": 0.25,
  "wet-mop-floors": 0.15,
  "cooking-lid-on": 0.2,
  "cooking-chimney": 0.4,
  "cooking-swap-induction": 0.5,
  "heating-swap-electric": 0.6,
};

// ─── 10 Cities with default lat/lng ───────────────────────────────────────────
export const SUPPORTED_CITIES = [
  { name: "Delhi",      lat: 28.6139, lng: 77.2090 },
  { name: "Mumbai",     lat: 19.0760, lng: 72.8777 },
  { name: "Bengaluru",  lat: 12.9716, lng: 77.5946 },
  { name: "Hyderabad",  lat: 17.3850, lng: 78.4867 },
  { name: "Chennai",    lat: 13.0827, lng: 80.2707 },
  { name: "Kolkata",    lat: 22.5726, lng: 88.3639 },
  { name: "Pune",       lat: 18.5204, lng: 73.8567 },
  { name: "Ahmedabad",  lat: 23.0225, lng: 72.5714 },
  { name: "Lucknow",    lat: 26.8467, lng: 80.9462 },
  { name: "Jaipur",     lat: 26.9124, lng: 75.7873 },
] as const;

export type CityName = (typeof SUPPORTED_CITIES)[number]["name"];

// Static fallback AQI per city when a live reading is unavailable
// (only the user's current city is fetched live from /api/aqi).
export const STATIC_CITY_AQI: Record<string, number> = {
  Delhi: 300, Mumbai: 150, Bengaluru: 100, Hyderabad: 120, Chennai: 80,
  Kolkata: 200, Pune: 130, Ahmedabad: 180, Lucknow: 280, Jaipur: 220,
};

// ─── Personalization Thresholds ───────────────────────────────────────────────
// AQI thresholds for outdoor activity recommendations, by sensitivity level
export const OUTDOOR_THRESHOLDS = {
  general:   { caution: 101, avoid: 201, stayIndoors: 301 },
  sensitive: { caution: 51,  avoid: 101, stayIndoors: 201 },  // elderly / heart / lung
  children:  { caution: 51,  avoid: 101, stayIndoors: 151 },
  asthma:    { caution: 51,  avoid: 100, stayIndoors: 151 },
} as const;

export type SensitivityGroup = keyof typeof OUTDOOR_THRESHOLDS;
