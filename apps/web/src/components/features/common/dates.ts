/**
 * Browser-side dates for deadlines and the lawyer brief.
 *
 * Responsibility: read today's date from the reader's own clock (core stays clock-free
 * and takes `todayIso` as input) and format ISO dates for people. Boundary: calendar
 * arithmetic lives in core's engine/deadline.ts; this file only reads and prints dates.
 */

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const PAD_WIDTH = 2;
/** JavaScript months are zero-based; ISO months are one-based. */
const MONTH_OFFSET = 1;

/** "27 September 2026": the long form Indian readers see on letters and notices. */
const DISPLAY_FORMAT = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

/**
 * Today on the reader's device as YYYY-MM-DD, using the local calendar (not UTC), so a
 * reader in India at 1 a.m. still gets their own date.
 * @example
 * todayIsoLocal(new Date(2026, 8, 27)); // '2026-09-27'
 */
export function todayIsoLocal(now: Date = new Date()): string {
  const month = String(now.getMonth() + MONTH_OFFSET).padStart(PAD_WIDTH, '0');
  const day = String(now.getDate()).padStart(PAD_WIDTH, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

/**
 * An ISO date in words, or the input unchanged when it is not a valid ISO date.
 * @example
 * formatIsoDate('2026-10-12'); // '12 October 2026'
 */
export function formatIsoDate(isoDate: string): string {
  const match = ISO_DATE.exec(isoDate);
  if (match === null) return isoDate;
  const [, year, month, day] = match.map(Number);
  if (year === undefined || month === undefined || day === undefined) return isoDate;
  return DISPLAY_FORMAT.format(new Date(Date.UTC(year, month - MONTH_OFFSET, day)));
}
