"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { computePersonalDailyExposureV2 } from "@/lib/impact-engine";
import { useT } from "@/lib/LocaleContext";
import type { Profile, AQISnapshot } from "@/lib/types";

interface Props {
  profile: Profile;
  snapshot: AQISnapshot;
}

export function ExposureMeter({ profile, snapshot }: Props) {
  const t = useT();

  const result = useMemo(
    () => computePersonalDailyExposureV2(profile, snapshot.forecast),
    [profile, snapshot.forecast]
  );

  if (snapshot.forecast.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-4 text-center text-sm text-muted-foreground">
        {t("connectForecast")}
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
        <h2 className="text-sm font-semibold">{t("exposureMeterTitle")}</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          {t("exposureMeterSubtitle")}
        </p>
      </div>

      {/* Headline */}
      <div className="text-center">
        <span className="inline-block bg-green-500/15 text-green-400 text-lg font-bold px-4 py-1.5 rounded-full">
          {t("optimisePrefix")} {result.pctCut}% {t("lessInhaledToday")}
        </span>
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-muted/40 rounded-xl p-4 text-center space-y-1">
          <p className="text-xs text-muted-foreground font-medium">{t("yourRoutine")}</p>
          <p className="text-2xl font-bold">{result.baselineUg.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">{t("ugPm25")}</p>
          <p className="text-sm">🚬 {result.baselineCigEq} {t("cigEqShort")}</p>
        </div>
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-center space-y-1">
          <p className="text-xs text-green-400 font-medium">{t("withAirWise")}</p>
          <p className="text-2xl font-bold text-green-400">{result.optimizedUg.toLocaleString()}</p>
          <p className="text-xs text-green-400/70">{t("ugPm25")}</p>
          <p className="text-sm">🚬 {result.optimizedCigEq} {t("cigEqShort")}</p>
        </div>
      </div>

      {/* Bar comparison */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{t("baseline")}</span>
          <span>{t("optimized")}</span>
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
        {t("exposureMeterFootnote")}
      </p>
    </motion.div>
  );
}
