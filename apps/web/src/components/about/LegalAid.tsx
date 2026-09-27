/**
 * Free legal aid directory.
 *
 * Responsibility: point readers to official, free help. Boundary: static copy; every
 * link is an official government site.
 */
import type { ReactElement } from 'react';

const LEGAL_AID = [
  {
    name: 'NALSA free legal aid',
    detail:
      'Free lawyers for eligible people under the Legal Services Authorities Act. Call 15100.',
    href: 'https://nalsa.gov.in/',
  },
  {
    name: 'Tele-Law',
    detail: 'Free advice from panel lawyers by phone or video through Common Service Centres.',
    href: 'https://www.tele-law.in/',
  },
  {
    name: 'National Consumer Helpline',
    detail: 'For unfair terms from sellers, apps and service providers. Call 1915.',
    href: 'https://consumerhelpline.gov.in/',
  },
  {
    name: 'e-Jagriti',
    detail: 'File a consumer complaint online with the consumer commission.',
    href: 'https://e-jagriti.gov.in/',
  },
] as const;

export function LegalAid(): ReactElement {
  return (
    <section className="card" aria-labelledby="legal-aid-heading">
      <h2 id="legal-aid-heading">Free legal help</h2>
      <ul className="plain-list aid-list" role="list">
        {LEGAL_AID.map((item) => (
          <li key={item.name} className="aid">
            <a href={item.href} target="_blank" rel="noopener noreferrer">
              {item.name}
              <span className="visually-hidden"> (opens official site in a new tab)</span>
            </a>
            <p>{item.detail}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
