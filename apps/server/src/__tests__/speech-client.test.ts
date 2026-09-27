import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SAMPLE_RATE,
  type SpeechAudio,
  type SpeechCall,
  createOfflineSpeechClient,
  createSpeechClient,
  sampleRateFrom,
} from '../services/speech-client.js';
import { TEST_TTS_MODELS, createFakeClock, statusError } from './helpers.js';

/** Six arbitrary PCM bytes and their base64 form, computed rather than typed in. */
const PCM = Uint8Array.from([1, 2, 3, 250, 251, 252]);
const AUDIO: SpeechAudio = { dataBase64: Buffer.from(PCM).toString('base64'), mimeType: 'audio/L16;codec=pcm;rate=16000' };

/** Short enough to keep the timeout test fast, long enough for scripted replies to win the race. */
const TIMEOUT_MS = 30;

type Step = (call: SpeechCall) => Promise<SpeechAudio | undefined>;

function client(steps: readonly Step[]) {
  const calls: SpeechCall[] = [];
  const clock = createFakeClock();
  const speech = createSpeechClient({
    caller: (call) => {
      calls.push(call);
      const step = steps[calls.length - 1] ?? steps.at(-1);
      return step === undefined ? Promise.resolve(undefined) : step(call);
    },
    models: TEST_TTS_MODELS,
    timeoutMs: TIMEOUT_MS,
    now: clock.now,
  });
  return { speech, calls };
}

const succeed: Step = () => Promise.resolve(AUDIO);
const fail = (status: number): Step => () => Promise.reject(statusError(status));

describe('createSpeechClient', () => {
  it('decodes PCM and reads the sample rate from the MIME type', async () => {
    const { speech, calls } = client([succeed]);
    const result = await speech.synthesize({ text: 'Namaste' });
    expect(result.ok ? { ...result.value, pcm: Array.from(result.value.pcm) } : result.error).toEqual({ pcm: Array.from(PCM), sampleRate: 16_000, model: 'tts-a', ms: 0 });
    expect(calls.map((call) => [call.model, call.text])).toEqual([['tts-a', 'Namaste']]);
  });

  it('fails over on retryable errors and then prefers the model that worked', async () => {
    const { speech, calls } = client([fail(404), succeed, succeed]);
    const first = await speech.synthesize({ text: 'a' });
    const second = await speech.synthesize({ text: 'b' });
    expect(first.ok && first.value.model).toBe('tts-b');
    expect(second.ok && second.value.model).toBe('tts-b');
    expect(calls.map((call) => call.model)).toEqual(['tts-a', 'tts-b', 'tts-b']);
  });

  it('stops at a key problem and keeps upstream text out of the error', async () => {
    const { speech, calls } = client([fail(403)]);
    const result = await speech.synthesize({ text: 'a' });
    expect(calls).toHaveLength(1);
    expect(result.ok ? 'ok' : result.error.code).toBe('UPSTREAM_FAILURE');
    expect(result.ok ? '' : result.error.internalHint).toBe('tts-a: status 403');
    expect(JSON.stringify(result)).not.toContain('secret body');
  });

  it('treats missing or non-PCM audio as a failure and tries the next model', async () => {
    const { speech, calls } = client([() => Promise.resolve(undefined), () => Promise.resolve({ ...AUDIO, mimeType: 'audio/mpeg' })]);
    const result = await speech.synthesize({ text: 'a' });
    expect(calls).toHaveLength(2);
    expect(result.ok ? '' : result.error.internalHint).toBe('tts-b: no playable audio');
  });

  it('accepts audio without a MIME type at the default rate', async () => {
    const { speech } = client([() => Promise.resolve({ ...AUDIO, mimeType: '' })]);
    const result = await speech.synthesize({ text: 'a' });
    expect(result.ok ? result.value.sampleRate : 0).toBe(DEFAULT_SAMPLE_RATE);
  });

  it('times out each model and reports a timeout', async () => {
    const { speech, calls } = client([() => new Promise(() => undefined)]);
    const result = await speech.synthesize({ text: 'a' });
    expect(calls).toHaveLength(TEST_TTS_MODELS.length);
    expect(result.ok ? 'ok' : result.error.code).toBe('UPSTREAM_TIMEOUT');
  });

  it('stops without failover when the caller cancels mid-request', async () => {
    const controller = new AbortController();
    const { speech, calls } = client([
      () => {
        controller.abort();
        return new Promise(() => undefined);
      },
    ]);
    const result = await speech.synthesize({ text: 'a', signal: controller.signal });
    expect(calls).toHaveLength(1);
    expect(result.ok ? 'ok' : result.error.code).toBe('UPSTREAM_FAILURE');
  });

  it('reports a failure when no models are configured', async () => {
    const speech = createSpeechClient({ caller: succeed, models: [], timeoutMs: TIMEOUT_MS, now: Date.now });
    const result = await speech.synthesize({ text: 'a' });
    expect(result.ok ? '' : result.error.internalHint).toBe('no speech models configured');
  });
});

describe('sampleRateFrom', () => {
  it.each([
    ['audio/L16;codec=pcm;rate=24000', 24_000],
    ['audio/pcm; rate=44100', 44_100],
    ['audio/L16', DEFAULT_SAMPLE_RATE],
    ['audio/L16;rate=1', DEFAULT_SAMPLE_RATE],
    ['audio/L16;rate=999999', DEFAULT_SAMPLE_RATE],
  ])('%s → %i Hz', (mimeType, rate) => {
    expect(sampleRateFrom(mimeType)).toBe(rate);
  });
});

describe('createOfflineSpeechClient', () => {
  it('is unconfigured and fails fast with a user-safe message', async () => {
    const speech = createOfflineSpeechClient();
    const result = await speech.synthesize({ text: 'a' });
    expect(speech.configured).toBe(false);
    expect(result.ok ? 'ok' : result.error.code).toBe('UPSTREAM_FAILURE');
    expect(result.ok ? '' : result.error.message).not.toMatch(/key/i);
  });
});
