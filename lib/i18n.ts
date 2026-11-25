/**
 * lib/i18n.ts
 *
 * Complete multi-language translation strings for AirWise.
 * Supported UI locales: en (English), hi (Hindi).
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
  todaysAirStory: string;
  safeWindow: string;
  planTitle: string;
  whatIf: string;
  loading: string;
  loadingProfile: string;
  error: string;
  retry: string;
  aqiLoadErrorLine1: string;
  aqiLoadErrorLine2: string;
  planErrorTitle: string;
  retryPlan: string;
  noRecommendations: string;
  today: string;
  tomorrow: string;
  baseline: string;
  optimized: string;
  doseCut: string;
  cigaretteEq: string;
  cigEqShort: string;
  cigEqAvoided: string;
  ugPm25: string;
  refresh: string;
  backDashboard: string;
  sourceLabel: string;
  fetchedLabel: string;
  disclaimer: string;
  // SafeWindowStrip
  fiveAm: string;
  elevenPm: string;
  goodLegend: string;
  moderateLegend: string;
  poorPlusLegend: string;
  cleanestWindow: string;
  noCleanWindowVeryPoor: string;
  airStaysPoor: string;
  bestHoursLegend: string;
  leastBadHoursLegend: string;
  nowLabel: string;
  // PlanTomorrowCard
  planTomorrow: string;
  noForecastYet: string;
  basedOnHourlyForecast: string;
  bestExerciseTime: string;
  schoolRun: string;
  bestCommute: string;
  // ExposureMeter
  exposureMeterTitle: string;
  exposureMeterSubtitle: string;
  connectForecast: string;
  optimisePrefix: string;
  lessInhaledToday: string;
  yourRoutine: string;
  withAirWise: string;
  exposureMeterFootnote: string;
  // PlanCard
  effortLow: string;
  effortMedium: string;
  effortHigh: string;
  howWeCalculate: string;
  // Chat
  chatTitle: string;
  chatEmptyHint: string;
  chatPlaceholder: string;
  chatDisclaimer: string;
  chatError: string;
  // Simulate
  whatIfTitle: string;
  exploreImpact: string;
  addPurifier: string;
  runPurifier: string;
  purifierSub: string;
  commuteMode: string;
  activityHour: string;
  activityDuration: string;
  indoorPm25Label: string;
  co2SavedLabel: string;
  perWeek: string;
  noChange: string;
  naturalInfiltration: string;
  avoidedByTiming: string;
  adjustControls: string;
  howWeCalculateBody: string;
  minUnit: string;
  // Map
  mapTitle: string;
  cityComparisonGrid: string;
  cpcbStandardSubtitle: string;
  worstToBest: string;
  yourCityLabel: string;
  liveLabel: string;
  selectedLabel: string;
  switchToCity: string;
  setAsMyCity: string;
  liveAqiFor: string;
  aqiFor: string;
  yourCurrentCity: string;
  cpcbScaleRef: string;
}

const EN_STRINGS: UIStrings = {
  appName: "AirWise",
  tagline: "Urban Air Quality Assistant",
  todaysAirStory: "Today's air story ☀️",
  safeWindow: "Safe outdoor window",
  planTitle: "Today's Clean-Air Plan",
  whatIf: "🔬 What if I add an air purifier / change my commute?",
  loading: "Loading…",
  loadingProfile: "Loading your profile…",
  error: "Something went wrong",
  retry: "Retry",
  aqiLoadErrorLine1: "Could not load air quality data.",
  aqiLoadErrorLine2: "Check your connection and try again.",
  planErrorTitle: "Could not generate your Clean-Air Plan",
  retryPlan: "Retry Plan",
  noRecommendations: "No recommendations generated yet. Check back shortly.",
  today: "Today",
  tomorrow: "Tomorrow",
  baseline: "Baseline",
  optimized: "Optimised",
  doseCut: "dose cut",
  cigaretteEq: "cigarette-eq",
  cigEqShort: "cig-eq",
  cigEqAvoided: "cig-eq avoided",
  ugPm25: "µg PM2.5",
  refresh: "Refresh",
  backDashboard: "Dashboard",
  sourceLabel: "Source",
  fetchedLabel: "Fetched",
  disclaimer:
    "General guidance only — not medical advice. Consult a doctor for health conditions.",
  // SafeWindowStrip
  fiveAm: "5 AM",
  elevenPm: "11 PM",
  goodLegend: "Good (0–50)",
  moderateLegend: "Moderate (101–200)",
  poorPlusLegend: "Poor+",
  cleanestWindow: "Cleanest:",
  noCleanWindowVeryPoor: "No clean window today — air stays Very Poor; keep outdoor time short",
  airStaysPoor: "Air stays Poor today — least polluted:",
  bestHoursLegend: "Best hours",
  leastBadHoursLegend: "Least-bad hours",
  nowLabel: "Now",
  // PlanTomorrowCard
  planTomorrow: "Plan Tomorrow 📅",
  noForecastYet: "No forecast available yet.",
  basedOnHourlyForecast: "Based on hourly forecast",
  bestExerciseTime: "Best exercise",
  schoolRun: "School run: aim for",
  bestCommute: "Best commute",
  // ExposureMeter
  exposureMeterTitle: "Personal Exposure Meter",
  exposureMeterSubtitle: "Estimated inhaled PM2.5 — your routine vs AirWise-optimised",
  connectForecast: "Connect forecast data for personalised exposure meter",
  optimisePrefix: "Optimise →",
  lessInhaledToday: "less inhaled PM2.5 today",
  yourRoutine: "Your routine",
  withAirWise: "With AirWise",
  exposureMeterFootnote:
    "Estimates based on ICRP minute-ventilation values, CADR box model, and stated household profile. Not measured exposure.",
  // PlanCard
  effortLow: "Easy",
  effortMedium: "Moderate",
  effortHigh: "Effort needed",
  howWeCalculate: "How we calculate this",
  // Chat
  chatTitle: "AirWise Chat",
  chatEmptyHint: "Ask me anything about today's air quality.",
  chatPlaceholder: "Ask about today's air quality…",
  chatDisclaimer: "General guidance only — not medical advice.",
  chatError: "Sorry, I couldn't get a response right now. Please try again.",
  // Simulate
  whatIfTitle: "What-If Simulator",
  exploreImpact: "Explore your impact",
  addPurifier: "Add an air purifier",
  runPurifier: "Run air purifier",
  purifierSub: "95% PM2.5 filtration (CADR 300 m³/h)",
  commuteMode: "Commute mode",
  activityHour: "Outdoor activity hour",
  activityDuration: "Activity duration",
  indoorPm25Label: "Indoor PM2.5",
  co2SavedLabel: "CO₂ saved",
  perWeek: "per week",
  noChange: "No change",
  naturalInfiltration: "Natural infiltration",
  avoidedByTiming: "PM2.5 avoided per day",
  adjustControls: "Adjust controls above to explore your impact",
  howWeCalculateBody:
    "Inhaled PM2.5 dose = concentration × minute-ventilation × duration (ICRP 1994 reference values). Air purifier: box model CADR 300 m³/h, 30 m³ room. CO₂: India MNRE 2023 factors. Cigarette-eq: Berkeley Earth (22 µg/m³ × 24h ≈ 1 cigarette). All figures are estimates based on stated assumptions.",
  minUnit: "min",
  // Map
  mapTitle: "City AQI Comparison 🗺️",
  cityComparisonGrid: "10-City Comparison Grid",
  cpcbStandardSubtitle: "CPCB National Ambient Air Quality Standard · Sorted worst to best",
  worstToBest: "Worst → Best",
  yourCityLabel: "Your City",
  liveLabel: "Live",
  selectedLabel: "Selected",
  switchToCity: "Switch to",
  setAsMyCity: "Set as my city & view dashboard →",
  liveAqiFor: "Live AQI for",
  aqiFor: "AQI for",
  yourCurrentCity: "(Your current city)",
  cpcbScaleRef: "CPCB AQI Scale Reference",
};

const HI_STRINGS: UIStrings = {
  appName: "एयरवाइज़",
  tagline: "शहरी वायु गुणवत्ता सहायक",
  todaysAirStory: "आज की हवा का हाल ☀️",
  safeWindow: "बाहर जाने का सुरक्षित समय",
  planTitle: "आज की स्वच्छ-वायु योजना",
  whatIf: "🔬 क्या हो अगर मैं एयर प्यूरीफायर लगाऊँ / यात्रा बदलूँ?",
  loading: "लोड हो रहा है…",
  loadingProfile: "आपकी प्रोफ़ाइल लोड हो रही है…",
  error: "कुछ गलत हो गया",
  retry: "पुनः प्रयास करें",
  aqiLoadErrorLine1: "वायु गुणवत्ता डेटा लोड नहीं हो सका।",
  aqiLoadErrorLine2: "अपना इंटरनेट कनेक्शन जांचें और पुनः प्रयास करें।",
  planErrorTitle: "आपकी स्वच्छ-वायु योजना बन नहीं सकी",
  retryPlan: "योजना पुनः प्रयास करें",
  noRecommendations: "अभी तक कोई सुझाव नहीं बना है। कृपया थोड़ी देर में जांचें।",
  today: "आज",
  tomorrow: "कल",
  baseline: "सामान्य दिनचर्या",
  optimized: "अनुकूलित",
  doseCut: "खुराक में कमी",
  cigaretteEq: "सिगरेट-समकक्ष",
  cigEqShort: "सिगरेट-समकक्ष",
  cigEqAvoided: "सिगरेट-समकक्ष से बचाव",
  ugPm25: "µg PM2.5",
  refresh: "रीफ़्रेश करें",
  backDashboard: "डैशबोर्ड",
  sourceLabel: "स्रोत",
  fetchedLabel: "अपडेट समय",
  disclaimer:
    "केवल सामान्य मार्गदर्शन — चिकित्सा सलाह नहीं। स्वास्थ्य समस्याओं के लिए डॉक्टर से परामर्श करें।",
  // SafeWindowStrip
  fiveAm: "सुबह 5",
  elevenPm: "रात 11",
  goodLegend: "अच्छा (0–50)",
  moderateLegend: "मध्यम (101–200)",
  poorPlusLegend: "खराब+",
  cleanestWindow: "सबसे साफ़ समय:",
  noCleanWindowVeryPoor: "आज कोई सुरक्षित समय नहीं — हवा बहुत खराब रहेगी; बाहर कम समय बिताएं",
  airStaysPoor: "आज हवा खराब रहेगी — अपेक्षाकृत कम प्रदूषित:",
  bestHoursLegend: "बेहतर घंटे",
  leastBadHoursLegend: "कम प्रदूषित घंटे",
  nowLabel: "अभी",
  // PlanTomorrowCard
  planTomorrow: "कल की योजना 📅",
  noForecastYet: "अभी पूर्वानुमान उपलब्ध नहीं है।",
  basedOnHourlyForecast: "प्रति घंटे के पूर्वानुमान के आधार पर",
  bestExerciseTime: "व्यायाम का श्रेष्ठ समय",
  schoolRun: "स्कूल जाने का समय",
  bestCommute: "यात्रा का श्रेष्ठ समय",
  // ExposureMeter
  exposureMeterTitle: "व्यक्तिगत एक्सपोज़र मीटर",
  exposureMeterSubtitle: "साँस द्वारा लिया गया अनुमानित PM2.5 — आपकी दिनचर्या बनाम एयरवाइज़",
  connectForecast: "व्यक्तिगत एक्सपोज़र मीटर के लिए पूर्वानुमान डेटा जोड़ें",
  optimisePrefix: "सुधार →",
  lessInhaledToday: "आज कम PM2.5 साँस में",
  yourRoutine: "आपकी दिनचर्या",
  withAirWise: "एयरवाइज़ के साथ",
  exposureMeterFootnote:
    "अनुमान ICRP श्वसन दर, CADR बॉक्स मॉडल और आपके घरेलू विवरण पर आधारित हैं। यह मापा गया एक्सपोज़र नहीं है।",
  // PlanCard
  effortLow: "आसान",
  effortMedium: "मध्यम",
  effortHigh: "अधिक प्रयास",
  howWeCalculate: "हम इसकी गणना कैसे करते हैं",
  // Chat
  chatTitle: "एयरवाइज़ चैट",
  chatEmptyHint: "आज की वायु गुणवत्ता के बारे में कुछ भी पूछें।",
  chatPlaceholder: "आज की हवा के बारे में पूछें…",
  chatDisclaimer: "केवल सामान्य मार्गदर्शन — चिकित्सा सलाह नहीं।",
  chatError: "क्षमा करें, अभी उत्तर नहीं मिल सका। कृपया पुनः प्रयास करें।",
  // Simulate
  whatIfTitle: "क्या-अगर सिमुलेटर",
  exploreImpact: "अपना प्रभाव देखें",
  addPurifier: "एयर प्यूरीफायर जोड़ें",
  runPurifier: "एयर प्यूरीफायर चलाएँ",
  purifierSub: "95% PM2.5 फ़िल्टरेशन (CADR 300 m³/h)",
  commuteMode: "यात्रा का तरीका",
  activityHour: "बाहरी गतिविधि का समय",
  activityDuration: "गतिविधि की अवधि",
  indoorPm25Label: "घर के अंदर PM2.5",
  co2SavedLabel: "CO₂ बचत",
  perWeek: "प्रति सप्ताह",
  noChange: "कोई बदलाव नहीं",
  naturalInfiltration: "सामान्य वायु प्रवेश",
  avoidedByTiming: "प्रति दिन टाला गया PM2.5",
  adjustControls: "अपना प्रभाव देखने के लिए ऊपर दिए नियंत्रण बदलें",
  howWeCalculateBody:
    "साँस में PM2.5 खुराक = सघनता × श्वसन दर × अवधि (ICRP 1994 मान)। एयर प्यूरीफायर: CADR 300 m³/h बॉक्स मॉडल, 30 m³ कमरा। CO₂: भारत MNRE 2023 कारक। सिगरेट-समकक्ष: बर्कले अर्थ (22 µg/m³ × 24 घंटे ≈ 1 सिगरेट)। सभी आंकड़े अनुमानित हैं।",
  minUnit: "मिनट",
  // Map
  mapTitle: "शहर AQI तुलना 🗺️",
  cityComparisonGrid: "10 शहरों की तुलना ग्रिड",
  cpcbStandardSubtitle: "CPCB राष्ट्रीय वायु गुणवत्ता मानक · सबसे खराब से सबसे अच्छे के क्रम में",
  worstToBest: "खराब → अच्छा",
  yourCityLabel: "आपका शहर",
  liveLabel: "लाइव",
  selectedLabel: "चयनित",
  switchToCity: "बदलें",
  setAsMyCity: "अपना शहर चुनें और डैशबोर्ड देखें →",
  liveAqiFor: "लाइव AQI:",
  aqiFor: "AQI:",
  yourCurrentCity: "(आपका वर्तमान शहर)",
  cpcbScaleRef: "CPCB AQI मानक संदर्भ",
};

export const STRINGS: Record<Locale, UIStrings> = {
  en: EN_STRINGS,
  hi: HI_STRINGS,
  kn: EN_STRINGS,
};

/** Returns the translated string for a given locale and key. */
export function t(locale: Locale, key: keyof UIStrings): string {
  const effectiveLocale = locale === "hi" ? "hi" : "en";
  return STRINGS[effectiveLocale][key] ?? STRINGS.en[key];
}

// ─── Helper Translators ──────────────────────────────────────────────────────

const CITY_HI_MAP: Record<string, string> = {
  Delhi: "दिल्ली",
  Mumbai: "मुंबई",
  Bengaluru: "बेंगलुरु",
  Hyderabad: "हैदराबाद",
  Chennai: "चेन्नई",
  Kolkata: "कोलकाता",
  Pune: "पुणे",
  Ahmedabad: "अहमदाबाद",
  Lucknow: "लखनऊ",
  Jaipur: "जयपुर",
};

export function translateCity(locale: string, city: string): string {
  if (locale !== "hi") return city;
  return CITY_HI_MAP[city] ?? city;
}

const IMPACT_UNIT_HI_MAP: Record<string, string> = {
  "µg PM2.5 avoided": "µg PM2.5 से बचाव",
  "% indoor PM2.5 reduction": "% इनडोर PM2.5 में कमी",
  "µg/m³ indoor PM2.5 reduction": "µg/m³ इनडोर PM2.5 में कमी",
  "kg CO₂ saved today": "किग्रा CO₂ की बचत आज",
  reminder: "अनुस्मारक",
};

export function translateImpactUnit(locale: string, unit: string): string {
  if (locale !== "hi") return unit;
  return IMPACT_UNIT_HI_MAP[unit] ?? unit;
}

export function formatLocalizedHour(h: number, locale: string = "en"): string {
  if (locale === "hi") {
    if (h === 0 || h === 24) return "रात 12 बजे";
    if (h < 12) return `सुबह ${h} बजे`;
    if (h === 12) return "दोपहर 12 बजे";
    if (h < 17) return `दोपहर ${h - 12} बजे`;
    if (h < 20) return `शाम ${h - 12} बजे`;
    return `रात ${h - 12} बजे`;
  }
  if (h === 0 || h === 24) return "12 AM";
  if (h === 12) return "12 PM";
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}

export const CHAT_SUGGESTED_PROMPTS: Record<"en" | "hi", string[]> = {
  en: [
    "Is it safe to walk my dog at 7 AM?",
    "What mask should I wear outdoors today?",
    "How is this air quality affecting my child?",
    "When is the best time to ventilate my home?",
    "What's the safest time for my morning run?",
  ],
  hi: [
    "क्या सुबह 7 बजे कुत्ते को टहलाना सुरक्षित है?",
    "आज बाहर जाते समय मुझे कौन सा मास्क पहनना चाहिए?",
    "यह वायु गुणवत्ता मेरे बच्चे को कैसे प्रभावित कर रही है?",
    "घर में वेंटिलेशन (खिड़कियाँ खोलने) का सबसे अच्छा समय कब है?",
    "सुबह दौड़ने के लिए सबसे सुरक्षित समय कौन सा है?",
  ],
};

// Complete Hindi translations for all 18 deterministic candidate actions
export const ACTION_TRANSLATIONS_HI: Record<
  string,
  { title: string; when: string; explanation: string }
> = {
  "time-outdoor-activity": {
    title: "साफ़ हवा वाले समय में बाहर जाएं",
    when: "नीचे दिखाए गए बेहतर घंटे",
    explanation: "आज के पूर्वानुमान के अनुसार कम प्रदूषण वाले घंटों में बाहर निकलने से फेफड़ों पर बोझ कम होता है।",
  },
  "school-run-timing": {
    title: "स्कूल आने-जाने का समय कम AQI पर रखें",
    when: "स्कूल छोड़ने/लाने का समय",
    explanation: "कम AQI वाले समय में स्कूल यात्रा करने से बच्चों द्वारा ली जाने वाली PM2.5 की मात्रा काफी कम हो जाती है।",
  },
  "move-exercise-indoors": {
    title: "आज दौड़ना या व्यायाम घर के अंदर करें",
    when: "नियोजित व्यायाम का समय",
    explanation: "बाहरी व्यायाम में गहरी साँसों के साथ अधिक प्रदूषक अंदर जाते हैं; आज घर के अंदर हल्का व्यायाम सुरक्षित है।",
  },
  "elderly-indoors": {
    title: "पीक प्रदूषण घंटों में बुजुर्गों को अंदर रखें",
    when: "अधिकतम प्रदूषण के घंटे",
    explanation: "बुजुर्ग सदस्यों के लिए आज उच्च प्रदूषण के समय घर के अंदर रहना श्वसन सुरक्षा के लिए सबसे बेहतर है।",
  },
  "wear-n95": {
    title: "बाहर जाते समय N95 मास्क पहनें",
    when: "आज की किसी भी बाहरी यात्रा में",
    explanation: "अच्छी तरह फ़िट होने वाला N95 मास्क बाहर की हवा से 95% तक सूक्ष्म PM2.5 कणों को छान देता है।",
  },
  "wet-mop-floors": {
    title: "धूल बैठने पर फ़र्श पर गीला पोंछा लगाएँ",
    when: "सुबह की दिनचर्या",
    explanation: "झाड़ू लगाने के बजाय गीले पोंछे से पोंछने पर जमी हुई धूल और सूक्ष्म कण वापस हवा में नहीं उड़ते।",
  },
  "close-windows-peak": {
    title: "पीक प्रदूषण के समय खिड़कियाँ बंद रखें",
    when: "सुबह 7–10 और शाम 6–9 बजे",
    explanation: "व्यस्त ट्रैफ़िक और स्मॉग वाले घंटों में खिड़कियाँ बंद रखने से बाहर की खराब हवा घर के अंदर नहीं आती।",
  },
  "run-purifier": {
    title: "पीक घंटों में एयर प्यूरीफायर हाई पर चलाएँ",
    when: "अधिकतम प्रदूषण के घंटे",
    explanation: "पीक प्रदूषण के दौरान HEPA एयर प्यूरीफायर तेज़ गति पर चलाने से कमरे के अंदर PM2.5 का स्तर तेज़ी से गिरता है।",
  },
  "check-purifier-filter": {
    title: "एयर प्यूरीफायर का फ़िल्टर जांचें या बदलें",
    when: "आज",
    explanation: "साफ़ फ़िल्टर आपके एयर प्यूरीफायर को उच्च दक्षता से कण साफ़ करने में मदद करता है।",
  },
  "add-purifier": {
    title: "बेडरूम के लिए एयर प्यूरीफायर लगाने पर विचार करें",
    when: "इस सप्ताह",
    explanation: "HEPA एयर प्यूरीफायर घर के अंदर की हवा से 95% तक सूक्ष्म PM2.5 कण हटाकर परिवार को सुरक्षित रखता है।",
  },
  "cooking-chimney": {
    title: "खाना बनाते समय चिमनी या एग्ज़ॉस्ट चलाएँ",
    when: "खाना पकाने का समय",
    explanation: "खाना पकाने से निकलने वाले धुएँ और सूक्ष्म कणों को तुरंत बाहर निकालने से घर के अंदर की हवा साफ़ रहती है।",
  },
  "cooking-swap-induction": {
    title: "इंडक्शन या इलेक्ट्रिक कुकर का उपयोग करें",
    when: "आज खाना बनाते समय",
    explanation: "स्वच्छ इलेक्ट्रिक कुकिंग से रसोई में धुआँ और हानिकारक PM2.5 उत्सर्जन बहुत कम हो जाता है।",
  },
  "cooking-lid-on": {
    title: "खाना ढककर पकाएँ ताकि अंदर PM2.5 कम रहे",
    when: "खाना पकाने का समय",
    explanation: "बर्तन ढककर पकाने से तेल व भाप के सूक्ष्म कण रसोई की हवा में नहीं फैलते।",
  },
  "commute-swap-metro": {
    title: "आज कार के बजाय मेट्रो या बस से यात्रा करें",
    when: "यात्रा के घंटे",
    explanation: "मेट्रो या सार्वजनिक परिवहन चुनने से व्यक्तिगत उत्सर्जन कम होता है और सड़कों पर प्रदूषण भी घटता है।",
  },
  "commute-wfh": {
    title: "घर से काम करें — आज की यात्रा टालें",
    when: "आज",
    explanation: "वर्क फ्रॉम होम चुनकर आप सड़क के धुएँ के सीधे संपर्क और यात्रा के CO₂ उत्सर्जन दोनों से बच सकते हैं।",
  },
  "inhaler-ready": {
    title: "आज इनहेलर / आवश्यक दवा हमेशा पास रखें",
    when: "घर से निकलने से पहले",
    explanation: "उच्च प्रदूषण वाले दिनों में साँस की समस्या वाले सदस्यों को बचाव दवा हमेशा तैयार रखनी चाहिए।",
  },
  "ventilate-clean-hours": {
    title: "सबसे साफ़ बाहरी घंटों में खिड़कियाँ खोलें",
    when: "सुरक्षित समय (टाइमलाइन देखें)",
    explanation: "जब बाहर का AQI कम हो, तब क्रॉस-वेंटिलेशन करने से घर की अंदरूनी हवा ताज़ा हो जाती है।",
  },
  "heating-swap-electric": {
    title: "खुले में आग जलाने के बजाय इलेक्ट्रिक हीटर चुनें",
    when: "शाम / रात",
    explanation: "लकड़ी या कोयला जलाने से बचकर इलेक्ट्रिक हीटर उपयोग करने से धुएँ और PM2.5 से तुरंत राहत मिलती है।",
  },
};
