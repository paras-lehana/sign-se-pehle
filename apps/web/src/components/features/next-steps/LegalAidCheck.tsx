/**
 * Free legal aid check — a private, in-browser screening under section 12 of the Legal
 * Services Authorities Act, 1987.
 *
 * Responsibility: ask the section 12 yes/no questions and an optional income, then show
 * core's checkLegalAidEligibility result. Boundary: computed entirely in the browser —
 * these answers are sensitive (caste, disability, custody), so no request is ever made.
 */
import { type FormEvent, type ReactElement, useId, useState } from 'react';
import {
  type EligibilityRequest,
  type Result,
  checkLegalAidEligibility,
  eligibilityRequestSchema,
  err,
  ok,
} from '@sign-se-pehle/core';
import { EligibilityOutcome } from './EligibilityOutcome';

type CategoryKey = Exclude<keyof EligibilityRequest, 'annualIncomeInr'>;

/** Questions in plain words, in the order of the Act's clauses (a)–(g). */
const QUESTIONS: readonly { readonly key: CategoryKey; readonly label: string }[] = [
  { key: 'isScheduledCasteOrTribe', label: 'I belong to a Scheduled Caste or Scheduled Tribe' },
  {
    key: 'isVictimOfTraffickingOrBegar',
    label: 'I have faced human trafficking or forced labour (begar)',
  },
  { key: 'isWoman', label: 'I am a woman' },
  { key: 'isChild', label: 'I am under 18, or I am asking for a child' },
  { key: 'hasDisability', label: 'I have a disability' },
  {
    key: 'isVictimOfDisasterOrViolence',
    label:
      'I am affected by a mass disaster, ethnic or caste violence, flood, drought, earthquake or industrial disaster',
  },
  { key: 'isIndustrialWorkman', label: 'I am an industrial worker' },
  { key: 'isInCustody', label: 'I am in custody (including a protective or juvenile home)' },
];

const NO_ANSWERS: Readonly<Record<CategoryKey, boolean>> = {
  isWoman: false,
  isChild: false,
  isScheduledCasteOrTribe: false,
  hasDisability: false,
  isIndustrialWorkman: false,
  isInCustody: false,
  isVictimOfTraffickingOrBegar: false,
  isVictimOfDisasterOrViolence: false,
};

/** Accepts "2,40,000", "240000" or "₹ 2,40,000"; empty means "not given". */
function toRequest(
  answers: Readonly<Record<CategoryKey, boolean>>,
  incomeText: string,
): Result<EligibilityRequest, string> {
  const digits = incomeText.replace(/[₹,\s]/g, '');
  const invalid = 'Please enter your yearly income in rupees using digits only, or leave it empty.';
  if (digits.length > 0 && !/^\d+$/.test(digits)) return err(invalid);
  const candidate =
    digits.length === 0 ? { ...answers } : { ...answers, annualIncomeInr: Number(digits) };
  const parsed = eligibilityRequestSchema.safeParse(candidate);
  return parsed.success ? ok(parsed.data) : err(invalid);
}

export function LegalAidCheck(): ReactElement {
  const fieldId = useId();
  const [answers, setAnswers] = useState<Readonly<Record<CategoryKey, boolean>>>(NO_ANSWERS);
  const [incomeText, setIncomeText] = useState('');
  const [checked, setChecked] = useState(false);
  const request = toRequest(answers, incomeText);

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setChecked(true);
  }

  return (
    <div className="legal-aid-check">
      <h4>Free legal aid check</h4>
      <p className="privacy-note">
        <span aria-hidden="true">🔒</span> Your answers never leave this device.
      </p>
      <form className="legal-aid-check__form" noValidate onSubmit={handleSubmit}>
        <fieldset className="check-group">
          <legend>Tick any that apply to you</legend>
          {QUESTIONS.map((question) => (
            <label key={question.key} className="check-option">
              <input
                type="checkbox"
                checked={answers[question.key]}
                onChange={(event) =>
                  setAnswers({ ...answers, [question.key]: event.target.checked })
                }
              />
              <span>{question.label}</span>
            </label>
          ))}
        </fieldset>
        <div className="field">
          <label htmlFor={`${fieldId}-income`}>Your yearly income in ₹ (optional)</label>
          <input
            id={`${fieldId}-income`}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={incomeText}
            aria-describedby={`${fieldId}-income-hint`}
            aria-invalid={checked && !request.ok}
            onChange={(event) => setIncomeText(event.target.value)}
          />
          <p id={`${fieldId}-income-hint`} className="field__hint">
            Only used if none of the boxes apply. Income limits are set by each state.
          </p>
        </div>
        <button type="submit" className="button button--secondary">
          Check free legal aid
        </button>
      </form>
      <div aria-live="polite">
        {!checked ? null : request.ok ? (
          <EligibilityOutcome result={checkLegalAidEligibility(request.value)} />
        ) : (
          <p className="field__error">{request.error}</p>
        )}
      </div>
    </div>
  );
}
