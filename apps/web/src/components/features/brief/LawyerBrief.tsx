/**
 * Lawyer brief: download a one-page PDF or share the key questions on WhatsApp.
 *
 * Responsibility: print the brief through the browser's own "Save as PDF" (no PDF
 * library, nothing uploaded) and build a privacy-safe WhatsApp share. Boundary: while
 * printing, the brief is portalled to <body> and `html.is-printing-brief` is set so the
 * print stylesheet shows only `.brief-print`; both are removed after `afterprint`.
 */
import { type ReactElement, useEffect, useState } from 'react';
import { createPortal, flushSync } from 'react-dom';
import type { Analysis } from '@sign-se-pehle/core';
import { todayIsoLocal } from '../common/dates';
import { FeaturePanel } from '../common/FeaturePanel';
import { buildWhatsAppShareUrl } from '../common/share-links';
import { BriefDocument } from './BriefDocument';
import { buildBriefShareText } from './brief-share';

/** The class the print stylesheet keys on (shared contract with styles/print.css). */
export const PRINTING_BRIEF_CLASS = 'is-printing-brief';

interface LawyerBriefProps {
  readonly analysis: Analysis;
}

export function LawyerBrief({ analysis }: LawyerBriefProps): ReactElement {
  const [generatedIso] = useState(todayIsoLocal);
  const [printing, setPrinting] = useState(false);

  // Never leave the page stuck in print mode if the panel unmounts mid-print.
  useEffect(() => () => document.documentElement.classList.remove(PRINTING_BRIEF_CLASS), []);

  function printBrief(): void {
    const root = document.documentElement;
    const finish = (): void => {
      root.classList.remove(PRINTING_BRIEF_CLASS);
      setPrinting(false);
    };
    // The brief must be in the DOM before the print snapshot is taken.
    flushSync(() => setPrinting(true));
    root.classList.add(PRINTING_BRIEF_CLASS);
    window.addEventListener('afterprint', finish, { once: true });
    window.print();
  }

  return (
    <FeaturePanel
      id="lawyer-brief"
      title="Lawyer brief"
      intro="A one-page summary to carry to a lawyer or a free legal aid clinic."
    >
      <ul className="plain-list brief-contents" role="list" aria-label="What the brief contains">
        <li>
          <span aria-hidden="true">✓</span> What the document is and a plain summary
        </li>
        <li>
          <span aria-hidden="true">✓</span> {analysis.flags.length} red flags with official sources
        </li>
        <li>
          <span aria-hidden="true">✓</span> Money at stake and key dates
        </li>
        <li>
          <span aria-hidden="true">✓</span> {analysis.lawyerQuestions.length} questions to ask
        </li>
      </ul>
      <div className="feature-actions">
        <button type="button" className="button button--primary" onClick={printBrief}>
          <span aria-hidden="true">⤓</span> Download brief (PDF)
        </button>
        <a
          className="button button--secondary"
          href={buildWhatsAppShareUrl(buildBriefShareText(analysis))}
          target="_blank"
          rel="noopener noreferrer"
        >
          Share on WhatsApp
          <span className="visually-hidden"> (opens in a new tab)</span>
        </a>
      </div>
      <p className="field__hint">
        In the print window choose “Save as PDF”. Sharing sends only the red-flag titles and your
        questions — never the document text.
      </p>
      {printing
        ? createPortal(
            <BriefDocument analysis={analysis} generatedIso={generatedIso} />,
            document.body,
          )
        : null}
    </FeaturePanel>
  );
}
