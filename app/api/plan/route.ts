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
 *   Stage 4: Gemini select & explain (structured JSON with fail-fast & timeout)
 *   Stage 5: Overwrite impact_value from engine (code — model's value DISCARDED)
 *
 * Primary model: gemini-flash-lite-latest (fast, high quota)
 * Fallback model: gemini-2.5-flash
 * Overall timeout: 12s so it can NEVER hang.
 *
 * Returns: PlanResponse JSON
 */

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { selectAndScoreCandidates, buildPlanItems } from "@/lib/personalization";
import { buildPlanSystemPrompt, buildPlanUserPrompt, buildMorningBriefPrompt } from "@/lib/prompts";
import { CANDIDATE_MODELS } from "@/lib/gemini";
import type { Profile, AQISnapshot, PlanItem, PlanResponse } from "@/lib/types";

export const runtime = "nodejs";

function getGemini() {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_GEMINI_API_KEY is not set");
  return new GoogleGenerativeAI(apiKey);
}

// ─── Stage 4 Helper with 12s overall timeout and immediate fail-fast ───────────

async function generatePlanItemsWithTimeout(
  genAI: GoogleGenerativeAI,
  userPrompt: string,
  locale: string,
  timeoutMs = 12000
): Promise<PlanItem[]> {
  const timeoutPromise = new Promise<PlanItem[]>((resolve) =>
    setTimeout(() => {
      console.warn("[/api/plan] Stage 4 AI generation reached timeout, falling back to engine items");
      resolve([]);
    }, timeoutMs)
  );

  const generatePromise = (async (): Promise<PlanItem[]> => {
    for (const modelName of CANDIDATE_MODELS) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          systemInstruction: buildPlanSystemPrompt(locale),
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.4,
            maxOutputTokens: 2048,
          },
        });
        const result = await model.generateContent(userPrompt);
        const rawJson = result.response.text();
        if (rawJson) {
          const parsed = JSON.parse(rawJson);
          if (Array.isArray(parsed.recommendations) && parsed.recommendations.length > 0) {
            return parsed.recommendations;
          }
        }
      } catch (err) {
        console.warn(`[/api/plan] ${modelName} failed fast, trying next fallback:`, err);
        // Fail fast to next model immediately with no blocking sleep
      }
    }
    return [];
  })();

  return Promise.race([generatePromise, timeoutPromise]);
}

// ─── Morning Brief Helper with 3s timeout ─────────────────────────────────────

async function generateMorningBriefWithTimeout(
  genAI: GoogleGenerativeAI,
  profile: Profile,
  aqiSnapshot: AQISnapshot,
  timeoutMs = 3000
): Promise<string | undefined> {
  const timeoutPromise = new Promise<undefined>((resolve) =>
    setTimeout(() => resolve(undefined), timeoutMs)
  );

  const briefPromise = (async (): Promise<string | undefined> => {
    for (const modelName of CANDIDATE_MODELS) {
      try {
        const briefModel = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: { temperature: 0.6, maxOutputTokens: 200 },
        });
        const briefResult = await briefModel.generateContent(
          buildMorningBriefPrompt(profile, aqiSnapshot)
        );
        const text = briefResult.response.text().trim();
        if (text) return text;
      } catch {
        // Fail fast to next candidate
      }
    }
    return undefined;
  })();

  return Promise.race([briefPromise, timeoutPromise]);
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  let profile: Profile;
  let aqiSnapshot: AQISnapshot;

  try {
    const body = await request.json();
    profile = body.profile;
    aqiSnapshot = body.aqiSnapshot;
    if (!profile || !aqiSnapshot) throw new Error("Missing profile or aqiSnapshot");
  } catch {
    return NextResponse.json(
      { error: "Invalid request body", code: "invalid_params" },
      { status: 400 }
    );
  }

  // ── Stage 2 + 3: Candidate selection + impact scoring ──────────────────────
  const scoredCandidates = selectAndScoreCandidates(profile, aqiSnapshot);

  // ── Stage 4: Gemini select & explain (fail-fast, primary: gemini-flash-lite-latest)
  let geminiItems: PlanItem[] = [];
  let morningBrief: string | undefined;

  try {
    const genAI = getGemini();
    const userPrompt = buildPlanUserPrompt(profile, aqiSnapshot, scoredCandidates);

    // Run plan generation and morning brief in parallel with strict timeouts
    const [itemsResult, briefResult] = await Promise.all([
      generatePlanItemsWithTimeout(genAI, userPrompt, profile.locale, 12000),
      generateMorningBriefWithTimeout(genAI, profile, aqiSnapshot, 3000),
    ]);

    geminiItems = itemsResult;
    morningBrief = briefResult;
  } catch (err) {
    console.error("[/api/plan] Gemini Stage 4 error:", err);
  }

  // ── Stage 5: Overwrite impact_value from Impact Engine ────────────────────
  // Drops unrecognised IDs; falls back to top scored candidates if < 4 valid items;
  // guarantees impact numbers come strictly from the engine, never the model.
  const planItems: PlanItem[] = buildPlanItems(geminiItems, scoredCandidates, profile.locale);

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
