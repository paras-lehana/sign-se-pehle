/**
 * WhatsApp and email share links.
 *
 * Responsibility: turn text the reader has already seen into wa.me and mailto: links.
 * Boundary: URL construction only — the app never sends anything itself; the reader's
 * own WhatsApp or mail app opens with the text filled in, ready to edit or discard.
 */

/** wa.me is WhatsApp's official click-to-chat domain; no number means "choose a chat". */
const WHATSAPP_SHARE_BASE = 'https://wa.me/';

/**
 * A WhatsApp link that opens the chat picker with `text` pre-filled.
 * @example
 * buildWhatsAppShareUrl('Hello'); // 'https://wa.me/?text=Hello'
 */
export function buildWhatsAppShareUrl(text: string): string {
  return `${WHATSAPP_SHARE_BASE}?text=${encodeURIComponent(text.trim())}`;
}

/**
 * A mailto: link with a subject and body and no recipient, so the reader picks who gets it.
 * @example
 * buildMailtoUrl('Rent', 'Hi'); // 'mailto:?subject=Rent&body=Hi'
 */
export function buildMailtoUrl(subject: string, body: string): string {
  return `mailto:?subject=${encodeURIComponent(subject.trim())}&body=${encodeURIComponent(body.trim())}`;
}
