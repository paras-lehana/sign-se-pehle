/**
 * Page shell: skip link, header, main landmark, disclaimer and footer.
 *
 * Responsibility: the landmarks every page shares. Boundary: page content renders
 * through the router outlet inside a Suspense boundary, so lazily loaded pages show an
 * announced fallback while the header, disclaimer and footer stay put.
 */
import { type ReactElement, Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { LoadingFallback } from '../ui/LoadingFallback';
import { DisclaimerBanner } from './DisclaimerBanner';
import { Footer } from './Footer';
import { Header } from './Header';

export function Layout(): ReactElement {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to main content
      </a>
      <Header />
      <main id="main" className="site-main" tabIndex={-1}>
        <DisclaimerBanner />
        <Suspense fallback={<LoadingFallback label="Loading the page…" />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
