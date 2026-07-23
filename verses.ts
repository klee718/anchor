import fs from "fs";
import path from "path";

export type Translation = "web" | "kjv";

type BibleData = Record<string, Record<string, Record<string, string>>>;

const DATA_DIR = path.join(process.cwd(), "data");
const BOOKS: Array<[name: string, usfxId: string, osisId: string]> = JSON.parse(
  fs.readFileSync(path.join(DATA_DIR, "books.json"), "utf-8")
);
const BOOK_NAMES = BOOKS.map(([name]) => name);
const LOWER_TO_CANONICAL = new Map(BOOK_NAMES.map((name) => [name.toLowerCase(), name]));

// Common alternate names real users (and the model) actually say. Found via
// the eval suite: a real user asking "What does Psalm 23:1 say?" (singular
// "Psalm" — completely standard usage) failed lookup because the canonical
// name is plural "Psalms". Aliases map the common form to the canonical one.
const BOOK_ALIASES: Record<string, string> = {
  psalm: "Psalms",
  revelations: "Revelation",
  "song of songs": "Song of Solomon",
};
for (const [alias, canonical] of Object.entries(BOOK_ALIASES)) {
  LOWER_TO_CANONICAL.set(alias, canonical);
}

const cache: Partial<Record<Translation, BibleData>> = {};

function loadTranslation(translation: Translation): BibleData {
  if (!cache[translation]) {
    const file = path.join(DATA_DIR, `${translation}.json`);
    cache[translation] = JSON.parse(fs.readFileSync(file, "utf-8"));
  }
  return cache[translation]!;
}

export interface ParsedReference {
  book: string;
  chapter: number;
  verse: number;
}

/**
 * Parses references like "John 3:16", "1 corinthians 13:4", "Song of Solomon 2:1".
 * Returns null if the string doesn't match a known book name or the chapter:verse shape.
 */
export function parseReference(ref: string): ParsedReference | null {
  const match = /^(.+?)\s+(\d+):(\d+)$/.exec(ref.trim());
  if (!match) return null;
  const [, rawBook, chapterStr, verseStr] = match;
  const book = LOWER_TO_CANONICAL.get(rawBook.trim().toLowerCase());
  if (!book) return null;
  return { book, chapter: Number(chapterStr), verse: Number(verseStr) };
}

export type VerseLookupResult =
  | { found: true; translation: Translation; book: string; chapter: number; verse: number; text: string }
  | { found: false; reason: "unknown_book" | "not_found" };

/**
 * Looks up a single verse from the local bundled data. Never calls a network
 * API — this is the guardrail (a) contract from the design doc: a miss here
 * must surface as "can't verify," never fall back to model memory.
 */
export function lookupVerse(translation: Translation, book: string, chapter: number, verse: number): VerseLookupResult {
  const canonical = LOWER_TO_CANONICAL.get(book.trim().toLowerCase());
  if (!canonical) return { found: false, reason: "unknown_book" };

  const bible = loadTranslation(translation);
  const text = bible[canonical]?.[String(chapter)]?.[String(verse)];
  if (!text) return { found: false, reason: "not_found" };

  return { found: true, translation, book: canonical, chapter, verse, text };
}

/**
 * Convenience wrapper: parses a "Book C:V" string and looks it up in one call.
 */
export function lookupReference(translation: Translation, ref: string): VerseLookupResult {
  const parsed = parseReference(ref);
  if (!parsed) return { found: false, reason: "unknown_book" };
  return lookupVerse(translation, parsed.book, parsed.chapter, parsed.verse);
}
