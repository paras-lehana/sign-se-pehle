/**
 * Read-aloud orchestration: translate when the reader wants another language, then speak
 * with the reader's voice, falling back through the other voices that speak the language.
 *
 * Responsibility: mask personal details before any third party sees the text, choose
 * translators and voices from the shared table in core, and report which voice actually
 * spoke. Boundary: HTTP details live in the engine modules; nothing here logs the text.
 */
import {
  type AppError,
  DEFAULT_SPEECH_VOICE,
  type LanguageCode,
  type Result,
  SPEECH_VOICES,
  type SpeechRequest,
  type SpeechVoice,
  appError,
  err,
  ok,
  redactPii,
  voiceOrder,
} from '@sign-se-pehle/core';
import type { Logger } from '../logger.js';
import { type AudioFile, SPEECH_UNAVAILABLE, type Translator, type VoiceEngine } from './voice-engine.js';

export type TranslatorName = 'google' | 'sarvam';

export interface SpokenAudio extends AudioFile {
  /** The voice that spoke — not always the one asked for. */
  readonly voice: SpeechVoice;
  readonly translated: boolean;
}

export interface SpeechService {
  /** Voices that have what they need to run, for /api/health. */
  readonly voices: readonly SpeechVoice[];
  speak(req: SpeechRequest): Promise<Result<SpokenAudio>>;
}

export interface SpeechServiceDeps {
  readonly voices: Readonly<Record<SpeechVoice, VoiceEngine>>;
  readonly translators: Readonly<Record<TranslatorName, Translator>>;
  readonly logger: Logger;
}

/** Sarvam's own translator for the Sarvam voice; Google's free one otherwise (Gemini included). */
function translatorOrder(voice: SpeechVoice): readonly TranslatorName[] {
  return voice === 'sarvam' ? ['sarvam', 'google'] : ['google', 'sarvam'];
}

/**
 * Creates the speech service.
 * @example
 * const speech = createSpeechService({ voices: { google, sarvam, gemini }, translators, logger });
 * await speech.speak({ text: summary, language: 'ta', textLanguage: 'en' });
 */
export function createSpeechService(deps: SpeechServiceDeps): SpeechService {
  const { voices, translators, logger } = deps;

  async function translate(
    text: string,
    from: LanguageCode,
    to: LanguageCode,
    voice: SpeechVoice,
  ): Promise<Result<string>> {
    let failure: AppError = appError('UPSTREAM_FAILURE', SPEECH_UNAVAILABLE, 'no translator configured');
    for (const name of translatorOrder(voice)) {
      const translator = translators[name];
      if (!translator.configured) continue;
      const result = await translator.translate(text, from, to);
      if (result.ok) return result;
      logger.log('WARNING', 'translation fell back', { translator: name, hint: result.error.internalHint ?? '' });
      failure = result.error;
    }
    return err(failure);
  }

  return {
    voices: SPEECH_VOICES.filter((voice) => voices[voice].configured),
    async speak(req) {
      const chosen = req.voice ?? DEFAULT_SPEECH_VOICE;
      const from = req.textLanguage ?? req.language;
      const translated = from !== req.language;
      const masked = redactPii(req.text).text;
      const text = translated ? await translate(masked, from, req.language, chosen) : ok(masked);
      if (!text.ok) return text;

      let failure: AppError = appError('UPSTREAM_FAILURE', SPEECH_UNAVAILABLE, 'no voice available');
      for (const voice of voiceOrder(chosen, req.language)) {
        const engine = voices[voice];
        if (!engine.configured) continue;
        const audio = await engine.speak(text.value, req.language);
        if (audio.ok) return ok({ ...audio.value, voice, translated });
        logger.log('WARNING', 'speech voice fell back', { voice, hint: audio.error.internalHint ?? '' });
        failure = audio.error;
      }
      return err(failure);
    },
  };
}
