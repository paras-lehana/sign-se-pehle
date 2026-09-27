/**
 * One bento tile: a tinted glass card with a decorative mini visual, a title and a line.
 *
 * Responsibility: consistent tile markup (an h3 per tile, so the grid is navigable by
 * heading). Boundary: presentation only; the tone and size classes are styled in bento.css.
 */
import type { ReactElement } from 'react';
import { TileVisual, type TileVisualKind } from './TileVisual';

export interface FeatureTileProps {
  readonly title: string;
  readonly body: string;
  readonly size: 'large' | 'wide' | 'small';
  readonly tone: 'indigo' | 'rose' | 'saffron' | 'violet' | 'cyan' | 'emerald';
  readonly visual: TileVisualKind;
}

export function FeatureTile({ title, body, size, tone, visual }: FeatureTileProps): ReactElement {
  return (
    <li className={`bento__tile bento__tile--${size} bento__tile--${tone} lift`}>
      <div className="bento__visual" aria-hidden="true">
        <TileVisual kind={visual} />
      </div>
      <h3 className="bento__title">{title}</h3>
      <p className="bento__body">{body}</p>
    </li>
  );
}
