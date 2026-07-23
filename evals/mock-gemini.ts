// Scriptable fake Gemini client for dry-run testing (no API key, no network,
// no quota). chat.ts only ever calls `ai.models.generateContent(...)` and
// reads `.text` / `.functionCalls` / `.candidates` off the result, so a plain
// object with those fields set directly is a valid stand-in — no need to
// instantiate the real GenerateContentResponse class.
import type { GoogleGenAI } from "@google/genai";

export interface MockTurn {
  functionCalls?: { name: string; args: Record<string, unknown> }[];
  text?: string;
}

/**
 * Creates a fake GoogleGenAI-shaped client that plays back `turns` in order,
 * one per `generateContent` call, repeating the last turn if called more
 * times than scripted (so an unexpected extra round doesn't crash the test).
 */
export function createMockAI(turns: MockTurn[]): { ai: GoogleGenAI; callCount: () => number } {
  let i = 0;
  const generateContent = async (_args: unknown) => {
    const turn = turns[Math.min(i, turns.length - 1)];
    i++;
    return {
      text: turn.text,
      functionCalls: turn.functionCalls,
      candidates: [
        {
          content: {
            role: "model",
            parts: turn.functionCalls ? turn.functionCalls.map((fc) => ({ functionCall: fc })) : [{ text: turn.text }],
          },
        },
      ],
    };
  };

  const ai = { models: { generateContent } } as unknown as GoogleGenAI;
  return { ai, callCount: () => i };
}

/** A mock that always throws, to exercise T6's error-handling path. */
export function createFailingMockAI(error: Error): { ai: GoogleGenAI } {
  const ai = {
    models: {
      generateContent: async () => {
        throw error;
      },
    },
  } as unknown as GoogleGenAI;
  return { ai };
}
