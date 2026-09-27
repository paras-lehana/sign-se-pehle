/**
 * Speech client — the server's doorway to Gemini text-to-speech.
 *
 * Responsibility: synthesise one short text across the configured TTS models with
 * per-attempt timeouts and failover, decode the returned base64 PCM and read its sample
 * rate. Boundary: kept apart from GenAiClient (audio, not text or JSON); the SDK sits behind
 * the injected `SpeechCaller`, and neither the text nor upstream bodies are ever logged or
 * returned in errors.
 */
import { type Result, appError, base64ToBytes, err, ok } from '@sign-se-pehle/core';
import { failoverOrder, isRetryableStatus, rejectOnAbort, statusOf } from './genai-client.js';

/** Inline audio as the SDK returns it. */
export interface SpeechAudio {
  readonly dataBase64: string;
  /** For example `audio/L16;codec=pcm;rate=24000`; empty when the API omits it. */
  readonly mimeType: string;
}

/** One concrete call to one TTS model — what the SDK adapter receives. */
export interface SpeechCall {
  readonly model: string;
  readonly text: string;
  readonly signal: AbortSignal;
}

/** Performs one TTS call; resolves undefined when no audio came back, throws on failure. */
export type SpeechCaller = (call: SpeechCall) => Promise<SpeechAudio | undefined>;

export interface SynthesizeRequest {
  readonly text: string;
  readonly signal?: AbortSignal;
}

export interface SynthesizedSpeech {
  /** 16-bit little-endian mono PCM. */
  readonly pcm: Uint8Array;
  readonly sampleRate: number;
  readonly model: string;
  readonly ms: number;
}

export interface SpeechClient {
  readonly configured: boolean;
  synthesize(req: SynthesizeRequest): Promise<Result<SynthesizedSpeech>>;
}

export interface SpeechClientOptions {
  readonly caller: SpeechCaller;
  readonly models: readonly string[];
  readonly timeoutMs: number;
  readonly now: () => number;
}

/** Gemini TTS returns 24 kHz PCM; used when the MIME type does not state a rate. */
export const DEFAULT_SAMPLE_RATE = 24_000;
/** Telephone quality to studio quality: anything outside is a malformed MIME type. */
const MIN_SAMPLE_RATE = 8_000;
const MAX_SAMPLE_RATE = 48_000;

/** User-safe copy: the web falls back to the browser's own voice when it sees this. */
const SPEECH_UNAVAILABLE = 'Read-aloud with the AI voice is unavailable right now.';

const RATE_PARAMETER = /(?:^|;)\s*rate=(\d+)/i;
/** Raw PCM is what can be wrapped in a WAV header; an empty type is taken as the documented PCM default. */
const RAW_PCM_TYPE = /^(?:audio\/(?:l16|pcm)\b|$)/i;

/**
 * Reads the sample rate from a PCM MIME type, falling back to 24 kHz.
 * @example
 * sampleRateFrom('audio/L16;codec=pcm;rate=16000'); // 16000
 */
export function sampleRateFrom(mimeType: string): number {
  const rate = Number(RATE_PARAMETER.exec(mimeType)?.[1]);
  return Number.isInteger(rate) && rate >= MIN_SAMPLE_RATE && rate <= MAX_SAMPLE_RATE ? rate : DEFAULT_SAMPLE_RATE;
}

function decode(audio: SpeechAudio | undefined): Uint8Array {
  if (audio === undefined || !RAW_PCM_TYPE.test(audio.mimeType.trim())) return new Uint8Array();
  return base64ToBytes(audio.dataBase64);
}

/**
 * Creates a failover speech client over `options.models`, remembering the last model that worked.
 * @example
 * const speech = createSpeechClient({ caller, models: ['tts-a', 'tts-b'], timeoutMs: 45_000, now: Date.now });
 */
export function createSpeechClient(options: SpeechClientOptions): SpeechClient {
  const { caller, models, timeoutMs, now } = options;
  let preferred: string | undefined;

  return {
    configured: true,
    async synthesize(req) {
      let failure = appError('UPSTREAM_FAILURE', SPEECH_UNAVAILABLE, 'no speech models configured');
      for (const model of failoverOrder(models, preferred)) {
        const startedAt = now();
        const timeout = AbortSignal.timeout(timeoutMs);
        const signal = req.signal === undefined ? timeout : AbortSignal.any([req.signal, timeout]);
        try {
          const audio = await Promise.race([caller({ model, text: req.text, signal }), rejectOnAbort(signal)]);
          const pcm = decode(audio);
          if (audio !== undefined && pcm.length > 0) {
            preferred = model;
            return ok({ pcm, sampleRate: sampleRateFrom(audio.mimeType), model, ms: now() - startedAt });
          }
          failure = appError('UPSTREAM_FAILURE', SPEECH_UNAVAILABLE, `${model}: no playable audio`);
        } catch (error: unknown) {
          const status = statusOf(error);
          const code = timeout.aborted ? 'UPSTREAM_TIMEOUT' : 'UPSTREAM_FAILURE';
          failure = appError(code, SPEECH_UNAVAILABLE, `${model}: status ${status ?? 'none'}`);
          if (!timeout.aborted && (!isRetryableStatus(status) || req.signal?.aborted === true)) break;
        }
      }
      return err(failure);
    },
  };
}

/**
 * A client for when no API key is configured: every call fails fast so the web falls back to
 * the browser's own speech synthesis.
 * @example
 * createOfflineSpeechClient().configured; // false
 */
export function createOfflineSpeechClient(): SpeechClient {
  const offline = appError('UPSTREAM_FAILURE', SPEECH_UNAVAILABLE, 'no API key configured');
  return { configured: false, synthesize: () => Promise.resolve(err(offline)) };
}
