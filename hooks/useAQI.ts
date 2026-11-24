/**
 * hooks/useAQI.ts
 *
 * Fetches AQI data from /api/aqi and refreshes every 15 minutes.
 */

"use client";

import useSWR from "swr";
import type { AQISnapshot } from "@/lib/types";

const fetcher = (url: string) =>
  fetch(url).then(async (res) => {
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw Object.assign(new Error(err.error ?? "AQI fetch failed"), {
        code: err.code,
        status: res.status,
      });
    }
    return res.json() as Promise<AQISnapshot>;
  });

export function useAQI(lat: number | null, lng: number | null) {
  const url =
    lat != null && lng != null
      ? `/api/aqi?lat=${lat}&lng=${lng}`
      : null;

  const { data, error, isLoading, mutate } = useSWR<AQISnapshot>(url, fetcher, {
    refreshInterval: 15 * 60 * 1000, // 15 minutes
    revalidateOnFocus: false,
    dedupingInterval: 60 * 1000,
  });

  return {
    snapshot: data ?? null,
    error: error ?? null,
    isLoading,
    refresh: () => mutate(),
  };
}
