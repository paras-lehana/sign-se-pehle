/**
 * Read-aloud state machine: the reader's chosen voice and language first, the device's
 * own voice as fallback.
 *
 * Responsibility: turn "listen to this text" into idle → loading → playing → idle,
 * with exactly one voice playing across the page and nothing left playing or allocated
 * after stop or unmount. The voice and listening language are read from the stored
 * preferences at the moment Listen is pressed (see ListenSettings), so every Listen
 * button on the page always uses the reader's latest choice. Boundary: fetching lives in
 * lib/api.ts and playback primitives in lib/speech.ts; this hook only sequences them.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { type LanguageCode, VOICE_PROFILES } from '@sign-se-pehle/core';
import { synthesizeSpeech } from '../../../lib/api';
import { initialListenLanguagePreference, initialVoicePreference } from '../../layout/preferences';
import {
  type StopPlayback,
  canPlayAudioBlobs,
  canSynthesizeSpeech,
  claimPlayback,
  clipForSpeech,
  playAudioBlob,
  releasePlayback,
  speakWithBrowser,
} from '../../../lib/speech';

export type PlayerState = 'idle' | 'loading' | 'playing';

export interface SpeechPlayer {
  /** False when neither audio playback nor device speech exists in this browser. */
  readonly available: boolean;
  readonly state: PlayerState;
  /** Short announcement for a live region ("Playing the Sarvam voice."). */
  readonly status: string;
  readonly toggle: (text: string) => void;
}

const UNAVAILABLE_STATUS = 'Audio is not available right now. Please try again later.';

/**
 * Turns which voice spoke, and whether the text was translated, into the live-region status.
 * @example
 * playingStatus('sarvam', true); // 'Playing the Sarvam voice (translated for you).'
 */
export function playingStatus(voice: string | undefined, translated: boolean): string {
  const name = voice !== undefined && voice in VOICE_PROFILES ? VOICE_PROFILES[voice as keyof typeof VOICE_PROFILES].spokenName : 'the voice';
  return translated ? `Playing ${name} (translated for you).` : `Playing ${name}.`;
}

export function useSpeechPlayer(language: LanguageCode): SpeechPlayer {
  const [available] = useState(() => canPlayAudioBlobs() || canSynthesizeSpeech());
  const [state, setState] = useState<PlayerState>('idle');
  const [status, setStatus] = useState('');
  // Each start or stop bumps the run; late network replies for an old run are dropped.
  const runRef = useRef(0);
  const stopPlaybackRef = useRef<StopPlayback | null>(null);

  const halt = useCallback((): void => {
    runRef.current += 1;
    stopPlaybackRef.current?.();
    stopPlaybackRef.current = null;
  }, []);

  // Also called by lib/speech.ts when another Listen button takes over the voice.
  const stop = useCallback((): void => {
    halt();
    setState('idle');
    setStatus('Stopped.');
  }, [halt]);

  useEffect(() => {
    return () => {
      halt();
      releasePlayback(stop);
    };
  }, [halt, stop]);

  const start = useCallback(
    async (text: string): Promise<void> => {
      halt();
      claimPlayback(stop);
      const run = runRef.current;
      const finished = (): void => {
        if (run !== runRef.current) return;
        stopPlaybackRef.current = null;
        releasePlayback(stop);
        setState('idle');
        setStatus('Finished.');
      };
      const playing = (stopPlayback: StopPlayback, message: string): void => {
        stopPlaybackRef.current = stopPlayback;
        setState('playing');
        setStatus(message);
      };
      setState('loading');
      setStatus('Preparing audio…');
      if (canPlayAudioBlobs()) {
        const listenLanguage = initialListenLanguagePreference() ?? language;
        const audio = await synthesizeSpeech({
          text: clipForSpeech(text),
          language: listenLanguage,
          ...(listenLanguage === language ? {} : { textLanguage: language }),
          voice: initialVoicePreference(),
        });
        if (run !== runRef.current) return;
        const stopAudio = audio.ok ? await playAudioBlob(audio.value.blob, finished) : null;
        if (run !== runRef.current) {
          stopAudio?.();
          return;
        }
        if (stopAudio !== null && audio.ok) {
          playing(stopAudio, playingStatus(audio.value.voice, audio.value.translated));
          return;
        }
      }
      if (canSynthesizeSpeech()) {
        playing(speakWithBrowser(text, language, finished), 'Playing with your device’s voice.');
        return;
      }
      releasePlayback(stop);
      setState('idle');
      setStatus(UNAVAILABLE_STATUS);
    },
    [halt, language, stop],
  );

  const toggle = useCallback(
    (text: string): void => {
      if (state === 'idle') {
        void start(text);
        return;
      }
      stop();
      releasePlayback(stop);
    },
    [start, state, stop],
  );

  return { available, state, status, toggle };
}
