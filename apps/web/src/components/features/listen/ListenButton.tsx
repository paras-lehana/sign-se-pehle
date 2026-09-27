/**
 * "Listen" — reads a piece of the explanation aloud in the reader's language.
 *
 * Responsibility: one toggle button (Listen / Stop, `aria-pressed`) with an announced
 * status that says which voice is playing. Boundary: sequencing, fallback and clean-up
 * live in useSpeechPlayer; the button hides itself where no audio path exists at all.
 */
import type { ReactElement } from 'react';
import type { LanguageCode } from '@sign-se-pehle/core';
import { useSpeechPlayer } from './use-speech-player';

interface ListenButtonProps {
  readonly text: string;
  readonly language: LanguageCode;
  /** Visible label when idle, e.g. "Listen to the summary". Defaults to "Listen". */
  readonly label?: string;
}

export function ListenButton({
  text,
  language,
  label = 'Listen',
}: ListenButtonProps): ReactElement | null {
  const player = useSpeechPlayer(language);
  if (!player.available || text.trim().length === 0) return null;
  const active = player.state !== 'idle';

  return (
    <span className="listen">
      <button
        type="button"
        className="button button--ghost listen__button"
        aria-pressed={active}
        aria-busy={player.state === 'loading'}
        onClick={() => player.toggle(text)}
      >
        <span aria-hidden="true" className="listen__icon">
          {active ? '■' : '▶'}
        </span>{' '}
        {active ? 'Stop' : label}
      </button>
      <span className="feature-status listen__status" role="status">
        {player.status}
      </span>
    </span>
  );
}
