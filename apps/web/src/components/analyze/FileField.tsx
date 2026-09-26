/**
 * PDF / photo upload field with client-side type and size checks.
 *
 * Responsibility: pick a file, validate it with the core limits and report the chosen
 * file or a reader-facing error. Boundary: reading bytes happens on submit (see
 * lib/file.ts) so a large file is never held in memory until it is needed.
 */
import { type ChangeEvent, type ReactElement, useRef } from 'react';
import { MAX_UPLOAD_MEGABYTES, UPLOAD_ACCEPT, validateUpload } from '../../lib/file';

interface FileFieldProps {
  readonly id: string;
  readonly file: File | null;
  readonly error: string | null;
  readonly onChange: (file: File | null, error: string | null) => void;
}

export function FileField({ id, file, error, onChange }: FileFieldProps): ReactElement {
  const inputRef = useRef<HTMLInputElement>(null);
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  function handleChange(event: ChangeEvent<HTMLInputElement>): void {
    const picked = event.target.files?.[0] ?? null;
    if (picked === null) {
      onChange(null, null);
      return;
    }
    const checked = validateUpload(picked);
    onChange(checked.ok ? picked : null, checked.ok ? null : checked.error);
    if (!checked.ok) event.target.value = '';
  }

  function clear(): void {
    if (inputRef.current !== null) inputRef.current.value = '';
    onChange(null, null);
  }

  return (
    <div className="field">
      <label htmlFor={id}>Or upload a PDF or photo</label>
      <p id={hintId} className="field__hint">
        PDF, JPG, PNG or WebP, up to {MAX_UPLOAD_MEGABYTES} MB. Phone photos of printed pages work.
        A chosen file is used instead of any pasted text.
      </p>
      <div className="file-row">
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept={UPLOAD_ACCEPT}
          aria-describedby={error === null ? hintId : `${hintId} ${errorId}`}
          aria-invalid={error !== null}
          onChange={handleChange}
        />
        {file !== null ? (
          <button type="button" className="button button--ghost" onClick={clear}>
            Remove file
          </button>
        ) : null}
      </div>
      {file !== null ? <p className="field__hint">Selected: {file.name}</p> : null}
      {error !== null ? (
        <p id={errorId} className="field__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
