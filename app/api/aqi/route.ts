/**
 * app/api/aqi/route.ts
 *
 * GET /api/aqi?lat={lat}&lng={lng}
 *
 * Phase 1: WAQI source.
 * Phase 2 (before Mission B): swap in Google Air Quality API by replacing fetchWAQI
 * with fetchGoogleAQ in this file — zero other changes needed.
 *
 * Returns: AQISnapshot JSON
 * Error:   { error: string, code: "aqi_unavailable" } — NEVER stale data as current
 */

import { NextRequest, NextResponse } from "next/server";
import { fetchWAQI } from "@/lib/waqi-client";
import type { AQISnapshot } from "@/lib/types";

// ─── In-process cache (15 min TTL) ──────────────────────────────────────────

interface CacheEntry {
  snapshot: AQISnapshot;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

function getCacheKey(lat: number, lng: number): string {
  // Round to 2 decimal places (~1 km grid) to maximise cache hit rate
  return `${lat.toFixed(2)},${lng.toFixed(2)}`;
}

function getFromCache(key: string): AQISnapshot | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return { ...entry.snapshot, source: `${entry.snapshot.source} (cached)` };
}

function setCache(key: string, snapshot: AQISnapshot): void {
  cache.set(key, { snapshot, expiresAt: Date.now() + CACHE_TTL_MS });
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const latStr = searchParams.get("lat");
  const lngStr = searchParams.get("lng");

  if (!latStr || !lngStr) {
    return NextResponse.json(
      { error: "lat and lng query params are required", code: "invalid_params" },
      { status: 400 }
    );
  }

  const lat = parseFloat(latStr);
  const lng = parseFloat(lngStr);

  if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return NextResponse.json(
      { error: "Invalid lat/lng values", code: "invalid_params" },
      { status: 400 }
    );
  }

  const cacheKey = getCacheKey(lat, lng);

  // Check cache first
  const cached = getFromCache(cacheKey);
  if (cached) {
    return NextResponse.json(cached, {
      headers: { "X-AQI-Source": "cache", "X-Cache": "HIT" },
    });
  }

  // Fetch from WAQI (Phase 1)
  try {
    const snapshot = await fetchWAQI(lat, lng);
    setCache(cacheKey, snapshot);
    return NextResponse.json(snapshot, {
      headers: { "X-AQI-Source": "WAQI", "X-Cache": "MISS" },
    });
  } catch (err) {
    console.error("[/api/aqi] WAQI fetch failed:", err);
    // Do NOT return stale data — return an honest error
    return NextResponse.json(
      {
        error: "Unable to fetch AQI data. Please try again shortly.",
        code: "aqi_unavailable",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 503 }
    );
  }
}
