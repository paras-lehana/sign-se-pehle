/**
 * The result of the free legal aid screening.
 *
 * Responsibility: say the outcome in words with an icon, list the reasons (each naming the
 * clause of section 12 that applies) and give the next action. Boundary: a screening aid —
 * the Legal Services Authority makes the actual decision, and the copy says so.
 */
import type { ReactElement } from 'react';
import type { EligibilityResult, EligibilityStatus } from '@sign-se-pehle/core';

interface EligibilityOutcomeProps {
  readonly result: EligibilityResult;
}

const STATUS_COPY: Readonly<
  Record<EligibilityStatus, { readonly icon: string; readonly title: string }>
> = {
  eligible: { icon: '✓', title: 'You are generally eligible for free legal aid' },
  likely: { icon: '◐', title: 'You are likely eligible for free legal aid' },
  'check-with-dlsa': { icon: 'ℹ', title: 'Check with your District Legal Services Authority' },
};

export function EligibilityOutcome({ result }: EligibilityOutcomeProps): ReactElement {
  const copy = STATUS_COPY[result.status];
  return (
    <div className={`eligibility eligibility--${result.status}`}>
      <p className="eligibility__title">
        <span aria-hidden="true">{copy.icon}</span> {copy.title}
      </p>
      <ul className="eligibility__reasons">
        {result.reasons.map((reason) => (
          <li key={reason}>{reason}</li>
        ))}
      </ul>
      <p className="eligibility__next">
        Free legal aid covers advice and, if you qualify, a lawyer at no cost.{' '}
        <a href="tel:15100">Call the NALSA helpline 15100</a> or visit your District Legal Services
        Authority at the district court.
      </p>
      <p className="eligibility__source">
        <a href={result.law.url} target="_blank" rel="noopener noreferrer">
          Source: {result.law.act}, {result.law.section}
          <span className="visually-hidden"> (opens official site in a new tab)</span>
        </a>
      </p>
    </div>
  );
}
