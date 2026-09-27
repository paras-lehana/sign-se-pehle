/**
 * Light / dark theme switch.
 *
 * Responsibility: a pressed-state toggle for the dark theme that applies and remembers the
 * choice. Boundary: storage and the <html> attribute live in preferences.ts; the default
 * (no stored choice) is dark.
 */
import { type ReactElement, useEffect, useState } from 'react';
import { type Theme, THEME_STORAGE_KEY, applyTheme, initialTheme, storePreference } from './preferences';

export function ThemeToggle(): ReactElement {
  const [theme, setTheme] = useState<Theme>(initialTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  function toggle(): void {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    storePreference(THEME_STORAGE_KEY, next);
  }

  return (
    <button
      type="button"
      className="icon-button"
      aria-pressed={theme === 'dark'}
      title="Dark theme"
      onClick={toggle}
    >
      {theme === 'dark' ? (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2.5v2M12 19.5v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2.5 12h2M19.5 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
        </svg>
      )}
      <span className="visually-hidden">Dark theme</span>
    </button>
  );
}
