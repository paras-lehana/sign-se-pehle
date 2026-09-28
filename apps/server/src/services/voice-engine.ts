/**
 * Contracts shared by the read-aloud engines: a voice turns text into an audio file and a
 * translator turns text from one app language into another.
 *
 * Responsibility: the small interfaces the speech service composes, plus the helpers both
 * HTTP engines use — a timed POST that maps every failure to an UPSTREAM_* AppError, and
 * byte joining for multi-part audio. Boundary: no provider details; hints name only the
 * service and a status, never the text or an upstream body.
 */
import { type LanguageCode, type Result, appError, err, ok } from '@sign-se-pehle/core';

export type AudioMimeType = 'audio/mpeg' | 'audio/wav';

export interface AudioFile {
  readonly bytes: Uint8Array;
  readonly mimeType: AudioMimeType;
}

export interface VoiceEngine {
  /** False when the engine lacks what it needs (an API key); the speech service skips it. */
  readonly configured: boolean;
  speak(text: string, language: LanguageCode): Promise<Result<AudioFile>>;
}

export interface Translator {
  readonly configured: boolean;
  translate(text: string, from: LanguageCode, to: LanguageCode): Promise<Result<string>>;
}

export type Fetch = typeof fetch;

/** User-safe copy for any read-aloud failure; the web then falls back to the device's voice. */
export const SPEECH_UNAVAILABLE = 'Read-aloud is unavailable right now.';

/** One answer larger than this is refused: about ten minutes of speech in any engine's format. */
export const MAX_AUDIO_BYTES = 8 * 1024 * 1024;

interface PostRequest {
  readonly url: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: string;
  readonly timeoutMs: number;
  /** Names the upstream in log hints, e.g. "sarvam speech". */
  readonly service: string;
}

/**
 * POSTs with a timeout and returns the reply body as text. A network error, a timeout or a
 * non-2xx status becomes an UPSTREAM_* error whose hint carries only the service and status.
 * @example
 * await postText(fetch, { url, headers, body, timeoutMs: 20_000, service: 'google speech' });
 */
export async function postText(fetchImpl: Fetch, request: PostRequest): Promise<Result<string>> {
  const signal = AbortSignal.timeout(request.timeoutMs);
  try {
    const res = await fetchImpl(request.url, {
      method: 'POST',
      headers: request.headers,
      body: request.body,
      signal,
    });
    if (!res.ok) {
      return err(appError('UPSTREAM_FAILURE', SPEECH_UNAVAILABLE, `${request.service}: status ${res.status}`));
    }
    return ok(await res.text());
  } catch {
    const code = signal.aborted ? 'UPSTREAM_TIMEOUT' : 'UPSTREAM_FAILURE';
    return err(appError(code, SPEECH_UNAVAILABLE, `${request.service}: ${signal.aborted ? 'timeout' : 'network error'}`));
  }
}

/**
 * Joins audio parts in order into one buffer (MP3 frames play back to back).
 * @example
 * joinBytes([new Uint8Array([1]), new Uint8Array([2, 3])]); // Uint8Array [1, 2, 3]
 */
export function joinBytes(parts: readonly Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

/**
 * Checks decoded audio before it is served: empty or oversized answers are upstream faults.
 * @example
 * checkedAudio(bytes, 'audio/mpeg', 'google speech');
 */
export function checkedAudio(bytes: Uint8Array, mimeType: AudioMimeType, service: string): Result<AudioFile> {
  if (bytes.length === 0) return err(appError('UPSTREAM_FAILURE', SPEECH_UNAVAILABLE, `${service}: no audio`));
  if (bytes.length > MAX_AUDIO_BYTES) {
    return err(appError('UPSTREAM_FAILURE', SPEECH_UNAVAILABLE, `${service}: audio too large`));
  }
  return ok({ bytes, mimeType });
}

/**
 * A voice for a provider without a key: never configured, always refuses.
 * @example
 * unconfiguredVoice('sarvam').configured; // false
 */
export function unconfiguredVoice(service: string): VoiceEngine {
  const refusal = err(appError('UPSTREAM_FAILURE', SPEECH_UNAVAILABLE, `${service}: not configured`));
  return { configured: false, speak: () => Promise.resolve(refusal) };
}

/**
 * A translator for a provider without a key: never configured, always refuses.
 * @example
 * unconfiguredTranslator('sarvam').configured; // false
 */
export function unconfiguredTranslator(service: string): Translator {
  const refusal = err(appError('UPSTREAM_FAILURE', SPEECH_UNAVAILABLE, `${service}: not configured`));
  return { configured: false, translate: () => Promise.resolve(refusal) };
}
