/**
 * App shell tests: disclaimer and landmarks on every route (lazy pages included), the
 * current-page marker, the dark-first theme default and the motion pause control.
 */
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { GOOGLE_SERVICES } from '@sign-se-pehle/core';
import { App } from '../App';
import {
  DEFAULT_THEME,
  MOTION_STORAGE_KEY,
  THEME_STORAGE_KEY,
} from '../components/layout/preferences';
import { jsonResponse, renderAt, stubFetch } from './helpers';

const ROUTES = ['/', '/compare', '/about', '/no-such-page'] as const;

beforeEach(() => {
  window.localStorage.clear();
  delete document.documentElement.dataset['theme'];
  delete document.documentElement.dataset['motion'];
});

describe('App shell', () => {
  it.each(ROUTES)('shows the disclaimer, one h1 and a skip link on %s', async (path) => {
    stubFetch(jsonResponse({ services: GOOGLE_SERVICES }));
    renderAt(<App />, path);
    // Compare and About are lazily loaded, so wait for the page heading.
    expect(await screen.findAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('complementary', { name: 'Disclaimer' })).toHaveTextContent(
      'Information, not legal advice.',
    );
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

  it('marks the current page in the navigation', async () => {
    renderAt(<App />, '/compare');
    await screen.findByRole('heading', { level: 1, name: 'Compare two drafts' });
    expect(screen.getByRole('link', { name: 'Compare' })).toHaveAttribute('aria-current', 'page');
  });
});

describe('display preferences', () => {
  it('defaults to the dark theme when nothing is stored', () => {
    expect(DEFAULT_THEME).toBe('dark');
    renderAt(<App />, '/');
    expect(document.documentElement.dataset['theme']).toBe('dark');
    expect(screen.getByRole('button', { name: 'Dark theme' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('lets a stored light choice win, and remembers a switch', async () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'light');
    renderAt(<App />, '/');
    expect(document.documentElement.dataset['theme']).toBe('light');
    const toggle = screen.getByRole('button', { name: 'Dark theme' });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(toggle);
    expect(document.documentElement.dataset['theme']).toBe('dark');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });

  it('pauses decorative motion on request and remembers it', async () => {
    renderAt(<App />, '/');
    const pause = screen.getByRole('button', { name: 'Pause animations' });
    expect(pause).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(pause);
    expect(pause).toHaveAttribute('aria-pressed', 'true');
    expect(document.documentElement.dataset['motion']).toBe('paused');
    expect(window.localStorage.getItem(MOTION_STORAGE_KEY)).toBe('paused');
  });
});
