/**
 * The "current → fairer wording" comparison for each requested change.
 *
 * Responsibility: a scannable table (clause · as written · fairer wording · why) that
 * becomes one card per change on narrow screens. Boundary: display only; the server
 * keeps only asks whose `current` text matched a real clause quote.
 */
import type { ReactElement } from 'react';
import type { NegotiateResponse } from '@sign-se-pehle/core';

interface NegotiationAsksProps {
  readonly asks: NegotiateResponse['asks'];
}

export function NegotiationAsks({ asks }: NegotiationAsksProps): ReactElement {
  if (asks.length === 0) {
    return (
      <p className="muted">
        We could not match specific wording to change, but the message below still lists your
        requests.
      </p>
    );
  }
  return (
    <div className="table-wrap">
      <table className="data-table negotiate-table">
        <caption className="negotiate-table__caption">
          {asks.length === 1 ? '1 change to ask for' : `${asks.length} changes to ask for`}
        </caption>
        <thead>
          <tr>
            <th scope="col">Clause</th>
            <th scope="col">As written now</th>
            <th scope="col">Fairer wording to ask for</th>
            <th scope="col">Why it matters</th>
          </tr>
        </thead>
        <tbody>
          {asks.map((ask) => (
            <tr key={`${ask.heading}-${ask.current}`} className="negotiate-table__row">
              <th scope="row" className="negotiate-table__heading">
                {ask.heading}
              </th>
              <td className="negotiate-table__current" data-label="As written now">
                <blockquote>{ask.current}</blockquote>
              </td>
              <td className="negotiate-table__proposed" data-label="Fairer wording">
                <span className="negotiate-table__arrow" aria-hidden="true">
                  →
                </span>{' '}
                {ask.proposed}
              </td>
              <td className="negotiate-table__reason" data-label="Why it matters">
                {ask.reason}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
