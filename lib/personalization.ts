/**
 * lib/personalization.ts
 *
 * Rule layer: given a profile + AQI snapshot, selects and scores
 * candidate actions from the fixed catalog. No LLM calls here.
 *
 * This is Stage 2 + 3 of the plan pipeline (see lib/prompts.ts).
 */

import type { Profile, AQISnapshot, ImpactMetric, PlanCategory, EffortLevel, PlanItem } from "./types";
import {
  computeInhaledDose,
  computeExposureAvoided,
  toCigaretteEquivalent,
  computeCommuteCO2Saved,
  computePurifierImpact,
} from "./impact-engine";
import {
  MASK_EFFICIENCY_N95,
  CLEAN_WINDOW_PM25_RATIO,
  INDOOR_UNFILTERED_RATIO,
} from "./constants";
import { getBand } from "./cpcb-bands";
import { ACTION_TRANSLATIONS_HI } from "./i18n";

// ─── Candidate action catalog ─────────────────────────────────────────────────

interface CandidateAction {
  id: string;
  category: PlanCategory;
  title: string;
  when: string;
  impact_metric: ImpactMetric;
  effort: EffortLevel;
  tags: string[]; // used for rule-based filtering
}

const ACTION_CATALOG: CandidateAction[] = [
  // Routine actions
  {
    id: "time-outdoor-activity",
    category: "routine",
    title: "Time outdoor activity to clean-air hours",
    when: "Best hours shown below",
    impact_metric: "pm25_exposure_avoided",
    effort: "low",
    tags: ["outdoor", "timing", "general"],
  },
  {
    id: "school-run-timing",
    category: "routine",
    title: "Time the school run to low-AQI window",
    when: "School drop/pick-up",
    impact_metric: "pm25_exposure_avoided",
    effort: "low",
    tags: ["children", "school", "timing"],
  },
  {
    id: "move-exercise-indoors",
    category: "routine",
    title: "Move your run indoors today",
    when: "Planned exercise time",
    impact_metric: "pm25_exposure_avoided",
    effort: "low",
    tags: ["exercise", "outdoor", "moderate-aqi"],
  },
  {
    id: "elderly-indoors",
    category: "routine",
    title: "Keep elderly members indoors during peak hours",
    when: "Peak pollution hours",
    impact_metric: "pm25_exposure_avoided",
    effort: "low",
    tags: ["elderly", "sensitive"],
  },
  {
    id: "wear-n95",
    category: "routine",
    title: "Wear an N95 mask outdoors",
    when: "Any outdoor trip today",
    impact_metric: "pm25_exposure_avoided",
    effort: "low",
    tags: ["outdoor", "poor-aqi", "general"],
  },
  {
    id: "wet-mop-floors",
    category: "indoor",
    title: "Wet mop floors to trap settled particles",
    when: "Morning routine",
    impact_metric: "indoor_pm25_drop",
    effort: "low",
    tags: ["indoor", "general"],
  },
  {
    id: "close-windows-peak",
    category: "indoor",
    title: "Keep windows closed during peak pollution hours",
    when: "7–10 AM and 6–9 PM",
    impact_metric: "indoor_pm25_drop",
    effort: "low",
    tags: ["indoor", "ventilation", "moderate-aqi"],
  },
  {
    id: "run-purifier",
    category: "indoor",
    title: "Run your air purifier on high during peak hours",
    when: "Peak pollution hours",
    impact_metric: "indoor_pm25_drop",
    effort: "low",
    tags: ["indoor", "purifier", "has-purifier"],
  },
  {
    id: "check-purifier-filter",
    category: "indoor",
    title: "Check and replace purifier filter if due",
    when: "Today",
    impact_metric: "indoor_pm25_drop",
    effort: "low",
    tags: ["indoor", "purifier", "has-purifier"],
  },
  {
    id: "add-purifier",
    category: "indoor",
    title: "Consider adding an air purifier",
    when: "This week",
    impact_metric: "indoor_pm25_drop",
    effort: "high",
    tags: ["indoor", "no-purifier", "poor-aqi"],
  },
  {
    id: "cooking-chimney",
    category: "indoor",
    title: "Run kitchen chimney / exhaust fan while cooking",
    when: "Cooking time",
    impact_metric: "indoor_pm25_drop",
    effort: "low",
    tags: ["indoor", "cooking", "no-chimney"],
  },
  {
    id: "cooking-swap-induction",
    category: "alternative",
    title: "Switch to induction or electric cooker",
    when: "Today's cooking",
    impact_metric: "indoor_pm25_drop",
    effort: "medium",
    tags: ["cooking", "biomass", "kerosene", "sustainable"],
  },
  {
    id: "cooking-lid-on",
    category: "indoor",
    title: "Cook with the lid on to cut indoor PM2.5",
    when: "Cooking time",
    impact_metric: "indoor_pm25_drop",
    effort: "low",
    tags: ["indoor", "cooking", "general"],
  },
  {
    id: "commute-swap-metro",
    category: "alternative",
    title: "Take metro / bus instead of car today",
    when: "Commute hours",
    impact_metric: "co2_saved_kg",
    effort: "medium",
    tags: ["commute", "car", "sustainable"],
  },
  {
    id: "commute-wfh",
    category: "alternative",
    title: "Work from home — skip the commute entirely",
    when: "Today",
    impact_metric: "co2_saved_kg",
    effort: "low",
    tags: ["commute", "car", "sustainable"],
  },
  {
    id: "inhaler-ready",
    category: "routine",
    title: "Keep inhaler / rescue medication handy today",
    when: "Before leaving home",
    impact_metric: "pm25_exposure_avoided",
    effort: "low",
    tags: ["asthma", "copd", "lung", "medical-reminder"],
  },
  {
    id: "ventilate-clean-hours",
    category: "indoor",
    title: "Open windows during the cleanest outdoor hours",
    when: "Safe window hours (see timeline)",
    impact_metric: "indoor_pm25_drop",
    effort: "low",
    tags: ["indoor", "ventilation", "good-outdoor"],
  },
  {
    id: "heating-swap-electric",
    category: "alternative",
    title: "Use electric heater instead of open burning",
    when: "Evening / night",
    impact_metric: "indoor_pm25_drop",
    effort: "medium",
    tags: ["heating", "biomass", "sustainable"],
  },
];

// ─── Scoring type ─────────────────────────────────────────────────────────────

export interface ScoredCandidate {
  id: string;
  category: PlanCategory;
  title: string;
  when: string;
  impact_metric: ImpactMetric;
  impact_value: number;
  impact_unit: string;
  effort: EffortLevel;
  relevanceScore: number;
}

// ─── Main function: select + score candidates ─────────────────────────────────

export function selectAndScoreCandidates(
  profile: Profile,
  snapshot: AQISnapshot
): ScoredCandidate[] {
  const aqi = snapshot.aqi;
  const pm25 = snapshot.pm25;
  const band = getBand(aqi);

  // Build a tag set representing this household's context
  const activeTags = new Set<string>(["general"]);

  if (profile.household.kids > 0)     activeTags.add("children");
  if (profile.household.elderly > 0)  activeTags.add("elderly");
  if (profile.household.conditions.includes("asthma")) activeTags.add("asthma");
  if (profile.household.conditions.includes("copd"))   activeTags.add("copd");
  if (profile.household.conditions.includes("lung"))   activeTags.add("lung");
  if (profile.household.conditions.includes("heart"))  activeTags.add("heart");

  if (profile.home.hasPurifier)  activeTags.add("has-purifier");
  if (!profile.home.hasPurifier) activeTags.add("no-purifier");
  if (!profile.home.hasChimney)  activeTags.add("no-chimney");

  if (profile.home.kitchenFuel === "biomass")  { activeTags.add("biomass"); activeTags.add("cooking"); }
  if (profile.home.kitchenFuel === "kerosene") { activeTags.add("kerosene"); activeTags.add("cooking"); }
  if (profile.home.kitchenFuel === "lpg")      activeTags.add("cooking");

  if (["car_petrol", "car_diesel"].includes(profile.commute.mode)) activeTags.add("car");

  if (aqi >= 201)  activeTags.add("poor-aqi");
  if (aqi >= 101)  activeTags.add("moderate-aqi");
  if (aqi <= 100)  activeTags.add("good-outdoor");
  if (aqi >= 51)   activeTags.add("outdoor");

  // Filter catalog: keep actions whose tags overlap with active tags
  const relevant = ACTION_CATALOG.filter((action) =>
    action.tags.some((tag) => activeTags.has(tag))
  );

  // Score + compute impact values
  const scored: ScoredCandidate[] = relevant.map((action) => {
    const { impactValue, impactUnit } = computeImpact(action, profile, snapshot);
    const relevanceScore = computeRelevanceScore(action, profile, aqi);

    return {
      id: action.id,
      category: action.category,
      title: action.title,
      when: action.when,
      impact_metric: action.impact_metric,
      impact_value: impactValue,
      impact_unit: impactUnit,
      effort: action.effort,
      relevanceScore,
    };
  });

  // Sort by relevance descending, return top 10 for Gemini to choose 4–6 from
  return scored.sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, 10);
}

// ─── Impact computation per action ───────────────────────────────────────────

function computeImpact(
  action: CandidateAction,
  profile: Profile,
  snapshot: AQISnapshot
): { impactValue: number; impactUnit: string } {
  const pm25 = snapshot.pm25;

  const indoorFraction = profile.home.hasPurifier
    ? computePurifierImpact().fractionRemaining
    : INDOOR_UNFILTERED_RATIO;
  const indoorPM25 = pm25 * indoorFraction;

  switch (action.id) {
    case "move-exercise-indoors": {
      // Outdoor exercise: 60 min moderate (0.025 m³/min) vs indoor light (0.012 m³/min)
      const outdoorDose = computeInhaledDose(pm25, "moderate", 60);
      const indoorDose = computeInhaledDose(indoorPM25, "light", 60);
      return {
        impactValue: Math.round(computeExposureAvoided(outdoorDose, indoorDose) * 10) / 10,
        impactUnit: "µg PM2.5 avoided",
      };
    }

    case "school-run-timing": {
      // School commute: 30 min light activity (0.012 m³/min) during peak vs safe window (~40% lower PM2.5)
      const peakDose = computeInhaledDose(pm25, "light", 30);
      const safeDose = computeInhaledDose(pm25 * CLEAN_WINDOW_PM25_RATIO, "light", 30);
      return {
        impactValue: Math.round(computeExposureAvoided(peakDose, safeDose) * 10) / 10,
        impactUnit: "µg PM2.5 avoided",
      };
    }

    case "elderly-indoors": {
      // Elderly staying indoors: avoids ~4 hours (240 min) daytime peak light activity vs resting indoors
      const outdoorDose = computeInhaledDose(pm25, "light", 240);
      const indoorDose = computeInhaledDose(indoorPM25, "rest", 240);
      return {
        impactValue: Math.round(computeExposureAvoided(outdoorDose, indoorDose) * 10) / 10,
        impactUnit: "µg PM2.5 avoided",
      };
    }

    case "wear-n95": {
      // N95 mask outdoors: 60 min moderate activity with 95% filtration efficiency
      const unmaskedDose = computeInhaledDose(pm25, "moderate", 60);
      const maskedDose = unmaskedDose * (1 - MASK_EFFICIENCY_N95);
      return {
        impactValue: Math.round(computeExposureAvoided(unmaskedDose, maskedDose) * 10) / 10,
        impactUnit: "µg PM2.5 avoided",
      };
    }

    case "time-outdoor-activity": {
      // Shifting 45 min moderate outdoor activity from peak to safe clean-air window
      const peakDose = computeInhaledDose(pm25, "moderate", 45);
      const cleanDose = computeInhaledDose(pm25 * CLEAN_WINDOW_PM25_RATIO, "moderate", 45);
      return {
        impactValue: Math.round(computeExposureAvoided(peakDose, cleanDose) * 10) / 10,
        impactUnit: "µg PM2.5 avoided",
      };
    }

    case "run-purifier":
    case "check-purifier-filter":
    case "add-purifier": {
      const { pctReduction } = computePurifierImpact();
      return { impactValue: pctReduction, impactUnit: "% indoor PM2.5 reduction" };
    }

    case "close-windows-peak":
      return { impactValue: Math.round(pm25 * 0.35), impactUnit: "µg/m³ indoor PM2.5 reduction" };

    case "ventilate-clean-hours":
      return { impactValue: Math.round(pm25 * 0.25), impactUnit: "µg/m³ indoor PM2.5 reduction" };

    case "wet-mop-floors":
      return { impactValue: Math.round(pm25 * 0.15), impactUnit: "µg/m³ indoor PM2.5 reduction" };

    case "cooking-lid-on":
      return { impactValue: Math.round(pm25 * 0.20), impactUnit: "µg/m³ indoor PM2.5 reduction" };

    case "cooking-chimney":
      return { impactValue: Math.round(pm25 * 0.40), impactUnit: "µg/m³ indoor PM2.5 reduction" };

    case "cooking-swap-induction":
      return { impactValue: Math.round(pm25 * 0.50), impactUnit: "µg/m³ indoor PM2.5 reduction" };

    case "heating-swap-electric":
      return { impactValue: Math.round(pm25 * 0.60), impactUnit: "µg/m³ indoor PM2.5 reduction" };

    case "commute-swap-metro":
    case "commute-wfh": {
      const altMode = action.id === "commute-wfh" ? "wfh" : "metro";
      const co2 = computeCommuteCO2Saved(
        profile.commute.mode,
        altMode,
        profile.commute.distanceKm,
        1 // per trip (not per week, for today's card)
      );
      return { impactValue: Math.round(co2 * 100) / 100, impactUnit: "kg CO₂ saved today" };
    }

    case "inhaler-ready":
      return { impactValue: 0, impactUnit: "reminder" };

    default:
      return { impactValue: 0, impactUnit: "" };
  }
}

// ─── Relevance scoring (higher = more important for this household) ───────────

function computeRelevanceScore(action: CandidateAction, profile: Profile, aqi: number): number {
  let score = 50; // base

  // AQI severity boost
  if (aqi >= 301) score += 30;
  else if (aqi >= 201) score += 20;
  else if (aqi >= 101) score += 10;

  // Profile-specific boosts (§7b personalization matrix)
  if (action.id === "school-run-timing" && profile.household.kids > 0) score += 25;
  if (action.id === "elderly-indoors" && profile.household.elderly > 0) score += 25;
  if (action.id === "inhaler-ready" && (
    profile.household.conditions.includes("asthma") ||
    profile.household.conditions.includes("copd")
  )) score += 30;
  if (action.id === "cooking-swap-induction" && ["biomass", "kerosene"].includes(profile.home.kitchenFuel)) score += 25;
  if (action.id === "add-purifier" && !profile.home.hasPurifier && aqi >= 201) score += 20;
  if ((action.id === "run-purifier" || action.id === "check-purifier-filter") && profile.home.hasPurifier) score += 15;
  if ((action.id === "commute-swap-metro" || action.id === "commute-wfh") &&
    ["car_petrol", "car_diesel"].includes(profile.commute.mode)) score += 20;
  if (action.id === "move-exercise-indoors" && aqi >= 151) score += 15;

  return score;
}

// ─── Stage 5 Reconciliation: buildPlanItems ──────────────────────────────────
/**
 * Drops any returned item whose id isn't in candidate map;
 * if fewer than 4 remain, builds the cards directly from the top scored candidates
 * and uses the model only for the explanation text.
 * Strictly enforces that impact_value and impact_unit come from the candidate engine.
 */
export function buildPlanItems(
  geminiItems: Array<Partial<PlanItem> & { id?: string }>,
  scoredCandidates: ScoredCandidate[],
  locale: string = "en"
): PlanItem[] {
  const candidateMap = new Map(scoredCandidates.map((c) => [c.id, c]));
  const isHi = locale === "hi";
  const hasDevanagari = (str?: string) => Boolean(str && /[\u0900-\u097F]/.test(str));

  // (b) Drop any returned item whose id isn't in impactLookup / candidateMap
  const validGeminiItems = (geminiItems || []).filter(
    (item): item is PlanItem => Boolean(item?.id && candidateMap.has(item.id))
  );

  const explanationMap = new Map<string, string>();
  for (const item of geminiItems || []) {
    if (item?.id && item.explanation) {
      explanationMap.set(item.id, item.explanation);
    }
  }

  let baseItems: PlanItem[] = [];

  // If fewer than 4 remain, build the cards directly from the top scored candidates
  // and use the model only for the explanation text
  if (validGeminiItems.length < 4) {
    const targetCount = Math.min(6, Math.max(4, scoredCandidates.length));
    const topCandidates = scoredCandidates.slice(0, targetCount);

    baseItems = topCandidates.map((candidate) => {
      const hiTrans = isHi ? ACTION_TRANSLATIONS_HI[candidate.id] : undefined;
      const modelExpl = explanationMap.get(candidate.id);
      const explanation =
        isHi
          ? (hasDevanagari(modelExpl) ? modelExpl! : hiTrans?.explanation ?? `${candidate.title} आपके घर की वायु गुणवत्ता के लिए सुझाया गया है।`)
          : (modelExpl || `${candidate.title} is recommended for your household based on today's air quality.`);

      return {
        id: candidate.id,
        category: candidate.category,
        title: hiTrans ? hiTrans.title : candidate.title,
        when: hiTrans ? hiTrans.when : candidate.when,
        explanation,
        impact_metric: candidate.impact_metric,
        impact_value: candidate.impact_value,
        impact_unit: candidate.impact_unit,
        effort: candidate.effort,
      };
    });
  } else {
    baseItems = validGeminiItems.map((item) => {
      const candidate = candidateMap.get(item.id)!;
      const hiTrans = isHi ? ACTION_TRANSLATIONS_HI[candidate.id] : undefined;

      const title = isHi
        ? (hasDevanagari(item.title) ? item.title! : hiTrans?.title ?? candidate.title)
        : (item.title || candidate.title);

      const when = isHi
        ? (hasDevanagari(item.when) ? item.when! : hiTrans?.when ?? candidate.when)
        : (item.when || candidate.when);

      const explanation = isHi
        ? (hasDevanagari(item.explanation) ? item.explanation! : hiTrans?.explanation ?? `${title} आपके घर के लिए सुझाया गया है।`)
        : (item.explanation || `${candidate.title} is recommended for your household.`);

      return {
        id: candidate.id,
        category: candidate.category,
        title,
        when,
        explanation,
        impact_metric: candidate.impact_metric,
        impact_value: candidate.impact_value,
        impact_unit: candidate.impact_unit,
        effort: candidate.effort,
      };
    });
  }

  // Ensure deterministic overwrite of impact_value from engine:
  return baseItems.map((item) => {
    const candidate = candidateMap.get(item.id);
    return {
      ...item,
      impact_value: candidate ? candidate.impact_value : 0,
      impact_unit: candidate ? candidate.impact_unit : item.impact_unit,
    };
  });
}

