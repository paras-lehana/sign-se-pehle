/**
 * Ask a question about this document — typed or spoken; answers cite verified quotes.
 *
 * Responsibility: grounded Q&A over the analysed (redacted) text with follow-up chips.
 * Boundary: the server decides answerType; this panel explains each type in plain
 * words and only shows quotes the server verified against the document. A spoken
 * question only fills the input — the reader still chooses Ask.
 */
import { type FormEvent, type ReactElement, useState } from 'react';
import { MAX_CHAT_HISTORY_TURNS, MAX_QUESTION_CHARS } from '@sign-se-pehle/core';
import { type Analysis, type AskResponse, askQuestion } from '../../lib/api';
import { VoiceQuestionButton } from '../features/listen/VoiceQuestionButton';
import { AskAnswer } from './AskAnswer';
import { ReportSection } from './ReportSection';

interface AskPanelProps {
  readonly analysis: Analysis;
}

export interface AskTurn {
  readonly question: string;
  readonly response: AskResponse;
}

/** Questions shorter than the request schema's two-character minimum are rejected early. */
const MIN_QUESTION_CHARS = 2;

export function AskPanel({ analysis }: AskPanelProps): ReactElement {
  const [question, setQuestion] = useState('');
  const [turns, setTurns] = useState<readonly AskTurn[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ask(text: string): Promise<void> {
    const trimmed = text.trim();
    if (busy) return;
    if (trimmed.length < MIN_QUESTION_CHARS) {
      setError('Please type a question first.');
      return;
    }
    setBusy(true);
    setError(null);
    const result = await askQuestion({
      documentText: analysis.document.text,
      kind: analysis.kind,
      role: analysis.role,
      language: analysis.language,
      question: trimmed,
      history: turns
        .slice(-MAX_CHAT_HISTORY_TURNS)
        .map((turn) => ({ question: turn.question, answer: turn.response.answer })),
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setTurns([...turns, { question: trimmed, response: result.value }]);
    setQuestion('');
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    void ask(question);
  }

  return (
    <ReportSection
      id="ask"
      title="Ask about this document"
      intro="Answers come only from your document and quote the exact words they rely on."
    >
      {turns.length > 0 ? (
        <ol className="plain-list ask-thread" role="list" aria-live="polite">
          {turns.map((turn, index) => (
            <AskAnswer
              key={`${index}-${turn.question}`}
              turn={turn}
              language={analysis.language}
              onFollowUp={(followUp) => void ask(followUp)}
            />
          ))}
        </ol>
      ) : null}
      <form className="ask-form" noValidate onSubmit={handleSubmit}>
        <label htmlFor="ask-question">Your question</label>
        <div className="ask-form__row">
          <input
            id="ask-question"
            type="text"
            value={question}
            maxLength={MAX_QUESTION_CHARS}
            placeholder="For example: Can the landlord keep my deposit?"
            onChange={(event) => setQuestion(event.target.value)}
          />
          <VoiceQuestionButton language={analysis.language} onText={setQuestion} />
          <button
            type="submit"
            className="button button--cta"
            aria-disabled={busy}
            aria-busy={busy}
          >
            {busy ? 'Asking…' : 'Ask'}
          </button>
        </div>
      </form>
      {error === null ? null : (
        <p className="field__error" role="alert">
          {error}
        </p>
      )}
    </ReportSection>
  );
}
