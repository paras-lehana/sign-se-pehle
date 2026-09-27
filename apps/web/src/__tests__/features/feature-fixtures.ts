/**
 * Feature-panel fixtures built by the real core pipeline.
 *
 * Responsibility: give feature tests analyses and negotiation drafts produced by the code
 * under test (offline analyser + assemblers) from the app's own sample documents, never
 * hand-typed. Only the input texts and provenance timings are pinned here.
 * Boundary: test-only.
 */
import {
  type Analysis,
  type DocumentKind,
  type NegotiateRequest,
  type NegotiateResponse,
  type Provenance,
  type UserRole,
  analyzeOffline,
  assembleAnalysis,
  assembleNegotiation,
  negotiableClauses,
  negotiateOffline,
} from '@sign-se-pehle/core';
import { SAMPLE_DOCUMENTS, type SampleDocument } from '../../lib/samples';

export const OFFLINE_PROVENANCE: Provenance = {
  mode: 'offline',
  models: [],
  latencyMs: 9,
  steps: [],
};

export const GEMINI_PROVENANCE: Provenance = {
  mode: 'gemini',
  models: ['gemini-3-flash-preview'],
  latencyMs: 2_400,
  steps: [],
};

/** A short legal notice with a dated line and a "within 15 days" demand. */
export const LEGAL_NOTICE_TEXT = [
  'LEGAL NOTICE',
  '',
  'Date: 20/09/2026',
  '',
  'To, Mr. Vikram Singh, Flat 12, Green Park, New Delhi.',
  '',
  'Under instructions from my client, Mr. Anil Kapoor, I hereby call upon you to pay the outstanding amount of Rs. 1,85,000 towards unpaid rent and damages within 15 days of receipt of this notice, failing which my client shall initiate appropriate legal proceedings against you.',
  '',
  'Advocate R. Mehra',
].join('\n');

/** The sample with this id, failing loudly if the samples list changes. */
export function sampleById(id: string): SampleDocument {
  const sample = SAMPLE_DOCUMENTS.find((candidate) => candidate.id === id);
  if (sample === undefined) throw new Error(`Unknown sample: ${id}`);
  return sample;
}

/** The Analysis the server would return for `text` in offline mode. */
export function analyseText(text: string, kind: DocumentKind, role: UserRole): Analysis {
  const output = analyzeOffline({ text, kindHint: kind, language: 'en' });
  return assembleAnalysis({
    id: `fixture-${kind}`,
    output,
    text,
    source: 'text',
    redactions: [],
    role,
    kindHint: kind,
    language: 'en',
    provenance: OFFLINE_PROVENANCE,
  });
}

/** The Analysis for one of the app's sample documents. */
export function buildSampleAnalysis(id: string): Analysis {
  const sample = sampleById(id);
  return analyseText(sample.text, sample.kind, sample.role);
}

/** The request NegotiatePanel sends for `analysis`, and the response the server builds for it. */
export function buildNegotiation(
  analysis: Analysis,
  options: Pick<NegotiateRequest, 'tone' | 'channel'>,
  provenance: Provenance = GEMINI_PROVENANCE,
): { request: NegotiateRequest; response: NegotiateResponse } {
  const request: NegotiateRequest = {
    kind: analysis.kind,
    role: analysis.role,
    language: analysis.language,
    tone: options.tone,
    channel: options.channel,
    clauses: negotiableClauses(analysis.clauses),
    flags: analysis.flags,
  };
  const output = negotiateOffline(request);
  const response = assembleNegotiation({
    output,
    clauses: request.clauses,
    flags: request.flags,
    provenance,
  });
  return { request, response };
}
