/**
 * "Where to go": the official forums that fit this kind of document.
 *
 * Responsibility: list each curated government or regulator forum with when people
 * generally use it, its website and (when certain) its helpline. Boundary: the list comes
 * from core's routesForKind; this says where help exists, never what the reader should file.
 */
import type { ReactElement } from 'react';
import { type DocumentKind, routesForKind } from '@sign-se-pehle/core';

interface ForumRoutesProps {
  readonly kind: DocumentKind;
}

export function ForumRoutes({ kind }: ForumRoutesProps): ReactElement {
  return (
    <ul className="plain-list forum-list" role="list">
      {routesForKind(kind).map((route) => (
        <li key={route.id} className="forum">
          <h5 className="forum__name">{route.name}</h5>
          <p className="forum__when">{route.when}</p>
          <p className="forum__links">
            <a href={route.url} target="_blank" rel="noopener noreferrer">
              Visit the official site
              <span className="visually-hidden"> of {route.name} (opens in a new tab)</span>
            </a>
            {route.phone === undefined ? null : (
              <a href={`tel:${route.phone}`} className="forum__phone">
                <span aria-hidden="true">✆</span> Call {route.phone}
              </a>
            )}
          </p>
        </li>
      ))}
    </ul>
  );
}
