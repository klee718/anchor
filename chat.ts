import { GoogleGenAI, FunctionDeclaration, Content, Part } from "@google/genai";
import { lookupVerse, lookupReference, type Translation } from "./verses.js";

// ---------------------------------------------------------------------------
// System prompt (T3): the doubt-honoring conversational stance.
// ---------------------------------------------------------------------------

export const SYSTEM_PROMPT = `You are Anchor, a companion for honest conversation about scripture and faith. You are built especially for people who are skeptical, lapsed, or drifting from faith — not for people who already want devotional comfort.

Your core stance: treat doubt as legitimate, not as a problem to be resolved. Where scholars or translators genuinely disagree, say so. When you make a claim, be willing to name the strongest counter-argument to your own point. Do not perform resolved confidence you don't have. Never end a turn with a scripted "have faith" close — end most turns by asking the user a genuine question back, one that invites them to keep talking rather than wrapping things up.

Grounding rule (never break this): you must never quote or cite Bible verse text from memory. Before stating what any verse says, call the lookup_verse tool. When you call the lookup_verse tool, you must quote the returned verse text verbatim in your response. If the tool reports the verse was not found (wrong reference, unavailable translation, or any other lookup failure), say plainly that you can't verify that citation right now — do not proceed to state text anyway, and do not guess.

Crisis rule (never break this): if anything in the conversation suggests the user may be in real emotional distress — self-harm, suicidal thoughts, abuse, or a genuine crisis, not just intellectual doubt or frustration — stop the normal theological conversation. Gently and clearly point them to real human help: in the US, the 988 Suicide & Crisis Lifeline (call or text 988), or the Crisis Text Line (text HOME to 741741). Do not diagnose, do not minimize what they said, and do not try to be a substitute for a real person. This applies even if the message also contains a scripture question — safety comes first.

You are not a licensed counselor, pastor, or medical professional. If asked for pastoral, medical, or legal advice, say so honestly rather than pretending to that authority.`;

// ---------------------------------------------------------------------------
// Crisis guardrail (c), layer 1: deterministic keyword pre-check.
//
// This runs before the LLM is ever called. Research on chatbot safety shows
// even good crisis classifiers miss real signal ~20% of the time — this
// keyword list is a narrow, high-signal backstop, not a full classifier
// (a dedicated classifier is explicitly out of scope per the design doc).
// Layer 2 is the system prompt instruction above, which the eval suite (T4)
// tests against more subtly-worded cases this list will miss.
// ---------------------------------------------------------------------------

const CRISIS_PATTERNS: RegExp[] = [
  /\bkill (myself|me)\b/i,
  /\bwant(ing)? to die\b/i,
  /\bend(ing)? my (own )?life\b/i,
  /\bsuicid(e|al)\b/i,
  /\bhurt(ing)? myself\b/i,
  /\bself[\s-]?harm\b/i,
  /\bno reason to live\b/i,
  /\bcan'?t go on\b/i,
];

export function isCrisisAdjacent(message: string): boolean {
  return CRISIS_PATTERNS.some((pattern) => pattern.test(message));
}

export const CRISIS_RESPONSE =
  "I want to pause on the scripture conversation for a second, because what you just said matters more than that. " +
  "If you're in crisis or thinking about harming yourself, please reach out to a real person right now: in the US, call or text 988 " +
  "(the Suicide & Crisis Lifeline), or text HOME to 741741 (Crisis Text Line). I'm not a substitute for that — you deserve a real person who can actually help. " +
  "I'm still here if you want to keep talking, about this or anything else.";

// ---------------------------------------------------------------------------
// Verse tool (T3 + reuses T2's lookup).
// ---------------------------------------------------------------------------

const LOOKUP_VERSE_TOOL_NAME = "lookup_verse";

const lookupVerseDeclaration: FunctionDeclaration = {
  name: LOOKUP_VERSE_TOOL_NAME,
  description:
    "Look up the exact text of a single Bible verse from the locally bundled WEB or KJV translation. " +
    "Always call this before quoting or citing any scripture — never quote from memory.",
  parametersJsonSchema: {
    type: "object",
    properties: {
      translation: {
        type: "string",
        enum: ["web", "kjv"],
        description: "Which translation to use. Default to web unless the user asks for KJV specifically.",
      },
      book: {
        type: "string",
        description: 'Full English book name, e.g. "John", "1 Corinthians", "Song of Solomon".',
      },
      chapter: { type: "integer" },
      verse: { type: "integer" },
    },
    required: ["translation", "book", "chapter", "verse"],
  },
};

// ---------------------------------------------------------------------------
// Chat turn (T3 loop + T6 error handling).
// ---------------------------------------------------------------------------

export interface ChatMessage {
  role: "user" | "model";
  text: string;
}

export interface ChatTurnResult {
  ok: true;
  text: string;
}

export interface ChatTurnError {
  ok: false;
  reason: "crisis_shortcircuit" | "gemini_unavailable" | "gemini_timeout";
  text: string;
}

const MAX_TOOL_ROUNDS = 3;
const GEMINI_TIMEOUT_MS = 20_000;

function toHistoryContents(history: ChatMessage[], newMessage: string): Content[] {
  const contents: Content[] = history.map((m) => ({ role: m.role, parts: [{ text: m.text }] }));
  contents.push({ role: "user", parts: [{ text: newMessage }] });
  return contents;
}

function normalizeForCompare(text: string): string {
  return text
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

async function generateContentWithRetry(
  ai: GoogleGenAI,
  options: Parameters<typeof ai.models.generateContent>[0],
  maxRetries = 3,
  delayMs = 1500
): ReturnType<typeof ai.models.generateContent> {
  let lastError: any = null;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await ai.models.generateContent(options);
    } catch (err: any) {
      lastError = err;
      const status = err?.status || err?.statusCode || (err?.message?.includes("503") ? 503 : null);
      const isTransient =
        status === 503 ||
        status === 429 ||
        err?.message?.includes("UNAVAILABLE") ||
        err?.message?.includes("high demand");

      if (isTransient && attempt < maxRetries) {
        console.warn(`Gemini API call failed (attempt ${attempt}/${maxRetries}). Retrying in ${delayMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

export async function runChatTurn(
  ai: GoogleGenAI,
  history: ChatMessage[],
  message: string
): Promise<ChatTurnResult | ChatTurnError> {
  // Guardrail (c), layer 1 — deterministic, runs before any LLM call.
  if (isCrisisAdjacent(message)) {
    return { ok: false, reason: "crisis_shortcircuit", text: CRISIS_RESPONSE };
  }

  const contents = toHistoryContents(history, message);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

  try {
    let lastVerseLookup: { found: boolean; text?: string } | null = null;

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const response = await generateContentWithRetry(ai, {
        model: "gemini-flash-latest",
        contents,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          tools: [{ functionDeclarations: [lookupVerseDeclaration] }],
          abortSignal: controller.signal,
        },
      });

      const calls = response.functionCalls;
      if (!calls || calls.length === 0) {
        clearTimeout(timeout);
        const finalText = response.text ?? "";

        // Guardrail (b): if a verse was successfully looked up this turn,
        // the final answer must contain that exact text verbatim. If it
        // doesn't, don't trust the model's phrasing — a wrong citation to a
        // skeptic is a credibility-killer.
        if (lastVerseLookup?.found && lastVerseLookup.text) {
          const normalizedVerse = normalizeForCompare(lastVerseLookup.text);
          const normalizedAnswer = normalizeForCompare(finalText);
          if (!normalizedAnswer.includes(normalizedVerse)) {
            return {
              ok: false,
              reason: "gemini_unavailable",
              text:
                "I looked up that verse but I'm not confident I quoted it back to you accurately, so I don't want to risk misquoting it. Could you ask me again?",
            };
          }
        }

        return { ok: true, text: finalText };
      }

      // Execute the tool call(s) — in practice always lookup_verse, since
      // it's the only declared tool.
      const modelContent: Content = response.candidates?.[0]?.content ?? {
        role: "model",
        parts: calls.map((c) => ({ functionCall: c })),
      };
      contents.push(modelContent);

      const responseParts: Part[] = calls.map((call) => {
        const args = (call.args ?? {}) as { translation?: string; book?: string; chapter?: number; verse?: number };
        const translation: Translation = args.translation === "kjv" ? "kjv" : "web";
        const result = lookupVerse(translation, args.book ?? "", Number(args.chapter), Number(args.verse));
        lastVerseLookup = result.found ? { found: true, text: result.text } : { found: false };
        return {
          functionResponse: {
            name: call.name ?? LOOKUP_VERSE_TOOL_NAME,
            response: result as unknown as Record<string, unknown>,
          },
        };
      });
      contents.push({ role: "user", parts: responseParts });
    }

    clearTimeout(timeout);
    return {
      ok: false,
      reason: "gemini_unavailable",
      text: "I got stuck trying to look up that verse. Could you try rephrasing your question?",
    };
  } catch (error: any) {
    clearTimeout(timeout);
    if (error?.name === "AbortError") {
      return {
        ok: false,
        reason: "gemini_timeout",
        text: "That's taking longer than it should — Anchor might be having connection trouble. Please try again in a moment.",
      };
    }
    console.error("Gemini call failed:", error);
    return {
      ok: false,
      reason: "gemini_unavailable",
      text: "Anchor is having trouble responding right now. Please try again in a moment.",
    };
  }
}

// ---------------------------------------------------------------------------
// Rate limiting (T5): per-IP sliding window. The server holds the Gemini key
// server-side, so an uncapped route risks real cost if the link is ever
// shared beyond the one intended tester.
// ---------------------------------------------------------------------------

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX_MESSAGES = 60;

const requestLog = new Map<string, number[]>();

export function isRateLimited(key: string): boolean {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const timestamps = (requestLog.get(key) ?? []).filter((t) => t > windowStart);

  if (timestamps.length >= RATE_LIMIT_MAX_MESSAGES) {
    requestLog.set(key, timestamps);
    return true;
  }

  timestamps.push(now);
  requestLog.set(key, timestamps);
  return false;
}

export const RATE_LIMIT_MESSAGE =
  "You've sent a lot of messages in the last hour — let's slow down a bit. Try again in a little while.";

// ---------------------------------------------------------------------------
// Lesson Opening Question Generator: generates the initial question from the
// assistant. Avoids the standard verbatim check because it is an initial turn.
// ---------------------------------------------------------------------------

export async function generateLessonOpeningQuestion(
  ai: GoogleGenAI,
  title: string,
  verseRef: string,
  translation: Translation,
  openingPrompt: string
): Promise<string> {
  const lookup = verseRef ? lookupReference(translation, verseRef) : null;
  let verseSnippet = "";
  if (lookup?.found) {
    verseSnippet = `"${lookup.text}" (${verseRef}, ${translation.toUpperCase()})\n\n`;
  }

  const verseSnippetLine = verseSnippet ? `The exact text of the verse is: ${verseSnippet}` : "";

  const prompt = `You are Anchor, a companion for honest conversation about scripture and faith.
The user is starting the lesson: "${title}".
The verse is: ${verseRef || "None"}.
${verseSnippetLine}
The core theme or question of this lesson is: "${openingPrompt}"

Your task is to introduce this lesson. 
- If there is a verse, quote the verse text verbatim.
- Introduce the topic or tension described in the core theme/question.
- End by asking the user a thoughtful, open-ended question to get their perspective.
- Follow your core identity: treat doubt as legitimate, do not offer devotional comfort or platitudes, and invite honest dialogue.
- Do not output any greeting, preamble, or metadata. Start immediately with the quote (if any), followed by your introduction and question.
- The verse text needed for this response has already been looked up and given to you above. Do not call any tools for this turn — just use the text provided.

Example format:
"Reach here your finger, and see my hands at home..." (John 20:27, WEB)

Thomas is often called "Doubting Thomas" as a label of shame, but Jesus actually met his request for physical evidence. Do you see this passage as encouraging honest inquiry, or is it ultimately a warning against doubting? How do you react to Thomas's story?`;

  const response = await generateContentWithRetry(ai, {
    model: "gemini-flash-latest",
    contents: prompt,
    config: {
      systemInstruction: SYSTEM_PROMPT,
    },
  });

  return response.text ?? "";
}

