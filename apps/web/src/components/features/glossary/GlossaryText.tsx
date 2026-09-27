/**
 * Text with its legal terms made tappable.
 *
 * Responsibility: wrap the first occurrence of each glossary term in a GlossaryTerm and
 * leave every other character exactly as written. Boundary: matching (whole words, case,
 * overlaps) is core's findGlossaryTerms; this component only splits and renders.
 */
import { Fragment, type ReactElement, useMemo } from 'react';
import { GLOSSARY, type GlossaryEntry, findGlossaryTerms } from '@sign-se-pehle/core';
import { GlossaryTerm } from './GlossaryTerm';

interface GlossaryTextProps {
  readonly text: string;
}

interface TextPiece {
  readonly start: number;
  readonly text: string;
  readonly entry?: GlossaryEntry;
}

const ENTRIES_BY_ID: ReadonlyMap<string, GlossaryEntry> = new Map(
  GLOSSARY.map((entry) => [entry.id, entry]),
);

/**
 * Splits text into plain pieces and glossary-term pieces, in order, covering it exactly.
 * @example
 * splitByGlossary('Pay the security deposit.'); // [plain 'Pay the ', term 'security deposit', plain '.']
 */
export function splitByGlossary(text: string): TextPiece[] {
  const pieces: TextPiece[] = [];
  let cursor = 0;
  for (const match of findGlossaryTerms(text)) {
    const entry = ENTRIES_BY_ID.get(match.entryId);
    if (entry === undefined || match.start < cursor) continue;
    if (match.start > cursor) pieces.push({ start: cursor, text: text.slice(cursor, match.start) });
    pieces.push({ start: match.start, text: text.slice(match.start, match.end), entry });
    cursor = match.end;
  }
  if (cursor < text.length) pieces.push({ start: cursor, text: text.slice(cursor) });
  return pieces;
}

export function GlossaryText({ text }: GlossaryTextProps): ReactElement {
  const pieces = useMemo(() => splitByGlossary(text), [text]);
  return (
    <>
      {pieces.map((piece) =>
        piece.entry === undefined ? (
          <Fragment key={piece.start}>{piece.text}</Fragment>
        ) : (
          <GlossaryTerm key={piece.start} entry={piece.entry} text={piece.text} />
        ),
      )}
    </>
  );
}
