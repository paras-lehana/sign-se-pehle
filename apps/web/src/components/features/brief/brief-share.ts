/**
 * The text shared to WhatsApp from the lawyer brief.
 *
 * Responsibility: a short message a reader can send to a lawyer, friend or legal-aid
 * volunteer. Boundary: privacy by construction — it is built only from red-flag titles
 * and lawyer questions, never from the document text, names or summary.
 */
import { type Analysis, KIND_PROFILES } from '@sign-se-pehle/core';
import { RISK_WORDS } from '../common/risk';

type BriefShareInput = Pick<Analysis, 'kind' | 'flags' | 'lawyerQuestions'>;

/**
 * Plain-text share message: kind, flag titles with severity, numbered questions, helpline.
 * @example
 * buildBriefShareText({ kind: 'rental', flags: [], lawyerQuestions: ['Is the lock-in fair?'] });
 */
export function buildBriefShareText({ kind, flags, lawyerQuestions }: BriefShareInput): string {
  const lines = [
    `Questions about my ${KIND_PROFILES[kind].label.toLowerCase()} (checked with Sign Se Pehle)`,
  ];
  if (flags.length > 0) {
    lines.push(
      '',
      'Red flags:',
      ...flags.map((flag) => `• ${flag.title} (${RISK_WORDS[flag.severity]} risk)`),
    );
  }
  if (lawyerQuestions.length > 0) {
    lines.push(
      '',
      'Questions for a lawyer:',
      ...lawyerQuestions.map((question, index) => `${index + 1}. ${question}`),
    );
  }
  lines.push('', 'Free legal aid: NALSA helpline 15100.');
  return lines.join('\n');
}
