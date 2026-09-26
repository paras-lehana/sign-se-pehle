/**
 * App shell tests: the disclaimer and landmarks are present on every route.
 */
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { GOOGLE_SERVICES } from '@sign-se-pehle/core';
import { App } from '../App';
import { jsonResponse, renderAt, stubFetch } from './helpers';

const ROUTES = ['/', '/compare', '/about', '/no-such-page'] as const;

describe('App shell', () => {
  it.each(ROUTES)('shows the disclaimer, one h1 and a skip link on %s', async (path) => {
    stubFetch(jsonResponse({ services: GOOGLE_SERVICES }));
    renderAt(<App />, path);
    expect(screen.getByRole('complementary', { name: 'Disclaimer' })).toHaveTextContent(
      'Information, not legal advice.',
    );
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('link', { name: 'Skip to main content' })).toHaveAttribute(
      'href',
      '#main',
    );
    expect(
      screen.getByText('Understand every clause before you sign', { selector: 'span' }),
    ).toBeInTheDocument();
    if (path === '/about') {
      const firstService = GOOGLE_SERVICES[0];
      if (firstService !== undefined) {
        expect(await screen.findByText(firstService.name)).toBeInTheDocument();
      }
    }
  });

  it('marks the current page in the navigation', () => {
    renderAt(<App />, '/compare');
    expect(screen.getByRole('link', { name: 'Compare' })).toHaveAttribute('aria-current', 'page');
  });
});
