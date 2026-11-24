/**
 * __tests__/impact-engine.test.ts
 *
 * Unit tests for every function in lib/impact-engine.ts.
 * Run: npx vitest --reporter=verbose
 * Screenshot the green output — it's blog evidence for a trustworthy Impact Engine.
 */

import { describe, it, expect } from "vitest";
import {
  computeInhaledDose,
  computeExposureAvoided,
  toCigaretteEquivalent,
  doseUgToCigaretteEquivalent,
  computeCommuteCO2Saved,
  computePurifierImpact,
  computeVentilationWindow,
  computePersonalDailyExposure,
  isOutdoorSafe,
  outdoorRisk,
} from "../lib/impact-engine";
import type { HourlyAQI, Profile } from "../lib/types";

// ─── Shared test fixtures ───────────────────────────────────────────────────

const MOCK_HOURLY_AQI: HourlyAQI[] = Array.from({ length: 24 }, (_, i) => ({
  hour: i,
  aqi: 150,
  pm25: 60,
  pm10: 90,
}));

const MOCK_PROFILE: Profile = {
  id: "test-profile",
  city: "Delhi",
  lat: 28.6139,
  lng: 77.209,
  household: { adults: 2, kids: 1, elderly: 0, conditions: [] },
  home: { type: "apartment", hasPurifier: false, hasAC: false, hasChimney: false, kitchenFuel: "lpg" },
  commute: { mode: "car_petrol", distanceKm: 10, tripsPerWeek: 5 },
  locale: "en",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// ─── 1. computeInhaledDose ──────────────────────────────────────────────────

describe("computeInhaledDose", () => {
  it("computes dose at rest for 60 minutes at 100 µg/m³", () => {
    // 100 µg/m³ × 0.0075 m³/min × 60 min = 45 µg
    expect(computeInhaledDose(100, "rest", 60)).toBeCloseTo(45, 2);
  });

  it("computes dose during exercise (higher ventilation rate)", () => {
    // 100 × 0.045 × 60 = 270 µg
    expect(computeInhaledDose(100, "exercise", 60)).toBeCloseTo(270, 2);
  });

  it("exercise dose is ~6× rest dose at same concentration", () => {
    const restDose = computeInhaledDose(80, "rest", 30);
    const exerciseDose = computeInhaledDose(80, "exercise", 30);
    expect(exerciseDose / restDose).toBeCloseTo(6, 1);
  });

  it("returns 0 for zero concentration", () => {
    expect(computeInhaledDose(0, "rest", 60)).toBe(0);
  });

  it("returns 0 for zero duration", () => {
    expect(computeInhaledDose(100, "rest", 0)).toBe(0);
  });

  it("returns 0 for negative concentration", () => {
    expect(computeInhaledDose(-10, "rest", 60)).toBe(0);
  });

  it("computes sleep dose (lowest ventilation)", () => {
    // 50 × 0.005 × 480 = 120 µg (8 h = 480 min)
    expect(computeInhaledDose(50, "sleep", 480)).toBeCloseTo(120, 2);
  });
});

// ─── 2. computeExposureAvoided ──────────────────────────────────────────────

describe("computeExposureAvoided", () => {
  it("returns positive avoided dose when indoor < outdoor", () => {
    expect(computeExposureAvoided(200, 50)).toBe(150);
  });

  it("clamps to 0 when indoor dose is higher (outdoor is cleaner)", () => {
    expect(computeExposureAvoided(50, 200)).toBe(0);
  });

  it("returns 0 when doses are equal", () => {
    expect(computeExposureAvoided(100, 100)).toBe(0);
  });
});

// ─── 3. toCigaretteEquivalent ───────────────────────────────────────────────

describe("toCigaretteEquivalent", () => {
  it("22 µg/m³ over 24 h equals exactly 1 cigarette (Berkeley Earth baseline)", () => {
    expect(toCigaretteEquivalent(22, 24)).toBeCloseTo(1, 5);
  });

  it("44 µg/m³ over 24 h equals 2 cigarettes", () => {
    expect(toCigaretteEquivalent(44, 24)).toBeCloseTo(2, 5);
  });

  it("scales linearly with time — 12 h at 22 µg/m³ = 0.5 cigs", () => {
    expect(toCigaretteEquivalent(22, 12)).toBeCloseTo(0.5, 5);
  });

  it("returns 0 for zero PM2.5", () => {
    expect(toCigaretteEquivalent(0, 24)).toBe(0);
  });

  it("returns 0 for zero hours", () => {
    expect(toCigaretteEquivalent(22, 0)).toBe(0);
  });

  it("Delhi 'Very Poor' (PM2.5 ≈ 150 µg/m³) over 24 h ≈ 6.8 cigarettes", () => {
    expect(toCigaretteEquivalent(150, 24)).toBeCloseTo(6.818, 2);
  });
});

describe("doseUgToCigaretteEquivalent", () => {
  it("returns positive value for positive dose", () => {
    expect(doseUgToCigaretteEquivalent(100)).toBeGreaterThan(0);
  });

  it("scales linearly — double the dose = double the cigs", () => {
    const single = doseUgToCigaretteEquivalent(100);
    const double = doseUgToCigaretteEquivalent(200);
    expect(double).toBeCloseTo(single * 2, 5);
  });
});

// ─── 4. computeCommuteCO2Saved ──────────────────────────────────────────────

describe("computeCommuteCO2Saved", () => {
  it("saves 0.17 kg/km × 2 × 10 km × 5 trips = 17 kg/week switching car→walk", () => {
    expect(computeCommuteCO2Saved("car_petrol", "walk", 10, 5)).toBeCloseTo(17, 2);
  });

  it("car_petrol → metro saves (0.17 − 0.03) × 100 km/week = 14 kg", () => {
    expect(computeCommuteCO2Saved("car_petrol", "metro", 10, 5)).toBeCloseTo(14, 2);
  });

  it("returns 0 when alternative is same mode", () => {
    expect(computeCommuteCO2Saved("car_petrol", "car_petrol", 10, 5)).toBe(0);
  });

  it("clamps to 0 if alternative emits more (should not happen in practice)", () => {
    // bus → car: negative saved, should return 0
    expect(computeCommuteCO2Saved("bus", "car_petrol", 10, 5)).toBe(0);
  });

  it("zero trips = zero savings", () => {
    expect(computeCommuteCO2Saved("car_petrol", "walk", 10, 0)).toBe(0);
  });

  it("zero distance = zero savings", () => {
    expect(computeCommuteCO2Saved("car_petrol", "walk", 0, 5)).toBe(0);
  });
});

// ─── 5. computePurifierImpact ───────────────────────────────────────────────

describe("computePurifierImpact", () => {
  it("typical mid-range purifier (300 m³/h CADR, 30 m³ room) reduces PM2.5 by >70%", () => {
    const { pctReduction } = computePurifierImpact(300, 30, 0.5);
    expect(pctReduction).toBeGreaterThanOrEqual(70);
  });

  it("fractionRemaining is between 0 and 1", () => {
    const { fractionRemaining } = computePurifierImpact(300, 30, 0.5);
    expect(fractionRemaining).toBeGreaterThan(0);
    expect(fractionRemaining).toBeLessThan(1);
  });

  it("higher CADR = lower fraction remaining (more effective)", () => {
    const low  = computePurifierImpact(100, 30, 0.5).fractionRemaining;
    const high = computePurifierImpact(600, 30, 0.5).fractionRemaining;
    expect(high).toBeLessThan(low);
  });

  it("larger room = less effective (same CADR)", () => {
    const small = computePurifierImpact(300, 20, 0.5).fractionRemaining;
    const large = computePurifierImpact(300, 60, 0.5).fractionRemaining;
    expect(large).toBeGreaterThan(small);
  });
});

// ─── 6. computeVentilationWindow ────────────────────────────────────────────

describe("computeVentilationWindow", () => {
  it("recommends opening windows when outdoor PM2.5 is well below indoor", () => {
    const hourly: HourlyAQI[] = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      aqi: 50,
      pm25: 20, // outdoor is clean
    }));
    const { openHours } = computeVentilationWindow(hourly, 80); // indoor = 80 µg/m³
    expect(openHours.length).toBeGreaterThan(0);
  });

  it("recommends keeping windows closed when outdoor PM2.5 > indoor", () => {
    const hourly: HourlyAQI[] = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      aqi: 300,
      pm25: 150, // very polluted outside
    }));
    const { openHours, closeHours } = computeVentilationWindow(hourly, 30); // indoor clean
    expect(openHours.length).toBe(0);
    expect(closeHours.length).toBeGreaterThan(0);
  });

  it("only considers hours 5–23", () => {
    const hourly: HourlyAQI[] = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      aqi: 50,
      pm25: 10,
    }));
    const { openHours, closeHours } = computeVentilationWindow(hourly, 80);
    const allHours = [...openHours, ...closeHours];
    expect(allHours.every((h) => h >= 5 && h <= 23)).toBe(true);
  });
});

// ─── 7. computePersonalDailyExposure ────────────────────────────────────────

describe("computePersonalDailyExposure", () => {
  it("returns zero result for empty hourly array", () => {
    const result = computePersonalDailyExposure(MOCK_PROFILE, []);
    expect(result.baselineUg).toBe(0);
    expect(result.optimizedUg).toBe(0);
    expect(result.pctCut).toBe(0);
  });

  it("baseline dose is positive for non-zero PM2.5", () => {
    const result = computePersonalDailyExposure(MOCK_PROFILE, MOCK_HOURLY_AQI);
    expect(result.baselineUg).toBeGreaterThan(0);
  });

  it("optimized dose is ≤ baseline (AirWise never makes it worse)", () => {
    const result = computePersonalDailyExposure(MOCK_PROFILE, MOCK_HOURLY_AQI);
    expect(result.optimizedUg).toBeLessThanOrEqual(result.baselineUg);
  });

  it("pctCut is 0–100", () => {
    const result = computePersonalDailyExposure(MOCK_PROFILE, MOCK_HOURLY_AQI);
    expect(result.pctCut).toBeGreaterThanOrEqual(0);
    expect(result.pctCut).toBeLessThanOrEqual(100);
  });

  it("profile with purifier has lower optimized dose than without", () => {
    const profileWithPurifier: Profile = {
      ...MOCK_PROFILE,
      home: { ...MOCK_PROFILE.home, hasPurifier: true },
    };
    const without = computePersonalDailyExposure(MOCK_PROFILE, MOCK_HOURLY_AQI);
    const with_   = computePersonalDailyExposure(profileWithPurifier, MOCK_HOURLY_AQI);
    expect(with_.optimizedUg).toBeLessThan(without.optimizedUg);
  });

  it("cig equivalents are positive for non-zero PM2.5", () => {
    const result = computePersonalDailyExposure(MOCK_PROFILE, MOCK_HOURLY_AQI);
    expect(result.baselineCigEq).toBeGreaterThan(0);
    expect(result.optimizedCigEq).toBeGreaterThan(0);
  });

  it("yields a meaningful, profile-driven percentage cut (> 15%, not flat 10%)", () => {
    const result = computePersonalDailyExposure(MOCK_PROFILE, MOCK_HOURLY_AQI);
    expect(result.pctCut).toBeGreaterThan(15);
  });

  it("produces different dose cuts across different commute profiles", () => {
    const walkerProfile: Profile = {
      ...MOCK_PROFILE,
      commute: { ...MOCK_PROFILE.commute, mode: "walk" },
    };
    const carProfile: Profile = {
      ...MOCK_PROFILE,
      commute: { ...MOCK_PROFILE.commute, mode: "car_petrol" },
    };
    const wfhProfile: Profile = {
      ...MOCK_PROFILE,
      commute: { ...MOCK_PROFILE.commute, mode: "wfh" },
    };

    const walkResult = computePersonalDailyExposure(walkerProfile, MOCK_HOURLY_AQI);
    const carResult = computePersonalDailyExposure(carProfile, MOCK_HOURLY_AQI);
    const wfhResult = computePersonalDailyExposure(wfhProfile, MOCK_HOURLY_AQI);

    // Walking outdoors has higher baseline exposure than car or WFH
    expect(walkResult.baselineUg).toBeGreaterThan(wfhResult.baselineUg);
    // Walking with N95 in optimized yields substantial dose cut
    expect(walkResult.pctCut).toBeGreaterThan(20);
    // Different profiles have different cuts
    expect(walkResult.baselineUg).not.toBe(carResult.baselineUg);
  });
});

// ─── 8. Outdoor safety helpers ──────────────────────────────────────────────

describe("isOutdoorSafe", () => {
  it("AQI 50 is safe for general population", () => {
    expect(isOutdoorSafe(50, "general")).toBe(true);
  });

  it("AQI 110 is NOT safe for general population (caution at 101)", () => {
    expect(isOutdoorSafe(110, "general")).toBe(false);
  });

  it("AQI 80 is NOT safe for sensitive group (caution at 51)", () => {
    expect(isOutdoorSafe(80, "sensitive")).toBe(false);
  });

  it("AQI 30 is safe for all groups", () => {
    expect(isOutdoorSafe(30, "general")).toBe(true);
    expect(isOutdoorSafe(30, "sensitive")).toBe(true);
    expect(isOutdoorSafe(30, "children")).toBe(true);
    expect(isOutdoorSafe(30, "asthma")).toBe(true);
  });
});

describe("outdoorRisk", () => {
  it("AQI 40 → safe for general", () => {
    expect(outdoorRisk(40, "general")).toBe("safe");
  });

  it("AQI 150 → caution for general (101–200 moderate band)", () => {
    expect(outdoorRisk(150, "general")).toBe("caution");
  });

  it("AQI 250 → avoid for general (poor band)", () => {
    expect(outdoorRisk(250, "general")).toBe("avoid");
  });

  it("AQI 350 → stayIndoors for general (very poor)", () => {
    expect(outdoorRisk(350, "general")).toBe("stayIndoors");
  });

  it("stricter threshold: AQI 80 → caution for children (caution at 51)", () => {
    expect(outdoorRisk(80, "children")).toBe("caution");
  });

  it("stricter threshold: AQI 120 → stayIndoors for asthma (stayIndoors at 151 — no, avoid at 100)", () => {
    expect(outdoorRisk(120, "asthma")).toBe("avoid");
  });
});
