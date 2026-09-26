/**
 * Shows which engine produced a response and how long it took.
 *
 * Responsibility: honest provenance — Gemini with model and latency, or the offline
 * rules fallback. Boundary: display only; the server fills the provenance object.
 */
import type { ReactElement } from 'react';
import type { Provenance } from '@sign-se-pehle/core';
import { formatSeconds } from '../../lib/format';

interface ProvenanceBadgeProps {
  readonly provenance: Provenance;
}

/**
 * The badge text, exported so tests derive expectations from the same rule.
 * @example
 * provenanceText({ mode: 'offline', models: [], latencyMs: 12, steps: [] });
 */
export function provenanceText(provenance: Provenance): string {
  if (provenance.mode === 'offline') return 'Offline rules — Gemini unavailable';
  const model = provenance.models[0];
  const parts = ['Explained by Gemini', model, formatSeconds(provenance.latencyMs)];
  return parts.filter((part): part is string => part !== undefined).join(' · ');
}

export function ProvenanceBadge({ provenance }: ProvenanceBadgeProps): ReactElement {
  return (
    <p className={`provenance provenance--${provenance.mode}`}>
      <span aria-hidden="true">{provenance.mode === 'gemini' ? '✦' : '⚙'}</span>{' '}
      <span>{provenanceText(provenance)}</span>
    </p>
  );
}
