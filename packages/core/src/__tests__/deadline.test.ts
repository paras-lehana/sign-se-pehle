import { describe, expect, it } from 'vitest';
import { computeReplyDeadline, type ReplyDeadline, SOON_MAX_DAYS, URGENT_MAX_DAYS } from '../engine/deadline.js';
import { MAX_DAYS } from '../schemas/limits.js';

const NOTICE = '2026-09-20';
const RESPONSE_DAYS = 15;
const MS_PER_DAY = 86_400_000;

/** Test-side calendar arithmetic, independent of the engine's own. */
function shift(isoDate: string, days: number): string {
  return new Date(Date.parse(`${isoDate}T00:00:00Z`) + days * MS_PER_DAY).toISOString().slice(0, 10);
}

const DEADLINE = shift(NOTICE, RESPONSE_DAYS);

function deadlineOn(todayIso: string): ReplyDeadline | undefined {
  const result = computeReplyDeadline({ noticeIsoDate: NOTICE, responseDays: RESPONSE_DAYS, todayIso });
  return result.ok ? result.value : undefined;
}

describe('computeReplyDeadline', () => {
  it('adds the response days to the notice date', () => {
    expect(deadlineOn(NOTICE)).toEqual({ deadlineIso: DEADLINE, daysLeft: RESPONSE_DAYS, urgency: 'comfortable' });
  });

  it.each([
    [SOON_MAX_DAYS + 1, 'comfortable'],
    [SOON_MAX_DAYS, 'soon'],
    [URGENT_MAX_DAYS + 1, 'soon'],
    [URGENT_MAX_DAYS, 'urgent'],
    [0, 'urgent'],
    [-1, 'overdue'],
  ] as const)('with %i days left the urgency is %s', (daysLeft, urgency) => {
    expect(deadlineOn(shift(DEADLINE, -daysLeft))).toEqual({ deadlineIso: DEADLINE, daysLeft, urgency });
  });

  it('crosses month, year and leap-day boundaries', () => {
    const newYear = computeReplyDeadline({ noticeIsoDate: '2026-12-25', responseDays: 10, todayIso: '2026-12-25' });
    const leap = computeReplyDeadline({ noticeIsoDate: '2028-02-20', responseDays: 10, todayIso: '2028-02-20' });
    expect(newYear.ok ? newYear.value.deadlineIso : '').toBe(shift('2026-12-25', 10));
    expect(leap.ok ? leap.value.deadlineIso : '').toBe(shift('2028-02-20', 10));
  });

  it('allows a zero-day window and the longest supported one', () => {
    expect(computeReplyDeadline({ noticeIsoDate: NOTICE, responseDays: 0, todayIso: NOTICE }).ok).toBe(true);
    expect(computeReplyDeadline({ noticeIsoDate: NOTICE, responseDays: MAX_DAYS, todayIso: NOTICE }).ok).toBe(true);
  });

  it.each([
    ['an impossible notice date', { noticeIsoDate: '2026-02-30', responseDays: 15, todayIso: NOTICE }],
    ['a day-first notice date', { noticeIsoDate: '20/09/2026', responseDays: 15, todayIso: NOTICE }],
    ['a malformed today', { noticeIsoDate: NOTICE, responseDays: 15, todayIso: 'today' }],
    ['negative days', { noticeIsoDate: NOTICE, responseDays: -1, todayIso: NOTICE }],
    ['fractional days', { noticeIsoDate: NOTICE, responseDays: 1.5, todayIso: NOTICE }],
    ['too many days', { noticeIsoDate: NOTICE, responseDays: MAX_DAYS + 1, todayIso: NOTICE }],
  ])('rejects %s with VALIDATION_FAILED', (_label, input) => {
    const result = computeReplyDeadline(input);
    expect(result.ok ? 'ok' : result.error.code).toBe('VALIDATION_FAILED');
  });
});
