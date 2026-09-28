/**
 * Home page: hero, document-type marquee, the feature bento ("what you get"), then the
 * workspace (form, progress, report).
 *
 * Responsibility: own the analyze request lifecycle (idle, loading, error, done) and
 * announce each outcome to assistive technology. Boundary: rendering the report is
 * delegated to components/report; validation to AnalyzeForm and the core schema. The bento
 * comes before the workspace so a first-time reader sees everything the report will contain
 * before being asked to paste a document.
 */
import { type ReactElement, useState } from 'react';
import type { AnalyzeRequest } from '@sign-se-pehle/core';
import { AnalyzeForm } from '../components/analyze/AnalyzeForm';
import { ProgressSteps } from '../components/analyze/ProgressSteps';
import { DocTypeMarquee } from '../components/home/DocTypeMarquee';
import { FeatureBento } from '../components/home/FeatureBento';
import { Hero } from '../components/home/Hero';
import { ReportWorkspace } from '../components/report/ReportWorkspace';
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
      <Hero />
      <DocTypeMarquee />
      <FeatureBento />
      <section id="workspace" className="workspace" aria-labelledby="workspace-heading">
        <div className="section-head">
          <p className="eyebrow">Your workspace</p>
          <h2 id="workspace-heading">Check a document</h2>
          <p className="lede">
            Paste the text, upload a PDF, take a photo or try a sample. Nothing is prefilled and
            nothing is stored.
          </p>
        </div>
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
      </section>
      {state.status === 'done' ? (
        <ReportWorkspace key={state.analysis.id} analysis={state.analysis} />
      ) : null}
    </>
  );
}
