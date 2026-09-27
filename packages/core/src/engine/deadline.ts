/**
 * Reply deadline for a legal notice — how many days are left to respond.
 *
 * Responsibility: add the notice's response period to its date and compare with today,
 * returning the deadline and an urgency band for a countdown. Boundary: pure — "today" is
 * passed in; the count starts from the notice date, the earliest a deadline can fall (many
 * notices count from the day they are received, which can only be later).
 */
import { appError } from '../errors.js';
import { err, ok, type Result } from '../result.js';
import { MAX_DAYS } from '../schemas/limits.js';

export type DeadlineUrgency = 'overdue' | 'urgent' | 'soon' | 'comfortable';

export interface ReplyDeadline {
  readonly deadlineIso: string;
  /** Whole days from today to the deadline; negative once it has passed. */
  readonly daysLeft: number;
  readonly urgency: DeadlineUrgency;
}

export interface ReplyDeadlineInput {
  readonly noticeIsoDate: string;
  readonly responseDays: number;
  readonly todayIso: string;
}

/** Three days or fewer leaves little time to find help, so the countdown turns urgent. */
export const URGENT_MAX_DAYS = 3;
/** Up to ten days is enough to act but not to wait; beyond that the deadline is comfortable. */
export const SOON_MAX_DAYS = 10;

const MS_PER_DAY = 86_400_000;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const ISO_DATE_CHARS = 10;
const MONTH_OFFSET = 1;

/** Milliseconds since the epoch at UTC midnight, or null for anything but a real calendar date. */
function utcDay(isoDate: string): number | null {
  const match = ISO_DATE.exec(isoDate);
  if (match === null) return null;
  const [year, month, day] = match.slice(1).map(Number);
  if (year === undefined || month === undefined || day === undefined) return null;
  const date = new Date(Date.UTC(year, month - MONTH_OFFSET, day));
  const real = date.getUTCFullYear() === year && date.getUTCMonth() === month - MONTH_OFFSET && date.getUTCDate() === day;
  return real ? date.getTime() : null;
}

function urgencyFor(daysLeft: number): DeadlineUrgency {
  if (daysLeft < 0) return 'overdue';
  if (daysLeft <= URGENT_MAX_DAYS) return 'urgent';
  if (daysLeft <= SOON_MAX_DAYS) return 'soon';
  return 'comfortable';
}

/**
 * Computes the reply deadline: notice date + response days, compared with today.
 * Invalid dates or a response period that is not a whole number of days (0–MAX_DAYS) fail validation.
 * @example
 * computeReplyDeadline({ noticeIsoDate: '2026-09-20', responseDays: 15, todayIso: '2026-09-27' });
 * // ok({ deadlineIso: '2026-10-05', daysLeft: 8, urgency: 'soon' })
 */
export function computeReplyDeadline(input: ReplyDeadlineInput): Result<ReplyDeadline> {
  const notice = utcDay(input.noticeIsoDate);
  const today = utcDay(input.todayIso);
  if (notice === null || today === null) {
    return err(appError('VALIDATION_FAILED', 'Please enter dates as YYYY-MM-DD.'));
  }
  if (!Number.isInteger(input.responseDays) || input.responseDays < 0 || input.responseDays > MAX_DAYS) {
    return err(appError('VALIDATION_FAILED', `Please enter the days to respond as a whole number up to ${MAX_DAYS}.`));
  }
  const deadline = notice + input.responseDays * MS_PER_DAY;
  const daysLeft = Math.round((deadline - today) / MS_PER_DAY);
  return ok({
    deadlineIso: new Date(deadline).toISOString().slice(0, ISO_DATE_CHARS),
    daysLeft,
    urgency: urgencyFor(daysLeft),
  });
}
