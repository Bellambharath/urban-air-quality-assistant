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
  nameHi: string;
  range: [number, number]; // [min, max] inclusive
  color: string;           // Tailwind text class
  hex: string;             // Raw hex for Canvas / SVG / Framer Motion
  bgClass: string;         // Tailwind bg class (semi-transparent)
  borderClass: string;     // Tailwind border class
  meaning: string;         // Short in-app label
  meaningHi: string;
  advice: string;          // One-line outdoor guidance
  adviceHi: string;
}

export const CPCB_BANDS: CPCBBand[] = [
  {
    name: "Good",
    nameHi: "अच्छा",
    range: [0, 50],
    color: "text-green-500",
    hex: "#22c55e",
    bgClass: "bg-green-500/15",
    borderClass: "border-green-500",
    meaning: "Clean air.",
    meaningHi: "स्वच्छ हवा।",
    advice: "Normal outdoor activity for everyone.",
    adviceHi: "सभी के लिए सामान्य बाहरी गतिविधियाँ सुरक्षित हैं।",
  },
  {
    name: "Satisfactory",
    nameHi: "संतोषजनक",
    range: [51, 100],
    color: "text-lime-400",
    hex: "#a3e635",
    bgClass: "bg-lime-400/15",
    borderClass: "border-lime-400",
    meaning: "Minor discomfort.",
    meaningHi: "हल्की असुविधा।",
    advice: "Sensitive people should reduce prolonged exertion.",
    adviceHi: "संवेदनशील लोगों को लंबे समय तक भारी श्रम कम करना चाहिए।",
  },
  {
    name: "Moderate",
    nameHi: "मध्यम",
    range: [101, 200],
    color: "text-yellow-400",
    hex: "#facc15",
    bgClass: "bg-yellow-400/15",
    borderClass: "border-yellow-400",
    meaning: "Moderate pollution.",
    meaningHi: "मध्यम प्रदूषण।",
    advice: "Sensitive groups reduce prolonged outdoor exertion.",
    adviceHi: "संवेदनशील समूह लंबे समय तक बाहर परिश्रम करने से बचें।",
  },
  {
    name: "Poor",
    nameHi: "खराब",
    range: [201, 300],
    color: "text-orange-500",
    hex: "#f97316",
    bgClass: "bg-orange-500/15",
    borderClass: "border-orange-500",
    meaning: "Breathing discomfort.",
    meaningHi: "साँस लेने में तकलीफ़।",
    advice: "Wear N95 outdoors. Limit outdoor activity.",
    adviceHi: "बाहर N95 मास्क पहनें। बाहरी गतिविधियाँ सीमित करें।",
  },
  {
    name: "Very Poor",
    nameHi: "बहुत खराब",
    range: [301, 400],
    color: "text-red-500",
    hex: "#ef4444",
    bgClass: "bg-red-500/15",
    borderClass: "border-red-500",
    meaning: "Respiratory risk.",
    meaningHi: "श्वसन संबंधी जोखिम।",
    advice: "Avoid outdoor exertion. Keep windows closed.",
    adviceHi: "बाहर भारी मेहनत से बचें। खिड़कियाँ बंद रखें।",
  },
  {
    name: "Severe",
    nameHi: "गंभीर",
    range: [401, 500],
    color: "text-red-900 dark:text-red-400",
    hex: "#7f1d1d",
    bgClass: "bg-red-950/40",
    borderClass: "border-red-900",
    meaning: "Severe health impact.",
    meaningHi: "गंभीर स्वास्थ्य प्रभाव।",
    advice: "Stay indoors. Healthy people are also affected.",
    adviceHi: "घर के अंदर ही रहें। स्वस्थ लोग भी प्रभावित हो सकते हैं।",
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

/** Returns localized name, meaning, and advice for a given AQI and locale. */
export function getLocalizedBand(aqi: number, locale: string = "en") {
  const band = getBand(aqi);
  const isHi = locale === "hi";
  return {
    ...band,
    localizedName: isHi ? band.nameHi : band.name,
    localizedMeaning: isHi ? band.meaningHi : band.meaning,
    localizedAdvice: isHi ? band.adviceHi : band.advice,
  };
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
