/**
 * Risk score dial (0–100) with a text band label.
 *
 * Responsibility: show the score as a ring plus words, so the meaning never depends
 * on colour. Boundary: the ring is drawn with SVG attributes, not inline styles,
 * because the production CSP forbids inline style attributes.
 */
import type { ReactElement } from 'react';
import type { RiskScore, ScoreBand } from '@sign-se-pehle/core';

/** Reader-facing band names, exported so tests assert the same copy. */
export const BAND_LABELS: Readonly<Record<ScoreBand, string>> = {
  balanced: 'Mostly balanced',
  review: 'Review before signing',
  'high-risk': 'High risk — read carefully',
};

const RING_RADIUS = 52;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const MAX_SCORE = 100;
/** viewBox is 120 wide: radius 52 plus an 8-unit stroke fits with room to spare. */
const VIEWBOX_SIZE = 120;
const CENTER = VIEWBOX_SIZE / 2;

interface ScoreDialProps {
  readonly score: RiskScore;
}

export function ScoreDial({ score }: ScoreDialProps): ReactElement {
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
        <circle className="score__track" cx={CENTER} cy={CENTER} r={RING_RADIUS} />
        <circle
          className="score__value"
          cx={CENTER}
          cy={CENTER}
          r={RING_RADIUS}
          strokeDasharray={`${filled} ${RING_CIRCUMFERENCE}`}
          transform={`rotate(-90 ${CENTER} ${CENTER})`}
        />
        <text
          className="score__number"
          x={CENTER}
          y={CENTER}
          textAnchor="middle"
          dominantBaseline="central"
        >
          {score.value}
        </text>
      </svg>
      <figcaption>
        <span className="score__caption">Risk score</span>
        <strong className="score__band">{label}</strong>
      </figcaption>
    </figure>
  );
}
