/**
 * app/api/chat/route.ts
 *
 * POST /api/chat
 * Body: { messages: ChatMessage[], profile: Profile, aqiSnapshot: AQISnapshot }
 *
 * Returns: Server-Sent Events (text/event-stream) — Gemini streaming response
 * Guardrails: profile + live AQI injected; model forbidden from inventing numbers
 */

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { buildChatSystemPrompt } from "@/lib/prompts";
import type { Profile, AQISnapshot, ChatMessage } from "@/lib/types";

export const runtime = "nodejs";

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

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: buildChatSystemPrompt(profile, aqiSnapshot),
    generationConfig: {
      temperature: 0.5,
      maxOutputTokens: 1024,
    },
  });

  // Build Gemini chat history from messages (exclude the last user message — sent as new turn)
  const history = messages.slice(0, -1).map((msg) => ({
    role: msg.role === "assistant" ? "model" : "user",
    parts: [{ text: msg.content }],
  }));

  const lastMessage = messages[messages.length - 1];
  if (!lastMessage || lastMessage.role !== "user") {
    return NextResponse.json(
      { error: "Last message must be from user", code: "invalid_params" },
      { status: 400 }
    );
  }

  // Stream response
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const chat = model.startChat({ history });
        const result = await chat.sendMessageStream(lastMessage.content);

        for await (const chunk of result.stream) {
          const text = chunk.text();
          if (text) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (err) {
        console.error("[/api/chat] Stream error:", err);
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: "Stream failed" })}\n\n`)
        );
      } finally {
        controller.close();
      }
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
