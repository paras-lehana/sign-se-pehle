/**
 * File signature checks: each allowed type accepts its real header and rejects impostors,
 * and the request schema refuses a mislabelled upload.
 */
import { describe, expect, it } from 'vitest';
import { analyzeRequestSchema } from '../schemas/requests.js';
import { matchesFileSignature } from '../schemas/file-signature.js';

/** Encodes raw bytes as base64 the way a browser FileReader would. */
function toBase64(bytes: readonly number[]): string {
  return Buffer.from(bytes).toString('base64');
}

const PDF = toBase64([...Buffer.from('%PDF-1.7\n')]);
const JPEG = toBase64([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
const PNG = toBase64([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
const WEBP = toBase64([...Buffer.from('RIFF'), 0x24, 0x00, 0x00, 0x00, ...Buffer.from('WEBPVP8 ')]);
const EXE = toBase64([...Buffer.from('MZ'), 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]);

describe('matchesFileSignature', () => {
  it.each([
    ['application/pdf', PDF],
    ['image/jpeg', JPEG],
    ['image/png', PNG],
    ['image/webp', WEBP],
  ] as const)('accepts a genuine %s header', (mimeType, data) => {
    expect(matchesFileSignature(mimeType, data)).toBe(true);
  });

  it.each(['application/pdf', 'image/jpeg', 'image/png', 'image/webp'] as const)(
    'rejects an executable labelled %s',
    (mimeType) => {
      expect(matchesFileSignature(mimeType, EXE)).toBe(false);
    },
  );

  it('rejects a PNG labelled as a PDF and data too short to hold a header', () => {
    expect(matchesFileSignature('application/pdf', PNG)).toBe(false);
    expect(matchesFileSignature('image/png', 'iVBO')).toBe(false);
  });
});

describe('analyzeRequestSchema file uploads', () => {
  const request = (dataBase64: string): unknown => ({
    language: 'en',
    document: { type: 'file', mimeType: 'application/pdf', fileName: 'rent.pdf', dataBase64 },
  });

  it('accepts a real PDF and refuses a disguised executable', () => {
    expect(analyzeRequestSchema.safeParse(request(PDF)).success).toBe(true);
    expect(analyzeRequestSchema.safeParse(request(EXE)).success).toBe(false);
  });
});
