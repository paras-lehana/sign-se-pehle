/**
 * Who drafted the negotiation message, and how long it took.
 *
 * Responsibility: honest provenance for a draft — Gemini with model and latency, or our
 * offline suggestions (English) when Gemini was unavailable. Boundary: display only.
 */
import type { ReactElement } from 'react';
import type { Provenance } from '@sign-se-pehle/core';
import { formatSeconds } from '../../../lib/format';

interface DraftProvenanceProps {
  readonly provenance: Provenance;
}

/**
 * The provenance line, exported so tests derive expectations from the same rule.
 * @example
 * draftProvenanceText({ mode: 'offline', models: [], latencyMs: 4, steps: [] });
 */
export function draftProvenanceText(provenance: Provenance): string {
  if (provenance.mode === 'offline') {
    return 'Drafted from our standard suggestions in English — Gemini unavailable';
  }
  const parts = ['Drafted by Gemini', provenance.models[0], formatSeconds(provenance.latencyMs)];
  return parts.filter((part): part is string => part !== undefined).join(' · ');
}

export function DraftProvenance({ provenance }: DraftProvenanceProps): ReactElement {
  return (
    <p className={`provenance provenance--${provenance.mode}`}>
      <span aria-hidden="true">{provenance.mode === 'gemini' ? '✦' : '⚙'}</span>{' '}
      <span>{draftProvenanceText(provenance)}</span>
    </p>
  );
}
