/**
 * "Ask by voice" — speak a question instead of typing it.
 *
 * Responsibility: run one browser speech-recognition session in the reader's language,
 * show what was heard live, and hand the final transcript to the parent. Boundary: only
 * rendered where the browser offers recognition (Chrome, Edge, Safari); elsewhere it
 * renders nothing and typing remains the way to ask. The parent decides what to do with
 * the text — this button never submits a question itself.
 */
import { type ReactElement, useCallback, useEffect, useId, useRef, useState } from 'react';
import { LANGUAGES, type LanguageCode } from '@sign-se-pehle/core';
import { getSpeechRecognition } from '../../../lib/speech';

interface VoiceQuestionButtonProps {
  readonly language: LanguageCode;
  readonly onText: (text: string) => void;
}

const ERROR_MESSAGES: Readonly<Record<SpeechRecognitionErrorCode, string>> = {
  aborted: '',
  'audio-capture': 'No microphone was found. Please type your question.',
  'language-not-supported': 'Voice typing is not available for this language here. Please type.',
  network: 'Voice typing needs an internet connection. Please type your question.',
  'no-speech': 'We did not hear anything. Please try again.',
  'not-allowed': 'Microphone access is blocked. Allow it in your browser, or type your question.',
  'phrases-not-supported': 'Voice typing stopped. Please try again or type your question.',
  'service-not-allowed': 'Voice typing is turned off in this browser. Please type your question.',
};

function readTranscript(event: SpeechRecognitionEvent): { text: string; final: boolean } {
  let text = '';
  let final = false;
  for (let index = 0; index < event.results.length; index += 1) {
    const result = event.results[index];
    if (result === undefined) continue;
    text += result[0]?.transcript ?? '';
    final = final || result.isFinal;
  }
  return { text: text.trim(), final };
}

export function VoiceQuestionButton({
  language,
  onText,
}: VoiceQuestionButtonProps): ReactElement | null {
  const hintId = useId();
  const [Recognition] = useState(getSpeechRecognition);
  const [listening, setListening] = useState(false);
  const [status, setStatus] = useState('');
  const sessionRef = useRef<BrowserSpeechRecognition | null>(null);

  const abortSession = useCallback((): void => {
    const session = sessionRef.current;
    sessionRef.current = null;
    if (session === null) return;
    session.onresult = null;
    session.onerror = null;
    session.onend = null;
    session.abort();
  }, []);

  useEffect(() => abortSession, [abortSession]);

  if (Recognition === undefined) return null;

  function start(Constructor: BrowserSpeechRecognitionConstructor): void {
    const session = new Constructor();
    session.lang = LANGUAGES[language].bcp47;
    session.interimResults = true;
    session.continuous = false;
    session.maxAlternatives = 1;
    session.onresult = (event) => {
      const { text, final } = readTranscript(event);
      if (text.length === 0) return;
      setStatus(final ? `Heard: “${text}”` : `Listening… “${text}”`);
      if (final) onText(text);
    };
    session.onerror = (event) => setStatus(ERROR_MESSAGES[event.error]);
    session.onend = () => {
      sessionRef.current = null;
      setListening(false);
    };
    try {
      session.start();
    } catch {
      setStatus('Voice typing could not start. Please type your question.');
      return;
    }
    sessionRef.current = session;
    setListening(true);
    setStatus('Listening… ask your question.');
  }

  function toggle(Constructor: BrowserSpeechRecognitionConstructor): void {
    if (listening) {
      sessionRef.current?.stop();
      return;
    }
    start(Constructor);
  }

  return (
    <span className="voice-question">
      <button
        type="button"
        className="button button--ghost voice-question__button"
        aria-pressed={listening}
        aria-describedby={hintId}
        onClick={() => toggle(Recognition)}
      >
        <span aria-hidden="true">{listening ? '■' : '🎤'}</span>{' '}
        {listening ? 'Stop listening' : 'Ask by voice'}
      </button>
      <span id={hintId} className="visually-hidden">
        Your browser turns your voice into text in {LANGUAGES[language].englishName}.
      </span>
      <span className="feature-status voice-question__status" role="status">
        {status}
      </span>
    </span>
  );
}
