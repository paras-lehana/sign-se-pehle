/**
 * Sarvam AI — Indian-language voices (Bulbul) and translation for read-aloud.
 *
 * Responsibility: speak and translate all 11 app languages, with the key from config sent
 * only in the `api-subscription-key` header, and schema-check every reply before use.
 * Boundary: the key, the text and upstream bodies never reach a log line or an error.
 */
import { LANGUAGES, type LanguageCode, type Result, appError, base64ToBytes, err, ok } from '@sign-se-pehle/core';
import { z } from 'zod';
import {
  type Fetch,
  SPEECH_UNAVAILABLE,
  type Translator,
  type VoiceEngine,
  checkedAudio,
  joinBytes,
  postText,
} from './voice-engine.js';

const BASE_URL = 'https://api.sarvam.ai';

/** MP3 is about a quarter of the size of Sarvam's default WAV for the same speech. */
const AUDIO_CODEC = 'mp3';

const speechReplySchema = z.object({ audios: z.array(z.string().min(1)).min(1) });
const translateReplySchema = z.object({ translated_text: z.string().trim().min(1) });

export interface SarvamOptions {
  readonly apiKey: string;
  readonly ttsModel: string;
  readonly speaker: string;
  readonly translateModel: string;
  readonly timeoutMs: number;
  readonly fetch: Fetch;
}

export interface SarvamClient {
  readonly voice: VoiceEngine;
  readonly translator: Translator;
}

/**
 * Sarvam's language code: Odia is `od-IN`; every other app language keeps its BCP-47 tag.
 * @example
 * sarvamLanguageCode('or'); // 'od-IN'
 * sarvamLanguageCode('ta'); // 'ta-IN'
 */
export function sarvamLanguageCode(language: LanguageCode): string {
  return language === 'or' ? 'od-IN' : LANGUAGES[language].bcp47;
}

/**
 * Creates the Sarvam voice and translator.
 * @example
 * const sarvam = createSarvamClient({ apiKey, ttsModel: 'bulbul:v3', speaker: 'shubh', translateModel: 'sarvam-translate:v1', timeoutMs: 20_000, fetch });
 */
export function createSarvamClient(options: SarvamOptions): SarvamClient {
  const headers = { 'api-subscription-key': options.apiKey, 'Content-Type': 'application/json' };

  async function call<T>(path: string, payload: object, schema: z.ZodType<T>, service: string): Promise<Result<T>> {
    const reply = await postText(options.fetch, {
      url: `${BASE_URL}${path}`,
      headers,
      body: JSON.stringify(payload),
      timeoutMs: options.timeoutMs,
      service,
    });
    if (!reply.ok) return reply;
    let json: unknown;
    try {
      json = JSON.parse(reply.value);
    } catch {
      json = undefined;
    }
    const parsed = schema.safeParse(json);
    return parsed.success
      ? ok(parsed.data)
      : err(appError('UPSTREAM_FAILURE', SPEECH_UNAVAILABLE, `${service}: unreadable reply`));
  }

  const voice: VoiceEngine = {
    configured: true,
    async speak(text, language) {
      const reply = await call(
        '/text-to-speech',
        {
          text,
          target_language_code: sarvamLanguageCode(language),
          model: options.ttsModel,
          speaker: options.speaker,
          output_audio_codec: AUDIO_CODEC,
        },
        speechReplySchema,
        'sarvam speech',
      );
      if (!reply.ok) return reply;
      return checkedAudio(joinBytes(reply.value.audios.map(base64ToBytes)), 'audio/mpeg', 'sarvam speech');
    },
  };

  const translator: Translator = {
    configured: true,
    async translate(text, from, to) {
      const reply = await call(
        '/translate',
        {
          input: text,
          source_language_code: sarvamLanguageCode(from),
          target_language_code: sarvamLanguageCode(to),
          model: options.translateModel,
        },
        translateReplySchema,
        'sarvam translate',
      );
      return reply.ok ? ok(reply.value.translated_text) : reply;
    },
  };

  return { voice, translator };
}
