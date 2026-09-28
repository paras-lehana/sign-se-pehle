/**
 * Browser speech helpers: audio playback, read-aloud fallback and speech recognition.
 *
 * Responsibility: feature-detect the Web Speech and media APIs and wrap them in small
 * typed functions that always hand back a way to stop. Boundary: no network — Gemini
 * audio is fetched by lib/api.ts; this module only plays sound locally and drives the
 * browser's own speech engines.
 */
import { LANGUAGES, type LanguageCode, MAX_SPEECH_CHARS } from '@sign-se-pehle/core';

/** Stops whatever is playing and frees its resources. Safe to call more than once. */
export type StopPlayback = () => void;

/**
 * Chrome silently cuts off a single utterance after roughly 15 seconds of speech, so
 * long answers are queued as sentence groups of about this size instead.
 */
const MAX_UTTERANCE_CHARS = 220;

/** Sentence ends in English and Indic scripts (the Devanagari danda is used by Hindi and Marathi). */
const SENTENCE_END = /(?<=[.!?।])\s+/u;

/**
 * True when the browser can read text aloud on the device.
 * @example
 * if (canSynthesizeSpeech()) speakWithBrowser('Namaste', 'hi', done);
 */
export function canSynthesizeSpeech(): boolean {
  return 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance === 'function';
}

/**
 * True when the browser can play an audio blob through an object URL.
 * @example
 * canPlayAudioBlobs(); // false in old WebViews without URL.createObjectURL
 */
export function canPlayAudioBlobs(): boolean {
  return typeof window.Audio === 'function' && typeof URL.createObjectURL === 'function';
}

/**
 * Shortens text to the speech request limit, preferring a sentence end, then a word end.
 * @example
 * clipForSpeech('One. Two three.', 8); // 'One.'
 */
export function clipForSpeech(text: string, max: number = MAX_SPEECH_CHARS): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  const slice = trimmed.slice(0, max);
  const sentenceEnd = Math.max(slice.lastIndexOf('. '), slice.lastIndexOf('। '));
  if (sentenceEnd > 0) return slice.slice(0, sentenceEnd + 1);
  const wordEnd = slice.lastIndexOf(' ');
  return (wordEnd > 0 ? slice.slice(0, wordEnd) : slice).trimEnd();
}

/**
 * Groups sentences into utterance-sized chunks (see {@link MAX_UTTERANCE_CHARS}).
 * @example
 * splitForUtterances('First. Second.'); // ['First. Second.']
 */
export function splitForUtterances(text: string): string[] {
  const chunks: string[] = [];
  let current = '';
  for (const sentence of text.trim().split(SENTENCE_END)) {
    if (sentence.length === 0) continue;
    const joined = current.length === 0 ? sentence : `${current} ${sentence}`;
    if (joined.length <= MAX_UTTERANCE_CHARS || current.length === 0) {
      current = joined;
      continue;
    }
    chunks.push(current);
    current = sentence;
  }
  if (current.length > 0) chunks.push(current);
  return chunks;
}

function pickVoice(
  voices: readonly SpeechSynthesisVoice[],
  bcp47: string,
): SpeechSynthesisVoice | undefined {
  const primary = bcp47.split('-')[0] ?? bcp47;
  return (
    voices.find((voice) => voice.lang === bcp47) ??
    voices.find((voice) => voice.lang.startsWith(primary))
  );
}

/**
 * Reads text aloud with the device's own voice for the language; `onEnd` fires once when
 * the last chunk finishes (never after the returned stop function has been called).
 * @example
 * const stop = speakWithBrowser(summary, 'ta', () => setIdle());
 */
export function speakWithBrowser(
  text: string,
  language: LanguageCode,
  onEnd: () => void,
): StopPlayback {
  const synth = window.speechSynthesis;
  const { bcp47 } = LANGUAGES[language];
  const voice = pickVoice(synth.getVoices(), bcp47);
  const chunks = splitForUtterances(text);
  let stopped = false;
  const finish = (): void => {
    if (!stopped) onEnd();
    stopped = true;
  };
  synth.cancel();
  chunks.forEach((chunk, index) => {
    const utterance = new SpeechSynthesisUtterance(chunk);
    utterance.lang = bcp47;
    if (voice !== undefined) utterance.voice = voice;
    if (index === chunks.length - 1) {
      utterance.onend = finish;
      utterance.onerror = finish;
    }
    synth.speak(utterance);
  });
  if (chunks.length === 0) finish();
  return () => {
    stopped = true;
    synth.cancel();
  };
}

/**
 * Most browsers settle `HTMLMediaElement.play()` in well under a second; some automated or
 * locked-down browser contexts leave it pending forever instead of rejecting (found testing
 * against a real deployment, 28 Sep 2026). Past this, treat it as refused so the reader falls
 * back to the device voice instead of a Listen button stuck saying "Preparing audio…" forever.
 */
const PLAY_TIMEOUT_MS = 4_000;

/**
 * Plays an audio blob; resolves to a stop function, or null when playback was refused
 * (autoplay policy, unsupported codec) or never started within {@link PLAY_TIMEOUT_MS}. The
 * object URL is revoked on stop, on end, on failure and on timeout, so no blob outlives its
 * playback.
 * @example
 * const stop = await playAudioBlob(wav, () => setIdle());
 */
export async function playAudioBlob(blob: Blob, onEnd: () => void): Promise<StopPlayback | null> {
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  let released = false;
  const release: StopPlayback = () => {
    if (released) return;
    released = true;
    audio.pause();
    URL.revokeObjectURL(url);
  };
  audio.addEventListener(
    'ended',
    () => {
      const wasPlaying = !released;
      release();
      if (wasPlaying) onEnd();
    },
    { once: true },
  );
  // Cleared as soon as the race settles, so a fast, normal play() never leaves a rejection
  // pending on `timeout` after this function has moved on.
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error('play() never settled')), PLAY_TIMEOUT_MS);
  });
  try {
    await Promise.race([audio.play(), timeout]);
    return release;
  } catch {
    release();
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * The browser's speech recogniser constructor, or undefined where it is not offered
 * (Firefox, most WebViews).
 * @example
 * const Recognition = getSpeechRecognition();
 */
export function getSpeechRecognition(): BrowserSpeechRecognitionConstructor | undefined {
  return window.SpeechRecognition ?? window.webkitSpeechRecognition;
}

/** Whoever is speaking right now; only one voice plays at a time across the page. */
let activeOwner: StopPlayback | null = null;

/**
 * Registers `owner` as the one thing speaking, stopping any previous owner first.
 * @example
 * claimPlayback(stop); // the summary stops when an answer starts reading
 */
export function claimPlayback(owner: StopPlayback): void {
  if (activeOwner !== null && activeOwner !== owner) activeOwner();
  activeOwner = owner;
}

/**
 * Forgets `owner` if it is still the active speaker.
 * @example
 * releasePlayback(stop);
 */
export function releasePlayback(owner: StopPlayback): void {
  if (activeOwner === owner) activeOwner = null;
}
