/**
 * app/api/chat/route.ts
 *
 * POST /api/chat
 * Body: { messages: ChatMessage[], profile: Profile, aqiSnapshot: AQISnapshot }
 *
 * Reliable non-streaming generateContent (same approach as /api/plan).
 * Primary: gemini-flash-lite-latest (fast, high quota)
 * Fallback: gemini-2.5-flash
 * Returns: SSE text/event-stream or application/json.
 * Guardrails: profile + live AQI injected; model forbidden from inventing numbers.
 */

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { buildChatSystemPrompt } from "@/lib/prompts";
import type { Profile, AQISnapshot, ChatMessage } from "@/lib/types";

export const runtime = "nodejs";

const CANDIDATE_MODELS = [
  "gemini-flash-lite-latest",
  "gemini-2.5-flash",
];

export async function POST(request: NextRequest) {
  let profile: Profile;
  let aqiSnapshot: AQISnapshot;
  let messages: ChatMessage[];

  try {
    const body = await request.json();
    profile = body.profile;
    aqiSnapshot = body.aqiSnapshot;
    messages = body.messages ?? [];
    if (!profile || !aqiSnapshot) throw new Error("Missing required fields");
  } catch {
    return NextResponse.json(
      { error: "Invalid request body", code: "invalid_params" },
      { status: 400 }
    );
  }

  const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Chat is not configured", code: "config_error" },
      { status: 503 }
    );
  }

  const lastMessage = messages[messages.length - 1];
  if (!lastMessage || lastMessage.role !== "user") {
    return NextResponse.json(
      { error: "Last message must be from user", code: "invalid_params" },
      { status: 400 }
    );
  }

  // Build Gemini chat history from messages
  const history = messages.slice(0, -1).map((msg) => ({
    role: msg.role === "assistant" ? "model" : "user",
    parts: [{ text: msg.content }],
  }));

  const contents = [
    ...history,
    { role: "user", parts: [{ text: lastMessage.content }] },
  ];

  const genAI = new GoogleGenerativeAI(apiKey);
  const systemInstruction = buildChatSystemPrompt(profile, aqiSnapshot);

  // Non-streaming generateContent with fail-fast multi-model fallback and 12s timeout
  let replyText = "";
  let lastError: unknown = null;

  const timeoutPromise = new Promise<string>((_, reject) =>
    setTimeout(() => reject(new Error("Chat request timed out")), 12000)
  );

  const generatePromise = (async (): Promise<string> => {
    for (const modelName of CANDIDATE_MODELS) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          systemInstruction,
          generationConfig: {
            temperature: 0.5,
            maxOutputTokens: 2048,
          },
        });

        const result = await model.generateContent({ contents });
        const text = result.response.text();
        if (text) return text;
      } catch (err: unknown) {
        lastError = err;
        console.warn(`[/api/chat] ${modelName} failed fast:`, err);
        // Fail fast immediately to next model
      }
    }
    return "";
  })();

  try {
    replyText = await Promise.race([generatePromise, timeoutPromise]);
  } catch (err) {
    console.error("[/api/chat] Chat generation failed or timed out:", err);
    return NextResponse.json(
      { error: "Chat generation timed out. Please try again." },
      { status: 504 }
    );
  }

  if (!replyText) {
    console.error("[/api/chat] All Gemini models failed:", lastError);
    return NextResponse.json(
      { error: "Could not generate chat response. Please try again." },
      { status: 500 }
    );
  }

  // If client prefers application/json, return JSON directly
  const acceptHeader = request.headers.get("accept") ?? "";
  if (acceptHeader.includes("application/json") && !acceptHeader.includes("text/event-stream")) {
    return NextResponse.json({ text: replyText });
  }

  // Otherwise stream via Server-Sent Events (SSE)
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: replyText })}\n\n`));
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
