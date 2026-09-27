/**
 * Logo mark: a folded page with a saffron check on an indigo-to-violet tile.
 *
 * Responsibility: the brand symbol used in the header and footer. Boundary: decorative
 * (aria-hidden) — the wordmark beside it carries the name. The gradient id comes from
 * useId so two marks on one page never collide.
 */
import { type ReactElement, useId } from 'react';

export function BrandMark(): ReactElement {
  const gradientId = useId();
  return (
    <svg className="brand__mark" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" className="brand__stop-1" />
          <stop offset="1" className="brand__stop-2" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill={`url(#${gradientId})`} />
      <path className="brand__mark-page" d="M9 6h9.5L23 10.5V25a1 1 0 0 1-1 1H10a1 1 0 0 1-1-1z" />
      <path className="brand__mark-line" d="M12 13.5h7M12 17h7M12 20.5h3.5" />
      <circle className="brand__mark-seal" cx="22.5" cy="22.5" r="5.5" />
      <path className="brand__mark-check" d="M20.1 22.6l1.6 1.6 3-3.3" />
    </svg>
  );
}
