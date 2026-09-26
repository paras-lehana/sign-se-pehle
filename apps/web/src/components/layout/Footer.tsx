/**
 * Site footer with the disclaimer, privacy note and free legal aid pointer.
 *
 * Responsibility: persistent trust information. Boundary: static copy only.
 */
import type { ReactElement } from 'react';
import { Link } from 'react-router-dom';

export function Footer(): ReactElement {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <p>
          Sign Se Pehle explains documents in plain language and links to official Indian law
          sources. It does not give legal advice or predict court outcomes.
        </p>
        <p>
          Personal numbers such as Aadhaar, PAN and phone numbers are masked before analysis. Need
          help? NALSA free legal aid: <a href="tel:15100">15100</a> ·{' '}
          <Link to="/about">How it works</Link>
        </p>
      </div>
    </footer>
  );
}
