/**
 * Read-aloud engines against a fake fetch: Google's free voice and translator, Sarvam's
 * voice and translator, the Gemini adapter and the ordered parallel helper.
 */
import { WAV_HEADER_BYTES, appError, err, ok } from '@sign-se-pehle/core';
import { describe, expect, it } from 'vitest';
import { mapWithConcurrency } from '../services/concurrency.js';
import {
  GOOGLE_SPEECH_MAX_CHARS,
  createGoogleFreeClient,
  parseSpeechReply,
  parseTranslation,
} from '../services/google-free-client.js';
import { createSarvamClient, sarvamLanguageCode } from '../services/sarvam-client.js';
import { type SpeechClient, geminiVoice } from '../services/speech-client.js';
import {
  MAX_AUDIO_BYTES,
  checkedAudio,
  type Fetch,
  unconfiguredTranslator,
  unconfiguredVoice,
} from '../services/voice-engine.js';

const KEY = 'sk_test_key_never_logged';
const LONG_TEXT = Array.from({ length: 9 }, (_, index) => `Clause ${index + 1} lets the landlord keep the deposit for any reason at all.`).join(' ');

interface Call {
  readonly url: string;
  readonly headers: Headers;
  readonly body: string;
}

function fakeFetch(respond: (call: Call) => Response | Promise<Response>): { fetch: Fetch; calls: Call[]; peak: () => number } {
  const calls: Call[] = [];
  let inFlight = 0;
  let peak = 0;
  const fetchImpl: Fetch = async (input, init) => {
    const call = { url: String(input), headers: new Headers(init?.headers), body: typeof init?.body === 'string' ? init.body : '' };
    calls.push(call);
    inFlight += 1;
    peak = Math.max(peak, inFlight);
    await new Promise((resolve) => setTimeout(resolve, 1));
    try {
      return await respond(call);
    } finally {
      inFlight -= 1;
    }
  };
  return { fetch: fetchImpl, calls, peak: () => peak };
}

/** A batchexecute reply carrying `bytes` as the jQ1olc audio payload. */
function speechReply(bytes: number[]): Response {
  const base64 = Buffer.from(bytes).toString('base64');
  return new Response(`)]}'\n\n96\n[["wrb.fr","jQ1olc","[\\"${base64}\\"]",null,null,null,"generic"]]`);
}

/** The text sent in one Google speech request, decoded from its f.req form field. */
function spokenPart(call: Call): string {
  const rpc: unknown = JSON.parse(new URLSearchParams(call.body).get('f.req') ?? 'null');
  const inner = Array.isArray(rpc) && Array.isArray(rpc[0]) && Array.isArray(rpc[0][0]) ? rpc[0][0][1] : '';
  const args: unknown = typeof inner === 'string' ? JSON.parse(inner) : [];
  return Array.isArray(args) && typeof args[0] === 'string' ? args[0] : '';
}

describe('Google free voice', () => {
  it('splits long text, keeps it out of the URL, and joins the MP3 parts in order', async () => {
    const fake = fakeFetch((call) => speechReply([spokenPart(call).length % 256]));
    const google = createGoogleFreeClient({ fetch: fake.fetch, timeoutMs: 1_000 });
    const result = await google.voice.speak(LONG_TEXT, 'hi');

    expect(result.ok).toBe(true);
    const parts = fake.calls.map(spokenPart);
    expect(parts.length).toBeGreaterThan(1);
    for (const part of parts) expect(part.length).toBeLessThanOrEqual(GOOGLE_SPEECH_MAX_CHARS);
    expect(parts.join(' ')).toBe(LONG_TEXT);
    for (const call of fake.calls) {
      expect(call.url).toBe('https://translate.google.com/_/TranslateWebserverUi/data/batchexecute');
      expect(call.url).not.toContain('landlord');
    }
    expect(result.ok ? [...result.value.bytes] : []).toEqual(parts.map((part) => part.length % 256));
    expect(result.ok ? result.value.mimeType : '').toBe('audio/mpeg');
    expect(fake.peak()).toBeLessThanOrEqual(4);
  });

  it('fails when a part comes back without audio', async () => {
    const google = createGoogleFreeClient({ fetch: fakeFetch(() => new Response(')]}\'\n[["wrb.fr","jQ1olc",null]]')).fetch, timeoutMs: 1_000 });
    const result = await google.voice.speak('Short text.', 'ta');
    expect(result).toEqual(err(appError('UPSTREAM_FAILURE', 'Read-aloud is unavailable right now.', 'google speech: no audio')));
  });

  it('maps HTTP errors, network errors and timeouts without the text', async () => {
    const rejected = createGoogleFreeClient({ fetch: fakeFetch(() => new Response('busy', { status: 429 })).fetch, timeoutMs: 1_000 });
    const status = await rejected.voice.speak('Secret words.', 'en');
    expect(status.ok ? '' : status.error.internalHint).toBe('google speech: status 429');

    const offline = createGoogleFreeClient({ fetch: () => Promise.reject(new Error('Secret words')), timeoutMs: 1_000 });
    const network = await offline.voice.speak('Secret words.', 'en');
    expect(network.ok ? '' : network.error.internalHint).toBe('google speech: network error');

    const hanging: Fetch = (_input, init) =>
      new Promise((_resolve, reject) => init?.signal?.addEventListener('abort', () => reject(new Error('aborted'))));
    const slow = createGoogleFreeClient({ fetch: hanging, timeoutMs: 5 });
    const timeout = await slow.voice.speak('Secret words.', 'en');
    expect(timeout.ok ? '' : timeout.error.code).toBe('UPSTREAM_TIMEOUT');
    expect(JSON.stringify([status, network, timeout])).not.toContain('Secret');
  });
});

describe('Google free translator', () => {
  it('posts the text in the body and joins the translated segments', async () => {
    const fake = fakeFetch(() => new Response(JSON.stringify([[['नमस्ते। ', 'Hello. '], ['पढ़ें।', 'Read.']], null, 'en'])));
    const google = createGoogleFreeClient({ fetch: fake.fetch, timeoutMs: 1_000 });
    const result = await google.translator.translate('Hello. Read.', 'en', 'hi');

    expect(result).toEqual(ok('नमस्ते। पढ़ें।'));
    const call = fake.calls[0];
    expect(call?.url).toBe('https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=hi&dt=t');
    expect(new URLSearchParams(call?.body).get('q')).toBe('Hello. Read.');
  });

  it('rejects replies it cannot read, and skips a segment with no text', async () => {
    expect(parseTranslation('not json')).toBeUndefined();
    expect(parseTranslation('{"a":1}')).toBeUndefined();
    expect(parseTranslation('[1,2,3]')).toBeUndefined();
    expect(parseTranslation('[[[""]]]')).toBeUndefined();
    expect(parseTranslation(JSON.stringify([[['Hi. ', 'Hi.'], [123]], null, 'en']))).toBe('Hi. ');
    const google = createGoogleFreeClient({ fetch: fakeFetch(() => new Response('<html>')).fetch, timeoutMs: 1_000 });
    const result = await google.translator.translate('Hello', 'en', 'ta');
    expect(result.ok ? '' : result.error.internalHint).toBe('google translate: unreadable reply');
  });

  it('maps a translate HTTP failure the same way as a speech failure', async () => {
    const rejected = createGoogleFreeClient({ fetch: fakeFetch(() => new Response('busy', { status: 500 })).fetch, timeoutMs: 1_000 });
    const result = await rejected.translator.translate('Secret words.', 'en', 'hi');
    expect(result.ok ? '' : result.error.internalHint).toBe('google translate: status 500');
    expect(JSON.stringify(result)).not.toContain('Secret');
  });

  it('parses the audio payload out of a batchexecute reply', () => {
    expect(parseSpeechReply(')]}\'\n[["wrb.fr","jQ1olc","[\\"SUQz\\"]"]]')).toEqual(new Uint8Array([73, 68, 51]));
    expect(parseSpeechReply('[["wrb.fr","other"]]')).toBeUndefined();
  });
});

describe('Sarvam', () => {
  const options = { apiKey: KEY, ttsModel: 'bulbul:v3', speaker: 'shubh', translateModel: 'sarvam-translate:v1', timeoutMs: 1_000 };

  it('speaks with the key only in its header and Odia as od-IN', async () => {
    const audio = [Buffer.from([1, 2]).toString('base64'), Buffer.from([3]).toString('base64')];
    const fake = fakeFetch(() => new Response(JSON.stringify({ request_id: 'r1', audios: audio })));
    const sarvam = createSarvamClient({ ...options, fetch: fake.fetch });
    const result = await sarvam.voice.speak('ଜମା ରଖିପାରିବେ।', 'or');

    expect(result).toEqual(ok({ bytes: new Uint8Array([1, 2, 3]), mimeType: 'audio/mpeg' }));
    const call = fake.calls[0];
    expect(call?.url).toBe('https://api.sarvam.ai/text-to-speech');
    expect(call?.headers.get('api-subscription-key')).toBe(KEY);
    expect(JSON.parse(call?.body ?? '{}')).toEqual({
      text: 'ଜମା ରଖିପାରିବେ।',
      target_language_code: 'od-IN',
      model: 'bulbul:v3',
      speaker: 'shubh',
      output_audio_codec: 'mp3',
    });
    expect(call?.url).not.toContain(KEY);
    expect(call?.body).not.toContain(KEY);
  });

  it('translates between Sarvam language codes', async () => {
    const fake = fakeFetch(() => new Response(JSON.stringify({ translated_text: 'வைப்புத்தொகை' })));
    const sarvam = createSarvamClient({ ...options, fetch: fake.fetch });
    expect(await sarvam.translator.translate('deposit', 'en', 'ta')).toEqual(ok('வைப்புத்தொகை'));
    expect(JSON.parse(fake.calls[0]?.body ?? '{}')).toEqual({
      input: 'deposit',
      source_language_code: 'en-IN',
      target_language_code: 'ta-IN',
      model: 'sarvam-translate:v1',
    });
  });

  it('turns rejections and odd replies into errors that name neither key nor text', async () => {
    const denied = createSarvamClient({ ...options, fetch: fakeFetch(() => new Response('{"error":"bad key"}', { status: 403 })).fetch });
    const odd = createSarvamClient({ ...options, fetch: fakeFetch(() => new Response('{"audios":[]}')).fetch });
    const notJson = createSarvamClient({ ...options, fetch: fakeFetch(() => new Response('not json at all')).fetch });
    const results = [
      await denied.voice.speak('Secret words.', 'hi'),
      await odd.voice.speak('Secret words.', 'hi'),
      await notJson.voice.speak('Secret words.', 'hi'),
    ];
    expect(results.map((result) => (result.ok ? '' : result.error.internalHint))).toEqual([
      'sarvam speech: status 403',
      'sarvam speech: unreadable reply',
      'sarvam speech: unreadable reply',
    ]);
    expect(JSON.stringify(results)).not.toMatch(/Secret|sk_test/);
  });

  it('maps a translate failure the same way as a speech failure', async () => {
    const denied = createSarvamClient({ ...options, fetch: fakeFetch(() => new Response('nope', { status: 401 })).fetch });
    const result = await denied.translator.translate('Secret words.', 'en', 'hi');
    expect(result.ok ? '' : result.error.internalHint).toBe('sarvam translate: status 401');
    expect(JSON.stringify(result)).not.toContain('Secret');
  });

  it('maps every app language, only Odia differently', () => {
    expect(sarvamLanguageCode('or')).toBe('od-IN');
    expect(sarvamLanguageCode('pa')).toBe('pa-IN');
  });
});

describe('Gemini voice adapter', () => {
  it('wraps Gemini PCM as WAV and passes failures through', async () => {
    const pcm = new Uint8Array(480);
    const working: SpeechClient = {
      configured: true,
      synthesize: () => Promise.resolve(ok({ pcm, sampleRate: 24_000, model: 'tts-a', ms: 9 })),
    };
    const result = await geminiVoice(working).speak('Namaste', 'hi');
    expect(result.ok ? result.value.bytes.length : 0).toBe(WAV_HEADER_BYTES + pcm.length);
    expect(result.ok ? result.value.mimeType : '').toBe('audio/wav');

    const failure = appError('UPSTREAM_FAILURE', 'x', 'tts-a: status 500');
    const broken: SpeechClient = { configured: false, synthesize: () => Promise.resolve(err(failure)) };
    expect(geminiVoice(broken).configured).toBe(false);
    expect(await geminiVoice(broken).speak('Namaste', 'hi')).toEqual(err(failure));
  });
});

describe('checkedAudio', () => {
  it('refuses empty and oversized audio, accepts a real payload', () => {
    expect(checkedAudio(new Uint8Array(), 'audio/mpeg', 'test voice')).toEqual(
      err(appError('UPSTREAM_FAILURE', 'Read-aloud is unavailable right now.', 'test voice: no audio')),
    );
    expect(checkedAudio(new Uint8Array(MAX_AUDIO_BYTES + 1), 'audio/mpeg', 'test voice')).toEqual(
      err(appError('UPSTREAM_FAILURE', 'Read-aloud is unavailable right now.', 'test voice: audio too large')),
    );
    const bytes = new Uint8Array([1, 2, 3]);
    expect(checkedAudio(bytes, 'audio/wav', 'test voice')).toEqual(ok({ bytes, mimeType: 'audio/wav' }));
  });
});

describe('unconfigured engines', () => {
  it('always refuse, naming only the service that has no key', async () => {
    const voice = unconfiguredVoice('test voice');
    expect(voice.configured).toBe(false);
    const spoken = await voice.speak('Secret words.', 'en');
    expect(spoken.ok ? '' : spoken.error.internalHint).toBe('test voice: not configured');

    const translator = unconfiguredTranslator('test translator');
    expect(translator.configured).toBe(false);
    const translated = await translator.translate('Secret words.', 'en', 'hi');
    expect(translated.ok ? '' : translated.error.internalHint).toBe('test translator: not configured');
    expect(JSON.stringify([spoken, translated])).not.toContain('Secret');
  });
});

describe('mapWithConcurrency', () => {
  it('keeps input order and never runs more than the limit at once', async () => {
    let running = 0;
    let peak = 0;
    const results = await mapWithConcurrency([30, 5, 20, 1, 10], 2, async (delay) => {
      running += 1;
      peak = Math.max(peak, running);
      await new Promise((resolve) => setTimeout(resolve, delay));
      running -= 1;
      return delay * 2;
    });
    expect(results).toEqual([60, 10, 40, 2, 20]);
    expect(peak).toBe(2);
    expect(await mapWithConcurrency([], 3, () => Promise.resolve(1))).toEqual([]);
  });
});
