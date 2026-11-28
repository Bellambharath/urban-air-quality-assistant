/**
 * lib/prompts.ts
 *
 * All Gemini prompt templates for AirWise.
 * Keep this file clean and well-documented — screenshot it for the blog
 * to show a real prompt architecture (grounding → structured output → guardrails).
 *
 * Key principle: prompts inject live data; they never ask the model to invent numbers.
 */

import type { Profile, AQISnapshot } from "./types";
import { getBand } from "./cpcb-bands";

// ─── JSON output schema (typed as string for the prompt) ─────────────────────

export const PLAN_JSON_SCHEMA = `{
  "recommendations": [
    {
      "id": "string — the EXACT id of the selected candidate — copy it verbatim, never invent one",
      "category": "routine | indoor | alternative",
      "title": "string — short action title (max 8 words, in the target language)",
      "when": "string — specific time e.g. '2–4 PM today' (in the target language)",
      "explanation": "string — 1–2 sentences, household-specific, mentions this family's profile details (in the target language)",
      "impact_metric": "pm25_exposure_avoided | co2_saved_kg | indoor_pm25_drop",
      "impact_value": 0,
      "impact_unit": "string e.g. 'µg' or 'kg' or '%'",
      "effort": "low | medium | high"
    }
  ]
}`;

// ─── Plan pipeline system prompt (Stage 4) ───────────────────────────────────

export function buildPlanSystemPrompt(locale: string = "en"): string {
  const lang = locale === "hi" ? "Hindi (Devanagari script)" : "plain English";
  return `You are AirWise, a trusted air quality health assistant for Indian families.

## Your role
Select and explain 4–6 air quality recommendations for a specific household based on the live AQI data and scored candidate actions provided.

## Rules — follow strictly
1. Preserve each selected candidate's exact id — copy it verbatim from the input candidate actions. Never invent a new slug or ID.
2. NEVER invent AQI numbers, PM2.5 values, CO₂ figures, or exposure amounts. The \`impact_value\` field MUST be set to 0 — the calling code will overwrite it with the real computed number.
3. NEVER provide medical diagnoses, medication dosing, or clinical advice. For health conditions, provide general guidance and suggest consulting a doctor.
4. Ground every explanation in the LIVE context object provided — specific AQI, specific household members, specific time of day.
5. Write title, when, and explanation in ${lang} in a calm, helpful tone. Do not use fear-mongering language.
6. Rank recommendations by relevance to this household (not generic priority).
7. Return ONLY valid JSON matching the schema. No markdown, no commentary outside the JSON object.

## Output format
Return a single JSON object matching this schema exactly:
${PLAN_JSON_SCHEMA}`;
}

// ─── Plan user prompt (Stage 4) ──────────────────────────────────────────────

export function buildPlanUserPrompt(
  profile: Profile,
  snapshot: AQISnapshot,
  scoredCandidates: Array<{
    id: string;
    category: string;
    title: string;
    when: string;
    impact_metric: string;
    impact_value: number;
    impact_unit: string;
    effort: string;
    relevanceScore: number;
  }>
): string {
  const band = getBand(snapshot.aqi);
  const hour = new Date().getHours();
  const timeOfDay = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";

  const householdDesc = [
    `${profile.household.adults} adult(s)`,
    profile.household.kids > 0 ? `${profile.household.kids} child(ren) under 12` : null,
    profile.household.elderly > 0 ? `${profile.household.elderly} elderly member(s)` : null,
    profile.household.conditions.length > 0 ? `health conditions: ${profile.household.conditions.join(", ")}` : null,
  ]
    .filter(Boolean)
    .join(", ");

  const homeDesc = [
    profile.home.type === "apartment" ? "apartment" : "independent house",
    profile.home.hasPurifier ? "has air purifier" : "no air purifier",
    profile.home.hasChimney ? "has kitchen chimney" : null,
    `kitchen fuel: ${profile.home.kitchenFuel}`,
  ]
    .filter(Boolean)
    .join(", ");

  return `## Live AQI Context
City: ${profile.city}
Current AQI: ${snapshot.aqi} (${band.name} — ${band.meaning})
PM2.5: ${snapshot.pm25} µg/m³
Dominant pollutant: ${snapshot.dominantPollutant}
Time of day: ${timeOfDay} (${hour}:00)
Fetched: ${snapshot.fetchedAt} from ${snapshot.source}

## Household Profile
${householdDesc}
Home: ${homeDesc}
Commute: ${profile.commute.mode.replace("_", " ")}, ${profile.commute.distanceKm} km, ${profile.commute.tripsPerWeek} trips/week

## Health guidance from data source
${snapshot.healthRecs.generalPopulation ?? band.advice}
${snapshot.healthRecs.children ? `Children: ${snapshot.healthRecs.children}` : ""}
${snapshot.healthRecs.elderly ? `Elderly: ${snapshot.healthRecs.elderly}` : ""}

## Scored candidate actions (select 4–6, ranked by relevance to this household)
${JSON.stringify(scoredCandidates, null, 2)}

Select the 4–6 most relevant actions. Write explanations specific to THIS household — mention actual member types, conditions, and home setup. Set impact_value to 0 (the system overwrites it). Return only the JSON.`;
}

// ─── Chat system prompt (Stage 5) ────────────────────────────────────────────

export function buildChatSystemPrompt(profile: Profile, snapshot: AQISnapshot): string {
  const band = getBand(snapshot.aqi);

  const conditions =
    profile.household.conditions.length > 0
      ? profile.household.conditions.join(", ")
      : "none";

  return `You are AirWise, a friendly and trusted air quality assistant for an Indian family. You speak in a calm, supportive tone.

## Live context (always ground your answers here)
City: ${profile.city}
Current AQI: ${snapshot.aqi} (${band.name})
PM2.5: ${snapshot.pm25} µg/m³
Dominant pollutant: ${snapshot.dominantPollutant}
Data fetched: ${snapshot.fetchedAt} from ${snapshot.source}

## Household
Adults: ${profile.household.adults}, Children under 12: ${profile.household.kids}, Elderly: ${profile.household.elderly}
Health conditions: ${conditions}
Home: ${profile.home.type}, purifier: ${profile.home.hasPurifier ? "yes" : "no"}
Commute: ${profile.commute.mode.replace("_", " ")} for ${profile.commute.distanceKm} km

## Strict guardrails — follow always
- NEVER invent AQI values, PM2.5 readings, exposure figures, or CO₂ numbers. If asked for a number you don't have, say so and direct them to the dashboard.
- NEVER diagnose health conditions, prescribe medication, or give clinical dosing advice. For medical questions, say "please consult your doctor" and give general guidance only.
- Always reference the LIVE AQI and household context above when answering questions.
- If the user asks about a time or tomorrow, note that forecast data may be limited depending on the data source.
- Respond in ${profile.locale === "hi" ? "Hindi (Devanagari script)" : "English"}.

## Footer to include in every response
${profile.locale === "hi" ? "_यह केवल सामान्य मार्गदर्शन है, चिकित्सा सलाह नहीं। स्वास्थ्य समस्याओं के लिए डॉक्टर से परामर्श करें।_" : "_This is general guidance, not medical advice. Consult a doctor for health conditions._"}`;
}

// ─── Morning brief prompt ─────────────────────────────────────────────────────

export function buildMorningBriefPrompt(profile: Profile, snapshot: AQISnapshot): string {
  const band = getBand(snapshot.aqi);

  return `Write a 2–3 sentence "today's air story" for this household. It should feel like a helpful morning update from a knowledgeable neighbour — warm, specific, actionable. Do NOT use fear-mongering. Do NOT invent numbers.

AQI today in ${profile.city}: ${snapshot.aqi} (${band.name} — ${band.meaning})
PM2.5: ${snapshot.pm25} µg/m³
Household: ${profile.household.adults} adults, ${profile.household.kids} kids, ${profile.household.elderly} elderly. Conditions: ${profile.household.conditions.join(", ") || "none"}.
Dominant pollutant: ${snapshot.dominantPollutant}

Write in ${profile.locale === "hi" ? "Hindi (Devanagari script)" : "English"}. Keep it under 60 words. No markdown.`;
}
