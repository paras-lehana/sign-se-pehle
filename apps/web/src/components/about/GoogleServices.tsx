/**
 * Google services used by the product, loaded from GET /api/google-services.
 *
 * Responsibility: list each service with its status and purpose. Boundary: the
 * catalogue is owned by core and served by the server; this component only renders it.
 */
import { type ReactElement, useEffect, useState } from 'react';
import { type GoogleServicesResponse, getGoogleServices } from '../../lib/api';

type Service = GoogleServicesResponse['services'][number];

const STATUS_TEXT: Readonly<Record<Service['status'], string>> = {
  live: 'Live',
  ready: 'Ready',
  planned: 'Planned',
};

type LoadState =
  | { readonly status: 'loading' }
  | { readonly status: 'error' }
  | { readonly status: 'done'; readonly services: readonly Service[] };

export function GoogleServices(): ReactElement {
  const [state, setState] = useState<LoadState>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    void getGoogleServices().then((result) => {
      if (!active) return;
      setState(
        result.ok ? { status: 'done', services: result.value.services } : { status: 'error' },
      );
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <section
      className="card"
      aria-labelledby="google-heading"
      aria-busy={state.status === 'loading'}
    >
      <h2 id="google-heading">Built on Google</h2>
      {state.status === 'loading' ? <p>Loading the list of services…</p> : null}
      {state.status === 'error' ? (
        <p>The service list could not be loaded right now. Gemini and Cloud Run power this app.</p>
      ) : null}
      {state.status === 'done' ? (
        <ul className="plain-list service-list" role="list">
          {state.services.map((service) => (
            <li key={service.id} className="service">
              <span className="service__name">{service.name}</span>
              <span className={`tag tag--${service.status}`}>{STATUS_TEXT[service.status]}</span>
              <p className="service__purpose">{service.purpose}</p>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
