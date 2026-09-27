/**
 * "Take a photo" — opens the phone's rear camera to capture a document page.
 *
 * Responsibility: a native file input with `capture="environment"`, presented as a
 * button, that hands the captured image to the parent. Boundary: no camera stream, no
 * permissions prompt of our own — the operating system's camera app does the capture,
 * and the parent's upload checks (type, size) still apply to the file.
 */
import { type ChangeEvent, type ReactElement, useId } from 'react';

interface CameraButtonProps {
  readonly onFile: (file: File) => void;
}

export function CameraButton({ onFile }: CameraButtonProps): ReactElement {
  const inputId = useId();
  const hintId = `${inputId}-hint`;

  function handleChange(event: ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0];
    // Reset so taking the same photo again still fires a change event.
    event.target.value = '';
    if (file !== undefined) onFile(file);
  }

  return (
    <div className="camera-field">
      <label htmlFor={inputId} className="button button--secondary camera-button">
        <span aria-hidden="true">📷</span> Take a photo
        <input
          id={inputId}
          className="visually-hidden"
          type="file"
          accept="image/*"
          capture="environment"
          aria-describedby={hintId}
          onChange={handleChange}
        />
      </label>
      <p id={hintId} className="field__hint">
        On a phone this opens the camera. Lay the page flat in good light and fit all of it in the
        frame.
      </p>
    </div>
  );
}
