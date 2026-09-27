/**
 * Offline negotiation drafter — a deterministic stand-in for the Gemini change request.
 *
 * Responsibility: turn the red-flag suggestions for each risky clause into first-person
 * requests and a ready WhatsApp or email message, in the model's output shape.
 * Boundary: English only; polite requests built from curated rule copy — no threats, no law
 * citations in the message, no advice on whether to sign.
 */
import { clipText } from '../format.js';
import type { NegotiationModelOutput } from '../genai/model-output.js';
import { negotiableClauses } from '../genai/prompts.js';
import type { Clause, RedFlag } from '../schemas/analysis.js';
import { MAX_NEGOTIATION_MESSAGE_CHARS, MAX_WHATSAPP_MESSAGE_CHARS } from '../schemas/limits.js';
import type { NegotiateRequest, NegotiationChannel, NegotiationTone } from '../schemas/requests.js';
import { verbatimPrefix } from './segment.js';

type OfflineAsk = NegotiationModelOutput['asks'][number];

/** The table shows the start of each clause; 300 characters is two or three lines on a phone. */
const MAX_CURRENT_CHARS = 300;
/** One numbered line per ask keeps a chat message scannable. */
const MAX_LINE_CHARS = 260;

const GENERIC_REQUEST = 'Could we make this clause balanced for both sides, with clear limits, notice and costs?';
const EMAIL_SUBJECT = 'Requested changes to the draft';

const OPENINGS: Readonly<Record<NegotiationTone, string>> = {
  polite: 'Thank you for sharing the draft. Before we go ahead, I would like to request a few changes:',
  firm: 'I have gone through the draft. I would like the following changes to be made before we go ahead:',
};

const CLOSINGS: Readonly<Record<NegotiationTone, string>> = {
  polite: 'I am happy to discuss these. Thank you for considering them.',
  firm: 'Please share a revised draft with these changes.',
};

const NO_ASKS: Readonly<Record<NegotiationTone, string>> = {
  polite: 'Thank you for sharing the draft. Before we go ahead, I would like to confirm the key terms with you in writing.',
  firm: 'I have gone through the draft and would like the key terms confirmed in writing before we go ahead.',
};

/**
 * Rewrites rule copy as the reader's own request to the other party.
 * @example
 * suggestionToRequest('Consider asking for a lower deposit.'); // 'Could we agree on a lower deposit?'
 */
export function suggestionToRequest(suggestion: string): string {
  const rest = suggestion.replace(/^consider asking\s+/i, '').replace(/[.\s]+$/, '');
  const firstPerson = rest.replace(/\byour\b/gi, 'my').replace(/\byou\b/gi, 'me');
  if (/^for\s/i.test(firstPerson)) return `Could we agree on ${firstPerson.replace(/^for\s+/i, '')}?`;
  if (/^to\s/i.test(firstPerson)) return `Could we ${firstPerson.replace(/^to\s+/i, '')}?`;
  if (/^the \w+ to\s/i.test(firstPerson)) return `Could you ${firstPerson.replace(/^the \w+ to\s+/i, '')}?`;
  if (/^(?:which|whether|how|who|what|when)\b/i.test(firstPerson)) return `Could you tell me ${firstPerson}?`;
  return `${firstPerson.charAt(0).toUpperCase()}${firstPerson.slice(1)}.`;
}

function askFor(clause: Clause, flags: readonly RedFlag[]): OfflineAsk {
  const flag = flags.find((candidate) => candidate.clauseIds.includes(clause.id));
  return {
    heading: clause.heading,
    current: verbatimPrefix(clause.quote, MAX_CURRENT_CHARS),
    proposed: flag === undefined ? GENERIC_REQUEST : suggestionToRequest(flag.suggestion),
    reason: flag === undefined ? clause.plainMeaning : flag.detail,
  };
}

/** Numbered request lines; on WhatsApp they stop before the message would pass the chat limit. */
function requestLines(asks: readonly OfflineAsk[], channel: NegotiationChannel, budget: number): string[] {
  const lines: string[] = [];
  let used = 0;
  for (const [index, ask] of asks.entries()) {
    const line = clipText(`${index + 1}. ${ask.heading}: ${ask.proposed}`, MAX_LINE_CHARS);
    const remaining = asks.length - index;
    const more = `…and ${remaining} more point${remaining === 1 ? '' : 's'} I can share in detail.`;
    // Room for a closing "…and N more" line is kept only while more lines could follow.
    const reserve = remaining > 1 ? more.length + 1 : 0;
    if (channel === 'whatsapp' && used + line.length + reserve > budget) {
      lines.push(more);
      break;
    }
    lines.push(line);
    used += line.length + 1;
  }
  return lines;
}

function composeMessage(asks: readonly OfflineAsk[], tone: NegotiationTone, channel: NegotiationChannel): string {
  const greeting = channel === 'email' ? 'Hello,' : 'Hi,';
  const signOff = channel === 'email' ? ['Regards,', '[Your name]'] : [];
  const separator = channel === 'email' ? '\n\n' : '\n';
  const limit = channel === 'email' ? MAX_NEGOTIATION_MESSAGE_CHARS : MAX_WHATSAPP_MESSAGE_CHARS;
  if (asks.length === 0) return clipText([greeting, NO_ASKS[tone], ...signOff].join(separator), limit);
  const frame = [greeting, OPENINGS[tone], CLOSINGS[tone], ...signOff].join(separator);
  const lines = requestLines(asks, channel, limit - frame.length - separator.length * 2);
  return clipText([greeting, OPENINGS[tone], lines.join('\n'), CLOSINGS[tone], ...signOff].join(separator), limit);
}

/**
 * Drafts a change request without the model, from the flags on each risky clause.
 * @example
 * negotiateOffline({ ...request, channel: 'email' }).subject; // 'Requested changes to the draft'
 */
export function negotiateOffline(req: NegotiateRequest): NegotiationModelOutput {
  const asks = negotiableClauses(req.clauses).map((clause) => askFor(clause, req.flags));
  const message = composeMessage(asks, req.tone, req.channel);
  return req.channel === 'email' ? { subject: EMAIL_SUBJECT, message, asks } : { message, asks };
}
