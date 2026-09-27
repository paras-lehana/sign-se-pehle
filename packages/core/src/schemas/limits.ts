/**
 * Input limits shared by the web forms, the API validators and the prompts.
 *
 * Responsibility: every size bound in one place, each with the reason for its value.
 * Boundary: schemas import these; nothing else hard-codes a limit.
 */

/** Shortest text worth analysing — a single real clause is rarely under 80 characters. */
export const MIN_DOCUMENT_CHARS = 80;

/**
 * Longest pasted or extracted document: ~60k characters is a 20–25 page agreement,
 * roughly 15k Gemini tokens — large enough for real contracts, small enough to keep
 * one analysis under a few seconds and a few paise.
 */
export const MAX_DOCUMENT_CHARS = 60_000;

/** Uploads are capped at 5 MB: a 15-page phone scan fits; Cloud Run's 32 MB request cap is far away. */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/** Base64 inflates bytes by 4/3; this is the longest base64 string a valid upload can produce. */
export const MAX_UPLOAD_BASE64_CHARS = Math.ceil(MAX_UPLOAD_BYTES / 3) * 4;

/** File types Gemini reads natively (PDF text + scans, phone photos). */
export const ALLOWED_UPLOAD_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

/** A question is a sentence or two; 500 characters also bounds prompt-injection payloads. */
export const MAX_QUESTION_CHARS = 500;

/** A reader's own account of their situation for the lawyer brief. */
export const MAX_SITUATION_CHARS = 2_000;

/** Conversation turns replayed to the model — enough for follow-ups, bounded for cost. */
export const MAX_CHAT_HISTORY_TURNS = 6;

/** Text sent for read-aloud; ~1,500 characters is about 90 seconds of speech. */
export const MAX_SPEECH_CHARS = 1_500;

/** A change request with more than eight asks reads as a rejection rather than a negotiation. */
export const MAX_NEGOTIATION_ASKS = 8;

/** About two phone screens of chat text; longer chat messages get skimmed, so WhatsApp drafts stay within it. */
export const MAX_WHATSAPP_MESSAGE_CHARS = 900;

/** An email request with a greeting, up to eight asks and a sign-off fits well within 4,000 characters. */
export const MAX_NEGOTIATION_MESSAGE_CHARS = 4_000;

/** Glossary lookups are a word or short phrase. */
export const MAX_TERM_CHARS = 60;

/** Upper bound for any money figure (₹10,000 crore) — rejects typos and overflow tricks. */
export const MAX_AMOUNT_INR = 100_000_000_000;

/** Upper bound for any duration in months (50 years) — covers home loans and long leases. */
export const MAX_MONTHS = 600;

/** Upper bound for any notice or grace period in days (5 years). */
export const MAX_DAYS = 1_825;

/** Clauses returned per analysis — keeps responses and screens scannable. */
export const MAX_CLAUSES = 40;

/** Opaque ids (analysis ids, clause ids) are short tokens. */
export const MAX_ID_CHARS = 64;
