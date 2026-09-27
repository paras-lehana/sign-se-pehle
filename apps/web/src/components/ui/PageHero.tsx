/**
 * Title block for inner pages: eyebrow, the page's one h1 and a lede.
 *
 * Responsibility: consistent page openings for Compare, About and Not found. Boundary:
 * presentation only; the home page has its own, larger hero.
 */
import type { ReactElement, ReactNode } from 'react';

interface PageHeroProps {
  readonly eyebrow: string;
  readonly title: string;
  readonly children: ReactNode;
}

export function PageHero({ eyebrow, title, children }: PageHeroProps): ReactElement {
  return (
    <div className="page-hero">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="page-hero__title">{title}</h1>
      <p className="lede">{children}</p>
    </div>
  );
}
