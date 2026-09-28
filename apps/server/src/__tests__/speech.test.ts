/**
 * POST /api/speech and the speech service: default Google voice, translation into the
 * listening language, fallback through the other voices, masking before any third party,
 * and no text in logs.
 */
import {
  type LanguageCode,
  MAX_SPEECH_CHARS,
  SPEECH_TRANSLATED_HEADER,
  SPEECH_VOICE_HEADER,
  appError,
  err,
  ok,
} from '@sign-se-pehle/core';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createSpeechService } from '../services/speech-service.js';
import type { Translator, VoiceEngine } from '../services/voice-engine.js';
import { type SpeechFactory, makeApp } from './helpers.js';

/** Marker text that must never reach a log line. */
const SPOKEN = 'Your deposit is two months of rent (read-aloud marker 7f3a).';
const MP3 = new Uint8Array([0xff, 0xf3, 0x84, 0xc4]);

type Outcome = 'ok' | 'fail' | 'off';

interface FakeVoice extends VoiceEngine {
  readonly heard: { text: string; language: LanguageCode }[];
}

interface FakeTranslator extends Translator {
  readonly asked: { text: string; from: LanguageCode; to: LanguageCode }[];
}

function fakeVoice(outcome: Outcome): FakeVoice {
  const heard: FakeVoice['heard'] = [];
  return {
    heard,
    configured: outcome !== 'off',
    speak: (text, language) => {
      heard.push({ text, language });
      return Promise.resolve(
        outcome === 'ok'
          ? ok({ bytes: MP3, mimeType: 'audio/mpeg' })
          : err(appError('UPSTREAM_FAILURE', 'Read-aloud is unavailable right now.', 'voice: status 500 7f3a')),
      );
    },
  };
}

function fakeTranslator(outcome: Outcome, tag: string): FakeTranslator {
  const asked: FakeTranslator['asked'] = [];
  return {
    asked,
    configured: outcome !== 'off',
    translate: (text, from, to) => {
      asked.push({ text, from, to });
      return Promise.resolve(
        outcome === 'ok' ? ok(`${tag}:${to}:${text}`) : err(appError('UPSTREAM_FAILURE', 'x', `${tag}: status 429`)),
      );
    },
  };
}

interface Rig {
  readonly google: FakeVoice;
  readonly sarvam: FakeVoice;
  readonly gemini: FakeVoice;
  readonly googleTranslate: FakeTranslator;
  readonly sarvamTranslate: FakeTranslator;
  readonly factory: SpeechFactory;
}

function rig(outcomes: Partial<Record<'google' | 'sarvam' | 'gemini' | 'googleTranslate' | 'sarvamTranslate', Outcome>> = {}): Rig {
  const google = fakeVoice(outcomes.google ?? 'ok');
  const sarvam = fakeVoice(outcomes.sarvam ?? 'ok');
  const gemini = fakeVoice(outcomes.gemini ?? 'ok');
  const googleTranslate = fakeTranslator(outcomes.googleTranslate ?? 'ok', 'google');
  const sarvamTranslate = fakeTranslator(outcomes.sarvamTranslate ?? 'ok', 'sarvam');
  const factory: SpeechFactory = (logger) =>
    createSpeechService({
      voices: { google, sarvam, gemini },
      translators: { google: googleTranslate, sarvam: sarvamTranslate },
      logger,
    });
  return { google, sarvam, gemini, googleTranslate, sarvamTranslate, factory };
}

function post(factory: SpeechFactory, body: object) {
  const test = makeApp(undefined, {}, factory);
  return { test, res: request(test.app).post('/api/speech').send(body).responseType('blob') };
}

describe('POST /api/speech', () => {
  it('reads with the free Google voice by default, uncached and labelled', async () => {
    const voices = rig();
    const { test, res } = post(voices.factory, { text: SPOKEN, language: 'hi' });
    const reply = await res;

    expect(reply.status).toBe(200);
    expect(reply.headers['content-type']).toMatch(/^audio\/mpeg/);
    expect(reply.headers['cache-control']).toBe('no-store');
    expect(reply.headers[SPEECH_VOICE_HEADER.toLowerCase()]).toBe('google');
    expect(reply.headers[SPEECH_TRANSLATED_HEADER.toLowerCase()]).toBe('0');
    expect(Buffer.isBuffer(reply.body) ? [...reply.body] : []).toEqual([...MP3]);
    expect(voices.google.heard).toEqual([{ text: SPOKEN, language: 'hi' }]);
    expect(voices.googleTranslate.asked).toEqual([]);
    expect(test.logs.join('\n')).not.toContain('7f3a');
  });

  it('translates into the listening language before speaking', async () => {
    const voices = rig();
    const reply = await post(voices.factory, { text: SPOKEN, language: 'ta', textLanguage: 'en' }).res;

    expect(reply.headers[SPEECH_TRANSLATED_HEADER.toLowerCase()]).toBe('1');
    expect(voices.googleTranslate.asked).toEqual([{ text: SPOKEN, from: 'en', to: 'ta' }]);
    expect(voices.google.heard).toEqual([{ text: `google:ta:${SPOKEN}`, language: 'ta' }]);
    expect(voices.sarvamTranslate.asked).toEqual([]);
  });

  it('uses Sarvam’s own translator for the Sarvam voice', async () => {
    const voices = rig();
    await post(voices.factory, { text: SPOKEN, language: 'kn', textLanguage: 'en', voice: 'sarvam' }).res;
    expect(voices.sarvamTranslate.asked).toHaveLength(1);
    expect(voices.sarvam.heard[0]?.text).toBe(`sarvam:kn:${SPOKEN}`);
    expect(voices.googleTranslate.asked).toEqual([]);
  });

  it('masks personal details before any translator or voice sees them', async () => {
    const voices = rig();
    await post(voices.factory, { text: 'Call me on 98765 43210 about PAN ABCDE1234F.', language: 'bn', textLanguage: 'en' }).res;
    const seen = [...voices.googleTranslate.asked.map((call) => call.text), ...voices.google.heard.map((call) => call.text)].join(' ');
    expect(seen).not.toMatch(/98765|43210|ABCDE1234F/);
  });

  it('sends Odia to Sarvam without trying Google, which has no Odia voice', async () => {
    const voices = rig();
    const reply = await post(voices.factory, { text: SPOKEN, language: 'or', textLanguage: 'en' }).res;
    expect(reply.headers[SPEECH_VOICE_HEADER.toLowerCase()]).toBe('sarvam');
    expect(voices.google.heard).toEqual([]);
    expect(voices.sarvam.heard).toHaveLength(1);
  });

  it('falls back to the next voice and logs only the voice and hint', async () => {
    const voices = rig({ google: 'fail' });
    const { test, res } = post(voices.factory, { text: SPOKEN, language: 'en' });
    const reply = await res;
    expect(reply.status).toBe(200);
    expect(reply.headers[SPEECH_VOICE_HEADER.toLowerCase()]).toBe('sarvam');
    const warning = test.logs.find((line) => line.includes('speech voice fell back'));
    expect(warning).toContain('"voice":"google"');
    expect(test.logs.join('\n')).not.toContain('read-aloud marker');
  });

  it('skips a voice without a key and falls back between translators', async () => {
    const voices = rig({ google: 'fail', sarvam: 'off', googleTranslate: 'fail', sarvamTranslate: 'off' });
    const reply = await post(voices.factory, { text: SPOKEN, language: 'hi', textLanguage: 'en' }).res;
    expect(reply.status).toBe(502);
    expect(voices.sarvam.heard).toEqual([]);

    const recovering = rig({ google: 'fail', sarvam: 'off', googleTranslate: 'fail' });
    const recovered = await post(recovering.factory, { text: SPOKEN, language: 'hi', textLanguage: 'en' }).res;
    expect(recovered.status).toBe(200);
    expect(recovered.headers[SPEECH_VOICE_HEADER.toLowerCase()]).toBe('gemini');
    expect(recovering.sarvamTranslate.asked).toHaveLength(1);
  });

  it('answers 502 with only the user-safe message when every voice fails', async () => {
    const voices = rig({ google: 'fail', sarvam: 'fail', gemini: 'fail' });
    const reply = await request(makeApp(undefined, {}, voices.factory).app).post('/api/speech').send({ text: SPOKEN, language: 'en' });
    expect(reply.status).toBe(502);
    expect(reply.body).toEqual({ error: { code: 'UPSTREAM_FAILURE', message: 'Read-aloud is unavailable right now.' } });
  });

  it('answers 502 when nothing is configured so the web can use the device voice', async () => {
    const reply = await request(makeApp().app).post('/api/speech').send({ text: SPOKEN, language: 'en' });
    expect(reply.status).toBe(502);
    expect(reply.body.error.code).toBe('UPSTREAM_FAILURE');
  });

  it.each([
    ['text that is too long', { text: 'a'.repeat(MAX_SPEECH_CHARS + 1), language: 'en' }],
    ['empty text', { text: '   ', language: 'en' }],
    ['an unknown language', { text: SPOKEN, language: 'xx' }],
    ['an unknown voice', { text: SPOKEN, language: 'en', voice: 'robot' }],
  ])('rejects %s with 400', async (_label, invalid) => {
    const voices = rig();
    const reply = await request(makeApp(undefined, {}, voices.factory).app).post('/api/speech').send(invalid);
    expect(reply.status).toBe(400);
    expect(reply.body.error.code).toBe('VALIDATION_FAILED');
    expect(voices.google.heard).toEqual([]);
  });

  it('lists the voices that can run in /api/health', async () => {
    const voices = rig({ sarvam: 'off' });
    const reply = await request(makeApp(undefined, {}, voices.factory).app).get('/api/health');
    expect(reply.body.speech).toEqual({ voices: ['google', 'gemini'] });
  });

  it('logs an empty hint rather than crashing when a failure carries none', async () => {
    const test = makeApp();
    const hintless = appError('UPSTREAM_FAILURE');
    const speech = createSpeechService({
      voices: {
        google: { configured: true, speak: () => Promise.resolve(err(hintless)) },
        sarvam: { configured: true, speak: () => Promise.resolve(ok({ bytes: new Uint8Array([1]), mimeType: 'audio/mpeg' })) },
        gemini: { configured: false, speak: () => Promise.reject(new Error('unused')) },
      },
      translators: {
        google: { configured: true, translate: () => Promise.resolve(err(hintless)) },
        sarvam: { configured: true, translate: () => Promise.resolve(ok('translated')) },
      },
      logger: test.logger,
    });
    const result = await speech.speak({ text: SPOKEN, language: 'hi', textLanguage: 'en' });
    expect(result.ok ? result.value.voice : '').toBe('sarvam');
    expect(test.logs.some((line) => line.includes('"hint":""'))).toBe(true);
  });
});
