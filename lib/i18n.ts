/**
 * lib/i18n.ts
 *
 * Multi-language translation strings for AirWise.
 * Supported locales: en (English), hi (Hindi), kn (Kannada).
 */

export type Locale = "en" | "hi" | "kn";

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "EN",
  hi: "हि",
  kn: "ಕ",
};

export interface UIStrings {
  appName: string;
  tagline: string;
  safeWindow: string;
  planTitle: string;
  whatIf: string;
  loading: string;
  error: string;
  retry: string;
  today: string;
  tomorrow: string;
  baseline: string;
  optimized: string;
  doseCut: string;
  cigaretteEq: string;
  refresh: string;
  backDashboard: string;
  sourceLabel: string;
  disclaimer: string;
  planTomorrow: string;
  bestExerciseTime: string;
  schoolRun: string;
  bestCommute: string;
  exposureMeter: string;
  whatIfTitle: string;
  addPurifier: string;
  commuteMode: string;
  activityHour: string;
}

export const STRINGS: Record<Locale, UIStrings> = {
  en: {
    appName: "AirWise",
    tagline: "Urban Air Quality Assistant",
    safeWindow: "Safe outdoor window",
    planTitle: "Today's Clean-Air Plan",
    whatIf: "🔬 What if I add an air purifier / change my commute?",
    loading: "Loading…",
    error: "Something went wrong",
    retry: "Retry",
    today: "Today",
    tomorrow: "Tomorrow",
    baseline: "Baseline",
    optimized: "Optimised",
    doseCut: "Dose cut",
    cigaretteEq: "Cigarette equivalent",
    refresh: "Refresh",
    backDashboard: "Back to Dashboard",
    sourceLabel: "Source",
    disclaimer:
      "General guidance only — not medical advice. Consult a doctor for health conditions.",
    planTomorrow: "Plan for tomorrow",
    bestExerciseTime: "Best exercise time",
    schoolRun: "School run window",
    bestCommute: "Best commute window",
    exposureMeter: "Exposure meter",
    whatIfTitle: "What-If Simulator",
    addPurifier: "Add air purifier",
    commuteMode: "Commute mode",
    activityHour: "Activity hour",
  },
  hi: {
    appName: "एयरवाइज़",
    tagline: "शहरी वायु गुणवत्ता सहायक",
    safeWindow: "बाहर जाने का सुरक्षित समय",
    planTitle: "आज की स्वच्छ-वायु योजना",
    whatIf: "🔬 यदि मैं एयर प्यूरीफायर लगाऊं / यात्रा बदलूं?",
    loading: "लोड हो रहा है…",
    error: "कुछ गलत हो गया",
    retry: "पुनः प्रयास करें",
    today: "आज",
    tomorrow: "कल",
    baseline: "आधार रेखा",
    optimized: "अनुकूलित",
    doseCut: "खुराक में कटौती",
    cigaretteEq: "सिगरेट समकक्ष",
    refresh: "ताज़ा करें",
    backDashboard: "डैशबोर्ड पर वापस जाएं",
    sourceLabel: "स्रोत",
    disclaimer:
      "केवल सामान्य मार्गदर्शन — चिकित्सा सलाह नहीं। स्वास्थ्य स्थितियों के लिए डॉक्टर से परामर्श करें।",
    planTomorrow: "कल की योजना",
    bestExerciseTime: "सर्वश्रेष्ठ व्यायाम समय",
    schoolRun: "स्कूल जाने का समय",
    bestCommute: "सर्वश्रेष्ठ यात्रा समय",
    exposureMeter: "एक्सपोज़र मीटर",
    whatIfTitle: "क्या-अगर सिमुलेटर",
    addPurifier: "एयर प्यूरीफायर जोड़ें",
    commuteMode: "यात्रा का तरीका",
    activityHour: "गतिविधि घंटा",
  },
  kn: {
    appName: "ಏರ್‌ವೈಸ್",
    tagline: "ನಗರ ವಾಯು ಗುಣಮಟ್ಟ ಸಹಾಯಕ",
    safeWindow: "ಹೊರಗೆ ಹೋಗಲು ಸುರಕ್ಷಿತ ಸಮಯ",
    planTitle: "ಇಂದಿನ ಶುದ್ಧ-ವಾಯು ಯೋಜನೆ",
    whatIf: "🔬 ಏರ್ ಪ್ಯೂರಿಫೈಯರ್ ಸೇರಿಸಿದರೆ / ಪ್ರಯಾಣ ಬದಲಿಸಿದರೆ?",
    loading: "ಲೋಡ್ ಆಗುತ್ತಿದೆ…",
    error: "ಏನೋ ತಪ್ಪಾಗಿದೆ",
    retry: "ಮರು ಪ್ರಯತ್ನಿಸಿ",
    today: "ಇಂದು",
    tomorrow: "ನಾಳೆ",
    baseline: "ಮೂಲ ರೇಖೆ",
    optimized: "ಅನುಕೂಲಿಸಲಾಗಿದೆ",
    doseCut: "ಡೋಸ್ ಕಡಿತ",
    cigaretteEq: "ಸಿಗರೇಟ್ ಸಮಾನ",
    refresh: "ರಿಫ್ರೆಶ್ ಮಾಡಿ",
    backDashboard: "ಡ್ಯಾಶ್‌ಬೋರ್ಡ್‌ಗೆ ಹಿಂತಿರುಗಿ",
    sourceLabel: "ಮೂಲ",
    disclaimer:
      "ಸಾಮಾನ್ಯ ಮಾರ್ಗದರ್ಶನ ಮಾತ್ರ — ವೈದ್ಯಕೀಯ ಸಲಹೆಯಲ್ಲ. ಆರೋಗ್ಯ ಸ್ಥಿತಿಗಳಿಗೆ ವೈದ್ಯರನ್ನು ಸಂಪರ್ಕಿಸಿ.",
    planTomorrow: "ನಾಳಿನ ಯೋಜನೆ",
    bestExerciseTime: "ಉತ್ತಮ ವ್ಯಾಯಾಮ ಸಮಯ",
    schoolRun: "ಶಾಲೆಗೆ ಹೋಗುವ ಸಮಯ",
    bestCommute: "ಉತ್ತಮ ಪ್ರಯಾಣ ಸಮಯ",
    exposureMeter: "ಎಕ್ಸ್‌ಪೋಶರ್ ಮೀಟರ್",
    whatIfTitle: "ಏನಾಗುತ್ತದೆ ಸಿಮ್ಯುಲೇಟರ್",
    addPurifier: "ಏರ್ ಪ್ಯೂರಿಫೈಯರ್ ಸೇರಿಸಿ",
    commuteMode: "ಪ್ರಯಾಣ ವಿಧಾನ",
    activityHour: "ಚಟುವಟಿಕೆ ಗಂಟೆ",
  },
};

/**
 * Returns the translated string for a given locale and key.
 */
export function t(locale: Locale, key: keyof UIStrings): string {
  return STRINGS[locale][key] ?? STRINGS["en"][key];
}
