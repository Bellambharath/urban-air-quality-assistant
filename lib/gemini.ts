/**
 * lib/gemini.ts
 *
 * Shared Gemini configuration for the API routes.
 * Keeping the candidate-model list in one place avoids drift between
 * /api/plan and /api/chat.
 */

// Ordered by preference: fast, high-quota primary, then a reliable fallback.
export const CANDIDATE_MODELS = [
  "gemini-flash-lite-latest",
  "gemini-2.5-flash",
];
