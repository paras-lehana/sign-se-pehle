import { describe, expect, it } from 'vitest';
import { findAmountMismatches, parseIndianAmountWords } from '../engine/amount-words.js';
import { locateQuote, normalizeForMatch } from '../engine/quote-verify.js';
import { rankClauses, tokenize } from '../engine/retrieve.js';
import { clipText, formatDays, formatFactValue, formatInr, formatMonths, formatPercent } from '../format.js';

describe('parseIndianAmountWords', () => {
  it.each([
    ['Rupees Twenty Five Thousand only', 25_000],
    ['One Lakh Fifty Thousand', 150_000],
    ['two lakhs', 200_000],
    ['Rupees One Crore Twenty Lakh only', 12_000_000],
    ['Five Hundred', 500],
    ['one thousand two hundred and fifty', 1_250],
    ['Twenty-Five Lakh', 2_500_000],
    ['ten lacs', 1_000_000],
  ] as const)('parses "%s"', (words, expected) => {
    expect(parseIndianAmountWords(words)).toBe(expected);
  });

  it.each(['', 'Rupees only', 'twenty bananas'])('returns null for "%s"', (words) => {
    expect(parseIndianAmountWords(words)).toBeNull();
  });
});

describe('findAmountMismatches', () => {
  it('flags a figure that disagrees with its words', () => {
    const [issue] = findAmountMismatches('Rent is Rs. 25,000 (Rupees Twenty Thousand only) per month.');
    expect(issue?.source).toBe('rule');
    expect(issue?.description).toContain(formatInr(25_000));
    expect(issue?.description).toContain(formatInr(20_000));
  });

  it('accepts matching figures and words with Indian grouping', () => {
    expect(findAmountMismatches('Deposit of ₹1,50,000/- (Rupees One Lakh Fifty Thousand only).')).toEqual([]);
  });

  it('handles INR and multiple amounts', () => {
    const text = 'INR 5,000 (Rupees Five Thousand) and Rs 10,000 (Rupees One Thousand only)';
    expect(findAmountMismatches(text)).toHaveLength(1);
  });
});

describe('normalizeForMatch and locateQuote', () => {
  const source = 'The  Tenant\nshall pay “rent” — monthly.';

  it('normalises case, whitespace, quotes and dashes', () => {
    expect(normalizeForMatch(source)).toBe('the tenant shall pay "rent" - monthly.');
  });

  it('finds an exact match and returns offsets into the original text', () => {
    const span = locateQuote('Intro. Rent is due monthly.', 'Rent is due');
    expect(span).toEqual({ start: 7, end: 18 });
  });

  it('tolerates whitespace and quote differences', () => {
    const span = locateQuote(source, 'the tenant shall pay "rent" - monthly');
    expect(span?.start).toBe(0);
    expect(source.slice(span?.start, span?.end)).toContain('monthly');
  });

  it('strips wrapping quote marks and ellipses from the quote', () => {
    expect(locateQuote('The deposit is refundable.', '"The deposit is refundable..."')).not.toBeNull();
  });

  it('falls back to a fuzzy word window for near-verbatim quotes', () => {
    const doc = 'Preamble. The Tenant shall keep the premises clean and hand them back in the same good condition at the end of the tenancy period. Other text.';
    const paraphrase = 'The Tenant shall keep the premises clean and hand them back in the same condition at the end of the tenancy period';
    const span = locateQuote(doc, paraphrase);
    expect(span).not.toBeNull();
    expect(doc.slice(span?.start, span?.end).startsWith('The Tenant')).toBe(true);
  });

  it('returns null when the quote is not in the document', () => {
    expect(locateQuote('The rent is ten thousand rupees.', 'The landlord pays all electricity bills')).toBeNull();
  });

  it('returns null for an empty quote', () => {
    expect(locateQuote('Anything', '  ')).toBeNull();
  });
});

describe('retrieve', () => {
  const clauses = [
    { heading: 'Security deposit', quote: 'The tenant pays a deposit of two months.', plainMeaning: 'Deposit rules.' },
    { heading: 'Rent', quote: 'Rent is payable monthly.', plainMeaning: 'Monthly payment.' },
    { heading: 'Repairs', quote: 'The landlord handles repairs.', plainMeaning: 'Who repairs.' },
  ];

  it('tokenize drops stopwords and short tokens', () => {
    expect(tokenize('What is the Deposit?')).toEqual(['deposit']);
  });

  it('ranks the most relevant clause first', () => {
    expect(rankClauses(clauses, 'When do I get my deposit back?', 2)[0]?.clause.heading).toBe('Security deposit');
  });

  it('respects the limit', () => {
    expect(rankClauses(clauses, 'rent', 1)).toHaveLength(1);
  });

  it('scores zero when nothing matches', () => {
    expect(rankClauses(clauses, 'pets allowed?', 3).every((entry) => entry.score === 0)).toBe(true);
  });

  it('returns nothing for no clauses or a zero limit', () => {
    expect(rankClauses([], 'rent', 3)).toEqual([]);
    expect(rankClauses(clauses, 'rent', 0)).toEqual([]);
  });
});

describe('format', () => {
  it.each([
    [150_000, '₹1,50,000'],
    [25_000, '₹25,000'],
    [12_345_678, '₹1,23,45,678'],
    [999.6, '₹1,000'],
  ] as const)('formatInr(%d) uses Indian grouping', (amount, expected) => {
    expect(formatInr(amount)).toBe(expected);
  });

  it('pluralises days and months', () => {
    expect(formatDays(1)).toBe('1 day');
    expect(formatDays(30)).toBe('30 days');
    expect(formatMonths(1)).toBe('1 month');
    expect(formatMonths(11)).toBe('11 months');
  });

  it('formats percentages and facts by unit', () => {
    expect(formatPercent(10.5)).toBe('10.5%');
    expect(formatFactValue(30, 'days')).toBe(formatDays(30));
    expect(formatFactValue(6, 'months')).toBe(formatMonths(6));
    expect(formatFactValue(5, 'percent')).toBe(formatPercent(5));
    expect(formatFactValue(100, 'inr')).toBe(formatInr(100));
  });

  it('clipText keeps short text and cuts long text on a word boundary', () => {
    expect(clipText('  short  ', 10)).toBe('short');
    const clipped = clipText('one two three four', 10);
    expect(clipped.length).toBeLessThanOrEqual(10);
    expect(clipped.endsWith('…')).toBe(true);
  });
});
