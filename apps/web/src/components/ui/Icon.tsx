/**
 * Line icons drawn from one path table (24 × 24 grid, stroke in currentColor).
 *
 * Responsibility: consistent, theme-aware pictograms for tabs, buttons and badges without
 * an icon font or external sprite (the CSP allows only same-origin assets). Boundary:
 * always decorative — the text beside an icon carries its meaning.
 */
import type { ReactElement } from 'react';

const ICON_PATHS = {
  paste: 'M9 4h6v3H9zM8 5.5H6.5A1.5 1.5 0 0 0 5 7v12.5A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V7a1.5 1.5 0 0 0-1.5-1.5H16M8.5 12h7M8.5 15.5h5',
  upload: 'M12 15V4M7.5 8.5 12 4l4.5 4.5M4.5 15.5v3a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5-1.5v-3',
  camera: 'M4 8.5A1.5 1.5 0 0 1 5.5 7h2.2L9.2 5h5.6l1.5 2h2.2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5zM12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z',
  sparkle: 'M12 3.5l1.9 5.1 5.1 1.9-5.1 1.9L12 17.5l-1.9-5.1L5 10.5l5.1-1.9zM18.5 16l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z',
  lock: 'M7 11V8a5 5 0 0 1 10 0v3M6 11h12v9H6zM12 14.5v2',
  file: 'M7 3.5h7l4.5 4.5v12.5H7zM14 3.5V8h4.5',
  close: 'M6.5 6.5l11 11M17.5 6.5l-11 11',
  shield: 'M12 3.5 19 6v5.5c0 4.2-2.9 7.6-7 9-4.1-1.4-7-4.8-7-9V6zM8.8 12l2.2 2.2 4.4-4.4',
  external: 'M14 4.5h5.5V10M19.5 4.5 11 13M17 14v4.5a1 1 0 0 1-1 1H5.5a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1H10',
  calendar: 'M5 6.5h14v13H5zM5 10.5h14M9 4v4M15 4v4',
} as const;

export type IconName = keyof typeof ICON_PATHS;

interface IconProps {
  readonly name: IconName;
  readonly className?: string;
}

export function Icon({ name, className }: IconProps): ReactElement {
  return (
    <svg
      className={className === undefined ? 'icon' : `icon ${className}`}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path d={ICON_PATHS[name]} />
    </svg>
  );
}
