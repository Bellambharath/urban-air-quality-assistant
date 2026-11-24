/**
 * lib/profile.ts
 *
 * Profile Zod schema, default values, and localStorage persistence.
 * Phase 1: localStorage only. Supabase wired in Mission B.
 */

import { z } from "zod";
import type { Profile } from "./types";
import { SUPPORTED_CITIES } from "./constants";

export const PROFILE_STORAGE_KEY = "airwise_profile_v1";

// ─── Zod schema (matches Profile type) ──────────────────────────────────────

export const HouseholdSchema = z.object({
  adults: z.number().int().min(0).max(20).default(2),
  kids: z.number().int().min(0).max(20).default(0),
  elderly: z.number().int().min(0).max(20).default(0),
  conditions: z.array(z.enum(["asthma", "copd", "heart", "lung", "pregnant"])).default([]),
});

export const HomeSchema = z.object({
  type: z.enum(["apartment", "independent"]).default("apartment"),
  hasPurifier: z.boolean().default(false),
  hasAC: z.boolean().default(false),
  hasChimney: z.boolean().default(false),
  kitchenFuel: z.enum(["lpg", "induction", "biomass", "kerosene"]).default("lpg"),
});

export const CommuteSchema = z.object({
  mode: z.enum(["car_petrol", "car_diesel", "auto", "bus", "metro", "bike", "walk", "wfh"]).default("car_petrol"),
  distanceKm: z.number().min(0).max(200).default(10),
  tripsPerWeek: z.number().int().min(0).max(14).default(5),
  alternativeMode: z.enum(["car_petrol", "car_diesel", "auto", "bus", "metro", "bike", "walk", "wfh"]).optional(),
});

export const ProfileSchema = z.object({
  id: z.string().uuid(),
  city: z.string().min(1),
  lat: z.number(),
  lng: z.number(),
  household: HouseholdSchema,
  home: HomeSchema,
  commute: CommuteSchema,
  locale: z.enum(["en", "hi", "kn"]).default("en"),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// ─── Default / empty profile ─────────────────────────────────────────────────

export function createDefaultProfile(overrides?: Partial<Profile>): Profile {
  const now = new Date().toISOString();
  const defaultCity = SUPPORTED_CITIES[0]; // Delhi
  return {
    id: typeof crypto !== "undefined" ? crypto.randomUUID() : `profile-${Date.now()}`,
    city: defaultCity.name,
    lat: defaultCity.lat,
    lng: defaultCity.lng,
    household: { adults: 2, kids: 0, elderly: 0, conditions: [] },
    home: { type: "apartment", hasPurifier: false, hasAC: false, hasChimney: false, kitchenFuel: "lpg" },
    commute: { mode: "car_petrol", distanceKm: 10, tripsPerWeek: 5 },
    locale: "en",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

// ─── localStorage helpers ────────────────────────────────────────────────────

export function saveProfile(profile: Profile): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
  } catch (e) {
    console.error("[AirWise] Failed to save profile:", e);
  }
}

export function loadProfile(): Profile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const result = ProfileSchema.safeParse(parsed);
    if (!result.success) {
      console.warn("[AirWise] Profile validation failed, resetting:", result.error.flatten());
      return null;
    }
    return result.data as Profile;
  } catch (e) {
    console.error("[AirWise] Failed to load profile:", e);
    return null;
  }
}

export function clearProfile(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(PROFILE_STORAGE_KEY);
}

export function hasProfile(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(PROFILE_STORAGE_KEY) !== null;
}
