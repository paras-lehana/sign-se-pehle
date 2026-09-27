/**
 * Pure helpers behind the feature panels: speech clipping and chunking, device dates and
 * share links.
 */
import { describe, expect, it } from 'vitest';
import { MAX_SPEECH_CHARS } from '@sign-se-pehle/core';
import { formatIsoDate, todayIsoLocal } from '../../components/features/common/dates';
import {
  buildMailtoUrl,
  buildWhatsAppShareUrl,
} from '../../components/features/common/share-links';
import { clipForSpeech, splitForUtterances } from '../../lib/speech';

describe('clipForSpeech', () => {
  it('keeps short text and trims long text at a sentence end within the limit', () => {
    expect(clipForSpeech('  Short.  ')).toBe('Short.');
    const sentence = 'The deposit is refundable within sixty days. ';
    const long = sentence.repeat(Math.ceil(MAX_SPEECH_CHARS / sentence.length) + 1);
    const clipped = clipForSpeech(long);
    expect(clipped.length).toBeLessThanOrEqual(MAX_SPEECH_CHARS);
    expect(clipped.endsWith('days.')).toBe(true);
  });

  it('falls back to a word boundary when there is no sentence end', () => {
    expect(clipForSpeech('one two three four', 9)).toBe('one two');
  });
});

describe('splitForUtterances', () => {
  it('groups sentences, including Devanagari ones, without losing any text', () => {
    const text = 'पहला वाक्य। दूसरा वाक्य। Third sentence.';
    const chunks = splitForUtterances(text);
    expect(chunks.join(' ')).toBe(text);
  });

  it('starts a new chunk before an utterance grows too long', () => {
    const sentence = 'This clause lets the landlord keep the whole deposit for any damage at all.';
    const chunks = splitForUtterances(Array.from({ length: 6 }, () => sentence).join(' '));
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((chunk) => chunk.startsWith('This clause'))).toBe(true);
  });
});

describe('dates', () => {
  it('reads the local calendar date and prints ISO dates in words', () => {
    expect(todayIsoLocal(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(formatIsoDate('2026-10-12')).toBe('12 October 2026');
    expect(formatIsoDate('not a date')).toBe('not a date');
  });
});

describe('share links', () => {
  it('encodes text for WhatsApp and mail apps without a recipient', () => {
    expect(buildWhatsAppShareUrl('Hi & bye\nThanks')).toBe(
      'https://wa.me/?text=Hi%20%26%20bye%0AThanks',
    );
    expect(buildMailtoUrl('Rent terms', 'Line 1\nLine 2')).toBe(
      'mailto:?subject=Rent%20terms&body=Line%201%0ALine%202',
    );
  });
});
