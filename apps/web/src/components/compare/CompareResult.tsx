/**
 * Compare result: summary, verdict, change table and fact deltas.
 *
 * Responsibility: present a CompareResponse so a reader sees every change and which
 * draft each one favours. Boundary: display only; judging is done by the server
 * (Gemini for wording changes, core's compareFacts for numbers).
 */
import type { ReactElement } from 'react';
import { type CompareChange, type FactDelta, formatFactValue } from '@sign-se-pehle/core';
import type { CompareResponse } from '../../lib/api';
import { ProvenanceBadge } from '../report/ProvenanceBadge';

const CHANGE_TEXT: Readonly<Record<CompareChange['change'], string>> = {
  added: 'Added',
  removed: 'Removed',
  changed: 'Changed',
};

const FAVOURS_TEXT: Readonly<Record<CompareChange['favours'], string>> = {
  first: 'First draft',
  second: 'Second draft',
  neutral: 'Neither',
};

const WINNER_TEXT: Readonly<Record<FactDelta['betterFor'], string>> = {
  first: 'First draft',
  second: 'Second draft',
  equal: 'Same',
  unknown: 'Cannot tell',
};

const NOT_STATED = 'Not stated';

function factCell(value: number | undefined, unit: FactDelta['unit']): string {
  return value === undefined ? NOT_STATED : formatFactValue(value, unit);
}

interface CompareResultProps {
  readonly result: CompareResponse;
}

export function CompareResult({ result }: CompareResultProps): ReactElement {
  return (
    <section className="card" aria-labelledby="compare-result-heading">
      <h2 id="compare-result-heading">What changed</h2>
      <ProvenanceBadge provenance={result.provenance} />
      <p>{result.summary}</p>
      <p className="verdict">
        <strong>Overall:</strong> {result.verdict}
      </p>
      {result.changes.length > 0 ? (
        <div className="table-wrap">
          <table className="data-table">
            <caption>Changes between the drafts</caption>
            <thead>
              <tr>
                <th scope="col">Topic</th>
                <th scope="col">First draft</th>
                <th scope="col">Second draft</th>
                <th scope="col">Change</th>
                <th scope="col">Better for you</th>
              </tr>
            </thead>
            <tbody>
              {result.changes.map((change) => (
                <tr key={`${change.topic}-${change.change}`}>
                  <th scope="row">
                    {change.topic}
                    <span className="table-note">{change.note}</span>
                  </th>
                  <td>{change.first ?? '—'}</td>
                  <td>{change.second ?? '—'}</td>
                  <td>{CHANGE_TEXT[change.change]}</td>
                  <td>{FAVOURS_TEXT[change.favours]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {result.factDeltas.length > 0 ? (
        <div className="table-wrap">
          <table className="data-table">
            <caption>Key numbers side by side</caption>
            <thead>
              <tr>
                <th scope="col">Fact</th>
                <th scope="col" className="num">
                  First
                </th>
                <th scope="col" className="num">
                  Second
                </th>
                <th scope="col">Better for you</th>
              </tr>
            </thead>
            <tbody>
              {result.factDeltas.map((delta) => (
                <tr key={delta.key}>
                  <th scope="row">{delta.label}</th>
                  <td className="num">{factCell(delta.first, delta.unit)}</td>
                  <td className="num">{factCell(delta.second, delta.unit)}</td>
                  <td>{WINNER_TEXT[delta.betterFor]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
