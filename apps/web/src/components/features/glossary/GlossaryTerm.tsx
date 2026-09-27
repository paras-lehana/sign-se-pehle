/**
 * One tappable legal term with a plain-language meaning popover.
 *
 * Responsibility: a disclosure button (`aria-expanded`, `aria-controls`) whose popover
 * closes on Escape (returning focus to the term), on the close button and on any click
 * outside. Boundary: the popover sits right after the term in the DOM so screen readers
 * reach it next; on small screens CSS lays it out as a block under the line instead of
 * floating, so it can never run off the edge.
 */
import { type ReactElement, useEffect, useId, useRef, useState } from 'react';
import type { GlossaryEntry } from '@sign-se-pehle/core';

interface GlossaryTermProps {
  readonly entry: GlossaryEntry;
  /** The term exactly as written in the text (keeps the document's own casing). */
  readonly text: string;
}

export function GlossaryTerm({ entry, text }: GlossaryTermProps): ReactElement {
  const popoverId = useId();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    function handlePointerDown(event: PointerEvent): void {
      const inside = event.target instanceof Node && wrapperRef.current?.contains(event.target);
      if (inside !== true) setOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key !== 'Escape') return;
      setOpen(false);
      buttonRef.current?.focus();
    }
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  function close(): void {
    setOpen(false);
    buttonRef.current?.focus();
  }

  return (
    <span className="glossary-term" ref={wrapperRef}>
      <button
        ref={buttonRef}
        type="button"
        className="glossary-term__button"
        aria-label={`${text}: what it means`}
        aria-expanded={open}
        aria-controls={popoverId}
        onClick={() => setOpen(!open)}
      >
        {text}
      </button>
      {open ? (
        <span id={popoverId} className="glossary-term__popover">
          <span className="glossary-term__head">
            <strong className="glossary-term__name">{entry.term}</strong>
            <button
              type="button"
              className="glossary-term__close"
              aria-label={`Close the meaning of ${entry.term}`}
              onClick={close}
            >
              <span aria-hidden="true">×</span>
            </button>
          </span>
          <span className="glossary-term__meaning">{entry.meaning}</span>
          <span className="glossary-term__note">
            General meaning — not advice about your document.
          </span>
        </span>
      ) : null}
    </span>
  );
}
