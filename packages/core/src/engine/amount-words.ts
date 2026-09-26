/**
 * Indian amount-in-words parsing and figure/words mismatch detection.
 *
 * Responsibility: read "Rupees Twenty Five Lakh only" style amounts and flag places
 * where a document's figure and its words disagree — a classic drafting error that
 * decides what is actually owed. Boundary: English number words only.
 */
import { formatInr } from '../format.js';
import type { Inconsistency } from '../schemas/analysis.js';

const UNITS: Readonly<Record<string, number>> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
};

const HUNDRED = 100;

/** Indian scale words: thousand (10^3), lakh (10^5), crore (10^7). */
const SCALES: Readonly<Record<string, number>> = {
  thousand: 1_000,
  lakh: 100_000,
  lakhs: 100_000,
  lac: 100_000,
  lacs: 100_000,
  crore: 10_000_000,
  crores: 10_000_000,
};

/** Filler words that carry no value in written amounts. */
const FILLER: ReadonlySet<string> = new Set(['rupees', 'rupee', 'rs', 'inr', 'only', 'and', 'of']);

/**
 * Parses an Indian amount written in English words, or returns null if it is not one.
 * @example
 * parseIndianAmountWords('Rupees Twenty Five Lakh Fifty Thousand only'); // 2550000
 */
export function parseIndianAmountWords(text: string): number | null {
  const tokens = text
    .toLowerCase()
    .replace(/[-,./]/g, ' ')
    .split(/\s+/)
    .filter((token) => token !== '' && !FILLER.has(token));
  if (tokens.length === 0) return null;
  let total = 0;
  let current = 0;
  for (const token of tokens) {
    const unit = UNITS[token];
    const scale = SCALES[token];
    if (unit !== undefined) {
      current += unit;
    } else if (token === 'hundred') {
      current = (current === 0 ? 1 : current) * HUNDRED;
    } else if (scale !== undefined) {
      total += (current === 0 ? 1 : current) * scale;
      current = 0;
    } else {
      return null;
    }
  }
  return total + current;
}

/** "Rs. 25,000/- (Rupees Twenty Thousand only)" — a figure followed by its words in brackets. */
const FIGURE_WITH_WORDS =
  /(?:₹|\bRs\.?|\bINR)\s*([\d,]+(?:\.\d{1,2})?)\s*(?:\/-)?\s*\(\s*([A-Za-z][A-Za-z\s,.-]{2,160}?)\s*\)/gi;

/**
 * Finds amounts whose figures and words disagree.
 * @example
 * findAmountMismatches('Rent Rs. 25,000 (Rupees Twenty Thousand only)').length; // 1
 */
export function findAmountMismatches(text: string): Inconsistency[] {
  const found: Inconsistency[] = [];
  for (const match of text.matchAll(FIGURE_WITH_WORDS)) {
    const wordsText = (match[2] ?? '').trim();
    const figure = Number((match[1] ?? '').replace(/,/g, ''));
    const words = parseIndianAmountWords(wordsText);
    if (words === null || !Number.isFinite(figure) || words === figure) continue;
    found.push({
      source: 'rule',
      description: `The amount ${formatInr(figure)} is written in words as "${wordsText}" (${formatInr(words)}). Consider asking which one is intended before signing.`,
      clauseIds: [],
    });
  }
  return found;
}
