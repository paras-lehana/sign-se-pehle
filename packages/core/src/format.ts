/**
 * Reader-facing number formatting (rupees, days, months, percentages).
 *
 * Responsibility: one place that turns document numbers into the strings rules,
 * the simulator and summaries interpolate, using Indian digit grouping (₹1,50,000).
 * Boundary: formatting only — no rounding policy beyond whole rupees for display.
 */
import type { FactUnit } from './schemas/facts.js';

/** Written as an escape so the symbol survives any editor or shell encoding. */
const RUPEE_SIGN = '₹';

/** `en-IN` gives lakh/crore grouping (1,50,000) — the grouping Indian readers expect. */
const INDIAN_GROUPING = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

/** Percentages and month counts in documents rarely carry more than two decimals (10.75% p.a.). */
const DECIMAL_FORMAT = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });

/**
 * Formats rupees with Indian digit grouping, rounded to whole rupees.
 * @example
 * formatInr(150000); // '₹1,50,000'
 */
export function formatInr(amount: number): string {
  return `${RUPEE_SIGN}${INDIAN_GROUPING.format(Math.round(amount))}`;
}

/**
 * Formats a day count with the right plural.
 * @example
 * formatDays(1); // '1 day'
 */
export function formatDays(days: number): string {
  return `${INDIAN_GROUPING.format(days)} ${days === 1 ? 'day' : 'days'}`;
}

/**
 * Formats a month count with the right plural.
 * @example
 * formatMonths(11); // '11 months'
 */
export function formatMonths(months: number): string {
  return `${DECIMAL_FORMAT.format(months)} ${months === 1 ? 'month' : 'months'}`;
}

/**
 * Formats a percentage with up to two decimals.
 * @example
 * formatPercent(10.5); // '10.5%'
 */
export function formatPercent(percent: number): string {
  return `${DECIMAL_FORMAT.format(percent)}%`;
}

/**
 * Formats any numeric fact by its unit (see FACT_DEFINITIONS).
 * @example
 * formatFactValue(30, 'days'); // '30 days'
 */
export function formatFactValue(value: number, unit: FactUnit): string {
  switch (unit) {
    case 'inr':
      return formatInr(value);
    case 'days':
      return formatDays(value);
    case 'months':
      return formatMonths(value);
    case 'percent':
      return formatPercent(value);
  }
}

/**
 * Shortens text to at most `max` characters on a word boundary, adding an ellipsis.
 * Keeps model and rule text inside schema bounds instead of failing validation.
 * @example
 * clipText('one two three', 8); // 'one two…'
 */
export function clipText(text: string, max: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  const slice = trimmed.slice(0, Math.max(0, max - 1));
  const lastSpace = slice.lastIndexOf(' ');
  const cut = lastSpace > 0 ? slice.slice(0, lastSpace) : slice;
  return `${cut.trimEnd()}…`;
}
