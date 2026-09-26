/**
 * What-if simulator — "what would it cost me if…" from the document's own numbers.
 *
 * Responsibility: one deterministic calculator per scenario id, each returning labelled
 * lines, a total and the assumptions it made. Boundary: a scenario whose facts the
 * document does not state fails with a validation error instead of guessing.
 */
import type { ScenarioId } from '../domain/document-kinds.js';
import { appError } from '../errors.js';
import { formatDays, formatInr, formatMonths, formatPercent } from '../format.js';
import { err, ok, type Result } from '../result.js';
import type { ScenarioLine, ScenarioResult } from '../schemas/features.js';
import type { DocumentFacts } from '../schemas/facts.js';
import type { ScenarioInputs } from '../schemas/requests.js';
import { monthlyEmi, outstandingPrincipal } from './emi.js';

/** Month-to-day conversions in Indian agreements conventionally use 30 days. */
const DAYS_PER_MONTH = 30;
const PERCENT = 100;
/** Used when the reader leaves "days late" blank: a typical 10-day slip past the due date. */
export const DEFAULT_DAYS_LATE = 10;

type Calculator = (facts: DocumentFacts, inputs: ScenarioInputs) => Result<ScenarioResult>;

const round = (value: number): number => Math.max(0, Math.round(value));

function missing(what: string): Result<ScenarioResult> {
  return err(appError('VALIDATION_FAILED', `This document does not state ${what}, so this scenario cannot be calculated.`));
}

function result(scenarioId: ScenarioId, title: string, lines: ScenarioLine[], assumptions: string[]): Result<ScenarioResult> {
  return ok({ scenarioId, title, lines, totalInr: lines.reduce((sum, item) => sum + item.amountInr, 0), assumptions });
}

const leaveEarly: Calculator = (facts, inputs) => {
  const { monthlyRentInr: rent, lockInMonths: lockIn } = facts;
  if (rent === undefined || lockIn === undefined) return missing('the monthly rent and lock-in period');
  const done = inputs.monthsCompleted ?? 0;
  const remaining = Math.max(0, lockIn - done);
  const lines: ScenarioLine[] = [
    { label: 'Rent for the rest of the lock-in', amountInr: round(rent * remaining), note: `${formatMonths(remaining)} left of a ${formatMonths(lockIn)} lock-in at ${formatInr(rent)} a month.` },
  ];
  if (facts.tenantNoticeDays !== undefined && remaining === 0) {
    lines.push({ label: 'Rent during the notice period', amountInr: round((rent * facts.tenantNoticeDays) / DAYS_PER_MONTH), note: `${formatDays(facts.tenantNoticeDays)} of notice.` });
  }
  return result('rental-leave-early', 'Leaving before the lock-in ends', lines, [
    `You have stayed ${formatMonths(done)}.`,
    'Assumes the lock-in clause is enforced exactly as written; courts generally allow only reasonable compensation.',
  ]);
};

const lateRent: Calculator = (facts, inputs) => {
  const fee = facts.lateFeePerDayInr;
  if (fee === undefined) return missing('a late fee');
  const days = inputs.daysLate ?? DEFAULT_DAYS_LATE;
  const share = facts.monthlyRentInr === undefined || facts.monthlyRentInr <= 0 ? '' : ` That is ${formatPercent(((fee * days) / facts.monthlyRentInr) * PERCENT)} of one month's rent.`;
  return result('rental-late-rent', 'Paying rent late', [
    { label: 'Late fee', amountInr: round(fee * days), note: `${formatInr(fee)} a day for ${formatDays(days)}.${share}` },
  ], [`Rent is paid ${formatDays(days)} late.`]);
};

const resign: Calculator = (facts, inputs) => {
  const { monthlySalaryInr: salary, employeeNoticeDays: notice } = facts;
  if (salary === undefined || notice === undefined) return missing('the monthly salary and your notice period');
  const served = inputs.noticeServedDays ?? 0;
  const shortfall = Math.max(0, notice - served);
  const lines: ScenarioLine[] = [
    { label: 'Salary in lieu of unserved notice', amountInr: round((salary * shortfall) / DAYS_PER_MONTH), note: `${formatDays(shortfall)} short of a ${formatDays(notice)} notice period.` },
  ];
  if (facts.trainingBondInr !== undefined && facts.trainingBondInr > 0) {
    lines.push({ label: 'Training bond as written', amountInr: round(facts.trainingBondInr), note: 'Courts generally allow recovery of reasonable, actual costs only.' });
  }
  return result('employment-resign', 'Resigning from the job', lines, [
    `You serve ${formatDays(served)} of notice.`,
    `A month is counted as ${DAYS_PER_MONTH} days of salary.`,
  ]);
};

function loanTerms(facts: DocumentFacts): { principal: number; rate: number; months: number } | null {
  const { loanPrincipalInr: principal, interestRatePercentAnnual: rate, loanTenureMonths: months } = facts;
  return principal === undefined || rate === undefined || months === undefined || months <= 0 ? null : { principal, rate, months };
}

const loanTotalCost: Calculator = (facts) => {
  const terms = loanTerms(facts);
  if (terms === null) return missing('the loan amount, interest rate and tenure');
  const emi = monthlyEmi(terms.principal, terms.rate, terms.months);
  const lines: ScenarioLine[] = [
    { label: 'Loan amount repaid', amountInr: round(terms.principal), note: `EMI of ${formatInr(emi)} for ${formatMonths(terms.months)}.` },
    { label: 'Total interest', amountInr: round(emi * terms.months - terms.principal), note: `At ${formatPercent(terms.rate)} a year on a reducing balance.` },
  ];
  if (facts.processingFeePercent !== undefined) {
    lines.push({ label: 'Processing fee', amountInr: round((terms.principal * facts.processingFeePercent) / PERCENT), note: `${formatPercent(facts.processingFeePercent)} of the loan amount.` });
  }
  return result('loan-total-cost', 'Total cost of the loan', lines, ['Every EMI is paid on time and the rate never changes.']);
};

const loanPrepay: Calculator = (facts, inputs) => {
  const terms = loanTerms(facts);
  if (terms === null) return missing('the loan amount, interest rate and tenure');
  const paid = inputs.monthsCompleted ?? 0;
  const outstanding = outstandingPrincipal(terms.principal, terms.rate, terms.months, paid);
  const prepay = Math.min(inputs.prepayAmountInr ?? outstanding, outstanding);
  const floating = facts.isFloatingRate === true;
  const penalty = floating ? 0 : (facts.prepaymentPenaltyPercent ?? 0);
  return result('loan-prepay', 'Repaying the loan early', [
    { label: 'Amount you prepay', amountInr: round(prepay), note: `${formatInr(outstanding)} principal is still owed after ${formatMonths(paid)}.` },
    { label: 'Prepayment charge', amountInr: round((prepay * penalty) / PERCENT), note: floating ? 'Floating-rate loan: RBI directs no foreclosure charge for individuals (non-business).' : `${formatPercent(penalty)} of the amount prepaid.` },
  ], [`${formatMonths(paid)} of EMIs have been paid on time.`]);
};

const cancelFreeLook: Calculator = (facts) => {
  const { annualPremiumInr: premium, freeLookDays: days } = facts;
  if (premium === undefined || days === undefined) return missing('the premium and the free-look period');
  return result('insurance-cancel-free-look', 'Cancelling in the free-look period', [
    { label: 'Premium refundable', amountInr: round(premium), note: `If cancelled within the ${formatDays(days)} free-look period.` },
  ], ['The insurer may deduct proportionate risk premium, stamp duty and medical check-up costs.']);
};

const CALCULATORS: Readonly<Record<ScenarioId, Calculator>> = {
  'rental-leave-early': leaveEarly,
  'rental-late-rent': lateRent,
  'employment-resign': resign,
  'loan-total-cost': loanTotalCost,
  'loan-prepay': loanPrepay,
  'insurance-cancel-free-look': cancelFreeLook,
};

/**
 * Runs a what-if scenario on a document's facts.
 * @example
 * runScenario('rental-late-rent', { lateFeePerDayInr: 100 }, { daysLate: 5 }); // ok: total 500
 */
export function runScenario(id: ScenarioId, facts: DocumentFacts, inputs: ScenarioInputs): Result<ScenarioResult> {
  return CALCULATORS[id](facts, inputs);
}
