/**
 * lib/cpcb-bands.ts
 *
 * Single source of truth for India CPCB (Central Pollution Control Board) AQI bands.
 * Import this module wherever AQI is displayed — never duplicate band definitions.
 *
 * Source: https://cpcb.nic.in/air-quality-index/
 */

export type CPCBBandName =
  | "Good"
  | "Satisfactory"
  | "Moderate"
  | "Poor"
  | "Very Poor"
  | "Severe";

export interface CPCBBand {
  name: CPCBBandName;
  range: [number, number]; // [min, max] inclusive
  color: string;           // Tailwind text class
  hex: string;             // Raw hex for Canvas / SVG / Framer Motion
  bgClass: string;         // Tailwind bg class (semi-transparent)
  borderClass: string;     // Tailwind border class
  meaning: string;         // Short in-app label
  advice: string;          // One-line outdoor guidance
}

export const CPCB_BANDS: CPCBBand[] = [
  {
    name: "Good",
    range: [0, 50],
    color: "text-green-500",
    hex: "#22c55e",
    bgClass: "bg-green-500/15",
    borderClass: "border-green-500",
    meaning: "Clean air.",
    advice: "Normal outdoor activity for everyone.",
  },
  {
    name: "Satisfactory",
    range: [51, 100],
    color: "text-lime-400",
    hex: "#a3e635",
    bgClass: "bg-lime-400/15",
    borderClass: "border-lime-400",
    meaning: "Minor discomfort.",
    advice: "Sensitive people should reduce prolonged exertion.",
  },
  {
    name: "Moderate",
    range: [101, 200],
    color: "text-yellow-400",
    hex: "#facc15",
    bgClass: "bg-yellow-400/15",
    borderClass: "border-yellow-400",
    meaning: "Moderate pollution.",
    advice: "Sensitive groups reduce prolonged outdoor exertion.",
  },
  {
    name: "Poor",
    range: [201, 300],
    color: "text-orange-500",
    hex: "#f97316",
    bgClass: "bg-orange-500/15",
    borderClass: "border-orange-500",
    meaning: "Breathing discomfort.",
    advice: "Wear N95 outdoors. Limit outdoor activity.",
  },
  {
    name: "Very Poor",
    range: [301, 400],
    color: "text-red-500",
    hex: "#ef4444",
    bgClass: "bg-red-500/15",
    borderClass: "border-red-500",
    meaning: "Respiratory risk.",
    advice: "Avoid outdoor exertion. Keep windows closed.",
  },
  {
    name: "Severe",
    range: [401, 500],
    color: "text-red-900 dark:text-red-400",
    hex: "#7f1d1d",
    bgClass: "bg-red-950/40",
    borderClass: "border-red-900",
    meaning: "Severe health impact.",
    advice: "Stay indoors. Healthy people are also affected.",
  },
];

/** Returns the CPCB band for a given AQI value. Clamps to Severe for AQI > 500. */
export function getBand(aqi: number): CPCBBand {
  const rounded = Math.round(aqi);
  const clamped = Math.max(0, Math.min(rounded, 500));
  return (
    CPCB_BANDS.find(
      (b) => clamped >= b.range[0] && clamped <= b.range[1]
    ) ?? CPCB_BANDS[CPCB_BANDS.length - 1]
  );
}

export function getBandName(aqi: number): CPCBBandName {
  return getBand(aqi).name;
}

export function getBandHex(aqi: number): string {
  return getBand(aqi).hex;
}

export function getBandColor(aqi: number): string {
  return getBand(aqi).color;
}

export function getBandBg(aqi: number): string {
  return getBand(aqi).bgClass;
}
