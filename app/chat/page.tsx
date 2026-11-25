"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProfile } from "@/hooks/useProfile";
import { useAQI } from "@/hooks/useAQI";
import { useLocale, useT } from "@/lib/LocaleContext";
import { getLocalizedBand } from "@/lib/cpcb-bands";
import { CHAT_SUGGESTED_PROMPTS, translateCity } from "@/lib/i18n";
import type { ChatMessage } from "@/lib/types";

export default function ChatPage() {
  const router = useRouter();
  const { locale } = useLocale();
  const t = useT();
  const { profile } = useProfile();
  const { snapshot } = useAQI(profile?.lat ?? null, profile?.lng ?? null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const suggestedPrompts =
    locale === "hi" ? CHAT_SUGGESTED_PROMPTS.hi : CHAT_SUGGESTED_PROMPTS.en;

  const sendMessage = async (content: string) => {
    if (!content.trim() || !profile || !snapshot || isStreaming) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content,
      timestamp: new Date().toISOString(),
    };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setIsStreaming(true);

    // Placeholder assistant message
    const assistantId = `a-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: "assistant", content: "", timestamp: new Date().toISOString() },
    ]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "text/event-stream, application/json",
        },
        body: JSON.stringify({
          messages: updatedMessages,
          profile: { ...profile, locale },
          aqiSnapshot: snapshot,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${res.status}`);
      }

      const contentType = res.headers.get("content-type") || "";

      if (contentType.includes("application/json")) {
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        if (!data.text) throw new Error("No response text");
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: data.text } : m
          )
        );
        return;
      }

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      let hasError = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          const trimmed = line.trim();
          if (trimmed.startsWith("data: ")) {
            const data = trimmed.slice(6).trim();
            if (data === "[DONE]") break;
            try {
              const parsed = JSON.parse(data);
              if (parsed.error) {
                hasError = true;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, content: t("chatError") }
                      : m
                  )
                );
                break;
              }
              if (parsed.text) {
                accumulated += parsed.text;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId ? { ...m, content: accumulated } : m
                  )
                );
              }
            } catch {}
          }
        }
        if (hasError) break;
      }

      if (!hasError && !accumulated.trim()) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: t("chatError") }
              : m
          )
        );
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: t("chatError") }
            : m
        )
      );
    } finally {
      setIsStreaming(false);
    }
  };

  const localizedBand = snapshot ? getLocalizedBand(snapshot.aqi, locale) : null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-md px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="font-semibold text-sm">{t("chatTitle")}</h1>
          {snapshot && localizedBand && profile && (
            <p className="text-xs text-muted-foreground">
              AQI {snapshot.aqi} · {localizedBand.localizedName} · {translateCity(locale, profile.city)}
            </p>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-36">
        {messages.length === 0 && (
          <div className="text-center py-10 space-y-4">
            <p className="text-muted-foreground text-sm">{t("chatEmptyHint")}</p>
            <div className="flex flex-col gap-2 items-center">
              {suggestedPrompts.map((p) => (
                <button
                  key={p}
                  onClick={() => sendMessage(p)}
                  className="text-xs text-left border border-border rounded-full px-4 py-2 hover:bg-muted/50 transition-colors max-w-xs"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-muted text-foreground rounded-bl-sm"
                }`}
              >
                {msg.content ? (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                ) : isStreaming && msg.role === "assistant" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <p>{t("chatError")}</p>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* Disclaimer */}
      <div className="px-4 py-1 text-center">
        <p className="text-[10px] text-muted-foreground">
          {t("chatDisclaimer")}
        </p>
      </div>

      {/* Input */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-background p-4">
        <div className="max-w-lg mx-auto flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage(input);
              }
            }}
            placeholder={t("chatPlaceholder")}
            className="flex-1 bg-muted/50 border border-border rounded-full px-4 py-2 text-sm outline-none focus:border-muted-foreground/50"
            disabled={isStreaming}
          />
          <Button
            size="icon"
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isStreaming || !profile || !snapshot}
            className="rounded-full"
          >
            {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
