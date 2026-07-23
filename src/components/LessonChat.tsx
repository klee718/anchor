import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import type { Lesson } from "../curriculum";
import { getIdToken } from "../firebase";

interface DisplayMessage {
  kind: "user" | "assistant" | "error";
  text: string;
}

interface Props {
  lesson: Lesson;
  dryRun: boolean;
  onComplete: (xpReward: number) => void;
  onBack: () => void;
  onPaywall: () => void;
}

export default function LessonChat({ lesson, dryRun, onComplete, onBack, onPaywall }: Props) {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [history, setHistory] = useState<{ role: "user" | "model"; text: string }[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [exchanges, setExchanges] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const didSeedRef = useRef(false);

  const isFreeChat = lesson.id === "free";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (didSeedRef.current) return;
    didSeedRef.current = true;
    if (isFreeChat) {
      setMessages([{ kind: "assistant", text: lesson.openingPrompt }]);
      setHistory([{ role: "model", text: lesson.openingPrompt }]);
    } else {
      initLessonChat();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function initLessonChat() {
    setLoading(true);
    try {
      const token = await getIdToken();
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          init: true,
          title: lesson.title,
          verseRef: lesson.verseRef,
          openingPrompt: lesson.openingPrompt,
          translation: lesson.translation,
        }),
      });
      const data = await res.json();
      if (data.ok && data.text) {
        setMessages([{ kind: "assistant", text: data.text }]);
        setHistory([{ role: "model", text: data.text }]);
      } else {
        setMessages([{ kind: "error", text: data.text || "Failed to initialize this lesson." }]);
      }
    } catch {
      setMessages([{ kind: "error", text: "Couldn't initialize this lesson. Please check your connection." }]);
    } finally {
      setLoading(false);
    }
  }


  async function sendText(message: string, isSeeded = false) {
    if (!message.trim() || loading) return;
    if (!isSeeded) setInput("");

    setMessages((prev) => [...prev, { kind: "user", text: message }]);
    setLoading(true);

    try {
      const token = await getIdToken();
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ history, message, isFreeChat }),
      });
      const data = await res.json();

      if (data.reason === "free_chat_limit") {
        // Pop the paywall instead of rendering this as a normal error bubble.
        onPaywall();
        return;
      }

      const isTechnical = ["gemini_unavailable", "gemini_timeout", "rate_limited"].includes(data.reason ?? "");
      setMessages((prev) => [...prev, { kind: isTechnical ? "error" : "assistant", text: data.text }]);
      if (!isTechnical) {
        setHistory((prev) => [...prev, { role: "user", text: message }, { role: "model", text: data.text }]);
        if (!isSeeded) setExchanges((n) => n + 1);
      }
    } catch {
      setMessages((prev) => [...prev, { kind: "error", text: "Couldn't reach Anchor. Please try again." }]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendText(input);
    }
  }

  const canComplete = exchanges >= 2 && !loading;

  return (
    <div className="flex h-screen flex-col bg-[#EDE8E0] text-[#1C1209]">
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-[#D9D0C4] bg-[#F2EDE5] px-4 py-3">
        <button onClick={onBack} className="text-[#8C7B6B] hover:text-[#1C1209] transition text-xl font-bold px-1" title="Go back to Dashboard">
          ←
        </button>
        <div className="flex-1">
          <p className="font-serif font-semibold text-base text-[#1C1209] leading-tight">{lesson.title}</p>
          <p className="text-xs text-[#8C7B6B] mt-0.5">
            {lesson.verseRef ? `${lesson.verseRef} · ` : ""}
            {lesson.xpReward > 0 ? `${lesson.xpReward} XP` : ""}
          </p>
        </div>
        {dryRun && (
          <span className="rounded-full bg-[#C8A26118] px-2 py-0.5 text-xs font-bold text-[#C8A261]">
            DRY RUN
          </span>
        )}
        {canComplete && !isFreeChat && (
          <button
            onClick={() => onComplete(lesson.xpReward)}
            className="rounded-full bg-[#3A6B4A] px-3 py-1 text-xs font-bold text-white shadow-[0_3px_0_#2A5238] transition active:translate-y-0.5 active:shadow-none cursor-pointer"
          >
            Complete ✓
          </button>
        )}
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto px-4 py-4">
        <div className="mx-auto flex max-w-2xl flex-col gap-3">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.kind === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={
                  "max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed " +
                  (m.kind === "user"
                    ? "bg-[#1C1209] text-white"
                    : m.kind === "error"
                      ? "border border-red-200 bg-red-50 text-red-700"
                      : "border border-[#D9D0C4] bg-white text-[#4A3728]")
                }
              >
                {m.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="rounded-2xl border border-[#D9D0C4] bg-white px-4 py-2.5 text-sm text-[#8C7B6B]">
                Anchor is thinking…
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </main>

      {/* Input */}
      <footer className="border-t border-[#D9D0C4] bg-[#F2EDE5] px-4 py-3">
        <div className="mx-auto flex max-w-2xl items-end gap-2">
          <textarea
            className="min-h-[44px] flex-1 resize-none rounded-xl border border-[#D9D0C4] bg-white px-3 py-2 text-sm text-[#1C1209] placeholder:text-[#8C7B6B] focus:border-[#5B4FCF] focus:outline-none"
            placeholder="Continue the conversation…"
            rows={1}
            value={input}
            disabled={loading}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            className="rounded-xl bg-[#1C1209] px-4 py-2 text-sm font-bold text-white shadow-[0_3px_0_#0a0704] disabled:opacity-40 transition active:translate-y-0.5 active:shadow-none cursor-pointer"
            disabled={loading || !input.trim()}
            onClick={() => sendText(input)}
          >
            Send
          </button>
        </div>
      </footer>
    </div>
  );
}
