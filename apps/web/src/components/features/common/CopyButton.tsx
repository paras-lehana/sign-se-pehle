/**
 * Copy-to-clipboard button with an announced outcome.
 *
 * Responsibility: copy one piece of text and say so. Boundary: the clipboard can be
 * missing (insecure context, permissions, old browsers), so failure is announced too and
 * the text stays selectable on screen.
 */
import { type ReactElement, useState } from 'react';

interface CopyButtonProps {
  readonly text: string;
  /** Visible button text, e.g. "Copy message". */
  readonly label: string;
  /** Announced after a successful copy, e.g. "Message copied." */
  readonly copiedMessage: string;
}

const COPY_UNAVAILABLE = 'Copy is not available here — please select the text instead.';

export function CopyButton({ text, label, copiedMessage }: CopyButtonProps): ReactElement {
  const [status, setStatus] = useState('');

  async function copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      setStatus(copiedMessage);
    } catch {
      setStatus(COPY_UNAVAILABLE);
    }
  }

  return (
    <span className="copy-control">
      <button type="button" className="button button--secondary" onClick={() => void copy()}>
        <span aria-hidden="true">⧉</span> {label}
      </button>
      <span className="feature-status" role="status">
        {status}
      </span>
    </span>
  );
}
