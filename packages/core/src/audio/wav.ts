/**
 * WAV packaging for synthesised speech.
 *
 * Responsibility: wrap raw 16-bit little-endian PCM (what Gemini text-to-speech returns) in a
 * RIFF/WAVE header so every browser can play it, and decode the model's base64 payload.
 * Boundary: pure byte work on Uint8Array and DataView — no Buffer, no atob, no I/O — so it runs
 * identically in Node and the browser.
 */

/** Canonical PCM WAV header: RIFF (12) + fmt chunk (24) + data chunk header (8). */
export const WAV_HEADER_BYTES = 44;

const BITS_PER_SAMPLE = 16;
const BYTES_PER_SAMPLE = BITS_PER_SAMPLE / 8;
/** Size of the fmt chunk body for plain PCM. */
const FMT_CHUNK_BYTES = 16;
/** WAVE_FORMAT_PCM. */
const PCM_FORMAT = 1;
/** RIFF size excludes the 8-byte "RIFF" + size prefix. */
const RIFF_PREFIX_BYTES = 8;
const MONO = 1;

function writeAscii(view: DataView, offset: number, text: string): void {
  for (let index = 0; index < text.length; index += 1) view.setUint8(offset + index, text.charCodeAt(index));
}

/**
 * Wraps 16-bit little-endian PCM samples in a WAV container. Trailing bytes that do not make a
 * whole sample frame are dropped so the header always describes the data exactly.
 * @example
 * pcmToWav(new Uint8Array(48_000), 24_000).length; // 48_044 (one second of mono 24 kHz audio)
 */
export function pcmToWav(pcm: Uint8Array, sampleRate: number, channels: number = MONO): Uint8Array {
  const blockAlign = channels * BYTES_PER_SAMPLE;
  const dataBytes = pcm.length - (pcm.length % blockAlign);
  const wav = new Uint8Array(WAV_HEADER_BYTES + dataBytes);
  const view = new DataView(wav.buffer);
  // Byte offsets below follow the canonical 44-byte layout: RIFF chunk, fmt chunk, data chunk.
  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, WAV_HEADER_BYTES - RIFF_PREFIX_BYTES + dataBytes, true);
  writeAscii(view, 8, 'WAVE');
  writeAscii(view, 12, 'fmt ');
  view.setUint32(16, FMT_CHUNK_BYTES, true);
  view.setUint16(20, PCM_FORMAT, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, BITS_PER_SAMPLE, true);
  writeAscii(view, 36, 'data');
  view.setUint32(40, dataBytes, true);
  wav.set(pcm.subarray(0, dataBytes), WAV_HEADER_BYTES);
  return wav;
}

/** Standard alphabet followed by the URL-safe '-' and '_', which also stand for 62 and 63. */
const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const URL_SAFE_EXTRAS = '-_';
const ASCII_CODES = 128;
const NOT_BASE64 = -1;
const PADDING_CODE = '='.charCodeAt(0);
const SEXTET_BITS = 6;
const BYTE_BITS = 8;
const BYTE_MASK = 0xff;
/** At most 13 pending bits are ever needed; masking keeps the accumulator small and positive. */
const PENDING_BITS_MASK = 0xffff;

/** ASCII code → sextet value, built once: a table lookup keeps multi-megabyte audio decoding fast. */
const DECODE_TABLE: readonly number[] = Array.from({ length: ASCII_CODES }, (_unused, code) => {
  const char = String.fromCharCode(code);
  const standard = BASE64_ALPHABET.indexOf(char);
  const urlSafe = URL_SAFE_EXTRAS.indexOf(char);
  if (standard >= 0) return standard;
  return urlSafe >= 0 ? BASE64_ALPHABET.length - URL_SAFE_EXTRAS.length + urlSafe : NOT_BASE64;
});

/**
 * Decodes standard or URL-safe base64. Decoding stops at padding; whitespace and any other
 * character outside the alphabet are skipped rather than failing the whole payload.
 * @example
 * Array.from(base64ToBytes('AQID')); // [1, 2, 3]
 */
export function base64ToBytes(b64: string): Uint8Array {
  const out = new Uint8Array(Math.floor((b64.length * SEXTET_BITS) / BYTE_BITS));
  let length = 0;
  let pending = 0;
  let bits = 0;
  for (let index = 0; index < b64.length; index += 1) {
    const code = b64.charCodeAt(index);
    if (code === PADDING_CODE) break;
    const value = DECODE_TABLE[code] ?? NOT_BASE64;
    if (value === NOT_BASE64) continue;
    pending = ((pending << SEXTET_BITS) | value) & PENDING_BITS_MASK;
    bits += SEXTET_BITS;
    if (bits >= BYTE_BITS) {
      bits -= BYTE_BITS;
      out[length] = (pending >> bits) & BYTE_MASK;
      length += 1;
    }
  }
  return out.slice(0, length);
}
