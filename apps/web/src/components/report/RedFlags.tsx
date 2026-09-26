/**
 * Law-anchored red flags from the deterministic rule engine.
 *
 * Responsibility: list each flag with a severity chip, what it means, a question to
 * consider and the official source it is anchored to. Boundary: display only; the
 * rules and law references come from core.
 */
import type { ReactElement } from 'react';
import type { RedFlag } from '@sign-se-pehle/core';
import { ReportSection } from './ReportSection';
import { RiskChip } from './RiskChip';

interface RedFlagsProps {
  readonly flags: readonly RedFlag[];
}

export function RedFlags({ flags }: RedFlagsProps): ReactElement {
  return (
    <ReportSection
      id="red-flags"
      title={`Red flags (${flags.length})`}
      intro="Checked by fixed rules against Indian law — the same document always gives the same flags."
    >
      {flags.length === 0 ? (
        <p>No red flags matched our rules for your role. Still read every clause below.</p>
      ) : (
        <ul className="plain-list flag-list" role="list">
          {flags.map((flag) => (
            <li key={flag.ruleId} className={`flag flag--${flag.severity}`}>
              <div className="flag__head">
                <RiskChip level={flag.severity} />
                <h4 className="flag__title">{flag.title}</h4>
              </div>
              <p>{flag.detail}</p>
              <p className="flag__suggestion">
                <strong>Consider:</strong> {flag.suggestion}
              </p>
              {flag.law === undefined ? null : (
                <p className="flag__law">
                  <a href={flag.law.url} target="_blank" rel="noopener noreferrer">
                    Source: {flag.law.act}, {flag.law.section}
                    <span className="visually-hidden"> (opens official site in a new tab)</span>
                  </a>
                  <span className="flag__law-summary">{flag.law.summary}</span>
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </ReportSection>
  );
}
