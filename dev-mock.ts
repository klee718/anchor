// Interactive dry-run AI client for manual UI testing (npm run dev:dry-run).
// Unlike evals/mock-gemini.ts (which plays back a fixed script for automated
// tests), this responds to whatever the user actually types in the browser —
// real verse lookups still work (reusing the real local data, zero API cost),
// everything else gets an obviously-fake placeholder reply. No Gemini calls,
// no API key required, no quota used.
import type { GoogleGenAI } from "@google/genai";
import { parseReference, type ParsedReference } from "./verses.js";

// parseReference expects the whole string to be exactly "Book C:V". Free-form
// user text ("what does john 3:16 say") needs the book name extracted first —
// try the 3, then 2, then 1 word(s) immediately before "C:V" until one parses,
// which handles multi-word books ("Song of Solomon", "1 Corinthians") too.
function extractReference(text: string): ParsedReference | null {
  const match = /([A-Za-z][A-Za-z\s]*?)\s+(\d{1,3}):(\d{1,3})\b/.exec(text);
  if (!match) return null;
  const words = match[1].trim().split(/\s+/);
  for (let take = Math.min(3, words.length); take >= 1; take--) {
    const candidateBook = words.slice(words.length - take).join(" ");
    const parsed = parseReference(`${candidateBook} ${match[2]}:${match[3]}`);
    if (parsed) return parsed;
  }
  return null;
}

interface GenaiContent {
  role?: string;
  parts?: Array<{ text?: string; functionResponse?: { response?: Record<string, unknown> } }>;
}

export function createDryRunAI(): GoogleGenAI {
  const generateContent = async (args: { contents?: GenaiContent[] }) => {
    const contents = args.contents ?? [];
    const lastContent = contents[contents.length - 1];
    const functionResponsePart = lastContent?.parts?.find((p) => p.functionResponse);

    // Second round: we already "called" lookup_verse last turn — this is us
    // reading back its result and giving a final answer.
    if (functionResponsePart) {
      const result = functionResponsePart.functionResponse!.response as
        | { found: true; book: string; chapter: number; verse: number; text: string }
        | { found: false; reason: string };
      const text = result.found
        ? `[DRY RUN] ${result.book} ${result.chapter}:${result.verse} says: "${result.text}" (Placeholder wrapper — no real Gemini call was made. Real UI, real local verse data, fake conversation.)`
        : "[DRY RUN] I can't verify that citation right now. (No real Gemini call was made.)";
      return {
        text,
        functionCalls: undefined,
        candidates: [{ content: { role: "model", parts: [{ text }] } }],
      };
    }

    // First round: look at the latest user message for a verse reference.
    const lastUser = [...contents].reverse().find((c) => c.role === "user");
    const userText = lastUser?.parts?.map((p) => p.text).filter(Boolean).join(" ") ?? "";
    const ref = extractReference(userText);

    if (ref) {
      const call = { name: "lookup_verse", args: { translation: "web", book: ref.book, chapter: ref.chapter, verse: ref.verse } };
      return {
        text: undefined,
        functionCalls: [call],
        candidates: [{ content: { role: "model", parts: [{ functionCall: call }] } }],
      };
    }

    const text = `[DRY RUN] This is a placeholder response — no real Gemini call was made. You said: "${userText}"`;
    return {
      text,
      functionCalls: undefined,
      candidates: [{ content: { role: "model", parts: [{ text }] } }],
    };
  };

  return { models: { generateContent } } as unknown as GoogleGenAI;
}
