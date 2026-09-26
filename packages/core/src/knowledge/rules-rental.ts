/**
 * Red-flag rules for rent and leave-and-licence agreements.
 *
 * Responsibility: tenant-side checks on deposit, entry, repairs, lock-in, rent
 * increases, late fees and registration. Boundary: each rule states what the document
 * says and what the model law generally provides; it never tells the reader what to do.
 */
import { formatInr, formatMonths, formatPercent } from '../format.js';
import { clauseIdsInCategory, type RedFlagRule, signalHit } from './rule-types.js';

/** Model Tenancy Act s.11: residential deposit capped at two months' rent. */
const MAX_DEPOSIT_MONTHS = 2;
/** Annual increases above ~10% are well beyond typical 5–10% escalation in Indian leases. */
const MAX_ESCALATION_PERCENT = 10;
/** Registration Act s.17(1)(d): leases from year to year or longer must be registered. */
const REGISTRATION_TERM_MONTHS = 12;
/** A month of late fees is compared with the rent to judge proportionality. */
const DAYS_PER_MONTH = 30;
/** Late fees above 10% of a month's rent for a month's delay look like a penalty (Contract Act s.74). */
const MAX_LATE_FEE_SHARE = 0.1;

export const RENTAL_RULES: readonly RedFlagRule[] = [
  {
    id: 'rental-deposit-over-cap',
    kinds: ['rental'],
    severity: 'high',
    lawId: 'model-tenancy-act-s11',
    test: (ctx) => {
      const { monthlyRentInr: rent, securityDepositInr: deposit } = ctx.facts;
      if (rent === undefined || deposit === undefined || rent <= 0) return null;
      if (deposit <= rent * MAX_DEPOSIT_MONTHS) return null;
      return {
        title: 'Security deposit is more than two months’ rent',
        detail: `The deposit is ${formatInr(deposit)}, about ${formatMonths(deposit / rent)} of rent at ${formatInr(rent)} a month. The Model Tenancy Act caps residential deposits at ${formatMonths(MAX_DEPOSIT_MONTHS)}’ rent where a state has adopted it.`,
        suggestion: 'Consider asking for a lower deposit or a written refund timeline with itemised deductions.',
        clauseIds: clauseIdsInCategory(ctx, 'deposit'),
      };
    },
  },
  {
    id: 'rental-entry-without-notice',
    kinds: ['rental'],
    severity: 'medium',
    lawId: 'model-tenancy-act-entry',
    test: (ctx) =>
      signalHit(ctx, ['entry-without-notice'], {
        title: 'Landlord can enter without notice',
        detail: 'The agreement lets the landlord enter the home without prior written notice. The model law expects at least 24 hours’ written notice at reasonable times.',
        suggestion: 'Consider asking to add a 24-hour written notice requirement before any visit.',
      }),
  },
  {
    id: 'rental-tenant-structural-repairs',
    kinds: ['rental'],
    severity: 'medium',
    lawId: 'model-tenancy-act-repairs',
    test: (ctx) =>
      signalHit(ctx, ['tenant-structural-repairs'], {
        title: 'You pay for structural repairs',
        detail: 'The agreement puts major or structural repairs on the tenant. Generally these are the landlord’s responsibility; tenants handle day-to-day upkeep.',
        suggestion: 'Consider asking to limit your repair duty to minor, day-to-day maintenance.',
      }),
  },
  {
    id: 'rental-full-rent-for-lock-in',
    kinds: ['rental'],
    severity: 'high',
    lawId: 'contract-act-s74',
    test: (ctx) => {
      const { monthlyRentInr: rent, lockInMonths } = ctx.facts;
      const exposure =
        rent !== undefined && lockInMonths !== undefined
          ? ` If you left in the first month, that could be up to ${formatInr(rent * lockInMonths)}.`
          : '';
      return signalHit(ctx, ['full-rent-for-lock-in'], {
        title: 'Full rent for the rest of the lock-in if you leave early',
        detail: `Leaving before the lock-in ends makes you pay rent for all the remaining months.${exposure} Courts generally allow only reasonable compensation, not an automatic full amount.`,
        suggestion: 'Consider asking for a shorter lock-in or a fixed exit fee such as one month’s rent.',
      });
    },
  },
  {
    id: 'rental-high-escalation',
    kinds: ['rental'],
    severity: 'medium',
    test: (ctx) => {
      const escalation = ctx.facts.rentEscalationPercent;
      if (escalation === undefined || escalation <= MAX_ESCALATION_PERCENT) return null;
      return {
        title: `Rent increase of ${formatPercent(escalation)} is steep`,
        detail: `Rent goes up by ${formatPercent(escalation)} at renewal, above the ${formatPercent(MAX_ESCALATION_PERCENT)} commonly seen in Indian rent agreements.`,
        suggestion: `Consider asking to cap increases at ${formatPercent(MAX_ESCALATION_PERCENT)} or less.`,
        clauseIds: clauseIdsInCategory(ctx, 'payment', 'renewal'),
      };
    },
  },
  {
    id: 'rental-registration-needed',
    kinds: ['rental'],
    severity: 'low',
    lawId: 'registration-act-s17',
    test: (ctx) => {
      const term = ctx.facts.agreementTermMonths;
      if (term === undefined || term < REGISTRATION_TERM_MONTHS) return null;
      return {
        title: 'This lease generally needs to be registered',
        detail: `The agreement runs for ${formatMonths(term)}. Leases of a year or more generally must be registered, and an unregistered lease may not prove its terms later.`,
        suggestion: 'Consider asking who will register the agreement and who pays the stamp duty and fees.',
        clauseIds: clauseIdsInCategory(ctx, 'term'),
      };
    },
  },
  {
    id: 'rental-late-fee-excessive',
    kinds: ['rental'],
    severity: 'medium',
    lawId: 'contract-act-s74',
    test: (ctx) => {
      const { lateFeePerDayInr: fee, monthlyRentInr: rent } = ctx.facts;
      if (fee === undefined || rent === undefined || rent <= 0) return null;
      const monthOfFees = fee * DAYS_PER_MONTH;
      if (monthOfFees <= rent * MAX_LATE_FEE_SHARE) return null;
      return {
        title: 'Late fee is high compared with the rent',
        detail: `A late fee of ${formatInr(fee)} a day adds up to ${formatInr(monthOfFees)} over ${DAYS_PER_MONTH} days — more than ${formatPercent(MAX_LATE_FEE_SHARE * 100)} of the ${formatInr(rent)} rent. Courts generally allow only reasonable compensation.`,
        suggestion: 'Consider asking for a grace period and a capped, one-time late fee.',
        clauseIds: clauseIdsInCategory(ctx, 'penalty', 'payment'),
      };
    },
  },
];
