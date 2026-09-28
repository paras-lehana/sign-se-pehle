/**
 * Read-aloud voices — which engines exist, which of the 11 languages each can speak, and
 * the order to try them in.
 *
 * Responsibility: one table shared by the server (routing and fallback) and the web (the
 * voice picker and its status copy), so both always agree. Boundary: data and pure
 * functions only; the HTTP clients for each voice live in apps/server.
 */
import { LANGUAGE_CODES, type LanguageCode } from '../domain/languages.js';

/** Google's free Translate voice is the default; Sarvam speaks all 11; Gemini is the AI voice. */
export const SPEECH_VOICES = ['google', 'sarvam', 'gemini'] as const;

export type SpeechVoice = (typeof SPEECH_VOICES)[number];

export const DEFAULT_SPEECH_VOICE: SpeechVoice = 'google';

export interface VoiceProfile {
  /** Picker label, e.g. "Google Translate (free)". */
  readonly label: string;
  /** How status messages name it, e.g. "the Google voice". */
  readonly spokenName: string;
  readonly languages: readonly LanguageCode[];
}

/**
 * Languages checked live on 27 Sep 2026: Google's free voice returns no audio for Odia;
 * Sarvam's Bulbul speaks all 11; Gemini TTS documents six of ours.
 */
export const VOICE_PROFILES: Readonly<Record<SpeechVoice, VoiceProfile>> = {
  google: {
    label: 'Google Translate (free)',
    spokenName: 'the Google voice',
    languages: LANGUAGE_CODES.filter((code) => code !== 'or'),
  },
  sarvam: {
    label: 'Sarvam AI (Indian voices)',
    spokenName: 'the Sarvam voice',
    languages: LANGUAGE_CODES,
  },
  gemini: {
    label: 'Gemini (AI voice)',
    spokenName: 'the Gemini voice',
    languages: ['en', 'hi', 'bn', 'mr', 'ta', 'te'],
  },
};

/**
 * Response header naming the voice that actually spoke (it can differ from the one asked
 * for when that voice has no such language or is unavailable).
 */
export const SPEECH_VOICE_HEADER = 'X-Speech-Voice';

/** Response header set to "1" when the text was translated before it was spoken. */
export const SPEECH_TRANSLATED_HEADER = 'X-Speech-Translated';

/**
 * True when `voice` can speak `language`.
 * @example
 * voiceSpeaks('google', 'or'); // false — no Odia voice
 */
export function voiceSpeaks(voice: SpeechVoice, language: LanguageCode): boolean {
  return VOICE_PROFILES[voice].languages.includes(language);
}

/**
 * The voices to try for a language: the reader's choice first (when it speaks the
 * language), then every other voice that does, in {@link SPEECH_VOICES} order.
 * @example
 * voiceOrder('google', 'or'); // ['sarvam']
 * voiceOrder('sarvam', 'hi'); // ['sarvam', 'google', 'gemini']
 */
export function voiceOrder(preferred: SpeechVoice, language: LanguageCode): readonly SpeechVoice[] {
  return [preferred, ...SPEECH_VOICES.filter((voice) => voice !== preferred)].filter((voice) =>
    voiceSpeaks(voice, language),
  );
}
