/**
 * One highlighted stretch of the document in the X-ray.
 *
 * Responsibility: paint a clause's verified text in its risk colour and, on its first
 * stretch, start it with a small labelled button that opens the clause. Boundary: the
 * button is native (keyboard and screen-reader ready); the text itself stays plain text.
 */
import type { ReactElement } from 'react';
import type { RiskLevel } from '@sign-se-pehle/core';
import { RISK_ICONS, RISK_WORDS } from '../common/risk';

interface XrayMarkProps {
  readonly clauseId: string;
  readonly heading: string;
  readonly risk: RiskLevel;
  readonly text: string;
  /** Only the first stretch of a clause gets the button, so each clause is one tab stop. */
  readonly showButton: boolean;
  readonly active: boolean;
  readonly onSelect: (clauseId: string) => void;
}

export function XrayMark({
  clauseId,
  heading,
  risk,
  text,
  showButton,
  active,
  onSelect,
}: XrayMarkProps): ReactElement {
  const activeClass = active ? ' xray-mark--active' : '';
  return (
    <mark className={`xray-mark xray-mark--${risk}${activeClass}`}>
      {showButton ? (
        <button
          type="button"
          className={`xray-mark__tag xray-mark__tag--${risk}`}
          aria-label={`Clause: ${heading}, ${risk} risk`}
          onClick={() => onSelect(clauseId)}
        >
          <span aria-hidden="true">{RISK_ICONS[risk]}</span> {RISK_WORDS[risk]}
        </button>
      ) : null}
      {text}
    </mark>
  );
}
