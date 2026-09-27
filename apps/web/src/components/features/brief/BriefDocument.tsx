/**
 * The printable one-page brief for a lawyer or legal-aid visit.
 *
 * Responsibility: lay out what a lawyer needs first — what the document is, the red
 * flags with their official sources, the money and dates at stake, and the reader's
 * questions — as plain black-on-white content. Boundary: rendered only while printing
 * (see LawyerBrief); URLs are printed in full because links cannot be tapped on paper.
 */
import type { ReactElement } from 'react';
import { type Analysis, KIND_PROFILES, ROLE_LABELS, formatInr } from '@sign-se-pehle/core';
import { formatIsoDate } from '../common/dates';
import { RISK_WORDS } from '../common/risk';

interface BriefDocumentProps {
  readonly analysis: Analysis;
  /** YYYY-MM-DD from the reader's device. */
  readonly generatedIso: string;
}

export function BriefDocument({ analysis, generatedIso }: BriefDocumentProps): ReactElement {
  const { flags, moneyAtStake, keyDates, lawyerQuestions, summary, score } = analysis;
  return (
    <article className="brief-print" aria-label="Printable lawyer brief">
      <header className="brief-print__header">
        <p className="brief-print__brand">Sign Se Pehle · Document brief</p>
        <h2 className="brief-print__title">{analysis.title}</h2>
        <p className="brief-print__meta">
          {KIND_PROFILES[analysis.kind].label} · Read as: {ROLE_LABELS[analysis.role]} · Risk score{' '}
          {score.value}/100 (higher means fewer concerns) · Generated {formatIsoDate(generatedIso)}
        </p>
      </header>

      <h3>Summary</h3>
      <p>{summary.oneLine}</p>
      {summary.keyPoints.length > 0 ? (
        <ul>
          {summary.keyPoints.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      ) : null}

      <h3>Red flags ({flags.length})</h3>
      {flags.length === 0 ? <p>No red flags matched the rules for this role.</p> : null}
      <ol className="brief-print__flags">
        {flags.map((flag) => (
          <li key={flag.ruleId}>
            <strong>
              [{RISK_WORDS[flag.severity]} risk] {flag.title}.
            </strong>{' '}
            {flag.detail}
            {flag.law === undefined ? null : (
              <span className="brief-print__source">
                Source: {flag.law.act}, {flag.law.section} — {flag.law.url}
              </span>
            )}
          </li>
        ))}
      </ol>

      {moneyAtStake.items.length > 0 ? (
        <>
          <h3>Money at stake</h3>
          <table className="brief-print__table">
            <tbody>
              {moneyAtStake.items.map((item) => (
                <tr key={item.label}>
                  <th scope="row">{item.label}</th>
                  <td>{formatInr(item.amountInr)}</td>
                </tr>
              ))}
              <tr>
                <th scope="row">Total</th>
                <td>{formatInr(moneyAtStake.totalInr)}</td>
              </tr>
            </tbody>
          </table>
        </>
      ) : null}

      {keyDates.length > 0 ? (
        <>
          <h3>Key dates</h3>
          <ul>
            {keyDates.map((date) => (
              <li key={`${date.label}-${date.text}`}>
                <strong>{date.label}:</strong> {date.text}
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {lawyerQuestions.length > 0 ? (
        <>
          <h3>Questions to ask a lawyer</h3>
          <ol>
            {lawyerQuestions.map((question) => (
              <li key={question}>{question}</li>
            ))}
          </ol>
        </>
      ) : null}

      <footer className="brief-print__footer">
        <p>
          This brief explains the document in plain language. It is information, not legal advice —
          please confirm every point with a lawyer before you act.
        </p>
        <p>
          <strong>Free legal aid:</strong> NALSA helpline 15100 · nalsa.gov.in · Tele-Law
          tele-law.in
        </p>
      </footer>
    </article>
  );
}
