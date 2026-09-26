/**
 * Sets the document title for the current page.
 *
 * Responsibility: give every route a distinct title so screen-reader users and tabs
 * know where they are. Boundary: title text is passed in by each page.
 */
import { useEffect } from 'react';

const PRODUCT_NAME = 'Sign Se Pehle';

export function usePageTitle(pageTitle: string): void {
  useEffect(() => {
    document.title = `${pageTitle} · ${PRODUCT_NAME}`;
  }, [pageTitle]);
}
