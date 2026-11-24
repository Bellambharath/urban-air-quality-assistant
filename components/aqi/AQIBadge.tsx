/**
 * components/aqi/AQIBadge.tsx
 *
 * Inline colour-coded AQI badge using the CPCB band system.
 */

"use client";

import { getBand } from "@/lib/cpcb-bands";
import { cn } from "@/lib/utils";

interface AQIBadgeProps {
  aqi: number;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function AQIBadge({ aqi, showLabel = true, size = "md", className }: AQIBadgeProps) {
  const band = getBand(aqi);

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5 rounded",
    md: "text-sm px-2.5 py-1 rounded-md font-medium",
    lg: "text-base px-3 py-1.5 rounded-lg font-semibold",
  };

  return (
    <span
      className={cn(sizeClasses[size], band.bgClass, band.color, band.borderClass, "border", className)}
      title={`AQI ${aqi} — ${band.name}: ${band.meaning}`}
    >
      AQI {aqi}
      {showLabel && <span className="ml-1.5 opacity-80">· {band.name}</span>}
    </span>
  );
}
