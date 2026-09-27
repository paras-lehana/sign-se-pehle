/**
 * PDF / photo upload field with client-side type and size checks.
 *
 * Responsibility: pick a file, validate it with the core limits and hand the parent the
 * chosen file or a reader-facing error. Boundary: the chosen file and any error are shown
 * by the form (so camera and upload share one status line); reading bytes happens on
 * submit (see lib/file.ts) so a large file is never held in memory until it is needed.
 */
import type { ChangeEvent, ReactElement } from 'react';
import { MAX_UPLOAD_MEGABYTES, UPLOAD_ACCEPT, validateUpload } from '../../lib/file';

interface FileFieldProps {
  readonly id: string;
  /** Id of the form's error line, referenced while an error is showing. */
  readonly errorId: string;
  readonly invalid: boolean;
  readonly onChange: (file: File | null, error: string | null) => void;
}

export function FileField({ id, errorId, invalid, onChange }: FileFieldProps): ReactElement {
  const hintId = `${id}-hint`;

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

  return (
    <div className="field upload-field">
      <label htmlFor={id}>Upload a PDF or photo</label>
      <p id={hintId} className="field__hint">
        PDF, JPG, PNG or WebP, up to {MAX_UPLOAD_MEGABYTES} MB. Phone photos of printed pages work.
        A chosen file is used instead of any pasted text.
      </p>
      <input
        id={id}
        type="file"
        accept={UPLOAD_ACCEPT}
        aria-describedby={invalid ? `${hintId} ${errorId}` : hintId}
        aria-invalid={invalid}
        onChange={handleChange}
      />
    </div>
  );
}
