"use client";
import { useMemo } from "react";
import { motion } from "framer-motion";
import { computePersonalDailyExposureV2 } from "@/lib/impact-engine";
import type { Profile, AQISnapshot } from "@/lib/types";

interface Props { profile: Profile; snapshot: AQISnapshot; }

export function ExposureMeter({ profile, snapshot }: Props) {
  const result = useMemo(
    () => computePersonalDailyExposureV2(profile, snapshot.forecast),
    [profile, snapshot.forecast]
  );

  if (snapshot.forecast.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-4 text-center text-sm text-muted-foreground">
        Connect forecast data for personalised exposure meter
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-xl p-5 space-y-4"
    >
      <div>
        <h2 className="text-sm font-semibold">Personal Exposure Meter</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Estimated inhaled PM2.5 — your routine vs AirWise-optimised
        </p>
      </div>

      {/* Headline */}
      <div className="text-center">
        <span className="inline-block bg-green-500/15 text-green-400 text-lg font-bold px-4 py-1.5 rounded-full">
          Optimise → {result.pctCut}% less inhaled PM2.5 today
        </span>
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-muted/40 rounded-xl p-4 text-center space-y-1">
          <p className="text-xs text-muted-foreground font-medium">Your routine</p>
          <p className="text-2xl font-bold">{result.baselineUg.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">µg PM2.5</p>
          <p className="text-sm">🚬 {result.baselineCigEq} cig-eq</p>
        </div>
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-center space-y-1">
          <p className="text-xs text-green-400 font-medium">With AirWise</p>
          <p className="text-2xl font-bold text-green-400">{result.optimizedUg.toLocaleString()}</p>
          <p className="text-xs text-green-400/70">µg PM2.5</p>
          <p className="text-sm">🚬 {result.optimizedCigEq} cig-eq</p>
        </div>
      </div>

      {/* Bar comparison */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Baseline</span>
          <span>Optimized</span>
        </div>
        <div className="relative h-2 bg-muted rounded-full overflow-hidden">
          <div className="absolute inset-y-0 left-0 bg-orange-400 rounded-full" style={{ width: "100%" }} />
          <motion.div
            className="absolute inset-y-0 left-0 bg-green-500 rounded-full"
            initial={{ width: "100%" }}
            animate={{ width: `${100 - result.pctCut}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground text-center">
        Estimates based on ICRP minute-ventilation values, CADR box model, and stated household profile. Not measured exposure.
      </p>
    </motion.div>
  );
}
