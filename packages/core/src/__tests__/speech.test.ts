import { describe, expect, it } from 'vitest';
import { LANGUAGE_CODES, languageLabel } from '../domain/languages.js';
import { MAX_SPEECH_CHARS } from '../schemas/limits.js';
import { speechRequestSchema } from '../schemas/requests.js';
import { splitIntoSpeechChunks } from '../speech/chunks.js';
import {
  DEFAULT_SPEECH_VOICE,
  SPEECH_VOICES,
  VOICE_PROFILES,
  voiceOrder,
  voiceSpeaks,
} from '../speech/voices.js';

/** Google's free voice took 200 characters live and failed at 300; the server asks for 180. */
const GOOGLE_CHUNK = 180;

const SUMMARY =
  'This agreement strongly favours the landlord. The deposit is six months of rent, refundable only at the landlord’s discretion. ' +
  'If you leave during the eleven-month lock-in, you pay rent for every remaining month; the landlord may also enter at any time, without notice, for inspection.';

const HINDI =
  'मकान मालिक आपकी जमा राशि रख सकता है। हस्ताक्षर करने से पहले लॉक-इन क्लॉज़ पढ़ें। यह समझौता किरायेदार के लिए बहुत एकतरफा है।';

describe('voice table', () => {
  it('makes the free Google voice the default', () => {
    expect(DEFAULT_SPEECH_VOICE).toBe('google');
    expect(SPEECH_VOICES[0]).toBe(DEFAULT_SPEECH_VOICE);
  });

  it('gives every app language at least one voice, and Sarvam all of them', () => {
    for (const language of LANGUAGE_CODES) {
      expect(voiceOrder(DEFAULT_SPEECH_VOICE, language).length).toBeGreaterThan(0);
      expect(voiceSpeaks('sarvam', language)).toBe(true);
    }
  });

  it('only lists languages the app supports', () => {
    for (const voice of SPEECH_VOICES) {
      for (const language of VOICE_PROFILES[voice].languages) {
        expect(LANGUAGE_CODES).toContain(language);
      }
    }
  });

  it('routes Odia to Sarvam because Google has no Odia voice', () => {
    expect(voiceSpeaks('google', 'or')).toBe(false);
    expect(voiceOrder('google', 'or')).toEqual(['sarvam']);
  });

  it('tries the chosen voice first, then the others that speak the language', () => {
    expect(voiceOrder('sarvam', 'hi')).toEqual(['sarvam', 'google', 'gemini']);
    expect(voiceOrder('gemini', 'gu')).toEqual(['google', 'sarvam']);
    expect(voiceOrder('google', 'en')).toEqual(['google', 'sarvam', 'gemini']);
  });
});

describe('splitIntoSpeechChunks', () => {
  it('keeps short text whole and collapses whitespace', () => {
    expect(splitIntoSpeechChunks('  One.\n\n  Two.  ', 50)).toEqual(['One. Two.']);
    expect(splitIntoSpeechChunks('   ', 50)).toEqual([]);
  });

  it('never exceeds the limit and loses no words', () => {
    const chunks = splitIntoSpeechChunks(SUMMARY, GOOGLE_CHUNK);
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) expect(chunk.length).toBeLessThanOrEqual(GOOGLE_CHUNK);
    expect(chunks.join(' ')).toBe(SUMMARY);
  });

  it('prefers sentence ends, including the Devanagari danda', () => {
    const chunks = splitIntoSpeechChunks(HINDI, 60);
    for (const chunk of chunks) expect(chunk.endsWith('।')).toBe(true);
    expect(chunks.join(' ')).toBe(HINDI);
  });

  it('falls back to commas, then words, inside a long sentence', () => {
    expect(splitIntoSpeechChunks('One. Two, three four.', 10)).toEqual(['One.', 'Two, three', 'four.']);
  });

  it('cuts a single run longer than the limit by code point', () => {
    const run = '₹'.repeat(25);
    const chunks = splitIntoSpeechChunks(run, 10);
    expect(chunks).toEqual(['₹'.repeat(10), '₹'.repeat(10), '₹'.repeat(5)]);
  });
});

describe('speechRequestSchema', () => {
  it('accepts a voice and a text language, both optional', () => {
    expect(speechRequestSchema.parse({ text: 'Namaste', language: 'hi' })).toEqual({ text: 'Namaste', language: 'hi' });
    expect(speechRequestSchema.parse({ text: 'Hello', language: 'ta', textLanguage: 'en', voice: 'sarvam' })).toEqual({
      text: 'Hello',
      language: 'ta',
      textLanguage: 'en',
      voice: 'sarvam',
    });
  });

  it.each([
    ['an unknown voice', { text: 'Hello', language: 'en', voice: 'robot' }],
    ['an unknown text language', { text: 'Hello', language: 'en', textLanguage: 'xx' }],
    ['text over the cap', { text: 'a'.repeat(MAX_SPEECH_CHARS + 1), language: 'en' }],
    ['an extra field', { text: 'Hello', language: 'en', speaker: 'shubh' }],
  ])('rejects %s', (_label, payload) => {
    expect(speechRequestSchema.safeParse(payload).success).toBe(false);
  });
});

describe('languageLabel', () => {
  it('shows the endonym first so readers find their own language', () => {
    expect(languageLabel('hi')).toBe('हिन्दी (Hindi)');
    expect(languageLabel('or')).toBe('ଓଡ଼ିଆ (Odia)');
    expect(languageLabel('en')).toBe('English');
  });
});
