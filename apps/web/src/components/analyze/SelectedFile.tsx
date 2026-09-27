/**
 * Shared status line under the input tabs: the chosen file (with Remove) or a file error.
 *
 * Responsibility: one place that says which file will be explained, whichever tab picked
 * it (Upload or Camera), and announces file problems. Boundary: display only; the form
 * owns the file state.
 */
import type { ReactElement } from 'react';
import { Icon } from '../ui/Icon';

interface SelectedFileProps {
  readonly file: File | null;
  readonly error: string | null;
  readonly errorId: string;
  readonly onRemove: () => void;
}

export function SelectedFile({ file, error, errorId, onRemove }: SelectedFileProps): ReactElement | null {
  if (error !== null) {
    return (
      <p id={errorId} className="field__error" role="alert">
        {error}
      </p>
    );
  }
  if (file === null) return null;
  return (
    <div className="selected-file">
      <Icon name="file" className="selected-file__icon" />
      <p className="selected-file__name">
        <span className="visually-hidden">Selected: </span>
        {file.name}
        <span className="selected-file__note"> — used instead of pasted text</span>
      </p>
      <button type="button" className="button button--ghost selected-file__remove" onClick={onRemove}>
        <Icon name="close" className="button__icon" />
        Remove file
      </button>
    </div>
  );
}
