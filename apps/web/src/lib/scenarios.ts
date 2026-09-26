/**
 * What-if scenario presentation: names and the inputs each scenario asks for.
 *
 * Responsibility: map every core ScenarioId to reader-facing copy and input fields.
 * Boundary: the maths lives in core's engine/simulate.ts; this file only decides what
 * to ask the reader. Keyed by the ScenarioId union so a new scenario must be described.
 */
import type { ScenarioId, ScenarioInputs } from '@sign-se-pehle/core';

export type ScenarioInputKey = keyof ScenarioInputs;

export interface ScenarioFieldSpec {
  readonly key: ScenarioInputKey;
  readonly label: string;
  readonly hint: string;
  /** Whole numbers only (days are integers in the request schema). */
  readonly integer: boolean;
}

export interface ScenarioSpec {
  readonly title: string;
  readonly fields: readonly ScenarioFieldSpec[];
}

const MONTHS_COMPLETED: ScenarioFieldSpec = {
  key: 'monthsCompleted',
  label: 'Months completed so far',
  hint: 'How long you will have stayed or paid by then.',
  integer: false,
};

const NOTICE_SERVED: ScenarioFieldSpec = {
  key: 'noticeServedDays',
  label: 'Days of notice you can give',
  hint: 'Leave empty if you will serve the full notice.',
  integer: true,
};

export const SCENARIO_SPECS: Readonly<Record<ScenarioId, ScenarioSpec>> = {
  'rental-leave-early': {
    title: 'If I move out early',
    fields: [MONTHS_COMPLETED, NOTICE_SERVED],
  },
  'rental-late-rent': {
    title: 'If I pay rent late',
    fields: [{ key: 'daysLate', label: 'Days late', hint: 'For example 10.', integer: true }],
  },
  'employment-resign': {
    title: 'If I resign',
    fields: [MONTHS_COMPLETED, NOTICE_SERVED],
  },
  'loan-total-cost': { title: 'What this loan really costs', fields: [] },
  'loan-prepay': {
    title: 'If I repay part of the loan early',
    fields: [
      {
        key: 'prepayAmountInr',
        label: 'Amount to prepay (₹)',
        hint: 'The lump sum you plan to pay.',
        integer: false,
      },
      MONTHS_COMPLETED,
    ],
  },
  'insurance-cancel-free-look': { title: 'If I cancel in the free-look period', fields: [] },
};
