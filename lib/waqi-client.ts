/**
 * lib/waqi-client.ts
 *
 * Thin wrapper around the WAQI (World Air Quality Index) API.
 * Maps the WAQI response to AirWise's AQISnapshot type.
 *
 * Phase 1 source. This file is the only one that changes when swapping to Google AQ.
 * Docs: https://aqicn.org/json-api/doc/
 */

import type { AQISnapshot, HourlyAQI, HealthRecommendations } from "./types";
import { getBand } from "./cpcb-bands";

const WAQI_BASE = "https://api.waqi.info";

interface WAQIStation {
  aqi: number;
  idx: number;
  attributions: Array<{ name: string; url: string }>;
  city: { geo: [number, number]; name: string; url: string };
  dominentpol: string;
  iaqi: {
    pm25?: { v: number };
    pm10?: { v: number };
    o3?: { v: number };
    no2?: { v: number };
    so2?: { v: number };
    co?: { v: number };
  };
  time: { s: string; tz: string; v: number; iso: string };
  forecast?: {
    daily?: {
      pm25?: Array<{ avg: number; day: string; max: number; min: number }>;
      pm10?: Array<{ avg: number; day: string; max: number; min: number }>;
      o3?: Array<{ avg: number; day: string }>;
    };
  };
}

interface WAQIResponse {
  status: "ok" | "error";
  data: WAQIStation | string; // string on error
}

/**
 * Fetches current AQI data from WAQI for the given coordinates.
 * Returns an AQISnapshot or throws on failure.
 */
export async function fetchWAQI(lat: number, lng: number): Promise<AQISnapshot> {
  const token = process.env.WAQI_API_TOKEN;
  if (!token) throw new Error("WAQI_API_TOKEN is not set");

  const url = `${WAQI_BASE}/feed/geo:${lat};${lng}/?token=${token}`;
  const res = await fetch(url, { next: { revalidate: 900 } }); // 15-min Next.js cache

  if (!res.ok) {
    throw new Error(`WAQI HTTP error: ${res.status} ${res.statusText}`);
  }

  const json: WAQIResponse = await res.json();

  if (json.status !== "ok" || typeof json.data === "string") {
    throw new Error(`WAQI API error: ${String(json.data)}`);
  }

  const station = json.data as WAQIStation;
  const pm25 = station.iaqi?.pm25?.v ?? 0;
  const pm10 = station.iaqi?.pm10?.v ?? 0;

  // Compute displayed AQI from PM2.5 (and PM10) using CPCB conversion
  // Keep station.aqi only as a fallback when pm25 is missing
  const aqi = computeCPCBFromStation(station);
  const band = getBand(aqi);

  // Build a stub health recommendations from band advice (WAQI doesn't provide per-group recs)
  const healthRecs: HealthRecommendations = {
    generalPopulation: band.advice,
    children: aqi > 100 ? `Children: ${band.advice}` : undefined,
    elderly: aqi > 50 ? `Elderly: ${band.advice}` : undefined,
  };

  // WAQI provides daily forecast, not hourly — build a flat hourly array from daily avg
  const forecast: HourlyAQI[] = buildHourlyForecastFromWAQI(station, pm25);

  return {
    aqi,
    band,
    dominantPollutant: station.dominentpol ?? "pm25",
    pm25,
    pm10,
    healthRecs,
    forecast,
    history: [], // WAQI free tier doesn't provide historical hourly data
    fetchedAt: new Date().toISOString(),
    source: "WAQI",
    lat,
    lng,
    city: station.city?.name,
  };
}

/**
 * WAQI provides daily PM2.5 averages; we expand to hourly by applying a
 * typical diurnal pattern (peak morning/evening, low midday/night).
 * This is an approximation — when Google AQ is enabled, hourly data is exact.
 */
function buildHourlyForecastFromWAQI(station: WAQIStation, currentPM25: number): HourlyAQI[] {
  const dailyPM25 = station.forecast?.daily?.pm25 ?? [];

  // Use tomorrow's forecast avg if available, else current reading
  const tomorrowAvg = dailyPM25[1]?.avg ?? currentPM25;

  // Diurnal multipliers (index = hour 0–23), normalized so mean ≈ 1.0
  // Pattern: higher in morning rush (7–9 AM) and evening (6–9 PM), lower midday
  const DIURNAL = [
    0.85, 0.80, 0.78, 0.76, 0.78, 0.85, // 00–05
    1.00, 1.20, 1.30, 1.15, 1.00, 0.90, // 06–11
    0.85, 0.80, 0.78, 0.80, 0.90, 1.05, // 12–17
    1.20, 1.25, 1.20, 1.10, 1.00, 0.90, // 18–23
  ];

  return Array.from({ length: 48 }, (_, i) => {
    const hour = i % 24;
    const dayAvg = i < 24 ? currentPM25 : tomorrowAvg;
    const pm25 = Math.round(dayAvg * DIURNAL[hour] * 10) / 10;
    const aqi = pm25ToAQI(pm25);
    return { hour, aqi, pm25, pm10: pm25 * 1.5 };
  });
}

/** Approximate PM2.5 → India AQI conversion (CPCB linear breakpoints) */
export function pm25ToAQI(pm25: number): number {
  if (pm25 <= 0) return 0;
  const breakpoints = [
    { cLow: 0,   cHigh: 30,  iLow: 0,   iHigh: 50  },
    { cLow: 30,  cHigh: 60,  iLow: 51,  iHigh: 100 },
    { cLow: 60,  cHigh: 90,  iLow: 101, iHigh: 200 },
    { cLow: 90,  cHigh: 120, iLow: 201, iHigh: 300 },
    { cLow: 120, cHigh: 250, iLow: 301, iHigh: 400 },
    { cLow: 250, cHigh: 500, iLow: 401, iHigh: 500 },
  ];
  const bp = breakpoints.find((b) => pm25 >= b.cLow && pm25 <= b.cHigh) ?? breakpoints[breakpoints.length - 1];
  const computed = Math.round(
    ((bp.iHigh - bp.iLow) / (bp.cHigh - bp.cLow)) * (pm25 - bp.cLow) + bp.iLow
  );
  return Math.min(500, Math.max(0, computed));
}

/** CPCB PM10 → India AQI conversion */
export function pm10ToAQI(pm10: number): number {
  if (pm10 <= 0) return 0;
  const breakpoints = [
    { cLow: 0,   cHigh: 50,  iLow: 0,   iHigh: 50  },
    { cLow: 50,  cHigh: 100, iLow: 51,  iHigh: 100 },
    { cLow: 100, cHigh: 250, iLow: 101, iHigh: 200 },
    { cLow: 250, cHigh: 350, iLow: 201, iHigh: 300 },
    { cLow: 350, cHigh: 430, iLow: 301, iHigh: 400 },
    { cLow: 430, cHigh: 500, iLow: 401, iHigh: 500 },
  ];
  const bp = breakpoints.find((b) => pm10 >= b.cLow && pm10 <= b.cHigh) ?? breakpoints[breakpoints.length - 1];
  const computed = Math.round(
    ((bp.iHigh - bp.iLow) / (bp.cHigh - bp.cLow)) * (pm10 - bp.cLow) + bp.iLow
  );
  return Math.min(500, Math.max(0, computed));
}

/**
 * Computes India CPCB AQI from a WAQI station response.
 * Uses CPCB sub-index for PM2.5 (and optionally PM10), taking the maximum.
 * Falls back to station.aqi only if PM2.5 is missing.
 */
export function computeCPCBFromStation(station: {
  aqi?: number;
  iaqi?: {
    pm25?: { v: number };
    pm10?: { v: number };
    [key: string]: { v: number } | undefined;
  };
}): number {
  const hasPM25 = typeof station.iaqi?.pm25?.v === "number";
  const hasPM10 = typeof station.iaqi?.pm10?.v === "number";

  if (hasPM25 || hasPM10) {
    const pm25AQI = hasPM25 ? pm25ToAQI(station.iaqi!.pm25!.v) : 0;
    const pm10AQI = hasPM10 ? pm10ToAQI(station.iaqi!.pm10!.v) : 0;
    return Math.max(pm25AQI, pm10AQI);
  }

  // Fallback to station.aqi when PM2.5 is missing
  return typeof station.aqi === "number" ? station.aqi : 0;
}
