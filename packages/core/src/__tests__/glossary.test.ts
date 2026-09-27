import { describe, expect, it } from 'vitest';
import { findGlossaryTerms, GLOSSARY, type GlossaryMatch } from '../knowledge/glossary.js';
import { RENT_AGREEMENT } from './fixtures.js';

/** Terms the product promises to explain (the build contract's list). */
const REQUIRED_TERMS = [
  'indemnity', 'lock-in period', 'arbitration', 'sole arbitrator', 'security deposit', 'notice period',
  'leave and licence', 'licensor', 'licensee', 'force majeure', 'liquidated damages', 'penalty', 'jurisdiction',
  'stamp duty', 'registration', 'escalation', 'sub-letting', 'termination', 'waiver', 'non-compete',
  'training bond', 'probation', 'gratuity', 'foreclosure', 'prepayment', 'EMI', 'guarantor', 'hypothecation',
  'moratorium', 'sum insured', 'co-payment', 'waiting period', 'free-look period', 'exclusion',
  'pre-existing disease', 'possession', 'carpet area', 'booking amount',
];

/** Longest meaning that still fits a phone popover in two or three lines. */
const MAX_MEANING_CHARS = 220;

function entryIdOf(term: string): string | undefined {
  return findGlossaryTerms(`The ${term} applies.`)[0]?.entryId;
}

function expectWellFormed(text: string, matches: readonly GlossaryMatch[]): void {
  matches.forEach((match, index) => {
    const previous = matches[index - 1];
    expect(match.end).toBeGreaterThan(match.start);
    expect(text.slice(match.start, match.end).length).toBe(match.end - match.start);
    if (previous !== undefined) expect(match.start).toBeGreaterThanOrEqual(previous.end);
  });
  expect(new Set(matches.map((match) => match.entryId)).size).toBe(matches.length);
}

describe('GLOSSARY', () => {
  it('has unique kebab-case ids and short, non-empty meanings', () => {
    expect(new Set(GLOSSARY.map((entry) => entry.id)).size).toBe(GLOSSARY.length);
    for (const entry of GLOSSARY) {
      expect(entry.id).toMatch(/^[a-z]+(?:-[a-z]+)*$/);
      expect(entry.meaning.length).toBeGreaterThan(0);
      expect(entry.meaning.length).toBeLessThanOrEqual(MAX_MEANING_CHARS);
    }
  });

  it.each(REQUIRED_TERMS)('explains "%s"', (term) => {
    const id = entryIdOf(term);
    expect(GLOSSARY.find((entry) => entry.id === id)?.term.toLowerCase()).toBe(term.toLowerCase());
  });
});

describe('findGlossaryTerms', () => {
  it('matches case-insensitively on whole words only', () => {
    expect(entryIdOf('INDEMNITY')).toBe('indemnity');
    expect(findGlossaryTerms('indemnityclause and preEMIum')).toEqual([]);
  });

  it('returns only the first occurrence of each term, with offsets into the text', () => {
    const text = 'A penalty applies. Another penalty applies.';
    const matches = findGlossaryTerms(text);
    expect(matches).toHaveLength(1);
    expect(text.slice(matches[0]?.start, matches[0]?.end)).toBe('penalty');
    expect(matches[0]?.start).toBe(text.indexOf('penalty'));
  });

  it('accepts aliases, plurals and hyphen or spacing variants', () => {
    expect(entryIdOf('subletting')).toBe('sub-letting');
    expect(entryIdOf('sub letting')).toBe('sub-letting');
    expect(entryIdOf('lock in period')).toBe('lock-in-period');
    expect(entryIdOf('EMIs')).toBe('emi');
    expect(entryIdOf('penalties')).toBe('penalty');
    expect(entryIdOf('leave and license')).toBe('leave-and-licence');
  });

  it('prefers the longer term where two overlap, and finds the shorter one later', () => {
    const text = 'Disputes go to a sole arbitrator. The arbitration is final.';
    const matches = findGlossaryTerms(text);
    expect(matches.map((match) => match.entryId)).toEqual(['sole-arbitrator', 'arbitration']);
    expect(text.slice(matches[1]?.start, matches[1]?.end)).toBe('arbitration');
  });

  it('returns sorted, non-overlapping, unique matches on a real agreement', () => {
    const matches = findGlossaryTerms(RENT_AGREEMENT);
    expect(matches.length).toBeGreaterThan(3);
    expect(matches.map((match) => match.start)).toEqual([...matches.map((match) => match.start)].sort((a, b) => a - b));
    expectWellFormed(RENT_AGREEMENT, matches);
  });

  it('returns nothing for text without terms', () => {
    expect(findGlossaryTerms('')).toEqual([]);
    expect(findGlossaryTerms('Hello world')).toEqual([]);
  });
});
