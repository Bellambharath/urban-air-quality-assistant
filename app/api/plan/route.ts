/**
 * app/api/plan/route.ts
 *
 * POST /api/plan
 * Body: { profile: Profile, aqiSnapshot: AQISnapshot }
 *
 * 5-stage pipeline:
 *   Stage 1: Context assembly (code)
 *   Stage 2: Candidate selection (code — lib/personalization.ts)
 *   Stage 3: Impact scoring (code — lib/impact-engine.ts, done in Stage 2)
 *   Stage 4: Gemini select & explain (structured output)
 *   Stage 5: Overwrite impact_value from engine (code — model's value DISCARDED)
 *
 * Returns: PlanResponse JSON
 */

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { selectAndScoreCandidates, buildPlanItems } from "@/lib/personalization";
import { buildPlanSystemPrompt, buildPlanUserPrompt, buildMorningBriefPrompt } from "@/lib/prompts";
import type { Profile, AQISnapshot, PlanItem, PlanResponse } from "@/lib/types";

// ─── Gemini setup ─────────────────────────────────────────────────────────────

function getGemini() {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_GEMINI_API_KEY is not set");
  return new GoogleGenerativeAI(apiKey);
}

// ─── Gemini response schema ───────────────────────────────────────────────────

const PLAN_RESPONSE_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    recommendations: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          id:            { type: SchemaType.STRING },
          category:      { type: SchemaType.STRING, enum: ["routine", "indoor", "alternative"] },
          title:         { type: SchemaType.STRING },
          when:          { type: SchemaType.STRING },
          explanation:   { type: SchemaType.STRING },
          impact_metric: { type: SchemaType.STRING, enum: ["pm25_exposure_avoided", "co2_saved_kg", "indoor_pm25_drop"] },
          impact_value:  { type: SchemaType.NUMBER },
          impact_unit:   { type: SchemaType.STRING },
          effort:        { type: SchemaType.STRING, enum: ["low", "medium", "high"] },
        },
        required: ["id", "category", "title", "when", "explanation", "impact_metric", "impact_value", "impact_unit", "effort"],
      },
      minItems: 4,
      maxItems: 6,
    },
  },
  required: ["recommendations"],
};

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  let profile: Profile;
  let aqiSnapshot: AQISnapshot;

  try {
    const body = await request.json();
    profile = body.profile;
    aqiSnapshot = body.aqiSnapshot;
    if (!profile || !aqiSnapshot) throw new Error("Missing profile or aqiSnapshot");
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid request body", code: "invalid_params" },
      { status: 400 }
    );
  }

  // ── Stage 2 + 3: Candidate selection + impact scoring ──────────────────────
  const scoredCandidates = selectAndScoreCandidates(profile, aqiSnapshot);

  // ── Stage 4: Gemini structured output ─────────────────────────────────────
  let geminiItems: PlanItem[] = [];
  let morningBrief: string | undefined;

  try {
    const genAI = getGemini();
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: buildPlanSystemPrompt(profile.locale),
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: PLAN_RESPONSE_SCHEMA as any,
        temperature: 0.4,
        maxOutputTokens: 4096,
      },
    });

    const userPrompt = buildPlanUserPrompt(profile, aqiSnapshot, scoredCandidates);
    const result = await model.generateContent(userPrompt);
    const rawJson = result.response.text();
    const parsed = JSON.parse(rawJson);

    geminiItems = parsed.recommendations ?? [];

    // Morning brief (separate, lighter call — only if 5–11 AM)
    const hour = new Date().getHours();
    if (hour >= 5 && hour <= 11) {
      try {
        const briefModel = genAI.getGenerativeModel({
          model: "gemini-2.5-flash",
          generationConfig: { temperature: 0.6, maxOutputTokens: 200 },
        });
        const briefResult = await briefModel.generateContent(
          buildMorningBriefPrompt(profile, aqiSnapshot)
        );
        morningBrief = briefResult.response.text().trim();
      } catch {
        // Brief is non-critical — silently skip on error
      }
    }
  } catch (err) {
    console.error("[/api/plan] Gemini call failed:", err);
    return NextResponse.json(
      { error: "Plan generation failed. Please try again.", code: "gemini_error" },
      { status: 503 }
    );
  }

  // ── Stage 5: Overwrite impact_value from Impact Engine ────────────────────
  // Drops unrecognised IDs; falls back to top scored candidates if < 4 valid items;
  // guarantees impact numbers come strictly from the engine, never the model.
  const planItems: PlanItem[] = buildPlanItems(geminiItems, scoredCandidates);

  const response: PlanResponse = {
    items: planItems,
    morningBrief,
    generatedAt: new Date().toISOString(),
    profileId: profile.id,
    aqiSnapshot: {
      aqi: aqiSnapshot.aqi,
      pm25: aqiSnapshot.pm25,
      source: aqiSnapshot.source,
      fetchedAt: aqiSnapshot.fetchedAt,
    },
  };

  return NextResponse.json(response);
}
