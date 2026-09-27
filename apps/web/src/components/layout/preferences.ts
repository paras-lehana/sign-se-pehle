/**
 * Display preferences: colour theme and decorative motion, remembered on this device.
 *
 * Responsibility: read, apply and store the two reader choices as attributes on <html>
 * (`data-theme`, `data-motion`) that the CSS keys off. Boundary: storage may be blocked
 * (private mode), so every access is guarded; the defaults — dark theme, motion on —
 * then apply for this visit. The theme-colour meta tag reads the token, never a literal.
 */

export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'sign-se-pehle:theme';
export const MOTION_STORAGE_KEY = 'sign-se-pehle:motion';

/** Midnight glass is designed dark-first; light is an explicit, remembered choice. */
export const DEFAULT_THEME: Theme = 'dark';

const MOTION_PAUSED = 'paused';

function readPreference(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Stores a preference; a blocked store still leaves the choice applied for this visit. */
export function storePreference(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage blocked (private mode): the attribute on <html> still carries the choice.
  }
}

/**
 * The stored theme when there is one, else dark.
 * @example
 * initialTheme(); // 'dark' on a first visit
 */
export function initialTheme(): Theme {
  const stored = readPreference(THEME_STORAGE_KEY);
  return stored === 'light' || stored === 'dark' ? stored : DEFAULT_THEME;
}

/** Sets `data-theme` and keeps the browser UI colour in step with the page background. */
export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  root.dataset['theme'] = theme;
  const background = getComputedStyle(root).getPropertyValue('--color-bg').trim();
  if (background.length > 0) {
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', background);
  }
}

/** True when the reader paused decorative motion on an earlier visit. */
export function initialMotionPaused(): boolean {
  return readPreference(MOTION_STORAGE_KEY) === MOTION_PAUSED;
}

/** Sets or clears `data-motion="paused"`, which stops every looping decoration. */
export function applyMotion(paused: boolean): void {
  const root = document.documentElement;
  if (paused) root.dataset['motion'] = MOTION_PAUSED;
  else delete root.dataset['motion'];
}

/** Stores the motion choice. */
export function storeMotionPaused(paused: boolean): void {
  storePreference(MOTION_STORAGE_KEY, paused ? MOTION_PAUSED : 'playing');
}

/** Applies both stored choices before the first render, so there is no flash of the wrong theme. */
export function applyStoredPreferences(): void {
  applyTheme(initialTheme());
  applyMotion(initialMotionPaused());
}
