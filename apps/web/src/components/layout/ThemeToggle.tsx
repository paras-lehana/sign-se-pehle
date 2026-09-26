/**
 * Light / dark theme switch.
 *
 * Responsibility: override the system colour scheme via `data-theme` on <html> and
 * remember the choice on this device. Boundary: storage may be unavailable (private
 * mode), so every access is guarded and the system preference remains the default.
 */
import { type ReactElement, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

const STORAGE_KEY = 'sign-se-pehle:theme';

function readStoredTheme(): Theme | null {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === 'light' || stored === 'dark' ? stored : null;
  } catch {
    return null;
  }
}

function systemTheme(): Theme {
  return typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

function storeTheme(theme: Theme): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Storage blocked (private mode): the choice still applies for this visit.
  }
}

export function ThemeToggle(): ReactElement {
  const [theme, setTheme] = useState<Theme>(() => readStoredTheme() ?? systemTheme());

  useEffect(() => {
    document.documentElement.dataset['theme'] = theme;
  }, [theme]);

  function toggle(): void {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    storeTheme(next);
  }

  return (
    <button type="button" className="theme-toggle" aria-pressed={theme === 'dark'} onClick={toggle}>
      <span aria-hidden="true">{theme === 'dark' ? '☾' : '☀'}</span>
      <span className="visually-hidden">Dark theme</span>
    </button>
  );
}
