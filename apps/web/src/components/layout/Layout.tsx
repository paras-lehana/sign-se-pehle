/**
 * Page shell: skip link, header, main landmark, disclaimer and footer.
 *
 * Responsibility: the landmarks every page shares. Boundary: page content renders
 * through the router outlet; the disclaimer banner is always present by design.
 */
import type { ReactElement } from 'react';
import { Outlet } from 'react-router-dom';
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
        <Outlet />
      </main>
      <Footer />
    </>
  );
}
