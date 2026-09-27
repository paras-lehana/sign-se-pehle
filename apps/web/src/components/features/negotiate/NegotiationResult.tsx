/**
 * One drafted change request: provenance, the comparison, the message and its sources.
 *
 * Responsibility: lay out a draft in reading order — who drafted it, what to change, the
 * message to send, and the official sources. Boundary: display only; drafting state lives
 * in NegotiatePanel.
 */
import type { ReactElement } from 'react';
import type { NegotiateRequest, NegotiateResponse } from '@sign-se-pehle/core';
import { LawReferenceList } from '../common/LawReferenceList';
import { DraftProvenance } from './DraftProvenance';
import { NegotiationAsks } from './NegotiationAsks';
import { NegotiationMessage } from './NegotiationMessage';

/** A draft plus the channel it was written for. */
export interface NegotiationDraft {
  /** Bumped per draft so the editable message resets to the new text. */
  readonly number: number;
  readonly channel: NegotiateRequest['channel'];
  readonly response: NegotiateResponse;
}

interface NegotiationResultProps {
  readonly draft: NegotiationDraft;
}

export function NegotiationResult({ draft }: NegotiationResultProps): ReactElement {
  const { response } = draft;
  return (
    <div className="negotiate-result">
      <DraftProvenance provenance={response.provenance} />
      <NegotiationAsks asks={response.asks} />
      <NegotiationMessage key={draft.number} draft={response} channel={draft.channel} />
      <LawReferenceList
        title="Official sources behind these requests"
        references={response.references}
      />
      <p className="field__hint">
        This is a request, not legal advice. The other side may say no — keep a copy of what you
        send, and ask a lawyer or free legal aid (NALSA 15100) if the stakes are high.
      </p>
    </div>
  );
}
