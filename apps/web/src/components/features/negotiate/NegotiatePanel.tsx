/**
 * Negotiate: turn the risky clauses into a polite, ready-to-send change request.
 *
 * Responsibility: collect tone and channel, send the medium/high-risk clauses and flags to
 * /api/negotiate, and show the comparison, the editable message and the law sources.
 * Boundary: the server drafts (Gemini, or offline suggestions); this panel never writes
 * legal wording itself and never sends anything on the reader's behalf.
 */
import { type FormEvent, type ReactElement, useState } from 'react';
import { type NegotiateRequest, negotiableClauses } from '@sign-se-pehle/core';
import { type Analysis, negotiate } from '../../../lib/api';
import { ChoiceGroup, type ChoiceOption } from '../common/ChoiceGroup';
import { FeaturePanel } from '../common/FeaturePanel';
import { type NegotiationDraft, NegotiationResult } from './NegotiationResult';

type Tone = NegotiateRequest['tone'];
type Channel = NegotiateRequest['channel'];

const TONE_OPTIONS: readonly ChoiceOption<Tone>[] = [
  { value: 'polite', label: 'Polite', hint: 'Friendly and open to discussion' },
  { value: 'firm', label: 'Firm', hint: 'Clear and direct, still respectful' },
];

const CHANNEL_OPTIONS: readonly ChoiceOption<Channel>[] = [
  { value: 'whatsapp', label: 'WhatsApp', hint: 'Short message for chat' },
  { value: 'email', label: 'Email', hint: 'Fuller letter with a subject line' },
];

interface NegotiatePanelProps {
  readonly analysis: Analysis;
}

/** A one-line announcement; the full result is read by moving through it, not shouted. */
function draftStatus(draft: NegotiationDraft | null): string {
  if (draft === null) return '';
  const count = draft.response.asks.length;
  return `Draft ready: ${count} ${count === 1 ? 'change' : 'changes'} and a message you can edit.`;
}

export function NegotiatePanel({ analysis }: NegotiatePanelProps): ReactElement {
  // Core picks what is worth asking about: medium/high risk, riskiest first, capped.
  const riskyClauses = negotiableClauses(analysis.clauses);
  const [tone, setTone] = useState<Tone>('polite');
  const [channel, setChannel] = useState<Channel>('whatsapp');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<NegotiationDraft | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const result = await negotiate({
      kind: analysis.kind,
      role: analysis.role,
      language: analysis.language,
      tone,
      channel,
      clauses: riskyClauses,
      flags: analysis.flags,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setDraft({ number: (draft?.number ?? 0) + 1, channel, response: result.value });
  }

  if (riskyClauses.length === 0) {
    return (
      <FeaturePanel id="negotiate" title="Negotiate">
        <p>
          No clause is marked medium or high risk for you, so there is nothing to push back on.
          Still read every clause before you sign.
        </p>
      </FeaturePanel>
    );
  }

  const clauseTarget =
    riskyClauses.length === 1 ? 'the risky clause' : `the ${riskyClauses.length} riskiest clauses`;
  return (
    <FeaturePanel
      id="negotiate"
      title="Negotiate"
      intro={`Ask for fairer wording on ${clauseTarget}. You review everything before it is sent.`}
    >
      <form className="negotiate-form" noValidate onSubmit={(event) => void handleSubmit(event)}>
        <div className="negotiate-form__choices">
          <ChoiceGroup
            legend="Tone"
            name="negotiate-tone"
            options={TONE_OPTIONS}
            value={tone}
            onChange={setTone}
          />
          <ChoiceGroup
            legend="Send by"
            name="negotiate-channel"
            options={CHANNEL_OPTIONS}
            value={channel}
            onChange={setChannel}
          />
        </div>
        <button
          type="submit"
          className="button button--primary"
          aria-disabled={busy}
          aria-busy={busy}
        >
          {busy ? 'Drafting…' : draft === null ? 'Draft my request' : 'Draft again'}
        </button>
      </form>
      {error === null ? null : (
        <p className="field__error" role="alert">
          {error}
        </p>
      )}
      <p className="visually-hidden" role="status">
        {busy ? 'Drafting your request…' : draftStatus(draft)}
      </p>
      {draft === null ? null : <NegotiationResult draft={draft} />}
    </FeaturePanel>
  );
}
