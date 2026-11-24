"use client";

import { useMemo } from "react";
import { getBand } from "@/lib/cpcb-bands";
import type { HourlyAQI } from "@/lib/types";
import { cn } from "@/lib/utils";

interface SafeWindowStripProps {
  forecast: HourlyAQI[];
  className?: string;
}

const HOURS = Array.from({ length: 19 }, (_, i) => i + 5); // 5 AM – 11 PM

export function SafeWindowStrip({ forecast, className }: SafeWindowStripProps) {
  const hourMap = useMemo(() => {
    const m = new Map(forecast.map((h) => [h.hour, h]));
    return m;
  }, [forecast]);

  const currentHour = new Date().getHours();

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>5 AM</span>
        <span className="font-medium text-foreground">Safe outdoor window</span>
        <span>11 PM</span>
      </div>

      <div className="flex gap-0.5 items-end h-10">
        {HOURS.map((hour) => {
          const entry = hourMap.get(hour);
          const aqi = entry?.aqi ?? 0;
          const band = getBand(aqi);
          const isCurrent = hour === currentHour;
          // Bar height proportional to AQI (inverted — lower = taller = "more visible")
          const heightPct = entry ? Math.min(100, Math.max(20, 100 - (aqi / 5))) : 20;

          return (
            <div
              key={hour}
              className="flex-1 flex flex-col items-center gap-0.5 group relative"
              title={`${formatHour(hour)}: AQI ${aqi} (${band.name})`}
            >
              {/* Tooltip */}
              <div className="absolute bottom-full mb-1 hidden group-hover:block bg-background border border-border rounded px-2 py-1 text-xs whitespace-nowrap z-10 shadow-lg">
                <div className="font-medium">{formatHour(hour)}</div>
                <div style={{ color: band.hex }}>
                  AQI {aqi} · {band.name}
                </div>
              </div>
              {/* Bar */}
              <div
                className={cn(
                  "w-full rounded-t transition-all duration-300",
                  isCurrent && "ring-2 ring-white ring-offset-1 ring-offset-background"
                )}
                style={{
                  height: `${heightPct}%`,
                  backgroundColor: band.hex,
                  opacity: entry ? 1 : 0.3,
                }}
              />
              {/* Hour label — show every 3 hours */}
              {hour % 3 === 0 && (
                <span className="text-[9px] text-muted-foreground leading-none mt-0.5">
                  {hour === 12 ? "12P" : hour > 12 ? `${hour - 12}P` : `${hour}A`}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex gap-3 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: "#22c55e" }} />
          Good (0–50)
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: "#facc15" }} />
          Moderate (101–200)
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: "#ef4444" }} />
          Poor+
        </span>
      </div>
    </div>
  );
}

function formatHour(h: number): string {
  if (h === 0 || h === 24) return "12 AM";
  if (h === 12) return "12 PM";
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}
