/**
 * What-if simulator: money consequences computed from the document's own numbers.
 *
 * Responsibility: pick a scenario for this kind of document, collect its inputs and
 * show the /api/simulate result. Boundary: the calculation is core's deterministic
 * engine running on the server; this panel never does arithmetic.
 */
import { type FormEvent, type ReactElement, useState } from 'react';
import {
  type DocumentFacts,
  type DocumentKind,
  KIND_PROFILES,
  type ScenarioId,
  scenarioInputsSchema,
} from '@sign-se-pehle/core';
import { type ScenarioResult, simulateScenario } from '../../lib/api';
import { SCENARIO_SPECS } from '../../lib/scenarios';
import { ReportSection } from './ReportSection';
import { ScenarioResultTable } from './ScenarioResultTable';

interface WhatIfPanelProps {
  readonly kind: DocumentKind;
  readonly facts: DocumentFacts;
}

type RawInputs = Readonly<Partial<Record<string, string>>>;

function toInputs(scenarioId: ScenarioId, raw: RawInputs): Record<string, number> {
  const inputs: Record<string, number> = {};
  for (const field of SCENARIO_SPECS[scenarioId].fields) {
    const text = raw[field.key]?.trim() ?? '';
    if (text.length === 0) continue;
    const value = Number(text);
    inputs[field.key] = field.integer ? Math.trunc(value) : value;
  }
  return inputs;
}

export function WhatIfPanel({ kind, facts }: WhatIfPanelProps): ReactElement | null {
  const scenarios = KIND_PROFILES[kind].scenarios;
  const [scenarioId, setScenarioId] = useState<ScenarioId | undefined>(scenarios[0]);
  const [raw, setRaw] = useState<RawInputs>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScenarioResult | null>(null);
  if (scenarioId === undefined) return null;
  const spec = SCENARIO_SPECS[scenarioId];

  async function handleSubmit(event: FormEvent<HTMLFormElement>, id: ScenarioId): Promise<void> {
    event.preventDefault();
    if (busy) return;
    const inputs = scenarioInputsSchema.safeParse(toInputs(id, raw));
    if (!inputs.success) {
      setError('Please enter numbers of zero or more.');
      return;
    }
    setBusy(true);
    const response = await simulateScenario({ scenarioId: id, facts, inputs: inputs.data });
    setBusy(false);
    setError(response.ok ? null : response.error.message);
    setResult(response.ok ? response.value : null);
  }

  return (
    <ReportSection
      id="what-if"
      title="What if…?"
      intro="See the money involved, using only the numbers written in your document."
    >
      <form
        className="what-if"
        noValidate
        onSubmit={(event) => void handleSubmit(event, scenarioId)}
      >
        <div className="field">
          <label htmlFor="scenario">Scenario</label>
          <select
            id="scenario"
            value={scenarioId}
            onChange={(event) => {
              setScenarioId(scenarios.find((id) => id === event.target.value) ?? scenarioId);
              setResult(null);
              setError(null);
            }}
          >
            {scenarios.map((id) => (
              <option key={id} value={id}>
                {SCENARIO_SPECS[id].title}
              </option>
            ))}
          </select>
        </div>
        {spec.fields.map((field) => (
          <div className="field" key={field.key}>
            <label htmlFor={`scenario-${field.key}`}>{field.label}</label>
            <input
              id={`scenario-${field.key}`}
              type="number"
              inputMode={field.integer ? 'numeric' : 'decimal'}
              min={0}
              step={field.integer ? 1 : 'any'}
              aria-describedby={`scenario-${field.key}-hint`}
              value={raw[field.key] ?? ''}
              onChange={(event) => setRaw({ ...raw, [field.key]: event.target.value })}
            />
            <p id={`scenario-${field.key}-hint`} className="field__hint">
              {field.hint}
            </p>
          </div>
        ))}
        <button
          type="submit"
          className="button button--secondary"
          aria-disabled={busy}
          aria-busy={busy}
        >
          {busy ? 'Calculating…' : 'Show me the numbers'}
        </button>
      </form>
      {error === null ? null : (
        <p className="field__error" role="alert">
          {error}
        </p>
      )}
      {result === null ? null : <ScenarioResultTable result={result} />}
    </ReportSection>
  );
}
