/**
 * __tests__/plan-pipeline.test.ts
 *
 * Unit tests for Stage 5 plan reconciliation and candidate selection.
 */

import { describe, it, expect } from "vitest";
import { buildPlanItems, selectAndScoreCandidates, type ScoredCandidate } from "../lib/personalization";
import { createDefaultProfile } from "../lib/profile";
import { getBand } from "../lib/cpcb-bands";
import type { AQISnapshot, PlanItem } from "../lib/types";

describe("Stage 5 Plan Reconciliation (buildPlanItems)", () => {
  const mockCandidates: ScoredCandidate[] = [
    {
      id: "time-outdoor-activity",
      category: "routine",
      title: "Time outdoor activity to clean-air hours",
      when: "2–4 PM today",
      impact_metric: "pm25_exposure_avoided",
      impact_value: 45.2,
      impact_unit: "µg PM2.5 avoided",
      effort: "low",
      relevanceScore: 95,
    },
    {
      id: "run-purifier",
      category: "indoor",
      title: "Run your air purifier on high during peak hours",
      when: "7–10 AM and 6–9 PM",
      impact_metric: "indoor_pm25_drop",
      impact_value: 75,
      impact_unit: "% indoor PM2.5 reduction",
      effort: "low",
      relevanceScore: 90,
    },
    {
      id: "commute-swap-metro",
      category: "alternative",
      title: "Take metro instead of car today",
      when: "Morning commute",
      impact_metric: "co2_saved_kg",
      impact_value: 2.8,
      impact_unit: "kg CO₂ saved today",
      effort: "medium",
      relevanceScore: 85,
    },
    {
      id: "close-windows-peak",
      category: "indoor",
      title: "Keep windows closed during peak pollution hours",
      when: "Peak hours",
      impact_metric: "indoor_pm25_drop",
      impact_value: 30,
      impact_unit: "µg/m³ indoor PM2.5 reduction",
      effort: "low",
      relevanceScore: 80,
    },
    {
      id: "wet-mop-floors",
      category: "indoor",
      title: "Wet mop floors to trap settled particles",
      when: "Morning",
      impact_metric: "indoor_pm25_drop",
      impact_value: 15,
      impact_unit: "µg/m³ indoor PM2.5 reduction",
      effort: "low",
      relevanceScore: 70,
    },
  ];

  it("fails if a plan item's impact_value is 0 when a matching candidate had a non-zero value", () => {
    // Gemini returned items with impact_value: 0 as instructed by the prompt
    const geminiItems: Partial<PlanItem>[] = [
      {
        id: "time-outdoor-activity",
        category: "routine",
        title: "Time outdoor activity",
        when: "2–4 PM today",
        explanation: "Keeps your children safe during peak hours.",
        impact_metric: "pm25_exposure_avoided",
        impact_value: 0, // Model output is 0
        impact_unit: "µg",
        effort: "low",
      },
      {
        id: "run-purifier",
        category: "indoor",
        title: "Run your air purifier",
        when: "All morning",
        explanation: "Reduces bedroom particulate levels.",
        impact_metric: "indoor_pm25_drop",
        impact_value: 0,
        impact_unit: "%",
        effort: "low",
      },
      {
        id: "commute-swap-metro",
        category: "alternative",
        title: "Take the metro",
        when: "Office commute",
        explanation: "Avoids vehicle emissions and heavy traffic.",
        impact_metric: "co2_saved_kg",
        impact_value: 0,
        impact_unit: "kg",
        effort: "medium",
      },
      {
        id: "close-windows-peak",
        category: "indoor",
        title: "Keep windows closed",
        when: "7–10 AM",
        explanation: "Prevents morning smog entering home.",
        impact_metric: "indoor_pm25_drop",
        impact_value: 0,
        impact_unit: "µg/m³",
        effort: "low",
      },
    ];

    const result = buildPlanItems(geminiItems, mockCandidates);

    expect(result.length).toBeGreaterThanOrEqual(4);

    for (const item of result) {
      const candidate = mockCandidates.find((c) => c.id === item.id);
      if (candidate && candidate.impact_value > 0) {
        // Assert: Impact value must NOT be 0 when candidate has a non-zero value
        expect(item.impact_value).not.toBe(0);
        expect(item.impact_value).toBe(candidate.impact_value);
        expect(item.impact_unit).toBe(candidate.impact_unit);
      }
    }
  });

  it("drops returned items whose id is not in the scored candidates catalog", () => {
    const geminiItemsWithHallucinatedIds: Partial<PlanItem>[] = [
      {
        id: "time-outdoor-activity",
        category: "routine",
        title: "Time outdoor activity",
        when: "2–4 PM",
        explanation: "Good for the kids.",
        impact_metric: "pm25_exposure_avoided",
        impact_value: 0,
        impact_unit: "µg",
        effort: "low",
      },
      {
        id: "run-purifier",
        category: "indoor",
        title: "Run purifier",
        when: "Morning",
        explanation: "Clean indoor air.",
        impact_metric: "indoor_pm25_drop",
        impact_value: 0,
        impact_unit: "%",
        effort: "low",
      },
      {
        id: "commute-swap-metro",
        category: "alternative",
        title: "Take metro",
        when: "Commute",
        explanation: "Save CO2.",
        impact_metric: "co2_saved_kg",
        impact_value: 0,
        impact_unit: "kg",
        effort: "medium",
      },
      {
        id: "close-windows-peak",
        category: "indoor",
        title: "Close windows",
        when: "Peak hours",
        explanation: "Keep dust out.",
        impact_metric: "indoor_pm25_drop",
        impact_value: 0,
        impact_unit: "µg/m³",
        effort: "low",
      },
      {
        id: "invented-fake-slug-xyz", // Hallucinated ID
        category: "routine",
        title: "Drink warm tea",
        when: "Morning",
        explanation: "Feels good.",
        impact_metric: "pm25_exposure_avoided",
        impact_value: 0,
        impact_unit: "none",
        effort: "low",
      },
    ];

    const result = buildPlanItems(geminiItemsWithHallucinatedIds, mockCandidates);
    const hasHallucinated = result.some((item) => item.id === "invented-fake-slug-xyz");
    expect(hasHallucinated).toBe(false);
  });

  it("builds cards directly from top scored candidates when fewer than 4 valid items return", () => {
    // Only 1 valid item returned by model, rest are invalid slugs
    const geminiItems: Partial<PlanItem>[] = [
      {
        id: "time-outdoor-activity",
        category: "routine",
        title: "Time outdoor activity",
        when: "2–4 PM",
        explanation: "Custom Gemini explanation for outdoor timing.",
        impact_metric: "pm25_exposure_avoided",
        impact_value: 0,
        impact_unit: "µg",
        effort: "low",
      },
      {
        id: "hallucinated-slug-1",
        category: "routine",
        title: "Bad item 1",
        when: "Now",
        explanation: "Fake explanation",
        impact_metric: "pm25_exposure_avoided",
        impact_value: 0,
        impact_unit: "µg",
        effort: "low",
      },
    ];

    const result = buildPlanItems(geminiItems, mockCandidates);

    // Must build cards from top candidates to have at least 4 items
    expect(result.length).toBeGreaterThanOrEqual(4);

    // The valid item should preserve Gemini's custom explanation
    const outdoorItem = result.find((item) => item.id === "time-outdoor-activity");
    expect(outdoorItem).toBeDefined();
    expect(outdoorItem?.explanation).toBe("Custom Gemini explanation for outdoor timing.");
    expect(outdoorItem?.impact_value).toBe(45.2);

    // The other items must match top scored candidates
    for (const item of result) {
      const candidate = mockCandidates.find((c) => c.id === item.id);
      expect(candidate).toBeDefined();
      expect(item.impact_value).toBe(candidate!.impact_value);
      expect(item.impact_value).toBeGreaterThan(0);
    }
  });

  it("calculates distinct, non-duplicate impact values for different exposure-avoided actions", () => {
    const profile = createDefaultProfile();
    profile.household.kids = 2;
    profile.household.elderly = 1;
    profile.household.conditions = ["asthma"];
    profile.home.hasPurifier = true;

    const snapshot: AQISnapshot = {
      aqi: 325,
      band: getBand(325),
      dominantPollutant: "pm25",
      pm25: 151,
      pm10: 220,
      healthRecs: {
        generalPopulation: "Wear mask",
        children: "Stay indoors",
      },
      forecast: [],
      history: [],
      fetchedAt: new Date().toISOString(),
      source: "WAQI",
      lat: 28.6139,
      lng: 77.2090,
      city: "Delhi",
    };

    const candidates = selectAndScoreCandidates(profile, snapshot);

    // Filter to actions measuring exposure avoided
    const exposureActions = candidates.filter(
      (c) => c.impact_metric === "pm25_exposure_avoided"
    );

    expect(exposureActions.length).toBeGreaterThanOrEqual(3);

    // Verify all returned exposure-avoided actions have strictly positive and non-duplicate values
    const values = exposureActions.map((a) => a.impact_value);
    const uniqueValues = new Set(values);

    // Each action must have its own distinct impact value based on its specific scenario
    expect(uniqueValues.size).toBe(values.length);

    // Verify specific actions have realistic relationships:
    // e.g. elderly staying indoors all day (~240 min) avoids more dose than 30-min school run
    const elderly = exposureActions.find((a) => a.id === "elderly-indoors");
    const schoolRun = exposureActions.find((a) => a.id === "school-run-timing");
    const exercise = exposureActions.find((a) => a.id === "move-exercise-indoors");
    const n95 = exposureActions.find((a) => a.id === "wear-n95");

    if (elderly && schoolRun) {
      expect(elderly.impact_value).toBeGreaterThan(schoolRun.impact_value);
    }
    if (exercise && schoolRun) {
      expect(exercise.impact_value).toBeGreaterThan(schoolRun.impact_value);
    }
    if (n95) {
      expect(n95.impact_value).toBeGreaterThan(0);
    }
  });

  it("localizes candidate titles, when, and fallback explanations when locale is hi", () => {
    const profile = { ...createDefaultProfile(), city: "Delhi", locale: "hi" as const };
    const snapshot: AQISnapshot = {
      aqi: 260,
      band: getBand(260),
      dominantPollutant: "pm25",
      pm25: 130,
      pm10: 190,
      healthRecs: { generalPopulation: "Wear mask" },
      forecast: [],
      history: [],
      fetchedAt: new Date().toISOString(),
      source: "WAQI",
      lat: 28.6139,
      lng: 77.2090,
      city: "Delhi",
    };

    const candidates = selectAndScoreCandidates(profile, snapshot);
    const result = buildPlanItems([], candidates, "hi");
    expect(result.length).toBeGreaterThanOrEqual(4);
    for (const item of result) {
      expect(/[\u0900-\u097F]/.test(item.title)).toBe(true);
      expect(/[\u0900-\u097F]/.test(item.when)).toBe(true);
      expect(/[\u0900-\u097F]/.test(item.explanation)).toBe(true);
    }
  });
});
