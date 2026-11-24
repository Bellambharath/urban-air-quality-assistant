/**
 * hooks/useSimulate.ts
 *
 * Calls /api/simulate with the current toggles and returns live results.
 * No debouncing needed — the route is pure compute (no LLM).
 */

"use client";

import { useState, useCallback } from "react";
import type { Profile, AQISnapshot, SimulateToggles, SimulateResult } from "@/lib/types";

export function useSimulate(profile: Profile | null, snapshot: AQISnapshot | null) {
  const [result, setResult] = useState<SimulateResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const simulate = useCallback(
    async (toggles: SimulateToggles) => {
      if (!profile || !snapshot) return;
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/simulate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profile, aqiSnapshot: snapshot, toggles }),
        });
        if (!res.ok) throw new Error("Simulate request failed");
        const data: SimulateResult = await res.json();
        setResult(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setIsLoading(false);
      }
    },
    [profile, snapshot]
  );

  return { result, isLoading, error, simulate };
}
