/**
 * Read-aloud state machine: Gemini audio first, the device's own voice as fallback.
 *
 * Responsibility: turn "listen to this text" into idle → loading → playing → idle,
 * with exactly one voice playing across the page and nothing left playing or allocated
 * after stop or unmount. Boundary: fetching lives in lib/api.ts and playback primitives
 * in lib/speech.ts; this hook only sequences them.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { LanguageCode } from '@sign-se-pehle/core';
import { synthesizeSpeech } from '../../../lib/api';
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
  /** False when neither Gemini audio playback nor device speech exists in this browser. */
  readonly available: boolean;
  readonly state: PlayerState;
  /** Short announcement for a live region ("Playing with your device's voice."). */
  readonly status: string;
  readonly toggle: (text: string) => void;
}

const UNAVAILABLE_STATUS = 'Audio is not available right now. Please try again later.';

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
        const audio = await synthesizeSpeech({ text: clipForSpeech(text), language });
        if (run !== runRef.current) return;
        const stopAudio = audio.ok ? await playAudioBlob(audio.value, finished) : null;
        if (run !== runRef.current) {
          stopAudio?.();
          return;
        }
        if (stopAudio !== null) {
          playing(stopAudio, 'Playing the Gemini voice.');
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
