/**
 * "What you get" bento grid: six feature tiles of mixed sizes.
 *
 * Responsibility: show at a glance everything a report contains. Boundary: static copy;
 * each tile's mini visual is decorative (TileVisual), so the h3 + text carry the meaning.
 */
import type { ReactElement } from 'react';
import { FeatureTile, type FeatureTileProps } from './FeatureTile';

/** The six features, in reading order; sizes map to bento spans in bento.css. */
export const FEATURES: readonly FeatureTileProps[] = [
  {
    title: 'Document X-ray',
    body: 'Your own text, lit up clause by clause — red for high risk, amber for medium. Tap any highlight to see what it means.',
    size: 'large',
    tone: 'indigo',
    visual: 'xray',
  },
  {
    title: 'Red flags with law links',
    body: 'Fixed rules check every clause against Indian law, and each warning links to the official source.',
    size: 'wide',
    tone: 'rose',
    visual: 'flags',
  },
  {
    title: 'What-if money',
    body: 'Leave early, pay late, prepay a loan — see the rupees involved, from your document’s own numbers.',
    size: 'small',
    tone: 'saffron',
    visual: 'money',
  },
  {
    title: 'Negotiate',
    body: 'Fairer wording for risky clauses and a polite message ready for WhatsApp or email.',
    size: 'small',
    tone: 'violet',
    visual: 'negotiate',
  },
  {
    title: 'Listen in 11 languages',
    body: 'Hear the summary and answers read aloud in Hindi, Tamil, Bengali and eight more Indian languages.',
    size: 'wide',
    tone: 'cyan',
    visual: 'listen',
  },
  {
    title: 'Next steps & legal aid',
    body: 'Where to complain, whether you qualify for free legal aid, the nearest legal services office and any reply deadline.',
    size: 'wide',
    tone: 'emerald',
    visual: 'next',
  },
];

export function FeatureBento(): ReactElement {
  return (
    <section className="bento-section" aria-labelledby="features-heading">
      <div className="section-head">
        <p className="eyebrow">What you get</p>
        <h2 id="features-heading">Everything you need before you sign</h2>
        <p className="lede">
          One report, organised into tabs you can jump between. Every explanation points back to
          the exact words in your document, so you can check it yourself.
        </p>
      </div>
      <ul className="plain-list bento" role="list">
        {FEATURES.map((feature) => (
          <FeatureTile key={feature.title} {...feature} />
        ))}
      </ul>
    </section>
  );
}
