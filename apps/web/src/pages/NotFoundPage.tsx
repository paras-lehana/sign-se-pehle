/**
 * Fallback page for unknown routes.
 *
 * Responsibility: a clear dead-end message with a way back. Boundary: static.
 */
import type { ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { usePageTitle } from '../lib/use-page-title';

export function NotFoundPage(): ReactElement {
  usePageTitle('Page not found');
  return (
    <section className="card">
      <h1>Page not found</h1>
      <p>
        That page does not exist. <Link to="/">Explain a document</Link> instead.
      </p>
    </section>
  );
}
