/**
 * "Try a sample" chips that load a realistic Indian document into the form.
 *
 * Responsibility: let a first-time visitor see a full analysis without finding a
 * document of their own. Boundary: picking only fills the form through `onPick` — it
 * never submits, so the reader still reviews the text and presses "Explain".
 */
import { type ReactElement, useId, useState } from 'react';
import { SAMPLE_DOCUMENTS, type SampleDocument } from '../../../lib/samples';

interface SampleDocumentsProps {
  readonly onPick: (sample: SampleDocument) => void;
}

export function SampleDocuments({ onPick }: SampleDocumentsProps): ReactElement {
  const headingId = useId();
  const [pickedId, setPickedId] = useState<string | null>(null);
  const picked = SAMPLE_DOCUMENTS.find((sample) => sample.id === pickedId);

  function pick(sample: SampleDocument): void {
    setPickedId(sample.id);
    onPick(sample);
  }

  return (
    <div className="samples" role="group" aria-labelledby={headingId}>
      <p id={headingId} className="samples__title">
        Try a sample document
      </p>
      <p className="field__hint">Fictional documents — every name, number and ID is made up.</p>
      <ul className="plain-list samples__list" role="list">
        {SAMPLE_DOCUMENTS.map((sample) => (
          <li key={sample.id}>
            <button
              type="button"
              className="sample-chip"
              aria-pressed={sample.id === pickedId}
              onClick={() => pick(sample)}
            >
              <span className="sample-chip__label">{sample.label}</span>
              <span className="sample-chip__teaser">{sample.teaser}</span>
            </button>
          </li>
        ))}
      </ul>
      <p className="feature-status" role="status">
        {picked === undefined
          ? ''
          : `Loaded the ${picked.label.toLowerCase()} sample. Review it, then press “Explain this document”.`}
      </p>
    </div>
  );
}
