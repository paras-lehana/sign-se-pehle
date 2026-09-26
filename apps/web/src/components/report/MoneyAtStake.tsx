/**
 * Money at stake: the amounts this document can cost the reader.
 *
 * Responsibility: a table of amounts computed by core from the document's own
 * numbers. Boundary: display only — nothing is recalculated here.
 */
import type { ReactElement } from 'react';
import { formatInr } from '@sign-se-pehle/core';
import type { Analysis } from '../../lib/api';
import { ReportSection } from './ReportSection';

interface MoneyAtStakeProps {
  readonly money: Analysis['moneyAtStake'];
}

export function MoneyAtStake({ money }: MoneyAtStakeProps): ReactElement | null {
  if (money.items.length === 0) return null;
  return (
    <ReportSection
      id="money"
      title="Money at stake"
      intro="Worked out from the amounts written in your document."
    >
      <div className="table-wrap">
        <table className="data-table">
          <caption className="visually-hidden">Amounts at stake</caption>
          <thead>
            <tr>
              <th scope="col">What</th>
              <th scope="col" className="num">
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {money.items.map((item) => (
              <tr key={item.label}>
                <th scope="row">{item.label}</th>
                <td className="num">{formatInr(item.amountInr)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">Total</th>
              <td className="num">{formatInr(money.totalInr)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </ReportSection>
  );
}
