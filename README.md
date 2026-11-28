# AirWise — Urban Air Quality Assistant

AirWise turns a live, CPCB-scale air-quality reading into **personal, actionable, and verifiable** advice for your city and household. Most air-quality apps show you a number and a colour and leave you to guess the rest. AirWise takes the same live data and answers the questions that actually matter: *Is it safe to send the kids out? Should I open the windows? Does running the purifier actually help enough to matter?*

The core design principle: **the LLM is a writer, never a calculator.** Every number on screen comes from a deterministic, unit-tested engine, and code overwrites any figure the model produces. *"LLM explains, code computes."*

> Built with [Google Antigravity](https://antigravity.google) for **PromptWars Challenge 06 — Urban Air Quality Assistant**.

**Live app:** https://airwise-web-production.up.railway.app

---

## Features

- **Live CPCB-scale AQI dashboard** — WAQI readings converted to the Indian CPCB AQI scale via the official PM2.5 breakpoints, with a "safe outdoor window" strip that highlights the cleanest hours (and honestly says *"no clean window today"* when the whole day is Very Poor).
- **Personalized daily plan** — every recommended action carries a real, engine-computed impact number (µg of PM2.5 avoided, cigarette-equivalents, kg of CO₂).
- **What-If Simulator** — toggle an air purifier, change the commute mode, or shift the outdoor hour, and watch the daily inhaled dose update instantly.
- **Personal exposure meter** — compares a typical routine against the AirWise-optimized one.
- **Grounded chat assistant** — Gemini answers questions from the user's profile and the live data, and is forbidden from inventing numbers.
- **Full English + Hindi localization** — band names, advice, and the AI-written plan are all localized.

---

## Architecture: why the LLM is a writer, never a calculator

### 1. A swappable data layer
All pollution data enters through a single route, `app/api/aqi/route.ts`. It fetches live readings (WAQI), converts them to the CPCB AQI scale, caches for 15 minutes, and returns an honest `503` when the source is down rather than a stale number dressed up as live. Because every screen reads from this one route, the data provider is swappable in one file without touching the UI.

**Data-honesty rule:** live is labelled live, cached is labelled "(cached)", and the app never shows a stale reading as if it were current.

### 2. A prompt *pipeline*, not a mega-prompt
The daily plan is generated through a five-stage pipeline:

```
context assembly  →  candidate selection  →  impact scoring  →  Gemini (select + explain)  →  code overwrites the numbers
```

- **Context assembly & candidate selection** happen in code (`lib/personalization.ts`): a catalogue of possible actions is filtered and ranked by relevance to the household.
- **Impact scoring** is pure math (`lib/impact-engine.ts`).
- **Gemini** chooses the best few candidates and writes the human explanation, in English or Hindi.
- **Code then overwrites every number** in the model's output from the deterministic engine, matched by action ID. Even if the model invents a figure, it never survives.

### 3. The deterministic Impact Engine
`lib/impact-engine.ts` is a file of pure, unit-tested functions. Every physical assumption lives in `lib/constants.ts` with a source comment — ventilation rates (ICRP), the Berkeley Earth cigarette-equivalence (≈22 µg/m³ over 24 h ≈ 1 cigarette), India-specific CO₂ factors, and a box model for purifier effectiveness (CADR ÷ room volume vs natural air changes). A "how we calculate this" link in the UI shows the working.

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router) + React 19 |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS 4 + shadcn/ui |
| Animation | Framer Motion |
| GenAI | Google Gemini (`gemini-flash-lite-latest`, falling back to `gemini-2.5-flash`) |
| Data source | WAQI (World Air Quality Index) |
| Testing | Vitest |

---

## Getting started

### Prerequisites
- Node.js 20+
- A [WAQI API token](https://aqicn.org/data-platform/token/) and a [Google Gemini API key](https://aistudio.google.com/app/apikey)

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment variables
cp .env.example .env.local
# then fill in WAQI_TOKEN and GEMINI_API_KEY

# 3. Run the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment variables
See [`.env.example`](.env.example) for the full list. The essentials:

| Variable | Purpose |
|---|---|
| `WAQI_TOKEN` | Live air-quality readings |
| `GEMINI_API_KEY` | Plan generation, chat, and Hindi localization |

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Run ESLint |
| `npm test` | Run the Vitest suite |
| `npm run test:coverage` | Run tests with coverage |

---

## Testing

The deterministic core is covered by unit tests — the numbers the product promises are the numbers the tests assert.

```bash
npm test
```

Covered: CPCB band classification and rounding, WAQI → CPCB conversion and fallback, the impact-engine dose/exposure math, and the plan pipeline's number-overwrite guarantee.

---

## Project structure

```
app/
  api/
    aqi/        # Swappable data layer: WAQI → CPCB, cached, honest 503s
    plan/       # Daily-plan pipeline (Gemini selects + explains, code scores)
    chat/       # Grounded chat assistant (streaming)
    simulate/   # Pure-computation What-If endpoint (no LLM call)
  dashboard/    # Main dashboard (gauge, safe window, plan, exposure)
  simulate/     # What-If Simulator UI
  chat/         # Chat UI
  map/          # City comparison grid
  onboarding/   # 3-step profile setup
components/      # UI components (aqi, plan, exposure, forecast, ui)
hooks/          # useProfile, useAQI
lib/
  impact-engine.ts   # Deterministic, unit-tested impact math
  personalization.ts # Candidate selection + scoring (no LLM)
  prompts.ts         # Gemini prompt templates
  cpcb-bands.ts      # CPCB AQI band definitions
  constants.ts       # Physical assumptions, each with a source comment
  waqi-client.ts     # WAQI fetch + CPCB conversion
  i18n.ts            # English + Hindi strings
__tests__/      # Vitest unit tests
```

---

## License

Built for PromptWars Challenge 06. All rights reserved by the author.
