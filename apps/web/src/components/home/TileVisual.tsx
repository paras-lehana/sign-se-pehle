/**
 * Decorative mini visuals for the bento tiles (a lit-up page, flag cards, a rupee figure,
 * chat bubbles, a voice waveform, a help card).
 *
 * Responsibility: make each tile recognisable at a glance using the same chips and glass as
 * the real report. Boundary: purely decorative — the tile hides it from assistive
 * technology; any motion is CSS on classes and obeys the motion policy.
 */
import type { ReactElement } from 'react';
import { LANGUAGE_CODES, LANGUAGES } from '@sign-se-pehle/core';

export type TileVisualKind = 'xray' | 'flags' | 'money' | 'negotiate' | 'listen' | 'next';

/** Page lines for the X-ray tile: width class and highlight per line. */
const XRAY_LINES = ['w90', 'w75 high', 'w85', 'w60', 'w80 medium', 'w70', 'w90 high', 'w50'] as const;

/** Enough bars for a convincing waveform at tile width. */
const WAVE_BARS = 28;

interface TileVisualProps {
  readonly kind: TileVisualKind;
}

export function TileVisual({ kind }: TileVisualProps): ReactElement {
  switch (kind) {
    case 'xray':
      return (
        <div className="tv-xray">
          {XRAY_LINES.map((line, index) => (
            <span key={`${line}-${index}`} className={`tv-xray__line ${line}`} />
          ))}
          <span className="tv-xray__tip">
            <strong>High risk · lock-in</strong>
            Leave early and you pay rent for every remaining month.
          </span>
          <span className="tv-xray__legend">
            <span className="chip chip--high">High</span>
            <span className="chip chip--medium">Medium</span>
            <span className="chip chip--low">Low</span>
          </span>
        </div>
      );
    case 'flags':
      return (
        <div className="tv-flags">
          <span className="tv-flags__card tv-flags__card--high">
            <span className="chip chip--high">⚠ High risk</span>
            <span className="tv-flags__title">Full rent for the whole lock-in</span>
            <span className="tv-flags__law">Indian Contract Act, s.74 ↗</span>
          </span>
          <span className="tv-flags__card tv-flags__card--medium">
            <span className="chip chip--medium">◆ Medium risk</span>
            <span className="tv-flags__title">Entry without notice</span>
          </span>
        </div>
      );
    case 'money':
      return (
        <div className="tv-money">
          <span className="tv-money__figure gradient-text">₹2,75,000</span>
          <span className="tv-money__caption">if you leave in month 4</span>
          <span className="tv-money__bar">
            <span className="tv-money__segment tv-money__segment--rent" />
            <span className="tv-money__segment tv-money__segment--deposit" />
          </span>
        </div>
      );
    case 'negotiate':
      return (
        <div className="tv-chat">
          <span className="tv-chat__bubble">Could the lock-in be 6 months instead of 11?</span>
          <span className="tv-chat__bubble tv-chat__bubble--reply">Sure, let’s update it.</span>
        </div>
      );
    case 'listen':
      return (
        <div className="tv-listen">
          <span className="tv-listen__wave">
            {Array.from({ length: WAVE_BARS }, (_, index) => (
              <span key={index} className="tv-listen__bar" />
            ))}
          </span>
          <span className="tv-listen__langs">
            {LANGUAGE_CODES.filter((code) => code !== 'en').map((code) => (
              <span key={code} lang={LANGUAGES[code].bcp47}>
                {LANGUAGES[code].nativeName}
              </span>
            ))}
          </span>
        </div>
      );
    case 'next':
      return (
        <div className="tv-next">
          <span className="pill tv-next__pill">NALSA free legal aid · 15100</span>
          <span className="pill tv-next__pill tv-next__pill--accent">Reply within 12 days</span>
          <span className="pill tv-next__pill">Consumer helpline · 1915</span>
        </div>
      );
  }
}
