/**
 * Result table for one what-if scenario.
 *
 * Responsibility: show each line, the total and the stated assumptions. Boundary:
 * display only; amounts come from core's simulator.
 */
import type { ReactElement } from 'react';
import { formatInr } from '@sign-se-pehle/core';
import type { ScenarioResult } from '../../lib/api';

interface ScenarioResultTableProps {
  readonly result: ScenarioResult;
}

export function ScenarioResultTable({ result }: ScenarioResultTableProps): ReactElement {
  return (
    <div className="scenario-result" aria-live="polite">
      <div className="table-wrap">
        <table className="data-table">
          <caption>{result.title}</caption>
          <thead>
            <tr>
              <th scope="col">Item</th>
              <th scope="col" className="num">
                Amount
              </th>
              <th scope="col">How we got it</th>
            </tr>
          </thead>
          <tbody>
            {result.lines.map((line) => (
              <tr key={line.label}>
                <th scope="row">{line.label}</th>
                <td className="num">{formatInr(line.amountInr)}</td>
                <td>{line.note}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">Total</th>
              <td className="num">{formatInr(result.totalInr)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
      {result.assumptions.length > 0 ? (
        <ul className="assumptions">
          {result.assumptions.map((assumption) => (
            <li key={assumption}>{assumption}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
