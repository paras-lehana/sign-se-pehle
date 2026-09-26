/**
 * The GenAI pipeline as an HTML/CSS flow diagram.
 *
 * Responsibility: show each stage of an analysis and which engine runs it, as an
 * ordered list so the diagram reads correctly without CSS. Boundary: static copy.
 */
import type { ReactElement } from 'react';

const PIPELINE_STAGES = [
  {
    name: 'Read',
    engine: 'Gemini (PDFs and photos)',
    detail: 'Uploaded scans and PDFs are transcribed word for word. Pasted text skips this step.',
  },
  {
    name: 'Mask personal details',
    engine: 'Deterministic rules',
    detail: 'Aadhaar, PAN, phone, email, bank and card numbers are replaced before any AI call.',
  },
  {
    name: 'Explain',
    engine: 'Gemini structured output',
    detail:
      'Every clause is explained in your language and tagged with a fixed list of risk signals.',
  },
  {
    name: 'Check against Indian law',
    engine: 'Deterministic rules',
    detail: 'Rules turn signals and numbers into red flags linked to India Code and regulators.',
  },
  {
    name: 'Verify quotes',
    engine: 'Deterministic matcher',
    detail:
      'Each quote is searched for in your document. Anything not found is marked as a paraphrase.',
  },
  {
    name: 'Score and simulate',
    engine: 'Deterministic engine',
    detail:
      'The Kavach score, money at stake and what-if results use only your document’s numbers.',
  },
] as const;

export function PipelineDiagram(): ReactElement {
  return (
    <section className="card" aria-labelledby="pipeline-heading">
      <h2 id="pipeline-heading">From document to report</h2>
      <p>
        Gemini does the reading and explaining. Anything that decides a warning, a number or a quote
        is checked by fixed rules, so the same document always gives the same red flags. If Gemini
        is unavailable, an offline rules engine still produces a basic English report.
      </p>
      <ol className="pipeline" role="list">
        {PIPELINE_STAGES.map((stage) => (
          <li key={stage.name} className="pipeline__stage">
            <h3 className="pipeline__name">{stage.name}</h3>
            <p className="pipeline__engine">{stage.engine}</p>
            <p className="pipeline__detail">{stage.detail}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
