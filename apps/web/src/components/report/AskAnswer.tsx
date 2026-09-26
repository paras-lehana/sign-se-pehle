/**
 * One question-and-answer turn with cited quotes and follow-up chips.
 *
 * Responsibility: render an answer and explain its answerType in plain words.
 * Boundary: display only; asking a follow-up is delegated to the parent panel.
 */
import type { ReactElement } from 'react';
import type { AskAnswerType } from '@sign-se-pehle/core';
import type { AskTurn } from './AskPanel';

/** Extra context per answer type, exported so tests assert the same copy. */
export const ANSWER_TYPE_NOTES: Readonly<Record<AskAnswerType, string | null>> = {
  answered: null,
  'not-in-document': 'Your document does not seem to say this.',
  'needs-lawyer':
    'This needs a lawyer’s view. Consider asking a lawyer or NALSA free legal aid (call 15100).',
};

interface AskAnswerProps {
  readonly turn: AskTurn;
  readonly onFollowUp: (question: string) => void;
}

export function AskAnswer({ turn, onFollowUp }: AskAnswerProps): ReactElement {
  const { response } = turn;
  const note = ANSWER_TYPE_NOTES[response.answerType];
  return (
    <li className="ask-turn">
      <p className="ask-turn__question">
        <span className="visually-hidden">You asked: </span>
        {turn.question}
      </p>
      <div className={`ask-turn__answer ask-turn__answer--${response.answerType}`}>
        {note === null ? null : <p className="ask-turn__note">{note}</p>}
        <p>{response.answer}</p>
        {response.citations.map((citation) => (
          <figure key={`${citation.span.start}-${citation.span.end}`} className="clause__quote">
            <blockquote>{citation.quote}</blockquote>
            <figcaption className="badge badge--verified">
              <span aria-hidden="true">{'✓'}</span> <span>From your document</span>
            </figcaption>
          </figure>
        ))}
      </div>
      {response.followUps.length > 0 ? (
        <ul className="plain-list chips" role="list" aria-label="Suggested follow-up questions">
          {response.followUps.map((followUp) => (
            <li key={followUp}>
              <button type="button" className="chip-button" onClick={() => onFollowUp(followUp)}>
                {followUp}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}
