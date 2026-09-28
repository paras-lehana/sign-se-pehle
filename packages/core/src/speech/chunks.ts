/**
 * Splits text into speakable chunks no longer than a limit.
 *
 * Responsibility: break at sentence ends first (English and Indic punctuation), then at
 * commas and similar pauses, then between words, and only cut inside a word that is
 * itself longer than the limit. Shared by the server (Google's free voice accepts about
 * 200 characters per request) and the browser (Chrome stops one utterance after roughly
 * 15 seconds). Boundary: pure; whitespace is collapsed to single spaces.
 */

/** Sentence ends: . ! ? and the Devanagari danda (।) and double danda (॥). */
const SENTENCE_BREAK = /(?<=[.!?।॥])\s+/u;

/** Softer pauses inside a long sentence. */
const CLAUSE_BREAK = /(?<=[,;:])\s+/u;

const WORD_BREAK = /\s+/u;

const BREAKS: readonly RegExp[] = [SENTENCE_BREAK, CLAUSE_BREAK, WORD_BREAK];

/** Joins neighbouring pieces while the result still fits. */
function group(pieces: readonly string[], maxChars: number): string[] {
  const chunks: string[] = [];
  let current = '';
  for (const piece of pieces) {
    const joined = current.length === 0 ? piece : `${current} ${piece}`;
    if (joined.length <= maxChars) {
      current = joined;
      continue;
    }
    if (current.length > 0) chunks.push(current);
    current = piece;
  }
  if (current.length > 0) chunks.push(current);
  return chunks;
}

/** Cuts an unbreakable run (a very long number or URL) by code point, never mid surrogate pair. */
function cut(piece: string, maxChars: number): string[] {
  const points = Array.from(piece);
  const parts: string[] = [];
  for (let start = 0; start < points.length; start += maxChars) {
    parts.push(points.slice(start, start + maxChars).join(''));
  }
  return parts;
}

function split(piece: string, maxChars: number, breaks: readonly RegExp[]): string[] {
  if (piece.length <= maxChars) return [piece];
  const [breaker, ...finer] = breaks;
  if (breaker === undefined) return cut(piece, maxChars);
  const parts = piece
    .split(breaker)
    .filter((part) => part.length > 0)
    .flatMap((part) => split(part, maxChars, finer));
  return group(parts, maxChars);
}

/**
 * Splits `text` into chunks of at most `maxChars` characters, in reading order.
 * @example
 * splitIntoSpeechChunks('One. Two, three four.', 10); // ['One.', 'Two, three', 'four.']
 * splitIntoSpeechChunks('One. Two.', 20); // ['One. Two.']
 */
export function splitIntoSpeechChunks(text: string, maxChars: number): string[] {
  const normalised = text.replace(/\s+/gu, ' ').trim();
  if (normalised.length === 0) return [];
  return split(normalised, Math.max(1, Math.floor(maxChars)), BREAKS);
}
