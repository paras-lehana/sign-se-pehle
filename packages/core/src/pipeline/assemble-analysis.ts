/**
 * Analysis assembly — turns raw model (or offline) output into the verified report.
 *
 * Responsibility: resolve the reader's role, give clauses ids, verify every quote
 * against the redacted text, merge rule-found inconsistencies, then compute flags,
 * score and money at stake, and finally parse through analysisSchema so the wire shape
 * is guaranteed. Boundary: identical for Gemini and offline output.
 */
import type { DocumentKind, UserRole } from '../domain/document-kinds.js';
import { resolveRole } from '../domain/document-kinds.js';
import type { LanguageCode } from '../domain/languages.js';
import { findAmountMismatches } from '../engine/amount-words.js';
import { computeMoneyAtStake } from '../engine/money.js';
import { locateQuote } from '../engine/quote-verify.js';
import { evaluateRedFlags } from '../engine/red-flags.js';
import { computeScore } from '../engine/score.js';
import { clipText } from '../format.js';
import type { AnalysisModelOutput } from '../genai/model-output.js';
import {
  type Analysis,
  analysisSchema,
  type Clause,
  type DocumentSource,
  type Inconsistency,
  type Provenance,
  type RedactionCount,
} from '../schemas/analysis.js';
import { MAX_CLAUSES, MAX_DOCUMENT_CHARS } from '../schemas/limits.js';

export interface AssembleAnalysisInput {
  readonly id: string;
  readonly output: AnalysisModelOutput;
  /** The PII-redacted text the output was produced from. */
  readonly text: string;
  readonly source: DocumentSource;
  readonly redactions: readonly RedactionCount[];
  readonly role?: UserRole;
  readonly kindHint?: DocumentKind;
  readonly language: LanguageCode;
  readonly provenance: Provenance;
}

/** Schema bounds mirrored here so over-long model text is clipped instead of rejected. */
const MAX_LINE_CHARS = 600;
const MAX_INCONSISTENCIES = 20;
const MAX_FLAGS = MAX_CLAUSES;

function cleanLines(lines: readonly string[], maxItems: number): string[] {
  return lines
    .map((line) => clipText(line, MAX_LINE_CHARS))
    .filter((line) => line !== '')
    .slice(0, maxItems);
}

function verifyClauses(output: AnalysisModelOutput, text: string): Clause[] {
  return output.clauses
    .flatMap((clause) => {
      const span = locateQuote(text, clause.quote);
      if (span === null && clause.heading.trim() === '') return [];
      return [{ clause, span }];
    })
    .slice(0, MAX_CLAUSES)
    .map(({ clause, span }, index): Clause => {
      const base = {
        id: `c${index + 1}`,
        heading: clipText(clause.heading, 120),
        quote: clipText(clause.quote, 1_200),
        plainMeaning: clipText(clause.plainMeaning, MAX_LINE_CHARS),
        category: clause.category,
        risk: clause.risk,
        favours: clause.favours,
        signals: [...new Set(clause.signals)],
        quoteVerified: span !== null,
      };
      return span === null ? base : { ...base, span };
    });
}

function mergeInconsistencies(aiNotes: readonly string[], text: string): Inconsistency[] {
  const fromAi = cleanLines(aiNotes, MAX_INCONSISTENCIES).map(
    (description): Inconsistency => ({ source: 'ai', description, clauseIds: [] }),
  );
  return [...findAmountMismatches(text), ...fromAi].slice(0, MAX_INCONSISTENCIES);
}

/**
 * Builds the verified Analysis for one document.
 * @example
 * assembleAnalysis({ id: 'abc', output: analyzeOffline({ text, language: 'en' }), text, source: 'text', redactions: [], language: 'en', provenance });
 */
export function assembleAnalysis(input: AssembleAnalysisInput): Analysis {
  const text = input.text.slice(0, MAX_DOCUMENT_CHARS);
  const { output } = input;
  const kind = input.kindHint ?? output.kind;
  const role = resolveRole(kind, input.role);
  const clauses = verifyClauses(output, text);
  const flags = evaluateRedFlags({ kind, role, facts: output.facts, clauses }).slice(0, MAX_FLAGS);
  const candidate: Analysis = {
    id: input.id,
    kind,
    role,
    language: input.language,
    title: clipText(output.title, 140),
    summary: { oneLine: clipText(output.summary.oneLine, MAX_LINE_CHARS), keyPoints: cleanLines(output.summary.keyPoints, 6) },
    clauses,
    facts: output.facts,
    flags,
    inconsistencies: mergeInconsistencies(output.inconsistencies, text),
    keyDates: output.keyDates.slice(0, 20).map((date) => ({
      label: clipText(date.label, 140),
      text: clipText(date.text, 160),
      ...(date.isoDate === undefined ? {} : { isoDate: date.isoDate }),
    })),
    obligations: { yours: cleanLines(output.obligations.yours, 12), theirs: cleanLines(output.obligations.theirs, 12) },
    moneyAtStake: computeMoneyAtStake(kind, output.facts),
    score: computeScore(flags, clauses),
    checklist: cleanLines(output.checklist, 10),
    lawyerQuestions: cleanLines(output.lawyerQuestions, 10),
    document: { text, source: input.source, redactions: [...input.redactions] },
    provenance: input.provenance,
  };
  return analysisSchema.parse(candidate);
}
