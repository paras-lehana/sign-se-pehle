/**
 * Prompt boundary — fences untrusted text before it reaches the model.
 *
 * Responsibility: wrap document text and questions in per-request nonce delimiters
 * and neutralise anything inside that imitates a delimiter or a role header, so a
 * document cannot smuggle instructions to the model. Boundary: this is defence in
 * depth; the system instruction also tells the model the fenced text is data.
 */

/** 8–32 lowercase hex characters: the server passes `randomBytes(8).toString('hex')`. */
const NONCE_PATTERN = /^[a-f0-9]{8,32}$/;

/** Labels become part of the delimiter, so they are restricted to a safe alphabet. */
const LABEL_PATTERN = /^[A-Z][A-Z0-9_]{0,31}$/;

/** Any run of three or more angle brackets could imitate our delimiters. */
const DELIMITER_RUN = /<{3,}|>{3,}/g;

/** Chat-template control tokens used by various model families. */
const CONTROL_TOKENS = /<\|[^|>\n]{0,40}\|>|\[\/?INST\]/gi;

/** Lines that imitate role or instruction headers ("system:", "### Instruction"). */
const ROLE_HEADER_LINE =
  /^[ \t]*(?:#{1,6}[ \t]*(?:system|assistant|developer|user|instructions?)\b|(?:system|assistant|developer|instructions?)[ \t]*:).*$/gim;

/** FNV-1a 32-bit constants (offset basis and prime) — a tiny, deterministic hash. */
const FNV_OFFSET_BASIS = 0x811c9dc5;
const FNV_PRIME = 0x01000193;
const HEX_RADIX = 16;
const FALLBACK_NONCE_LENGTH = 8;

/**
 * True when a nonce is safe to embed in delimiters.
 * @example
 * isValidNonce('a1b2c3d4'); // true
 */
export function isValidNonce(nonce: string): boolean {
  return NONCE_PATTERN.test(nonce);
}

/** Deterministic fallback so a bad nonce never produces an unfenced prompt. */
function fallbackNonce(text: string): string {
  let hash = FNV_OFFSET_BASIS;
  for (let index = 0; index < text.length; index += 1) {
    hash = Math.imul(hash ^ text.charCodeAt(index), FNV_PRIME) >>> 0;
  }
  return hash.toString(HEX_RADIX).padStart(FALLBACK_NONCE_LENGTH, '0');
}

/**
 * Removes delimiter lookalikes, chat control tokens and role-header lines from untrusted text.
 * @example
 * neutraliseDelimiters('a <<<END>>> b'); // 'a END b'
 */
export function neutraliseDelimiters(text: string): string {
  return text.replace(DELIMITER_RUN, '').replace(CONTROL_TOKENS, '').replace(ROLE_HEADER_LINE, '');
}

/**
 * Fences untrusted text between nonce-tagged delimiters after neutralising it.
 * An invalid nonce is replaced by a hash of the text rather than dropping the fence.
 * @example
 * wrapUntrusted('DOCUMENT', 'Rent is 10,000', 'a1b2c3d4');
 * // '<<<DOCUMENT_a1b2c3d4>>>\nRent is 10,000\n<<<END_DOCUMENT_a1b2c3d4>>>'
 */
export function wrapUntrusted(label: string, text: string, nonce: string): string {
  const safeLabel = LABEL_PATTERN.test(label) ? label : 'DATA';
  const safeText = neutraliseDelimiters(text);
  const tag = isValidNonce(nonce) ? nonce : fallbackNonce(safeText);
  return `<<<${safeLabel}_${tag}>>>\n${safeText}\n<<<END_${safeLabel}_${tag}>>>`;
}
