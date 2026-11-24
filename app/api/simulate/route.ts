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
import { computeSimulatedImpact } from "@/lib/impact-engine";
import type { Profile, AQISnapshot, SimulateToggles } from "@/lib/types";

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

  const result = computeSimulatedImpact(profile, aqiSnapshot, toggles);
  return NextResponse.json(result);
}
