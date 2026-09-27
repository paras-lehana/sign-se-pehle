/**
 * Subscribes a component to a CSS media query.
 *
 * Responsibility: tell layout components when the viewport crosses a breakpoint (the report
 * switches between stacked and two-column at 1100 px). Boundary: uses the browser's own
 * change events via useSyncExternalStore; where matchMedia is missing (old browsers, tests)
 * it reports `false`, i.e. the stacked, mobile-first layout.
 */
import { useCallback, useSyncExternalStore } from 'react';

function canMatch(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function';
}

export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!canMatch()) return () => undefined;
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => canMatch() && window.matchMedia(query).matches,
    () => false,
  );
}
