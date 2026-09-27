/**
 * Fallback page for unknown routes.
 *
 * Responsibility: a clear dead-end message with a way back. Boundary: static.
 */
import type { ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { PageHero } from '../components/ui/PageHero';
import { usePageTitle } from '../lib/use-page-title';

export function NotFoundPage(): ReactElement {
  usePageTitle('Page not found');
  return (
    <div className="not-found glass glass--blur">
      <p className="not-found__code gradient-text" aria-hidden="true">
        404
      </p>
      <PageHero eyebrow="Lost the thread" title="Page not found">
        That page does not exist. Let us get you back to your document.
      </PageHero>
      <Link className="button button--cta" to="/">
        Explain a document
      </Link>
    </div>
  );
}
