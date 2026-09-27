/**
 * Animated "document scan": a page of text, a saffron scan beam sweeping down, three risky
 * lines lighting up as it passes, floating findings and a shield check.
 *
 * Responsibility: the hero's decorative illustration, drawn as inline SVG. Boundary: every
 * animation is a CSS keyframe on a class (see illustration.css), so the motion policy can
 * stop it; the resting state is the finished scan (beam mid-page, all marks lit). Colours
 * come from theme tokens. The parent hides it from assistive technology.
 */
import { type ReactElement, useId } from 'react';

/** Text-line widths (SVG units) — varied so the page reads as prose, not a table. */
const LINE_WIDTHS = [196, 176, 204, 160, 192, 184, 120, 200, 168, 140] as const;
const FIRST_LINE_Y = 128;
const LINE_STEP = 24;
const LINE_X = 148;

/** Which lines the scan flags, and how risky each is. */
const MARKS = [
  { line: 2, risk: 'high' },
  { line: 5, risk: 'medium' },
  { line: 8, risk: 'high' },
] as const;

const lineY = (index: number): number => FIRST_LINE_Y + index * LINE_STEP;

export function ScanIllustration(): ReactElement {
  const id = useId();
  const haloId = `${id}-halo`;
  const trailId = `${id}-trail`;
  const shieldId = `${id}-shield`;

  return (
    <svg className="scan" viewBox="0 0 520 480" focusable="false">
      <defs>
        <radialGradient id={haloId}>
          <stop offset="0" className="scan__halo-stop" />
          <stop offset="1" className="scan__halo-stop scan__halo-stop--end" />
        </radialGradient>
        <linearGradient id={trailId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className="scan__trail-stop scan__trail-stop--end" />
          <stop offset="1" className="scan__trail-stop" />
        </linearGradient>
        <linearGradient id={shieldId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" className="brand__stop-1" />
          <stop offset="1" className="brand__stop-2" />
        </linearGradient>
      </defs>

      <circle cx="270" cy="236" r="230" fill={`url(#${haloId})`} />
      <rect className="scan__sheet scan__sheet--back" x="150" y="58" width="250" height="350" rx="18" />
      <rect className="scan__sheet" x="120" y="40" width="260" height="384" rx="20" />
      <rect className="scan__title" x={LINE_X} y="72" width="128" height="12" rx="6" />
      <rect className="scan__ink" x={LINE_X} y="94" width="84" height="7" rx="3.5" />

      {MARKS.map((mark, index) => (
        <g key={mark.line} className={`scan__mark scan__mark--${mark.risk} scan__mark--${index + 1}`}>
          <rect x="134" y={lineY(mark.line) - 7} width="232" height="21" rx="7" />
          <circle cx="128" cy={lineY(mark.line) + 3.5} r="4" />
        </g>
      ))}
      {LINE_WIDTHS.map((width, index) => (
        <rect
          key={lineY(index)}
          className="scan__ink"
          x={LINE_X}
          y={lineY(index)}
          width={width}
          height="7"
          rx="3.5"
        />
      ))}

      <path className="scan__signature" d="M150 392c8-16 16-16 20-2s12 12 20-2 12-10 18 0 10 6 16-2" />
      <line className="scan__sign-line" x1={LINE_X} y1="404" x2="268" y2="404" />

      <g className="scan__beam">
        <rect x="106" y="38" width="288" height="56" fill={`url(#${trailId})`} />
        <rect className="scan__beam-line" x="106" y="93" width="288" height="3" rx="1.5" />
      </g>

      <g className="scan__float scan__float--1">
        <rect className="scan__chip scan__chip--high" x="300" y="150" width="204" height="36" rx="18" />
        <circle className="scan__chip-dot scan__chip-dot--high" cx="321" cy="168" r="5" />
        <text className="scan__chip-text" x="334" y="173">
          High risk · lock-in penalty
        </text>
      </g>
      <g className="scan__float scan__float--2">
        <rect className="scan__chip" x="16" y="232" width="158" height="36" rx="18" />
        <text className="scan__chip-text scan__chip-text--verified" x="36" y="255">
          ✓ Verified quote
        </text>
      </g>
      <g className="scan__float scan__float--3">
        <rect className="scan__chip" x="30" y="326" width="170" height="36" rx="18" />
        <text className="scan__chip-text" x="50" y="349">
          ₹1,50,000 at stake
        </text>
      </g>

      <g className="scan__shield">
        <circle className="scan__shield-ring" cx="392" cy="384" r="40" />
        <circle cx="392" cy="384" r="32" fill={`url(#${shieldId})`} />
        <path className="scan__shield-check" d="M378 385l9 9 18-19" />
      </g>
    </svg>
  );
}
