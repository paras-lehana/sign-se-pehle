/**
 * Time-limit reminder: most contract claims must generally be filed within three years.
 *
 * Responsibility: one hedged, law-anchored reminder that waiting too long can end the
 * right to go to court. Boundary: general information from core's curated LAWS entry —
 * the reader's own limitation period depends on the facts and is for a lawyer to confirm.
 */
import type { ReactElement } from 'react';
import { LAWS } from '@sign-se-pehle/core';

/** Articles 55 and 113 of the Limitation Act's schedule set three years for most contract claims. */
const CONTRACT_CLAIM_YEARS = 3;

export function LimitationReminder(): ReactElement {
  const law = LAWS['limitation-act'];
  return (
    <div className="next-steps__block">
      <h4>Time limits for going to court</h4>
      <p>
        Most claims about a contract must generally be filed within{' '}
        <strong>{CONTRACT_CLAIM_YEARS} years</strong>. The clock usually starts when a promise is
        broken — for example, the day a deposit should have been refunded. Keep copies of the
        agreement, receipts and messages.
      </p>
      <p>
        <a href={law.url} target="_blank" rel="noopener noreferrer">
          Source: {law.act}, {law.section}
          <span className="visually-hidden"> (opens official site in a new tab)</span>
        </a>
      </p>
    </div>
  );
}
