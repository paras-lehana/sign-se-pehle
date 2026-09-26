/**
 * Offline analyser — a deterministic stand-in for Gemini.
 *
 * Responsibility: produce the SAME AnalysisModelOutput shape the model returns, from
 * keyword tables and regexes, so the pipeline, rules and UI work with no API key or
 * when the model fails. Boundary: English explanations only (said in the summary).
 */
import { CATEGORY_LABELS } from '../domain/clauses.js';
import { type DocumentKind, KIND_PROFILES } from '../domain/document-kinds.js';
import type { LanguageCode } from '../domain/languages.js';
import { clipText, formatFactValue } from '../format.js';
import type { AnalysisModelOutput, ModelClause, ModelKeyDate } from '../genai/model-output.js';
import { type DocumentFacts, FACT_DEFINITIONS, NUMERIC_FACT_KEYS } from '../schemas/facts.js';
import { assessClause, classifyCategory, classifyKind, detectSignals } from './classify.js';
import { extractFacts, SENTENCE_BREAK } from './extract-facts.js';
import { segmentClauses } from './segment.js';
import { CATEGORY_MEANING, checklistFor, OBLIGATION_PARTIES, SIGNAL_NOTE } from './templates.js';

export interface OfflineAnalysisInput {
  readonly text: string;
  readonly kindHint?: DocumentKind;
  readonly language: LanguageCode;
}

const MAX_TITLE_CHARS = 100;
const MIN_TITLE_CHARS = 4;
const MAX_KEY_POINTS = 6;
const MAX_DATES = 6;
const MAX_OBLIGATIONS = 6;
const MAX_OBLIGATION_CHARS = 240;
const MAX_LAWYER_QUESTIONS = 5;
const MAX_LINE_CHARS = 600;
const MONTH_NAMES = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

function toClause(segment: { heading: string; quote: string }): ModelClause {
  const category = classifyCategory(segment.quote);
  const signals = detectSignals(segment.quote);
  const { risk, favours } = assessClause(category, signals);
  const notes = signals.map((signal) => SIGNAL_NOTE[signal]).join(' ');
  return {
    heading: clipText(segment.heading === '' ? CATEGORY_LABELS[category] : segment.heading, 120),
    quote: segment.quote,
    plainMeaning: clipText(`${CATEGORY_MEANING[category]}${notes === '' ? '' : ` ${notes}`}`, MAX_LINE_CHARS),
    category,
    risk,
    favours,
    signals,
  };
}

function detectTitle(text: string): string | null {
  const first = text.split(/\r?\n/).find((line) => line.trim() !== '')?.trim() ?? '';
  return first.length >= MIN_TITLE_CHARS && first.length <= MAX_TITLE_CHARS && /\p{L}/u.test(first) ? first : null;
}

function keyPoints(facts: DocumentFacts): string[] {
  const points = NUMERIC_FACT_KEYS.flatMap((key) => {
    const value = facts[key];
    return value === undefined ? [] : [`${FACT_DEFINITIONS[key].label}: ${formatFactValue(value, FACT_DEFINITIONS[key].unit)}`];
  }).slice(0, MAX_KEY_POINTS);
  return points.length > 0 ? points : ['No amounts or time periods were detected automatically.'];
}

function isoFrom(year: number, month: number, day: number): string | undefined {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return undefined;
  return date.toISOString().slice(0, 10);
}

/**
 * Finds explicit dates written as dd/mm/yyyy or "5th January 2026" (Indian day-first order).
 * @example
 * findKeyDates('Starts on 01/04/2026.')[0]?.isoDate; // '2026-04-01'
 */
export function findKeyDates(text: string): ModelKeyDate[] {
  const numeric = /\b(\d{1,2})[./-](\d{1,2})[./-](\d{4})\b/g;
  const named = new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${MONTH_NAMES.join('|')}),?\\s+(\\d{4})\\b`, 'gi');
  const found = [
    ...Array.from(text.matchAll(numeric), (m) => ({ at: m.index, text: m[0], iso: isoFrom(Number(m[3]), Number(m[2]), Number(m[1])) })),
    ...Array.from(text.matchAll(named), (m) => ({ at: m.index, text: m[0], iso: isoFrom(Number(m[3]), MONTH_NAMES.indexOf((m[2] ?? '').toLowerCase()) + 1, Number(m[1])) })),
  ].sort((a, b) => a.at - b.at);
  return found.slice(0, MAX_DATES).map((date) => ({
    label: 'Date mentioned in the document',
    text: date.text,
    ...(date.iso === undefined ? {} : { isoDate: date.iso }),
  }));
}

function obligations(text: string, kind: DocumentKind): { yours: string[]; theirs: string[] } {
  const parties = OBLIGATION_PARTIES[kind];
  const yours: string[] = [];
  const theirs: string[] = [];
  if (parties === undefined) return { yours, theirs };
  const [reader, other] = parties;
  for (const sentence of text.split(SENTENCE_BREAK)) {
    if (!/\b(?:shall|must|agrees? to|will)\b/i.test(sentence)) continue;
    const readerAt = sentence.search(reader);
    const otherAt = sentence.search(other);
    const line = clipText(sentence.replace(/^\s*\d{1,2}[.)]\s*/, ''), MAX_OBLIGATION_CHARS);
    if (line === '') continue;
    if (readerAt >= 0 && (otherAt < 0 || readerAt < otherAt)) yours.push(line);
    else if (otherAt >= 0) theirs.push(line);
  }
  return { yours: yours.slice(0, MAX_OBLIGATIONS), theirs: theirs.slice(0, MAX_OBLIGATIONS) };
}

/**
 * Analyses a document without the model, returning the model's output shape.
 * @example
 * analyzeOffline({ text: rentAgreement, language: 'en' }).kind; // 'rental'
 */
export function analyzeOffline(input: OfflineAnalysisInput): AnalysisModelOutput {
  const kind = input.kindHint ?? classifyKind(input.text);
  const label = KIND_PROFILES[kind].label;
  const clauses = segmentClauses(input.text).map(toClause);
  const facts = extractFacts(input.text, kind);
  const risky = clauses.filter((clause) => clause.risk !== 'low');
  const languageNote = input.language === 'en' ? '' : ' Explanations in your chosen language need the Gemini engine.';
  const lawyerQuestions = [
    ...clauses
      .filter((clause) => clause.risk === 'high')
      .slice(0, MAX_LAWYER_QUESTIONS)
      .map((clause) => clipText(`Is the "${clause.heading}" clause enforceable as written, and can it be negotiated?`, MAX_LINE_CHARS)),
    'Which terms in this document are most worth negotiating before signing?',
  ];
  return {
    kind,
    title: clipText(detectTitle(input.text) ?? label, 140),
    summary: {
      oneLine: `Offline reading of this ${label.toLowerCase()}: ${clauses.length} clauses found, ${risky.length} worth a closer look. Offline mode explains in English.${languageNote}`,
      keyPoints: keyPoints(facts),
    },
    clauses,
    facts,
    keyDates: findKeyDates(input.text),
    obligations: obligations(input.text, kind),
    inconsistencies: [],
    checklist: checklistFor(kind),
    lawyerQuestions,
  };
}
