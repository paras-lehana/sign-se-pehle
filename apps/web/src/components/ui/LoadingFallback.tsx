/**
 * Small, announced placeholder shown while a lazily loaded page or panel arrives.
 *
 * Responsibility: tell every reader something is loading (a polite status region) without
 * shifting the layout much. Boundary: presentation only; Suspense decides when it shows.
 */
import type { ReactElement } from 'react';

interface LoadingFallbackProps {
  readonly label: string;
}

export function LoadingFallback({ label }: LoadingFallbackProps): ReactElement {
  return (
    <p className="loading-fallback" role="status">
      <span className="loading-fallback__spinner" aria-hidden="true" />
      {label}
    </p>
  );
}
