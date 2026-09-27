/**
 * Compare page: two drafts of the same agreement, side by side.
 *
 * Responsibility: collect both texts, validate them with the core compare schema and
 * show what changed and for whom. Boundary: diffing and judging happen on the server;
 * this page renders the CompareResponse.
 */
import { type FormEvent, type ReactElement, useState } from 'react';
import { DEFAULT_LANGUAGE, compareRequestSchema } from '@sign-se-pehle/core';
import { DocumentOptions, type DocumentOptionsValue } from '../components/analyze/DocumentOptions';
import { CompareResult } from '../components/compare/CompareResult';
import { DraftField } from '../components/compare/DraftField';
import { PageHero } from '../components/ui/PageHero';
import { type CompareResponse, compareDocuments } from '../lib/api';
import { usePageTitle } from '../lib/use-page-title';

export function ComparePage(): ReactElement {
  usePageTitle('Compare two drafts');
  const [first, setFirst] = useState('');
  const [second, setSecond] = useState('');
  const [options, setOptions] = useState<DocumentOptionsValue>({
    role: undefined,
    language: DEFAULT_LANGUAGE,
    kind: undefined,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CompareResponse | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (busy) return;
    const parsed = compareRequestSchema.safeParse({
      first,
      second,
      language: options.language,
      ...(options.role === undefined ? {} : { role: options.role }),
    });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const which = issue?.path[0] === 'second' ? 'Second draft: ' : 'First draft: ';
      setError(`${which}${issue?.message ?? 'Please check both drafts.'}`);
      return;
    }
    setBusy(true);
    setError(null);
    const response = await compareDocuments(parsed.data);
    setBusy(false);
    setError(response.ok ? null : response.error.message);
    setResult(response.ok ? response.value : null);
  }

  return (
    <>
      <PageHero eyebrow="Compare" title="Compare two drafts">
        Got a revised agreement? Paste the old and new versions to see exactly what changed and who
        each change favours.
      </PageHero>
      <form
        className="card compare-form"
        aria-busy={busy}
        noValidate
        onSubmit={(event) => void handleSubmit(event)}
      >
        <h2 className="compare-form__title">Your drafts</h2>
        <div className="compare-grid">
          <DraftField
            id="first-draft"
            label="First draft (older)"
            value={first}
            onChange={setFirst}
          />
          <DraftField
            id="second-draft"
            label="Second draft (newer)"
            value={second}
            onChange={setSecond}
          />
        </div>
        <DocumentOptions
          idPrefix="compare"
          value={options}
          onChange={setOptions}
          showKind={false}
        />
        {error === null ? null : (
          <p className="field__error" role="alert">
            {error}
          </p>
        )}
        <button
          type="submit"
          className="button button--cta button--large"
          aria-disabled={busy}
          aria-busy={busy}
        >
          {busy ? 'Comparing…' : 'Compare drafts'}
        </button>
      </form>
      <p className="visually-hidden" aria-live="polite">
        {busy ? 'Comparing your drafts.' : result === null ? '' : 'Comparison ready.'}
      </p>
      {result === null ? null : <CompareResult result={result} />}
    </>
  );
}
