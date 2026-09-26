/**
 * Latency formatting for provenance badges.
 *
 * Responsibility: show how long a response took ("3.2 s"). Boundary: money and fact
 * formatting (Indian digit grouping) is reused from core's format helpers.
 */
const SECONDS_FORMAT = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 1 });

const MS_PER_SECOND = 1000;

/**
 * Milliseconds as seconds with one decimal.
 * @example
 * formatSeconds(3240); // '3.2 s'
 */
export function formatSeconds(ms: number): string {
  return `${SECONDS_FORMAT.format(ms / MS_PER_SECOND)} s`;
}
