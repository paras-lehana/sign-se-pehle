/**
 * One labelled draft textarea with a character counter.
 *
 * Responsibility: a controlled textarea for the compare form. Boundary: validation
 * happens once on submit with the core schema, not per keystroke.
 */
import type { ReactElement } from 'react';
import { MAX_DOCUMENT_CHARS } from '@sign-se-pehle/core';

const NUMBER_FORMAT = new Intl.NumberFormat('en-IN');

interface DraftFieldProps {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
}

export function DraftField({ id, label, value, onChange }: DraftFieldProps): ReactElement {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <textarea
        id={id}
        rows={10}
        value={value}
        spellCheck={false}
        aria-describedby={`${id}-count`}
        onChange={(event) => onChange(event.target.value)}
      />
      <p id={`${id}-count`} className="field__hint field__counter">
        {NUMBER_FORMAT.format(value.length)} / {NUMBER_FORMAT.format(MAX_DOCUMENT_CHARS)} characters
      </p>
    </div>
  );
}
