/**
 * Offline clause segmentation.
 *
 * Responsibility: split a pasted agreement into clause-sized segments on numbered
 * headings and blank lines, keeping each segment's text verbatim so quotes verify.
 * Boundary: structure only — classification happens in classify.ts.
 */

/** Top-level clause numbers: "1.", "12)", "Clause 3.", "Article 4)". Sub-items like "(a)" stay inside. */
const NUMBERED_HEADING = /^\s*(?:(?:clause|article|section)\s+)?\d{1,2}[.)](?!\d)\s*/i;

/** A heading line is short; anything longer is body text. */
const MAX_HEADING_CHARS = 80;

/** Fragments shorter than this (page numbers, stray titles) are not clauses. */
const MIN_SEGMENT_CHARS = 25;

/** clauseSchema caps quotes at 1,200 characters. */
export const MAX_QUOTE_CHARS = 1_200;

/** Offline analysis returns at most the schema's clause limit. */
const MAX_SEGMENTS = 40;

export interface Segment {
  /** Heading text without its number, or '' when the segment has none. */
  readonly heading: string;
  /** Verbatim segment text (possibly shortened on a word boundary). */
  readonly quote: string;
}

/**
 * Returns the longest prefix of `text` within `max` characters that ends on a word boundary,
 * so the result is still a verbatim substring.
 * @example
 * verbatimPrefix('one two three', 9); // 'one two'
 */
export function verbatimPrefix(text: string, max: number): string {
  if (text.length <= max) return text;
  const slice = text.slice(0, max);
  const lastSpace = slice.search(/\s\S*$/);
  return (lastSpace > 0 ? slice.slice(0, lastSpace) : slice).trimEnd();
}

function isHeadingLine(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.length > 0 && trimmed.length <= MAX_HEADING_CHARS && !/[.;]$/.test(trimmed);
}

function headingOf(lines: readonly string[]): string {
  const first = lines[0] ?? '';
  const numbered = NUMBERED_HEADING.test(first);
  const stripped = first.replace(NUMBERED_HEADING, '');
  const candidate = (numbered ? (stripped.split(/[.:–—-]\s/)[0] ?? '') : stripped).trim();
  if (lines.length > 1 && isHeadingLine(candidate)) return candidate.replace(/[:\s]+$/, '');
  if (numbered && candidate.length > 0 && candidate.length <= MAX_HEADING_CHARS / 2) return candidate.replace(/[:\s]+$/, '');
  return '';
}

/**
 * Splits text into clause segments.
 * @example
 * segmentClauses('1. RENT\nThe tenant pays rent monthly.\n\n2. DEPOSIT\nA deposit is payable.');
 * // [{ heading: 'RENT', quote: '1. RENT\nThe tenant pays rent monthly.' }, …]
 */
export function segmentClauses(text: string): Segment[] {
  const groups: string[][] = [];
  let current: string[] = [];
  const flush = (): void => {
    if (current.length > 0) groups.push(current);
    current = [];
  };
  for (const line of text.split(/\r?\n/)) {
    if (line.trim() === '') {
      const onlyHeading = current.length === 1 && isHeadingLine(current[0] ?? '');
      if (!onlyHeading) flush();
      continue;
    }
    if (NUMBERED_HEADING.test(line)) flush();
    current.push(line.trim());
  }
  flush();
  return groups
    .map((lines) => ({ heading: headingOf(lines), quote: verbatimPrefix(lines.join('\n'), MAX_QUOTE_CHARS) }))
    .filter((segment) => segment.quote.length >= MIN_SEGMENT_CHARS)
    .slice(0, MAX_SEGMENTS);
}
