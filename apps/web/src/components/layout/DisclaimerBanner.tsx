/**
 * Always-visible legal-information disclaimer.
 *
 * Responsibility: state on every page that the product informs and never advises.
 * Boundary: rendered by the layout, so no page can omit it.
 */
import type { ReactElement } from 'react';

export function DisclaimerBanner(): ReactElement {
  return (
    <aside className="disclaimer-banner" aria-label="Disclaimer">
      <span className="disclaimer-banner__icon" aria-hidden="true">
        {'⚖'}
      </span>
      <p>
        <strong>Information, not legal advice.</strong> Sign Se Pehle helps you understand a
        document. For decisions that matter, consider asking a lawyer or a free legal aid clinic.
      </p>
    </aside>
  );
}
