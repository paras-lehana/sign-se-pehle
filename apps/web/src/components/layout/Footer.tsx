/**
 * Site footer: what the product is, the privacy promise and where to get free help.
 *
 * Responsibility: persistent trust information on every page. Boundary: static copy;
 * the phone numbers are official national helplines.
 */
import type { ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { BrandMark } from './BrandMark';

export function Footer(): ReactElement {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div>
          <p className="site-footer__brand">
            <BrandMark />
            <span>Sign Se Pehle</span>
          </p>
          <p>
            Sign Se Pehle explains documents in plain language and links to official Indian law
            sources. It does not give legal advice or predict court outcomes.
          </p>
        </div>
        <div>
          <p className="site-footer__title">Your privacy</p>
          <p>
            Personal numbers such as Aadhaar, PAN and phone numbers are masked before analysis.
            Documents are not stored and there are no accounts or trackers.
          </p>
        </div>
        <div>
          <p className="site-footer__title">Free help</p>
          <ul className="plain-list site-footer__links" role="list">
            <li>
              <a href="tel:15100">NALSA free legal aid: 15100</a>
            </li>
            <li>
              <a href="tel:1915">National Consumer Helpline: 1915</a>
            </li>
            <li>
              <Link to="/about">How it works</Link>
            </li>
          </ul>
        </div>
      </div>
      <p className="site-footer__legal">
        Information, not legal advice. For decisions that matter, consider asking a lawyer or a
        free legal aid clinic.
      </p>
    </footer>
  );
}
