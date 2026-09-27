/**
 * Home hero: kinetic headline, promise, calls to action, trust chips and the scan art.
 *
 * Responsibility: the page's one h1 and the first impression. Boundary: the headline words
 * animate with CSS keyframes only (staggered by :nth-child), and their resting state is
 * fully visible, so reduced motion or a paused page never hides the heading. The art is
 * decorative and hidden from assistive technology.
 */
import { Fragment, type ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { ScanIllustration } from './ScanIllustration';

const HEADLINE_WORDS = ['Understand', 'every', 'clause'] as const;

/** The spec's trust line, one chip per claim. */
export const TRUST_CHIPS = [
  'Gemini on Google Cloud',
  'Checked against Indian law',
  '11 languages',
  'Nothing stored',
] as const;

export function Hero(): ReactElement {
  return (
    <section className="hero" aria-labelledby="hero-heading">
      <div className="hero__copy">
        <p className="eyebrow hero__eyebrow">
          <span className="pulse-dot" aria-hidden="true" />
          “Sign Se Pehle” means “before you sign”
        </p>
        <h1 id="hero-heading" className="hero__title">
          {HEADLINE_WORDS.map((word) => (
            <Fragment key={word}>
              <span className="kinetic">{word}</span>{' '}
            </Fragment>
          ))}
          <span className="kinetic kinetic--accent">before you sign.</span>
        </h1>
        <p className="lede hero__lede">
          Paste, upload or photograph a rent agreement, job offer, loan, insurance policy or legal
          notice. Get it explained in your language, with red flags checked against Indian law and
          the exact words they rely on.
        </p>
        <div className="hero__actions">
          <a className="button button--cta button--large" href="#workspace">
            Check a document
            <svg className="button__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M12 5v14M6 13l6 6 6-6" />
            </svg>
          </a>
          <Link className="button button--glass button--large" to="/about">
            See how it works
          </Link>
        </div>
        <ul className="plain-list trust" role="list" aria-label="Why you can rely on it">
          {TRUST_CHIPS.map((chip) => (
            <li key={chip} className="trust__chip">
              <span className="trust__tick" aria-hidden="true">
                {'✓'}
              </span>
              {chip}
            </li>
          ))}
        </ul>
      </div>
      <div className="hero__art" aria-hidden="true">
        <ScanIllustration />
      </div>
    </section>
  );
}
