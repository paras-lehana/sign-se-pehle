/**
 * Document-type marquee: the everyday documents Sign Se Pehle reads, scrolling slowly.
 *
 * Responsibility: a quick "yes, it handles my document" signal. Boundary: the list is read
 * once by assistive technology (the looping duplicate is aria-hidden); the loop pauses on
 * hover, stops with the header's pause control, and becomes a static wrapped list under
 * reduced motion.
 */
import type { ReactElement } from 'react';

export const DOCUMENT_TYPES = [
  'Rent agreements',
  'Leave & licence',
  'Offer letters',
  'Employment bonds',
  'Personal loans',
  'Home loans',
  'Insurance policies',
  'App terms',
  'Builder-buyer agreements',
  'Freelance contracts',
  'Legal notices',
] as const;

/** The original list, then a visual-only duplicate that makes the loop seamless. */
const TRACKS = [
  { key: 'list', copy: false },
  { key: 'copy', copy: true },
] as const;

export function DocTypeMarquee(): ReactElement {
  return (
    <section className="marquee-section" aria-labelledby="doc-types-heading">
      <h2 id="doc-types-heading" className="marquee-section__label">
        Reads the documents India signs every day
      </h2>
      <div className="marquee">
        {TRACKS.map((track) => (
          <ul
            key={track.key}
            className={`plain-list marquee__track${track.copy ? ' marquee__track--copy' : ''}`}
            role="list"
            aria-hidden={track.copy || undefined}
          >
            {DOCUMENT_TYPES.map((type) => (
              <li key={type} className="marquee__item">
                <span className="marquee__glyph" aria-hidden="true">
                  {'◆'}
                </span>
                {type}
              </li>
            ))}
          </ul>
        ))}
      </div>
    </section>
  );
}
