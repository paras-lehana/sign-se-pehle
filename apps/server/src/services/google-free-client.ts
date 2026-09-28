/**
 * Google Translate's free web endpoints — the default read-aloud voice and translator.
 *
 * Responsibility: translate and speak the way the Google Translate website does (the same
 * requests the open-source gTTS library makes): no key, text only ever in POST bodies,
 * long text split at sentence ends and fetched a few parts at a time, MP3 parts joined in
 * order. Boundary: these endpoints are unofficial and carry no SLA, so every failure is an
 * UPSTREAM_* error the speech service falls back from; text and upstream bodies are never
 * logged or returned.
 */
import {
  type LanguageCode,
  type Result,
  appError,
  base64ToBytes,
  err,
  ok,
  splitIntoSpeechChunks,
} from '@sign-se-pehle/core';
import { mapWithConcurrency } from './concurrency.js';
import {
  type Fetch,
  SPEECH_UNAVAILABLE,
  type Translator,
  type VoiceEngine,
  checkedAudio,
  joinBytes,
  postText,
} from './voice-engine.js';

const TRANSLATE_URL = 'https://translate.googleapis.com/translate_a/single';
const SPEECH_URL = 'https://translate.google.com/_/TranslateWebserverUi/data/batchexecute';

/** The batchexecute call that answers [text, language] with base64 MP3. */
const SPEECH_RPC = 'jQ1olc';

/** 200 characters per part worked live on 27 Sep 2026 and 300 failed; 180 leaves a margin. */
export const GOOGLE_SPEECH_MAX_CHARS = 180;

/** Parts fetched at once: a 1,500-character summary is 9 parts, so about three rounds. */
const SPEECH_CONCURRENCY = 4;

const FORM_TYPE = 'application/x-www-form-urlencoded;charset=utf-8';

/** The reply embeds the audio as `"jQ1olc","[\"<base64>\"]"`. */
const AUDIO_IN_REPLY = /jQ1olc","\[\\"([A-Za-z0-9+/=]+)\\"]/;

export interface GoogleFreeOptions {
  readonly fetch: Fetch;
  readonly timeoutMs: number;
}

export interface GoogleFreeClient {
  readonly voice: VoiceEngine;
  readonly translator: Translator;
}

/**
 * Reads the translated text out of translate_a/single's nested arrays.
 * @example
 * parseTranslation('[[["नमस्ते","Hello",null,null,1]],null,"en"]'); // 'नमस्ते'
 */
export function parseTranslation(body: string): string | undefined {
  let data: unknown;
  try {
    data = JSON.parse(body);
  } catch {
    return undefined;
  }
  if (!Array.isArray(data) || !Array.isArray(data[0])) return undefined;
  const segments: unknown[] = data[0];
  const text = segments
    .map((segment) => (Array.isArray(segment) && typeof segment[0] === 'string' ? segment[0] : ''))
    .join('');
  return text.trim().length > 0 ? text : undefined;
}

/**
 * Pulls the MP3 bytes out of a batchexecute reply; undefined when there is no audio.
 * @example
 * parseSpeechReply(')]}\'\n[["wrb.fr","jQ1olc","[\\"SUQz\\"]"]]'); // Uint8Array [73, 68, 51]
 */
export function parseSpeechReply(body: string): Uint8Array | undefined {
  const base64 = AUDIO_IN_REPLY.exec(body)?.[1];
  return base64 === undefined ? undefined : base64ToBytes(base64);
}

function speechForm(text: string, language: LanguageCode): string {
  const rpc = [[[SPEECH_RPC, JSON.stringify([text, language, null, 'null']), null, 'generic']]];
  return `f.req=${encodeURIComponent(JSON.stringify(rpc))}&`;
}

/**
 * Creates the Google Translate voice and translator.
 * @example
 * const google = createGoogleFreeClient({ fetch, timeoutMs: 20_000 });
 * await google.voice.speak('Read the lock-in clause.', 'en');
 */
export function createGoogleFreeClient(options: GoogleFreeOptions): GoogleFreeClient {
  const { fetch: fetchImpl, timeoutMs } = options;

  async function speakPart(part: string, language: LanguageCode): Promise<Result<Uint8Array>> {
    const reply = await postText(fetchImpl, {
      url: SPEECH_URL,
      headers: { 'Content-Type': FORM_TYPE, Referer: 'https://translate.google.com/' },
      body: speechForm(part, language),
      timeoutMs,
      service: 'google speech',
    });
    if (!reply.ok) return reply;
    const audio = parseSpeechReply(reply.value);
    return audio === undefined || audio.length === 0
      ? err(appError('UPSTREAM_FAILURE', SPEECH_UNAVAILABLE, 'google speech: no audio'))
      : ok(audio);
  }

  const voice: VoiceEngine = {
    configured: true,
    async speak(text, language) {
      const parts = splitIntoSpeechChunks(text, GOOGLE_SPEECH_MAX_CHARS);
      const results = await mapWithConcurrency(parts, SPEECH_CONCURRENCY, (part) => speakPart(part, language));
      const audio: Uint8Array[] = [];
      for (const result of results) {
        if (!result.ok) return result;
        audio.push(result.value);
      }
      return checkedAudio(joinBytes(audio), 'audio/mpeg', 'google speech');
    },
  };

  const translator: Translator = {
    configured: true,
    async translate(text, from, to) {
      const query = new URLSearchParams({ client: 'gtx', sl: from, tl: to, dt: 't' });
      const reply = await postText(fetchImpl, {
        url: `${TRANSLATE_URL}?${query.toString()}`,
        headers: { 'Content-Type': FORM_TYPE },
        body: new URLSearchParams({ q: text }).toString(),
        timeoutMs,
        service: 'google translate',
      });
      if (!reply.ok) return reply;
      const translated = parseTranslation(reply.value);
      return translated === undefined
        ? err(appError('UPSTREAM_FAILURE', SPEECH_UNAVAILABLE, 'google translate: unreadable reply'))
        : ok(translated);
    },
  };

  return { voice, translator };
}
