/**
 * About page: how it works, Google services, privacy, disclaimer and free legal aid.
 *
 * Responsibility: explain the pipeline and the trust model in plain language.
 * Boundary: the Google services list is fetched live from the server's catalogue so
 * it never drifts from what the deployment actually uses.
 */
import type { ReactElement } from 'react';
import { GoogleServices } from '../components/about/GoogleServices';
import { LegalAid } from '../components/about/LegalAid';
import { PipelineDiagram } from '../components/about/PipelineDiagram';
import { PageHero } from '../components/ui/PageHero';
import { usePageTitle } from '../lib/use-page-title';

export function AboutPage(): ReactElement {
  usePageTitle('How it works');
  return (
    <>
      <PageHero eyebrow="How it works" title="How Sign Se Pehle works">
        “Sign Se Pehle” means “before you sign”. It turns dense Indian legal documents into plain
        language, checks them against Indian law and shows you exactly which words it relied on.
      </PageHero>
      <PipelineDiagram />
      <GoogleServices />
      <div className="about-grid">
        <section className="card" aria-labelledby="privacy-heading">
        <h2 id="privacy-heading">Your privacy</h2>
        <ul>
          <li>
            Aadhaar, PAN, phone numbers, emails, bank and card numbers are masked before any AI sees
            the text.
          </li>
          <li>
            Documents are not stored in a database. A short-lived cache avoids re-analysing the same
            text.
          </li>
          <li>
            No accounts, no tracking scripts, no third-party fonts — the page only talks to its own
            server.
          </li>
          <li>
            Read-aloud sends only the sentence you asked to hear, never the rest of your document,
            to Google Translate’s free voice (the default, no account needed) or, if you choose it
            in the Voice picker, Sarvam AI — an Indian-language voice service.
          </li>
        </ul>
      </section>
        <section className="card" aria-labelledby="disclaimer-heading">
          <h2 id="disclaimer-heading">Information, not legal advice</h2>
          <p>
            Explanations can be incomplete or wrong. Red flags point to official sources so you can
            check them yourself. Sign Se Pehle never tells you whether to sign, and never predicts
            what a court would decide.
          </p>
        </section>
      </div>
      <LegalAid />
    </>
  );
}
