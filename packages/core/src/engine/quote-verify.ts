/**
 * Quote verification — proves a quoted excerpt really appears in the document.
 *
 * Responsibility: locate a model- or rule-supplied quote inside the source text and
 * return character offsets into the ORIGINAL text, tolerating case, whitespace, curly
 * quotes and dash variants, with a word-window fallback for near-verbatim quotes.
 * Boundary: a quote that cannot be located is never presented to readers as a quote.
 */
import type { TextSpan } from '../schemas/analysis.js';

/** A near-verbatim quote must share at least 85% of its words with one source window. */
const FUZZY_MIN_RATIO = 0.85;

/** Below 12 words a fuzzy match is too likely to be a coincidence, so only exact matches count. */
const FUZZY_MIN_WORDS = 12;

const SINGLE_QUOTES = /[‘’‚‛′`´]/g;
const DOUBLE_QUOTES = /[“”„‟″]/g;
const DASHES = /[‐-―−]/g;
const WHITESPACE = /\s/;
const WORD = /[\p{L}\p{N}]+/gu;
/** Models often wrap quotes in quote marks or add a trailing ellipsis; neither is in the source. */
const QUOTE_WRAPPER = /^["'\s]+|(?:["'\s]|\.{3}|…)+$/g;

function normalizeChar(char: string): string {
  return char.toLowerCase().replace(SINGLE_QUOTES, "'").replace(DOUBLE_QUOTES, '"').replace(DASHES, '-');
}

/**
 * Normalises text for matching: lowercase, unified quotes and dashes, collapsed whitespace.
 * @example
 * normalizeForMatch('The  “Tenant”\n—shall'); // 'the "tenant" -shall'
 */
export function normalizeForMatch(text: string): string {
  return text
    .toLowerCase()
    .replace(SINGLE_QUOTES, "'")
    .replace(DOUBLE_QUOTES, '"')
    .replace(DASHES, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

interface IndexedText {
  readonly text: string;
  /** For each normalised character, the original index where it starts and ends. */
  readonly starts: number[];
  readonly ends: number[];
}

function indexNormalized(source: string): IndexedText {
  let text = '';
  const starts: number[] = [];
  const ends: number[] = [];
  let index = 0;
  for (const char of source) {
    const next = index + char.length;
    if (WHITESPACE.test(char)) {
      if (text.length > 0 && !text.endsWith(' ')) {
        text += ' ';
        starts.push(index);
        ends.push(next);
      }
    } else {
      for (const piece of normalizeChar(char)) {
        text += piece;
        starts.push(index);
        ends.push(next);
      }
    }
    index = next;
  }
  return { text, starts, ends };
}

function exactSpan(source: string, needle: string): TextSpan | null {
  const indexed = indexNormalized(source);
  const at = indexed.text.indexOf(needle);
  if (at < 0) return null;
  const start = indexed.starts[at];
  const end = indexed.ends[at + needle.length - 1];
  return start === undefined || end === undefined ? null : { start, end };
}

interface SourceWord {
  readonly word: string;
  readonly start: number;
  readonly end: number;
}

function sourceWords(source: string): SourceWord[] {
  return Array.from(source.matchAll(WORD), (match) => ({
    word: match[0].toLowerCase(),
    start: match.index,
    end: match.index + match[0].length,
  }));
}

function fuzzySpan(source: string, quote: string): TextSpan | null {
  const wanted = Array.from(quote.matchAll(WORD), (match) => match[0].toLowerCase());
  if (wanted.length < FUZZY_MIN_WORDS) return null;
  const words = sourceWords(source);
  const size = wanted.length;
  if (words.length < size) return null;
  const need = new Map<string, number>();
  for (const word of wanted) need.set(word, (need.get(word) ?? 0) + 1);
  const have = new Map<string, number>();
  let overlap = 0;
  const add = (word: string, delta: number): void => {
    const before = have.get(word) ?? 0;
    const cap = need.get(word) ?? 0;
    const after = before + delta;
    overlap += Math.min(after, cap) - Math.min(before, cap);
    have.set(word, after);
  };
  let best: { overlap: number; first: number } = { overlap: -1, first: 0 };
  words.forEach((entry, index) => {
    add(entry.word, 1);
    const dropped = words[index - size];
    if (dropped !== undefined) add(dropped.word, -1);
    if (index >= size - 1 && overlap > best.overlap) best = { overlap, first: index - size + 1 };
  });
  if (best.overlap / size < FUZZY_MIN_RATIO) return null;
  const firstWord = words[best.first];
  const lastWord = words[best.first + size - 1];
  return firstWord === undefined || lastWord === undefined ? null : { start: firstWord.start, end: lastWord.end };
}

/**
 * Normalises a model-supplied quote for matching: drops wrapping quote marks and a trailing
 * ellipsis (neither is in the source), then applies {@link normalizeForMatch}.
 * @example
 * normalizeQuote('“The Tenant shall pay…”'); // 'the tenant shall pay'
 */
export function normalizeQuote(quote: string): string {
  return normalizeForMatch(normalizeForMatch(quote).replace(QUOTE_WRAPPER, ''));
}

/**
 * Finds a quote in the source and returns offsets into the original text, or null.
 * Tries an exact normalised match first, then a word-window match (≥ 85% of words).
 * @example
 * locateQuote('Rent is  ₹10,000.', 'rent is ₹10,000'); // { start: 0, end: 16 }
 */
export function locateQuote(source: string, quote: string): TextSpan | null {
  const needle = normalizeForMatch(quote.replace(QUOTE_WRAPPER, ''));
  if (needle.length === 0) return null;
  return exactSpan(source, needle) ?? fuzzySpan(source, needle);
}
