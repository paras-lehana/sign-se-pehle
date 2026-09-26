/**
 * Google Calendar and Google Maps deep links.
 *
 * Responsibility: build share-free template URLs so a reader can save a document's
 * deadline to Google Calendar or look up a place in Google Maps with one tap.
 * Boundary: URL construction only — no API keys, no network, no user data beyond
 * what the reader chooses to open.
 */

const CALENDAR_BASE = 'https://calendar.google.com/calendar/render';
const MAPS_BASE = 'https://www.google.com/maps/search/';
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
/** Google Calendar truncates very long details; 1,000 characters keeps links well under URL limits. */
const MAX_DETAILS_CHARS = 1_000;
const MONTH_OFFSET = 1;
const PAD_WIDTH = 2;
const YEAR_WIDTH = 4;

export interface CalendarEventInput {
  readonly title: string;
  readonly isoDate: string;
  readonly details: string;
}

function compactDate(date: Date): string {
  const year = String(date.getUTCFullYear()).padStart(YEAR_WIDTH, '0');
  const month = String(date.getUTCMonth() + MONTH_OFFSET).padStart(PAD_WIDTH, '0');
  const day = String(date.getUTCDate()).padStart(PAD_WIDTH, '0');
  return `${year}${month}${day}`;
}

/** YYYYMMDD/YYYYMMDD for an all-day event (end date is exclusive), or null for an invalid date. */
function allDayRange(isoDate: string): string | null {
  const match = ISO_DATE.exec(isoDate);
  if (match === null) return null;
  const [, year, month, day] = match.map(Number);
  if (year === undefined || month === undefined || day === undefined) return null;
  const start = new Date(Date.UTC(year, month - MONTH_OFFSET, day));
  if (start.getUTCMonth() !== month - MONTH_OFFSET || start.getUTCDate() !== day) return null;
  const end = new Date(Date.UTC(year, month - MONTH_OFFSET, day + 1));
  return `${compactDate(start)}/${compactDate(end)}`;
}

/**
 * Builds a Google Calendar "add event" link for an all-day event on `isoDate`.
 * An invalid date still yields a usable link, just without a pre-filled date.
 * @example
 * buildGoogleCalendarUrl({ title: 'Rent due', isoDate: '2026-10-05', details: 'Clause 3' });
 * // 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=Rent%20due&dates=20261005/20261006&details=Clause%203'
 */
export function buildGoogleCalendarUrl(input: CalendarEventInput): string {
  const range = allDayRange(input.isoDate);
  const parts = [
    'action=TEMPLATE',
    `text=${encodeURIComponent(input.title.trim())}`,
    ...(range === null ? [] : [`dates=${range}`]),
    `details=${encodeURIComponent(input.details.trim().slice(0, MAX_DETAILS_CHARS))}`,
  ];
  return `${CALENDAR_BASE}?${parts.join('&')}`;
}

/**
 * Builds a Google Maps search link (Maps URLs API, no key needed).
 * @example
 * buildMapsSearchUrl('District Legal Services Authority Pune');
 * // 'https://www.google.com/maps/search/?api=1&query=District%20Legal%20Services%20Authority%20Pune'
 */
export function buildMapsSearchUrl(query: string): string {
  return `${MAPS_BASE}?api=1&query=${encodeURIComponent(query.trim())}`;
}
