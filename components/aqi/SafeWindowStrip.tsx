"use client";

import { useMemo } from "react";
import { getLocalizedBand } from "@/lib/cpcb-bands";
import { useLocale, useT } from "@/lib/LocaleContext";
import { formatLocalizedHour } from "@/lib/i18n";
import type { HourlyAQI } from "@/lib/types";
import { cn } from "@/lib/utils";

interface SafeWindowStripProps {
  forecast: HourlyAQI[];
  className?: string;
}

const HOURS = Array.from({ length: 19 }, (_, i) => i + 5); // 5 AM – 11 PM
const AXIS_HOURS = [6, 12, 18, 22]; // Evenly spaced localized labels

export function SafeWindowStrip({ forecast, className }: SafeWindowStripProps) {
  const { locale } = useLocale();
  const t = useT();

  const hourMap = useMemo(() => {
    return new Map(forecast.map((h) => [h.hour, h]));
  }, [forecast]);

  const currentHour = new Date().getHours();

  // Compute cleanest hours & air quality status in 5 AM – 11 PM
  const { bestHourSet, minAQI, windowText, isVeryPoorAllDay, isPoorAllDay } = useMemo(() => {
    const entries = HOURS.map((h) => hourMap.get(h)).filter(
      (e): e is HourlyAQI => Boolean(e)
    );

    if (entries.length === 0) {
      return {
        bestHourSet: new Set<number>(),
        minAQI: 0,
        windowText: "",
        isVeryPoorAllDay: false,
        isPoorAllDay: false,
      };
    }

    const sorted = [...entries].sort((a, b) => a.aqi - b.aqi);
    const min = sorted[0].aqi;
    const top3 = sorted.slice(0, 3);
    const bestSet = new Set(top3.map((e) => e.hour));

    // Find best contiguous 2–3 hour span for display label
    let bestSpanStart = sorted[0].hour;
    let bestSpanEnd = sorted[0].hour;

    // Sort top3 chronologically to see if there's a contiguous pair/trio
    const chronTop = [...top3].sort((a, b) => a.hour - b.hour);
    if (chronTop.length >= 2 && chronTop[1].hour === chronTop[0].hour + 1) {
      bestSpanStart = chronTop[0].hour;
      bestSpanEnd =
        chronTop.length === 3 && chronTop[2].hour === chronTop[1].hour + 1
          ? chronTop[2].hour
          : chronTop[1].hour;
    } else if (chronTop.length === 3 && chronTop[2].hour === chronTop[1].hour + 1) {
      bestSpanStart = chronTop[1].hour;
      bestSpanEnd = chronTop[2].hour;
    }

    const formattedWindow =
      bestSpanStart === bestSpanEnd
        ? `${formatLocalizedHour(bestSpanStart, locale)} (AQI ${min})`
        : `${formatLocalizedHour(bestSpanStart, locale)} – ${formatLocalizedHour(bestSpanEnd, locale)}`;

    return {
      bestHourSet: bestSet,
      minAQI: min,
      windowText: formattedWindow,
      isVeryPoorAllDay: min >= 301,
      isPoorAllDay: min >= 201 && min < 301,
    };
  }, [hourMap, locale]);

  return (
    <div className={cn("bg-card border border-border rounded-xl p-4 space-y-3", className)}>
      {/* Status / Recommended Window Banner (no duplicate "Safe outdoor window" heading) */}
      {windowText && (
        <div
          className={cn(
            "text-xs font-medium rounded-lg px-3 py-2 flex items-center justify-between gap-2 flex-wrap",
            isVeryPoorAllDay
              ? "bg-red-500/10 text-red-400 border border-red-500/20"
              : isPoorAllDay
              ? "bg-orange-500/10 text-orange-400 border border-orange-500/20"
              : "bg-green-500/10 text-green-400 border border-green-500/20"
          )}
        >
          <span>
            {isVeryPoorAllDay
              ? t("noCleanWindowVeryPoor")
              : isPoorAllDay
              ? `${t("airStaysPoor")} ${windowText}`
              : `${t("cleanestWindow")} ${windowText}`}
          </span>
          {isVeryPoorAllDay && (
            <span className="text-[11px] opacity-80 font-normal">
              ({t("leastBadHoursLegend")}: {windowText})
            </span>
          )}
        </div>
      )}

      {/* 19-hour color-coded strip (uniform bar base; highlighted best hours stand out cleanly) */}
      <div className="space-y-1.5">
        <div className="flex gap-1 items-end h-10 pt-2">
          {HOURS.map((hour) => {
            const entry = hourMap.get(hour);
            const aqi = entry?.aqi ?? 0;
            const band = getLocalizedBand(aqi, locale);
            const isCurrent = hour === currentHour;
            const isBest = bestHourSet.has(hour);

            return (
              <div
                key={hour}
                className="flex-1 h-full flex flex-col items-center justify-end group relative"
                title={`${formatLocalizedHour(hour, locale)}: AQI ${aqi} (${band.localizedName})`}
              >
                {/* Tooltip */}
                <div className="absolute bottom-full mb-1.5 hidden group-hover:block bg-background border border-border rounded px-2 py-1 text-xs whitespace-nowrap z-20 shadow-lg pointer-events-none">
                  <div className="font-medium">
                    {formatLocalizedHour(hour, locale)}
                    {isCurrent ? ` (${t("nowLabel")})` : ""}
                  </div>
                  <div style={{ color: band.hex }}>
                    AQI {aqi} · {band.localizedName}
                  </div>
                </div>

                {/* Best hour indicator dot */}
                {isBest && (
                  <span
                    className={cn(
                      "w-1.5 h-1.5 rounded-full mb-1 shrink-0",
                      isVeryPoorAllDay || isPoorAllDay ? "bg-amber-300" : "bg-emerald-400"
                    )}
                  />
                )}

                {/* CPCB-colored bar */}
                <div
                  className={cn(
                    "w-full rounded-sm transition-all duration-300",
                    isBest
                      ? isVeryPoorAllDay || isPoorAllDay
                        ? "h-7 ring-2 ring-amber-300/90 ring-offset-1 ring-offset-background"
                        : "h-7 ring-2 ring-emerald-400 ring-offset-1 ring-offset-background"
                      : "h-5",
                    isCurrent && "border-b-2 border-white"
                  )}
                  style={{
                    backgroundColor: band.hex,
                    opacity: !entry ? 0.25 : isBest ? 1 : 0.55,
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* Localized X-axis hour labels */}
        <div className="flex items-center justify-between text-[10px] text-muted-foreground px-0.5">
          {AXIS_HOURS.map((h) => (
            <span key={h} className="whitespace-nowrap">
              {formatLocalizedHour(h, locale)}
            </span>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground pt-0.5">
        <span className="flex items-center gap-1">
          <span
            className={cn(
              "inline-block w-2 h-2 rounded-full ring-1",
              isVeryPoorAllDay || isPoorAllDay
                ? "bg-amber-300 ring-amber-300"
                : "bg-emerald-400 ring-emerald-400"
            )}
          />
          {isVeryPoorAllDay || isPoorAllDay ? t("leastBadHoursLegend") : t("bestHoursLegend")}
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: "#22c55e" }} />
          {t("goodLegend")}
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: "#facc15" }} />
          {t("moderateLegend")}
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: "#ef4444" }} />
          {t("poorPlusLegend")}
        </span>
      </div>
    </div>
  );
}
