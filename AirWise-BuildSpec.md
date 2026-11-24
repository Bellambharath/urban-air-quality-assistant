# AirWise — Build Spec & Architecture

**Challenge:** PromptWars Virtual, Challenge 06 — Urban Air Quality Assistant
**Deadline:** Sun 29 Nov 2026, 11:59 PM IST · **Submission attempts:** 3 (ship early, iterate)
**Mandatory:** Built with Google Antigravity · Dual submission (code + narrative blog)

---

## 1. Winning thesis (read this first)

Scoring priority from the live session: **UI/UX + prompt flow > architecture > rubric.**

The rubric phrase everyone will under-deliver on is *"clearly explaining the direct impact of their choices."* Most entries will be a generic pollution chatbot. **AirWise wins by quantifying impact, personally.** Every recommendation is tied to a concrete, computed number for *this specific household*.

Three non-negotiables that create the edge:
1. **Live, real AQI data** for the user's actual location (Google Air Quality API) — never LLM-guessed numbers.
2. **A household profile** that changes every recommendation (kids / elderly / asthma / home type / commute).
3. **A deterministic Impact Engine** so the numbers are trustworthy — the LLM *explains*, it does not *invent*, the math.

Google ecosystem alignment (Gemini + Google Maps Air Quality API) also gives a clean, coherent architecture story for the mandatory blog.

---

## 2. Core demo narrative (what a judge sees in 60 seconds)

1. Open app → 15-second profile setup (location auto-detected, pick household, home, commute).
2. **Today dashboard** loads: big live AQI gauge (India local AQI), plain-language "what this means for *your* 6-year-old + asthmatic parent."
3. **Today's Clean-Air Plan**: a timeline of 4–6 cards — *"Ventilate 2–4 PM (outdoor AQI dips)," "Move your run indoors → avoid ~140 µg/m³ exposure," "Swap the school-drop car trip → save 2.1 kg CO₂/week."* Each card shows a quantified impact badge.
4. **What-if simulator**: toggle "add an air purifier" → see projected indoor PM2.5 drop and exposure reduction.
5. **Chat**: "Is it safe to walk my dog at 7 AM?" → contextual answer using live AQI + profile.

If that story lands cleanly and looks polished, you're Top 50 material.

---

## 3. Feature scope

### The product — full scope (all of this is the plan; no tiered MVP, no plan B)
- Profile onboarding wizard (persisted) — with a **10-city picker** (Delhi, Mumbai, Bengaluru, Hyderabad, Chennai, Kolkata, Pune, Ahmedabad, Lucknow, Jaipur); geolocation auto-selects, the picker is for manual choice
- Live AQI fetch for location + pollutant breakdown (PM2.5/PM10), mapped to CPCB bands, shown with a fetch timestamp + source (§9)
- Today dashboard: AQI gauge + personalized health read + headline action
- **Safe outdoor window** — hour-by-hour 5 AM–11 PM, best hours vs. hours to avoid, so a family can time the walk / school run / commute at a glance
- Clean-Air Plan generator (routines + indoor hacks + sustainable alternatives) with **impact badges**
- Impact Engine (deterministic exposure + CO₂ math)
- Contextual chat assistant

**Concrete India-specific content to seed the catalog** (use verbatim as candidate actions):
- *Cooking swaps:* induction / electric pressure cooker instead of biomass or kerosene; run chimney/exhaust while cooking; cook with the lid on.
- *Heating swaps:* electric heater instead of open burning; seal gaps around doors/windows.
- *Indoor routine (AQI-adaptive):* when to open windows, when to keep closed, when to run the purifier, how to keep indoor air cleaner during peak hours — adaptation must be **visible, not generic**.
- *Family checklist (tickable):* N95 masks ready · windows closed in peak hours · purifier filter checked · wet mopping · school run timed to safe window · elderly/children indoors at peak · inhaler/medicines handy · vehicle use minimised / carpool.

### Top-10 elevation layer (planned — this is what separates Top 10 from Top 400)
Depth on a few things, not breadth. Build these *well* rather than adding more.
- **Forecast-driven planning** — use the Google AQ API hourly **forecast** so the safe-window and plan cover *tomorrow*, not just now. An assistant that plans ahead reads as genuinely intelligent.
- **Personal daily exposure meter** — accumulate a personalized inhaled-PM2.5 dose for the household's routine, and show the headline *"your optimized routine cuts today's dose ~X%."* The impact differentiator at full strength.
- **What-if simulator as the hero interaction** — sliders/toggles (purifier, commute swap, timing) → live-updating projected impact. This is the demo money-shot; make it beautiful.
- **Multi-language** — Hindi + one regional language toggle, translated on the fly by Gemini. Inclusive, India-fit, visible UX-breadth win.
- **Signature UI + map** — animated AQI gauge, Google AQ **heatmap** tile view, polished dark mode, motion throughout. Directly serves the #1-weighted criterion.
- **Proactive morning brief** — a generated "today's air story" for the household; the agentic touch.

### Explicitly out of scope (protect quality — resist these even with time)
- Auth beyond anonymous/local, native mobile, wearable/IoT sensors, real-time multi-user sync, more than ~2 languages. Every one of these trades polish for surface area.

---

## 4. System architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Next.js App (App Router) — Vercel                           │
│                                                               │
│  CLIENT (React)                                               │
│   • Onboarding wizard      • Today dashboard + AQI gauge      │
│   • Plan timeline cards     • What-if simulator   • Chat UI   │
│                                                               │
│  SERVER (Route Handlers / Server Actions)                     │
│   /api/aqi        → Google Air Quality API (cached 15 min)    │
│   /api/plan       → Impact Engine + Gemini (structured JSON)  │
│   /api/chat       → Gemini streaming (profile + AQI injected) │
│   /api/simulate   → Impact Engine (pure compute, no LLM)      │
│                                                               │
│  lib/impact-engine.ts   ← deterministic math (unit-tested)    │
│  lib/prompts.ts         ← prompt templates + JSON schemas     │
└───────────────┬───────────────────────────┬─────────────────┘
                │                           │
      ┌─────────▼─────────┐       ┌─────────▼──────────┐
      │ Google Air Quality│       │  Gemini API        │
      │ API (current +    │       │  (structured output│
      │ pollutants +      │       │   + streaming chat)│
      │ health recs)      │       └────────────────────┘
      └───────────────────┘
                │
      ┌─────────▼─────────┐
      │ Supabase          │  profiles, saved plans, impact log
      │ (Postgres + RLS)  │
      └───────────────────┘
```

**Key principle:** AQI data and impact numbers are produced by code/APIs; Gemini only *selects, sequences, and explains*. This is what makes impact claims credible and keeps the app from hallucinating health advice.

---

## 5. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 15 (App Router)** | Server routes keep API keys server-side; fast; Vercel one-click deploy |
| Styling | **Tailwind + shadcn/ui** | Polished, consistent UI fast — directly serves the #1 scoring criterion |
| Charts | **Recharts** | AQI history + impact bars |
| Motion | **Framer Motion** | Animated AQI gauge = the "wow" on first load |
| LLM | **Gemini API** (structured output + streaming) | Google-ecosystem coherence; JSON mode for reliable plan objects |
| AQI data | **Google Maps Air Quality API** | India local AQI, pollutant breakdown, built-in health recommendations; fallback: WAQI (aqicn.org) |
| Geocoding | Browser Geolocation + reverse geocode | Auto-detect location |
| Persistence | **Supabase** (Postgres) | Profile + plan history; good architecture story. *Simpler fallback: localStorage* |
| Deploy | **Vercel** | Public URL for submission + demo |

---

## 6. The GenAI prompt flow (the #1 scored thing — design it deliberately)

Treat this as a **pipeline**, not one mega-prompt. Make the stages visible in the blog.

```
Stage 1  CONTEXT ASSEMBLY (code, no LLM)
         profile + live AQI + pollutant breakdown + time-of-day → context object

Stage 2  CANDIDATE ACTIONS (code)
         rule layer proposes candidate actions from a fixed catalog
         (ventilation window, exercise timing, commute swap, indoor hacks…)

Stage 3  IMPACT SCORING (code — Impact Engine)
         each candidate gets a computed number (µg exposure avoided / kg CO₂ saved)

Stage 4  GEMINI — SELECT & EXPLAIN (structured output)
         input: context + scored candidates
         output: JSON array of 4–6 ranked recommendations with a plain,
         household-specific explanation string per item
         → model chooses relevance/ordering/wording; it never writes the numbers

Stage 5  GEMINI — CHAT (streaming)
         system prompt carries profile + current AQI; answers follow-ups,
         always grounding on the live context object
```

**Why this scores:** judges can see a real prompt *architecture* (grounding → structured output → guardrails), not a toy chatbot. Keep `lib/prompts.ts` clean and documented — screenshot it for the blog.

### Gemini structured-output schema (plan items)
```json
{
  "recommendations": [{
    "id": "string",
    "category": "routine | indoor | alternative",
    "title": "string",
    "when": "string (e.g. '2–4 PM today')",
    "explanation": "string — why it matters for THIS household",
    "impact_metric": "pm25_exposure_avoided | co2_saved_kg | indoor_pm25_drop",
    "impact_value": "number (SET BY CODE, not the model)",
    "impact_unit": "string",
    "effort": "low | medium | high"
  }]
}
```
Populate `impact_value` from the Impact Engine *after* the model returns, so the number is always deterministic.

---

## 7. The Impact Engine (`lib/impact-engine.ts`) — your differentiator

Pure functions, **unit-tested** (ask Antigravity to write the tests — it gives the agent something concrete to verify against). Every number must be defensible and every assumption shown in the UI (a small "how we calculate this" link). Keep all factors in one `constants.ts` with a source comment per value, so the blog can cite them.

**1. Inhaled PM2.5 dose (µg)** = concentration (µg/m³) × minute-ventilation (m³/min) × duration (min)
- Minute ventilation: rest ≈ 0.0075 m³/min · light activity ≈ 0.012 · moderate exercise ≈ 0.045 (≈6× rest) · sleep ≈ 0.005 (ICRP reference values)
- *Exposure avoided* = dose(outdoor activity) − dose(indoor/filtered alternative). This is the number on routine cards.

**2. Cigarette-equivalence (the family-legible headline)** — translate dose to cigarettes using Berkeley Earth's rule: **~22 µg/m³ of PM2.5 over 24 h ≈ 1 cigarette.**
- `cigarettes = (mean PM2.5 µg/m³ × hours) / (22 × 24)`
- Use it everywhere a raw µg number appears: *"a 7 AM outdoor run today ≈ smoking 1.8 cigarettes; move it indoors → ≈ 0.3."* This is the single most demo-able way to "clearly explain impact" to a family.

**3. Commute CO₂ (kg)** = distance_km × factor (per passenger-km)
- Petrol car ≈ 0.17 · auto-rickshaw ≈ 0.11 · bus ≈ 0.05 · metro ≈ 0.03 · bike/walk/WFH = 0 (India-typical factors; cite in constants)
- *Saved* = CO₂(current) − CO₂(alternative) × trips/week

**4. Indoor hack impact**
- Air purifier: indoor PM2.5 drop from CADR vs. room volume → steady-state fraction ≈ natural_ACH / (natural_ACH + CADR-derived ACH). Model a clear % drop (e.g. 60–80% at adequate CADR) and show it.
- Ventilation timing: compare modelled indoor vs. live outdoor PM2.5 by hour → recommend window-open hours only where outdoor < indoor.

**5. Personal daily exposure meter (elevation)** — sum each household member's modelled dose across their day (sleep/indoor/commute/outdoor blocks) using the hourly AQI curve. Show **baseline routine vs. AirWise-optimized routine**, the % cut, and both in cigarette-equivalents. This is the "your routine cuts today's dose ~38%" headline.

Store each applied action in `impact_log` so the weekly summary totals real, cumulative savings. Always label these as **estimates** based on stated assumptions — never as measured personal exposure.

---

## 7b. Personalization matrix (how the profile actually changes outputs)

This is what makes "tailored to lifestyle" real instead of asserted. Code this as explicit rules that adjust thresholds, re-rank recommendations, and steer Gemini's wording.

| Profile signal | How the app changes |
|---|---|
| Child in household | School-run timing becomes a headline action; stricter outdoor-play threshold; health note uses the API's *children* guidance |
| Elderly / heart / lung condition | Most conservative thresholds; "stay indoors" windows prioritized; condition-specific health recs surfaced; stronger mask advice |
| Asthma / COPD | Inhaler reminder added to checklist; alert on sudden band jumps; lowest exertion threshold |
| No air purifier | "Add a purifier" is a top what-if; ventilation-timing emphasized as the free alternative |
| Has air purifier | Focus on filter-check + run-timing; suppress "buy a purifier" |
| Commute = car / auto | Commute swap is a top recommendation, shown with CO₂ + exposure impact |
| Commute = walk / cycle | Focus on timing, route and mask — not mode-switching |
| Kitchen uses biomass / kerosene | Cooking swap becomes the top sustainable-alternative, with indoor PM2.5 impact |
| Apartment vs. independent house | Ventilation guidance differs (floor level, stack effect, proximity to road) |

## 7c. Trust & safety (a Top-10 differentiator judges look for)

- **Medical disclaimer**, shown in onboarding and as a chat footer: *general guidance, not medical advice — consult a doctor for health conditions.*
- **Conservative bias:** when data is uncertain, stale, or missing, err toward caution (recommend the safer option).
- **Gemini guardrails** (enforced in the system prompt, §6): no diagnosis, no medication dosing, defer medical conditions to professionals; ground every answer in the live context object; never invent AQI numbers or impact figures.
- **Transparency:** always show data source + fetch time; a "how we calculate impact" link exposes the assumptions (§7).
- **Privacy:** anonymous profile, no login, no PII; location used only for the AQI lookup, never stored beyond the session's city/coords.

## 8. Data model (Supabase)

```sql
profiles        (id, created_at, city, lat, lng,
                 household jsonb,   -- {adults, kids, elderly, conditions:[asthma,...]}
                 home jsonb,        -- {type, has_purifier, has_ac, kitchen_chimney}
                 commute jsonb)     -- {mode, distance_km, trips_per_week}

plans           (id, profile_id, created_at, aqi_snapshot jsonb, items jsonb)

impact_log      (id, profile_id, action_id, metric, value, unit, logged_at)
```
Enable RLS; anonymous session id is fine for a hackathon (no login friction = better demo).

---

## 9. External APIs — setup notes

### Canonical AQI bands — use CPCB (official India standard)
Use the Central Pollution Control Board bands everywhere (data, UI colors, blog). Do not change ranges or colors between screens.

| Band | AQI | Meaning in-app | Color |
|---|---|---|---|
| Good | 0–50 | Clean. Normal outdoor activity. | green |
| Satisfactory | 51–100 | Minor discomfort for sensitive people. | light green |
| Moderate | 101–200 | Sensitive groups reduce prolonged exertion. | yellow |
| Poor | 201–300 | Breathing discomfort on exposure. Mask outdoors. | orange |
| Very Poor | 301–400 | Respiratory risk. Avoid outdoor exertion. | red |
| Severe | 401–500 | Affects healthy people. Stay indoors. | maroon |

### Data-honesty rule (non-negotiable — credibility + scoring)
- Always show live data with a **fetch timestamp + source**.
- Never present stale numbers as live. If the API fails, show a clear, honest error/retry state — never old numbers dressed as current.

**Decision: Google Maps Air Quality API is the primary source** (`airquality.googleapis.com`). It's the only single source that gives all three things this product needs — forecast, heatmap, and per-group health recommendations — and it fits the Google/Antigravity ecosystem story.
- `currentConditions:lookup` → universal AQI + **local (India) AQI**, dominant pollutant, `healthRecommendations` (generalPopulation, children, elderly, athletes, lung/heart/pregnant). Surface these per household member — big personalization win for near-zero effort.
- `forecast:lookup` → **hourly forecast** (drives tomorrow's safe-outdoor-window and the planning headline). Core, not optional.
- `history:lookup` → past 24h trend for the chart.
- `heatmapTiles` → the map view (elevation layer §3).
- Needs an API key + billing enabled on a Google Cloud project; restrict the key to the server. Keep all AQ fields behind `/api/aqi`.
- **Swappable alternative (architecture, not a plan B):** the `/api/aqi` boundary lets you drop in WAQI (`api.waqi.info`, free token) or OpenAQ in one file if Google billing is ever a blocker. Not a parallel track — just a clean seam.

**Gemini API** — use JSON/structured mode for `/api/plan`, streaming for `/api/chat`. Keep keys in Vercel env vars, never client-side.

---

## 10. UI/UX spec (highest-weighted — spend real time here)

**Design language:** dark-first, generous whitespace, one accent that shifts with AQI severity (green→yellow→orange→red→maroon per India AQI bands). Big numbers, calm tone (health context, don't fear-monger).

**Screens**
1. **Onboarding** — 3 quick steps, progress dots, location auto-detect with manual override. Delightful, <20s.
2. **Today (home)** — animated AQI gauge (Framer Motion sweep on load) · one-line personalized read · **headline action** card · Clean-Air Plan timeline below.
3. **Plan card** — collapsed shows title + impact badge; expands to the explanation + "why this number."
4. **What-if** — toggles/sliders (purifier, commute swap) → live-updating projected impact.
5. **Chat** — floating, context-aware, suggested prompt chips.
6. **Your week** — stacked impact totals (Recharts) + share button (community).

**Polish checklist (judges notice these):** loading skeletons, empty states, error state when AQI fetch fails, mobile responsive, keyboard focus, no layout shift. These separate Top 400 from Top 50.

---

## 11. Antigravity workflow (intent-driven, with guardrails)

Antigravity is agent-first — you give intent, agents plan/build/verify across editor + terminal + browser and produce Artifacts (task lists, screenshots). Use that, but keep it on rails.

**Setup once (before any build prompt):** install Antigravity (antigravity.google/download), sign in with your personal Gmail (Workspace accounts aren't supported in preview), use the 8 GB+ laptop (it runs agents + a browser at once), create an empty folder `urban-air-quality-assistant`, open it as the workspace, and create a **public** GitHub repo connected to it (submission needs a public repo link).

**Run in discrete missions — never combine, test between each:**
- **Mission A — core product (live):** profile/city-picker + dashboard + animated gauge on CPCB bands + safe-outdoor-window + Impact Engine + Gemini plan pipeline, on **live** AQI via `/api/aqi`.
- **Mission B — elevation:** forecast-driven planning + personal exposure meter + what-if simulator + chat + heatmap + multi-language + morning brief.
- **Mission C — verify & polish:** Antigravity drives its browser end-to-end — every city, every interaction, mobile width, console errors, CPCB colors, live timestamps — fixes what it finds and re-tests. No new features.

Within those missions, keep agents on rails:

1. **Seed this spec** as the planning context. First intent: *"Plan the build for this spec; produce a task list before writing code."* Review its plan Artifact before it builds.
2. **Scaffold:** *"Create the Next.js 15 + Tailwind + shadcn app with the route handlers and folder structure in §4."*
3. **Impact Engine first, with tests:** *"Implement `lib/impact-engine.ts` per §7 and write unit tests for each formula."* Let the agent run the tests and show green — this is both correctness and blog gold.
4. **Data layer behind `/api/aqi`** with the WAQI fallback, so the AQI source is swappable.
5. **Plan pipeline** (§6) with the JSON schema; verify `impact_value` is overwritten by code.
6. **UI screen by screen** (§10) — have the agent screenshot each in its browser tool. Save those screenshots; they go in the blog and the reel.
7. **Guardrail prompts:** "Don't add auth/features beyond the spec," "keep keys server-side," "don't let the model generate impact numbers."

Antigravity's verification screenshots + task Artifacts *are* your narrative evidence — capture them as you go.

---

## 12. Schedule — all-in on the product (today is Tue 24 Nov)

One target: the final submission. Four days building the best product (Tue–Fri); Sat is deep polish + narrative; Sun is recovery-only buffer + final review before the 11:59 PM IST deadline. No parallel plan-B track.

| Day | Focus | Milestone |
|---|---|---|
| **Tue 24** (D1) | Setup + scaffold (Next.js/Tailwind/shadcn) + profile/city-picker + `/api/aqi` (live) + dashboard with animated gauge on CPCB bands | Foundation solid |
| **Wed 25** (D2) | Impact Engine (+ unit tests) + Gemini plan pipeline (structured output) + safe-outdoor-window | Core product working end-to-end |
| **Thu 26** (D3) | Elevation: forecast-driven planning + personal exposure meter + chat | Differentiators live |
| **Fri 27** (D4) | What-if simulator (hero) + heatmap + multi-language + morning brief | Feature-complete — **freeze scope tonight** |
| **Sat 28** (D5) | Deep UI/UX polish (motion, states, mobile, a11y) + blog + Instagram reel + deploy | Top-10 quality |
| **Sun 29** | Final review → submit well before 11:59 PM IST. Recovery only if something broke. | Submitted |

The discipline that wins: freeze the feature set Friday night. After that, **no new features** — only polish and the narrative.

---

## 13. The narrative / blog (half the submission — don't leave it to the last hour)

Structure it around the theme PromptWars is testing: **manual coding → intent-driven development.**
1. The problem (winter smog in Indian cities, why generic advice fails families).
2. The idea: impact-first personalization.
3. **Architecture walkthrough** — the diagram (§4), the grounding→structured→guardrail prompt pipeline (§6), and *why the LLM doesn't do the math* (§7). This is your most impressive section.
4. **Building with Antigravity** — show the plan Artifacts, the agent writing + running the Impact Engine tests, the verification screenshots. Be concrete about what you described vs what the agent produced.
5. Results + screenshots + live URL.
6. What you'd do next.

Write §3–4 as you build (copy decisions in real time) so the blog is 80% done by Thursday.

**Bonus:** Top 5 Instagram reels per challenge = 4,000 credits. A 20–30s screen-capture reel of the gauge animating + a plan card flipping to its impact number is low effort, high return. Shoot it Friday.

---

## 14. Scoring self-check (grade yourself before each submit)

- [ ] Low-emission **routines** — present and personalized? (rubric)
- [ ] Indoor **AQI hacks** — present with impact? (rubric)
- [ ] **Sustainable alternatives** — commute/energy swaps shown? (rubric)
- [ ] Tailored to **location** (live AQI) and **lifestyle** (profile)? (rubric)
- [ ] **Direct impact clearly explained** with real numbers? (the differentiator)
- [ ] UI feels polished, animated, mobile-clean? (#1 weight)
- [ ] Prompt flow is a visible architecture, not a toy chatbot? (#1 weight)
- [ ] Deployed public URL works + blog with architecture section? (submission validity)
- [ ] Built via Antigravity with evidence? (mandatory)

---

## Risks & mitigations
- **"GenAI-powered" under-delivered** → the challenge requires a GenAI *assistant*, not just an app built by AI. Keep Gemini live at runtime (plan generation + chat). Don't ship a static rules-only app.
- **Google AQ API blocker** → keep the data layer behind `/api/aqi` so the AQI provider is swappable in one file (WAQI/OpenAQ) without touching the UI. This is architecture, not a plan B.
- **Gemini puts numbers in text** → always overwrite `impact_value` from the engine; chat prompt forbids inventing figures.
- **Over-building** → freeze scope Friday night; no new features after, only polish.
- **Blog rushed** → write architecture sections live while building.

---

## 15. Submission checklist (run before every attempt)

- [ ] Built in **Google Antigravity** — keep the mission prompts + workspace as your record.
- [ ] **Public** GitHub repo, final code pushed, README names the app + how to run it.
- [ ] Deployed app link opens, no console errors, works at mobile width.
- [ ] Blog published (Medium / Dev.to / Hashnode) with the architecture section + a screenshot; link opens with no login wall.
- [ ] **Data honesty verified** — live labelled live, snapshot labelled snapshot, no stale-as-live.
- [ ] All cities + safe-outdoor-window + indoor routine + cooking/heating swaps + checklist tested.
- [ ] **Open every submission link in an incognito window** — if it needs your login, it's not ready for judges.
- [ ] Final build submitted; earlier attempts used only if you deliberately choose to.
- [ ] Submitted at hack2skill.com/event/pwvirtual1/dashboard/submissions before Sun 29 Nov 2026, 11:59 PM IST.
- [ ] *(Bonus)* 20–30s Instagram reel recorded (Top 5 reels = 4,000 credits).
