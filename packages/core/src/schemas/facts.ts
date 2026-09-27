/**
 * Document facts — the numbers and names the rules, simulator and comparison run on.
 *
 * Responsibility: one strict schema for facts extracted from a document (by Gemini
 * or by the offline extractor) plus the metadata that says how to label, format and
 * compare each number. Boundary: facts are *what the document says*; whether a fact
 * is a problem is decided in knowledge/red-flag-rules.ts.
 */
import { z } from 'zod';
import { type DocumentKind, type UserRole, KIND_PROFILES } from '../domain/document-kinds.js';
import { MAX_AMOUNT_INR, MAX_DAYS, MAX_MONTHS } from './limits.js';

const amountInr = z.number().finite().min(0).max(MAX_AMOUNT_INR);
const months = z.number().finite().min(0).max(MAX_MONTHS);
const days = z.number().finite().min(0).max(MAX_DAYS);
const percent = z.number().finite().min(0).max(100);
const shortText = z.string().trim().min(1).max(80);

/** Every fact is optional: documents only state some of them, and absent means "not stated". */
export const documentFactsSchema = z.strictObject({
  // Rental
  monthlyRentInr: amountInr.optional(),
  securityDepositInr: amountInr.optional(),
  lockInMonths: months.optional(),
  tenantNoticeDays: days.optional(),
  landlordNoticeDays: days.optional(),
  rentEscalationPercent: percent.optional(),
  lateFeePerDayInr: amountInr.optional(),
  // Shared duration of the agreement
  agreementTermMonths: months.optional(),
  // Employment
  monthlySalaryInr: amountInr.optional(),
  employeeNoticeDays: days.optional(),
  employerNoticeDays: days.optional(),
  nonCompeteMonths: months.optional(),
  trainingBondInr: amountInr.optional(),
  bondDurationMonths: months.optional(),
  probationMonths: months.optional(),
  // Loans
  loanPrincipalInr: amountInr.optional(),
  interestRatePercentAnnual: percent.optional(),
  loanTenureMonths: months.optional(),
  isFloatingRate: z.boolean().optional(),
  prepaymentPenaltyPercent: percent.optional(),
  processingFeePercent: percent.optional(),
  // Insurance
  sumInsuredInr: amountInr.optional(),
  annualPremiumInr: amountInr.optional(),
  preExistingWaitingMonths: months.optional(),
  freeLookDays: days.optional(),
  coPaymentPercent: percent.optional(),
  // Property purchase
  totalConsiderationInr: amountInr.optional(),
  bookingAmountInr: amountInr.optional(),
  // Legal notices: the date on the notice and the days it gives to reply or comply
  noticeDate: z.iso.date().optional(),
  responseDays: days.optional(),
  // Where the document was signed and where disputes go
  executionCity: shortText.optional(),
  disputeSeatCity: shortText.optional(),
});

export type DocumentFacts = z.infer<typeof documentFactsSchema>;

/** The numeric facts — the ones that can be compared, simulated and summed. */
export type NumericFactKey = {
  [K in keyof DocumentFacts]-?: NonNullable<DocumentFacts[K]> extends number ? K : never;
}[keyof DocumentFacts];

export type FactUnit = 'inr' | 'months' | 'days' | 'percent';

/** How to present and compare one numeric fact. */
export interface FactDefinition {
  readonly label: string;
  readonly unit: FactUnit;
  /**
   * Which direction is better for the kind's default (weaker) role, e.g. a lower deposit
   * is better for a tenant. `neutral` facts are shown but never judged.
   */
  readonly betterWhen: 'lower' | 'higher' | 'neutral';
  readonly kinds: readonly DocumentKind[];
}

/** Numeric fact → presentation metadata. Keyed by the union so a new fact must be described here. */
export const FACT_DEFINITIONS: Readonly<Record<NumericFactKey, FactDefinition>> = {
  monthlyRentInr: { label: 'Monthly rent', unit: 'inr', betterWhen: 'lower', kinds: ['rental'] },
  securityDepositInr: {
    label: 'Security deposit',
    unit: 'inr',
    betterWhen: 'lower',
    kinds: ['rental'],
  },
  lockInMonths: { label: 'Lock-in period', unit: 'months', betterWhen: 'lower', kinds: ['rental'] },
  tenantNoticeDays: {
    label: 'Notice you must give',
    unit: 'days',
    betterWhen: 'lower',
    kinds: ['rental'],
  },
  landlordNoticeDays: {
    label: 'Notice the landlord must give',
    unit: 'days',
    betterWhen: 'higher',
    kinds: ['rental'],
  },
  rentEscalationPercent: {
    label: 'Rent increase per renewal',
    unit: 'percent',
    betterWhen: 'lower',
    kinds: ['rental'],
  },
  lateFeePerDayInr: {
    label: 'Late fee per day',
    unit: 'inr',
    betterWhen: 'lower',
    kinds: ['rental', 'service-contract'],
  },
  agreementTermMonths: {
    label: 'Agreement duration',
    unit: 'months',
    betterWhen: 'neutral',
    kinds: ['rental', 'employment', 'service-contract', 'other'],
  },
  monthlySalaryInr: {
    label: 'Monthly salary',
    unit: 'inr',
    betterWhen: 'higher',
    kinds: ['employment'],
  },
  employeeNoticeDays: {
    label: 'Notice you must give',
    unit: 'days',
    betterWhen: 'lower',
    kinds: ['employment'],
  },
  employerNoticeDays: {
    label: 'Notice the employer must give',
    unit: 'days',
    betterWhen: 'higher',
    kinds: ['employment'],
  },
  nonCompeteMonths: {
    label: 'Non-compete after leaving',
    unit: 'months',
    betterWhen: 'lower',
    kinds: ['employment'],
  },
  trainingBondInr: {
    label: 'Training bond amount',
    unit: 'inr',
    betterWhen: 'lower',
    kinds: ['employment'],
  },
  bondDurationMonths: {
    label: 'Bond duration',
    unit: 'months',
    betterWhen: 'lower',
    kinds: ['employment'],
  },
  probationMonths: {
    label: 'Probation period',
    unit: 'months',
    betterWhen: 'lower',
    kinds: ['employment'],
  },
  loanPrincipalInr: { label: 'Loan amount', unit: 'inr', betterWhen: 'neutral', kinds: ['loan'] },
  interestRatePercentAnnual: {
    label: 'Interest rate (per year)',
    unit: 'percent',
    betterWhen: 'lower',
    kinds: ['loan'],
  },
  loanTenureMonths: { label: 'Loan tenure', unit: 'months', betterWhen: 'neutral', kinds: ['loan'] },
  prepaymentPenaltyPercent: {
    label: 'Prepayment / foreclosure charge',
    unit: 'percent',
    betterWhen: 'lower',
    kinds: ['loan'],
  },
  processingFeePercent: {
    label: 'Processing fee',
    unit: 'percent',
    betterWhen: 'lower',
    kinds: ['loan'],
  },
  sumInsuredInr: { label: 'Sum insured', unit: 'inr', betterWhen: 'higher', kinds: ['insurance'] },
  annualPremiumInr: {
    label: 'Annual premium',
    unit: 'inr',
    betterWhen: 'lower',
    kinds: ['insurance'],
  },
  preExistingWaitingMonths: {
    label: 'Waiting period for existing illnesses',
    unit: 'months',
    betterWhen: 'lower',
    kinds: ['insurance'],
  },
  freeLookDays: {
    label: 'Free-look (cancel for refund) period',
    unit: 'days',
    betterWhen: 'higher',
    kinds: ['insurance'],
  },
  coPaymentPercent: {
    label: 'Co-payment on claims',
    unit: 'percent',
    betterWhen: 'lower',
    kinds: ['insurance'],
  },
  totalConsiderationInr: {
    label: 'Total price',
    unit: 'inr',
    betterWhen: 'lower',
    kinds: ['property-purchase'],
  },
  bookingAmountInr: {
    label: 'Booking / advance amount',
    unit: 'inr',
    betterWhen: 'lower',
    kinds: ['property-purchase'],
  },
  responseDays: {
    label: 'Days given to respond',
    unit: 'days',
    betterWhen: 'higher',
    kinds: ['legal-notice'],
  },
};

/** All numeric fact keys, in the display order of {@link FACT_DEFINITIONS}. */
export const NUMERIC_FACT_KEYS = Object.keys(FACT_DEFINITIONS).filter(
  (key): key is NumericFactKey => key in FACT_DEFINITIONS,
);

/**
 * True when the reader holds the kind's default (weaker) role, so `betterWhen` applies as written.
 * A landlord reading a rent agreement sees every direction flipped.
 * @example
 * isDefaultPerspective('rental', 'landlord'); // false
 */
export function isDefaultPerspective(kind: DocumentKind, role: UserRole): boolean {
  return KIND_PROFILES[kind].defaultRole === role;
}
