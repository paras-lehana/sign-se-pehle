/**
 * Money at stake — the rupee amounts a reader could lose or lock up.
 *
 * Responsibility: turn stated facts into a short list of worst-case amounts (deposit,
 * lock-in exposure, bond, booking amount, premium, loan charges). Boundary: only items
 * whose facts the document states; nothing is estimated from outside the document.
 */
import type { DocumentKind } from '../domain/document-kinds.js';
import type { MoneyItem } from '../schemas/analysis.js';
import type { DocumentFacts } from '../schemas/facts.js';
import { MAX_AMOUNT_INR } from '../schemas/limits.js';

const PERCENT = 100;

interface MoneyRule {
  readonly label: string;
  readonly kinds: readonly DocumentKind[];
  amount(facts: DocumentFacts): number | undefined;
}

function product(a: number | undefined, b: number | undefined): number | undefined {
  return a === undefined || b === undefined ? undefined : a * b;
}

function percentOf(base: number | undefined, percent: number | undefined): number | undefined {
  return base === undefined || percent === undefined ? undefined : (base * percent) / PERCENT;
}

/** Ordered as a reader meets them: upfront money first, exit costs after. */
const MONEY_RULES: readonly MoneyRule[] = [
  { label: 'Security deposit held by the landlord', kinds: ['rental'], amount: (f) => f.securityDepositInr },
  {
    label: 'Rent owed if you leave at the start of the lock-in',
    kinds: ['rental'],
    amount: (f) => product(f.monthlyRentInr, f.lockInMonths),
  },
  { label: 'Training bond payable if you leave early', kinds: ['employment'], amount: (f) => f.trainingBondInr },
  { label: 'Booking amount paid upfront', kinds: ['property-purchase'], amount: (f) => f.bookingAmountInr },
  { label: 'One year of premium', kinds: ['insurance'], amount: (f) => f.annualPremiumInr },
  {
    label: 'Processing fee on the loan amount',
    kinds: ['loan'],
    amount: (f) => percentOf(f.loanPrincipalInr, f.processingFeePercent),
  },
  {
    label: 'Prepayment charge if you repay the full loan early',
    kinds: ['loan'],
    amount: (f) => percentOf(f.loanPrincipalInr, f.prepaymentPenaltyPercent),
  },
];

export interface MoneyAtStake {
  readonly items: MoneyItem[];
  readonly totalInr: number;
}

/**
 * Lists stated amounts at risk for a document kind and totals them.
 * @example
 * computeMoneyAtStake('rental', { securityDepositInr: 100000 }).totalInr; // 100000
 */
export function computeMoneyAtStake(kind: DocumentKind, facts: DocumentFacts): MoneyAtStake {
  const items = MONEY_RULES.flatMap((rule): MoneyItem[] => {
    if (!rule.kinds.includes(kind)) return [];
    const amount = rule.amount(facts);
    if (amount === undefined || amount <= 0) return [];
    return [{ label: rule.label, amountInr: Math.min(MAX_AMOUNT_INR, Math.round(amount)) }];
  });
  return { items, totalInr: items.reduce((sum, item) => sum + item.amountInr, 0) };
}
