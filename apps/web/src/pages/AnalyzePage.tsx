/**
 * Analyze page: the form, the progress state and the report on one screen.
 *
 * Responsibility: own the analyze request lifecycle (idle, loading, error, done) and
 * announce each outcome to assistive technology. Boundary: rendering the report is
 * delegated to components/report; validation to AnalyzeForm and the core schema.
 */
import { type ReactElement, useState } from 'react';
import type { AnalyzeRequest } from '@sign-se-pehle/core';
import { AnalyzeForm } from '../components/analyze/AnalyzeForm';
import { ProgressSteps } from '../components/analyze/ProgressSteps';
import { Report } from '../components/report/Report';
import { type Analysis, type ApiError, analyzeDocument } from '../lib/api';
import { usePageTitle } from '../lib/use-page-title';

type AnalyzeState =
  | { readonly status: 'idle' }
  | { readonly status: 'loading' }
  | { readonly status: 'error'; readonly error: ApiError }
  | { readonly status: 'done'; readonly analysis: Analysis };

const ANNOUNCEMENT: Readonly<Record<AnalyzeState['status'], string>> = {
  idle: '',
  loading: 'Analysing your document.',
  error: 'The analysis could not be completed.',
  done: 'Analysis ready.',
};

export function AnalyzePage(): ReactElement {
  usePageTitle('Explain a document');
  const [state, setState] = useState<AnalyzeState>({ status: 'idle' });

  async function handleSubmit(payload: AnalyzeRequest): Promise<void> {
    setState({ status: 'loading' });
    const result = await analyzeDocument(payload);
    setState(
      result.ok
        ? { status: 'done', analysis: result.value }
        : { status: 'error', error: result.error },
    );
  }

  return (
    <>
      <h1>Understand every clause before you sign</h1>
      <p className="lede">
        Paste or upload a rent agreement, job offer, loan, insurance policy or app terms. Get a
        plain-language explanation in your language, red flags linked to official Indian law, and
        questions to ask before you sign.
      </p>
      <AnalyzeForm
        busy={state.status === 'loading'}
        onSubmit={(payload) => void handleSubmit(payload)}
      />
      <p className="visually-hidden" aria-live="polite">
        {ANNOUNCEMENT[state.status]}
      </p>
      {state.status === 'loading' ? <ProgressSteps /> : null}
      {state.status === 'error' ? (
        <div className="notice notice--error" role="alert">
          <p>
            <strong>Something went wrong.</strong> {state.error.message}
          </p>
        </div>
      ) : null}
      {state.status === 'done' ? <Report analysis={state.analysis} /> : null}
    </>
  );
}
