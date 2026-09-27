/**
 * The "Paste the document text" textarea with a live character counter.
 *
 * Responsibility: a controlled, labelled textarea whose counter is tied to it by
 * aria-describedby. Boundary: validation happens once on submit in AnalyzeForm; the
 * textarea always starts empty — nothing is prefilled.
 */
import type { ReactElement, Ref } from 'react';
import { MAX_DOCUMENT_CHARS } from '@sign-se-pehle/core';

const NUMBER_FORMAT = new Intl.NumberFormat('en-IN');

interface PasteFieldProps {
  readonly value: string;
  readonly invalid: boolean;
  readonly onChange: (text: string) => void;
  /** Lets the form move focus here after a sample fills the text. */
  readonly textareaRef: Ref<HTMLTextAreaElement>;
}

export function PasteField({ value, invalid, onChange, textareaRef }: PasteFieldProps): ReactElement {
  return (
    <div className="field paste-field">
      <label htmlFor="document-text">Paste the document text</label>
      <textarea
        ref={textareaRef}
        id="document-text"
        value={value}
        rows={12}
        spellCheck={false}
        placeholder="Paste the full text of your rent agreement, offer letter, loan, insurance policy or notice…"
        aria-describedby="document-text-count"
        aria-invalid={invalid}
        onChange={(event) => onChange(event.target.value)}
      />
      <p id="document-text-count" className="field__hint field__counter">
        {NUMBER_FORMAT.format(value.length)} / {NUMBER_FORMAT.format(MAX_DOCUMENT_CHARS)}{' '}
        characters
      </p>
    </div>
  );
}
