/**
 * File signature ("magic number") checks for uploads.
 *
 * Responsibility: confirm an uploaded file really is the type it claims to be by reading
 * its first bytes, so a renamed executable or script can never reach the model as a "PDF".
 * Boundary: pure — decodes only the few leading base64 characters it needs; no Buffer/atob,
 * so it runs identically in the browser and on the server.
 */
import type { ALLOWED_UPLOAD_MIME_TYPES } from './limits.js';

type AllowedMimeType = (typeof ALLOWED_UPLOAD_MIME_TYPES)[number];

/** One expected byte run at an offset. */
interface ByteRun {
  readonly offset: number;
  readonly bytes: readonly number[];
}

/** Published signatures: PDF "%PDF", JPEG SOI + marker, PNG 8-byte header, WebP "RIFF....WEBP". */
const SIGNATURES: Readonly<Record<AllowedMimeType, readonly ByteRun[]>> = {
  'application/pdf': [{ offset: 0, bytes: [0x25, 0x50, 0x44, 0x46] }],
  'image/jpeg': [{ offset: 0, bytes: [0xff, 0xd8, 0xff] }],
  'image/png': [{ offset: 0, bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] }],
  'image/webp': [
    { offset: 0, bytes: [0x52, 0x49, 0x46, 0x46] },
    { offset: 8, bytes: [0x57, 0x45, 0x42, 0x50] },
  ],
};

/** 16 base64 characters decode to the 12 leading bytes — enough for every signature above. */
const HEADER_BASE64_CHARS = 16;

const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Decodes the leading bytes of a base64 string; stops at padding or an invalid character. */
function decodeLeadingBytes(dataBase64: string): number[] {
  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const char of dataBase64.slice(0, HEADER_BASE64_CHARS)) {
    const value = BASE64_ALPHABET.indexOf(char);
    if (value < 0) break;
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }
  return bytes;
}

/**
 * True when the decoded leading bytes match the signature for the declared MIME type.
 * @example
 * matchesFileSignature('application/pdf', 'JVBERi0xLjQK'); // true ("%PDF-1.4")
 */
export function matchesFileSignature(mimeType: AllowedMimeType, dataBase64: string): boolean {
  const header = decodeLeadingBytes(dataBase64);
  return SIGNATURES[mimeType].every(({ offset, bytes }) =>
    bytes.every((byte, index) => header[offset + index] === byte),
  );
}
