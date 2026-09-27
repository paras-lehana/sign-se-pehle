import { describe, expect, it } from 'vitest';
import { base64ToBytes, pcmToWav, WAV_HEADER_BYTES } from '../audio/wav.js';

const SAMPLE_RATE = 24_000;
const BYTES_PER_SAMPLE = 2;

function ascii(bytes: Uint8Array, start: number, length: number): string {
  return String.fromCharCode(...bytes.subarray(start, start + length));
}

function header(wav: Uint8Array): Record<string, number | string> {
  const view = new DataView(wav.buffer, wav.byteOffset, wav.byteLength);
  return {
    riff: ascii(wav, 0, 4),
    riffSize: view.getUint32(4, true),
    wave: ascii(wav, 8, 4),
    fmt: ascii(wav, 12, 4),
    fmtSize: view.getUint32(16, true),
    format: view.getUint16(20, true),
    channels: view.getUint16(22, true),
    sampleRate: view.getUint32(24, true),
    byteRate: view.getUint32(28, true),
    blockAlign: view.getUint16(32, true),
    bitsPerSample: view.getUint16(34, true),
    data: ascii(wav, 36, 4),
    dataSize: view.getUint32(40, true),
  };
}

/** Deterministic PCM: a byte ramp is enough to prove the samples are copied untouched. */
const PCM = Uint8Array.from({ length: 1_000 }, (_unused, index) => index % 256);

describe('pcmToWav', () => {
  it('writes a canonical 16-bit PCM RIFF header followed by the samples', () => {
    const wav = pcmToWav(PCM, SAMPLE_RATE);
    expect(wav.length).toBe(WAV_HEADER_BYTES + PCM.length);
    expect(header(wav)).toEqual({
      riff: 'RIFF',
      riffSize: WAV_HEADER_BYTES - 8 + PCM.length,
      wave: 'WAVE',
      fmt: 'fmt ',
      fmtSize: 16,
      format: 1,
      channels: 1,
      sampleRate: SAMPLE_RATE,
      byteRate: SAMPLE_RATE * BYTES_PER_SAMPLE,
      blockAlign: BYTES_PER_SAMPLE,
      bitsPerSample: 16,
      data: 'data',
      dataSize: PCM.length,
    });
    expect(Array.from(wav.subarray(WAV_HEADER_BYTES))).toEqual(Array.from(PCM));
  });

  it('describes stereo audio and drops a trailing partial frame', () => {
    const wav = pcmToWav(PCM.subarray(0, 7), SAMPLE_RATE, 2);
    expect(header(wav)).toMatchObject({ channels: 2, blockAlign: 4, byteRate: SAMPLE_RATE * 4, dataSize: 4 });
    expect(wav.length).toBe(WAV_HEADER_BYTES + 4);
  });

  it('produces a header-only file for empty audio', () => {
    expect(header(pcmToWav(new Uint8Array(), SAMPLE_RATE)).dataSize).toBe(0);
  });
});

describe('base64ToBytes', () => {
  it('round-trips every byte value, with and without padding', () => {
    for (const length of [0, 1, 2, 3, 256]) {
      const bytes = Uint8Array.from({ length }, (_unused, index) => index % 256);
      const encoded = Buffer.from(bytes).toString('base64');
      expect(Array.from(base64ToBytes(encoded))).toEqual(Array.from(bytes));
    }
  });

  it('accepts URL-safe base64 and skips whitespace', () => {
    const bytes = Uint8Array.from([251, 255, 191, 62, 63]);
    const urlSafe = Buffer.from(bytes).toString('base64url');
    expect(Array.from(base64ToBytes(urlSafe))).toEqual(Array.from(bytes));
    expect(Array.from(base64ToBytes(' AQ\nID \t'))).toEqual([1, 2, 3]);
  });

  it('stops at padding', () => {
    expect(Array.from(base64ToBytes('AQ==AQID'))).toEqual([1]);
  });
});
