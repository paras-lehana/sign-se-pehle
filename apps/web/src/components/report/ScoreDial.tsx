/**
 * Risk score ring (0–100) with a text band label.
 *
 * Responsibility: show the score as an animated gradient ring plus words, so the meaning
 * never depends on colour. Boundary: the ring is drawn with SVG presentation attributes
 * (not inline styles — the CSP forbids those); report.css animates the dash offset from an
 * empty ring to this value, and the resting state is the filled ring.
 */
import { type ReactElement, useId } from 'react';
import type { RiskScore, ScoreBand } from '@sign-se-pehle/core';

/** Reader-facing band names, exported so tests assert the same copy. */
export const BAND_LABELS: Readonly<Record<ScoreBand, string>> = {
  balanced: 'Mostly balanced',
  review: 'Review before signing',
  'high-risk': 'High risk — read carefully',
};

/** Radius 52 in a 120 viewBox leaves room for the 10-unit stroke and its glow. */
const RING_RADIUS = 52;
/** 2π × 52 ≈ 326.73 — report.css starts the fill animation from this offset. */
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const MAX_SCORE = 100;
const VIEWBOX_SIZE = 120;
const CENTER = VIEWBOX_SIZE / 2;
/** The "/100" caption sits just under the number. */
const CAPTION_OFFSET = 22;

interface ScoreDialProps {
  readonly score: RiskScore;
}

export function ScoreDial({ score }: ScoreDialProps): ReactElement {
  const gradientId = useId();
  const filled = (score.value / MAX_SCORE) * RING_CIRCUMFERENCE;
  const label = BAND_LABELS[score.band];
  return (
    <figure className={`score score--${score.band}`}>
      <svg
        className="score__ring"
        viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
        role="img"
        aria-label={`Risk score ${score.value} out of ${MAX_SCORE}: ${label}`}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" className="score__stop score__stop--start" />
            <stop offset="1" className="score__stop score__stop--end" />
          </linearGradient>
        </defs>
        <circle className="score__track" cx={CENTER} cy={CENTER} r={RING_RADIUS} />
        <circle
          className="score__value"
          cx={CENTER}
          cy={CENTER}
          r={RING_RADIUS}
          stroke={`url(#${gradientId})`}
          strokeDasharray={`${RING_CIRCUMFERENCE} ${RING_CIRCUMFERENCE}`}
          strokeDashoffset={RING_CIRCUMFERENCE - filled}
          transform={`rotate(-90 ${CENTER} ${CENTER})`}
        />
        <text
          className="score__number"
          x={CENTER}
          y={CENTER - 4}
          textAnchor="middle"
          dominantBaseline="central"
        >
          {score.value}
        </text>
        <text className="score__of" x={CENTER} y={CENTER + CAPTION_OFFSET} textAnchor="middle">
          /{MAX_SCORE}
        </text>
      </svg>
      <figcaption>
        <span className="score__caption">Risk score</span>
        <strong className="score__band">{label}</strong>
      </figcaption>
    </figure>
  );
}
