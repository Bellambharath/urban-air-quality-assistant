"use client";

import { useEffect } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { CPCB_BANDS, getLocalizedBand, getBandHex } from "@/lib/cpcb-bands";
import { useLocale } from "@/lib/LocaleContext";
import { cn } from "@/lib/utils";

interface AQIGaugeProps {
  aqi: number;
  pm25?: number;
  size?: number;  // svg viewport size in px
  className?: string;
}

const MAX_AQI = 500;
const START_ANGLE = -225; // degrees (bottom-left)
const END_ANGLE   =  45;  // degrees (bottom-right)
const TOTAL_SWEEP = END_ANGLE - START_ANGLE; // 270°

function polarToXY(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const start = polarToXY(cx, cy, r, startDeg);
  const end   = polarToXY(cx, cy, r, endDeg);
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

// Band sweep segments mapped directly from the single source of truth (CPCB_BANDS)
const BANDS = CPCB_BANDS.map((b) => ({ max: b.range[1], color: b.hex }));

export function AQIGauge({ aqi, pm25, size = 220, className }: AQIGaugeProps) {
  const { locale } = useLocale();
  const cx = size / 2;
  const cy = size / 2;
  const r  = size * 0.4;
  const strokeW = size * 0.065;

  const band = getLocalizedBand(aqi, locale);
  const hex  = getBandHex(aqi);

  // Animated needle value
  const motionAQI = useMotionValue(0);
  const needleAngle = useTransform(
    motionAQI,
    [0, MAX_AQI],
    [START_ANGLE, START_ANGLE + TOTAL_SWEEP]
  );

  useEffect(() => {
    const controls = animate(motionAQI, Math.min(aqi, MAX_AQI), {
      duration: 1.4,
      ease: "easeOut",
    });
    return controls.stop;
  }, [aqi, motionAQI]);

  // Build band arc segments
  let prevAngle = START_ANGLE;
  const segments = BANDS.map(({ max, color }) => {
    const startAng = prevAngle;
    const endAng   = START_ANGLE + (max / MAX_AQI) * TOTAL_SWEEP;
    prevAngle = endAng;
    return { startAng, endAng, color };
  });

  return (
    <div className={cn("relative flex flex-col items-center", className)}>
      <svg
        width={size}
        height={size * 0.72}
        viewBox={`0 0 ${size} ${size}`}
        aria-label={`AQI gauge: ${aqi}, ${band.localizedName}`}
      >
        {/* Background track */}
        <path
          d={describeArc(cx, cy, r, START_ANGLE, START_ANGLE + TOTAL_SWEEP)}
          fill="none"
          stroke="currentColor"
          strokeOpacity={0.08}
          strokeWidth={strokeW}
          strokeLinecap="round"
        />

        {/* Coloured band segments */}
        {segments.map(({ startAng, endAng, color }) => (
          <path
            key={color}
            d={describeArc(cx, cy, r, startAng, endAng)}
            fill="none"
            stroke={color}
            strokeOpacity={0.25}
            strokeWidth={strokeW}
          />
        ))}

        {/* Active filled arc */}
        <motion.path
          d={describeArc(cx, cy, r, START_ANGLE, START_ANGLE + (Math.min(aqi, MAX_AQI) / MAX_AQI) * TOTAL_SWEEP)}
          fill="none"
          stroke={hex}
          strokeWidth={strokeW}
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.4, ease: "easeOut" }}
        />

        {/* Centre AQI number */}
        <text
          x={cx}
          y={cy - r * 0.05}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={size * 0.18}
          fontWeight="700"
          fill={hex}
        >
          {aqi}
        </text>

        {/* Band label */}
        <text
          x={cx}
          y={cy + r * 0.22}
          textAnchor="middle"
          fontSize={size * 0.065}
          fill={hex}
          opacity={0.9}
        >
          {band.localizedName}
        </text>

        {/* PM2.5 label */}
        {pm25 != null && (
          <text
            x={cx}
            y={cy + r * 0.42}
            textAnchor="middle"
            fontSize={size * 0.052}
            fill="currentColor"
            opacity={0.5}
          >
            PM2.5 · {pm25} µg/m³
          </text>
        )}

        {/* Needle */}
        <motion.g style={{ rotate: needleAngle, originX: `${cx}px`, originY: `${cy}px` }}>
          <line
            x1={cx}
            y1={cy}
            x2={cx}
            y2={cy - r + strokeW / 2}
            stroke={hex}
            strokeWidth={size * 0.018}
            strokeLinecap="round"
            opacity={0.9}
          />
          <circle cx={cx} cy={cy} r={size * 0.025} fill={hex} />
        </motion.g>
      </svg>

      {/* Meaning text below gauge */}
      <p className="text-xs text-muted-foreground text-center mt-1 px-4 leading-snug">
        {band.localizedMeaning}
      </p>
    </div>
  );
}
