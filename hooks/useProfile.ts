/**
 * hooks/useProfile.ts
 *
 * React hook for reading and updating the user's profile from localStorage.
 * Triggers re-renders across the app when profile changes.
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import {
  loadProfile,
  saveProfile,
  clearProfile,
  createDefaultProfile,
} from "@/lib/profile";
import type { Profile } from "@/lib/types";

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Load from localStorage on mount (client only)
    const stored = loadProfile();
    setProfile(stored);
    setIsLoaded(true);
  }, []);

  const updateProfile = useCallback((updates: Partial<Profile>) => {
    setProfile((prev) => {
      const base = prev ?? createDefaultProfile();
      const updated: Profile = {
        ...base,
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      saveProfile(updated);
      return updated;
    });
  }, []);

  const resetProfile = useCallback(() => {
    clearProfile();
    setProfile(null);
  }, []);

  return {
    profile,
    isLoaded,
    hasProfile: isLoaded && profile !== null,
    updateProfile,
    resetProfile,
  };
}
