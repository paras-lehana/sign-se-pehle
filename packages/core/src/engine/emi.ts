/**
 * Loan arithmetic — EMI and outstanding balance on a reducing-balance loan.
 *
 * Responsibility: the standard amortisation formulas Indian lenders use for EMIs.
 * Boundary: pure maths on the document's own numbers; no rounding until display.
 */

const MONTHS_PER_YEAR = 12;
const PERCENT = 100;

function monthlyRate(annualRatePercent: number): number {
  return annualRatePercent / MONTHS_PER_YEAR / PERCENT;
}

/**
 * Equated monthly instalment: P*r*(1+r)^n / ((1+r)^n - 1); a 0% loan is P / n.
 * @example
 * Math.round(monthlyEmi(100000, 12, 12)); // 8885
 */
export function monthlyEmi(principal: number, annualRatePercent: number, months: number): number {
  if (months <= 0 || principal <= 0) return 0;
  const rate = monthlyRate(annualRatePercent);
  if (rate === 0) return principal / months;
  const growth = (1 + rate) ** months;
  return (principal * rate * growth) / (growth - 1);
}

/**
 * Principal still owed after `paidMonths` EMIs.
 * @example
 * Math.round(outstandingPrincipal(100000, 12, 12, 12)); // 0
 */
export function outstandingPrincipal(
  principal: number,
  annualRatePercent: number,
  months: number,
  paidMonths: number,
): number {
  const paid = Math.min(Math.max(paidMonths, 0), Math.max(months, 0));
  const rate = monthlyRate(annualRatePercent);
  const emi = monthlyEmi(principal, annualRatePercent, months);
  if (rate === 0) return Math.max(0, principal - emi * paid);
  const growth = (1 + rate) ** paid;
  return Math.max(0, principal * growth - (emi * (growth - 1)) / rate);
}
