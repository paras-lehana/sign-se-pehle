/**
 * Reply deadline countdown for a legal notice.
 *
 * Responsibility: when the notice's date and response period were found, show the days
 * left (or overdue) in large type, the urgency in words and a Google Calendar reminder.
 * Boundary: today's date comes from the reader's device and the arithmetic from core's
 * computeReplyDeadline; the count starts at the notice date, the earliest it can start.
 */
import { type ReactElement, useState } from 'react';
import {
  type DeadlineUrgency,
  type DocumentFacts,
  buildGoogleCalendarUrl,
  computeReplyDeadline,
} from '@sign-se-pehle/core';
import { formatIsoDate, todayIsoLocal } from '../common/dates';

interface ReplyDeadlineProps {
  readonly facts: DocumentFacts;
}

const URGENCY_COPY: Readonly<
  Record<DeadlineUrgency, { readonly icon: string; readonly text: string }>
> = {
  overdue: {
    icon: '⚠',
    text: 'The time given to reply has passed. A late reply may still help — free legal aid can tell you what to do next.',
  },
  urgent: { icon: '⚠', text: 'Urgent — very little time is left. Consider getting help today.' },
  soon: { icon: '◆', text: 'Soon — plan your reply this week.' },
  comfortable: {
    icon: 'ℹ',
    text: 'You have some time, but replies are best not left to the last day.',
  },
};

function countdownLabel(daysLeft: number): { readonly number: string; readonly unit: string } {
  const days = Math.abs(daysLeft);
  const unit = days === 1 ? 'day' : 'days';
  if (daysLeft < 0) return { number: String(days), unit: `${unit} overdue` };
  if (daysLeft === 0) return { number: '0', unit: 'days — due today' };
  return { number: String(days), unit: `${unit} left to reply` };
}

export function ReplyDeadline({ facts }: ReplyDeadlineProps): ReactElement | null {
  const [todayIso] = useState(todayIsoLocal);
  const { noticeDate, responseDays } = facts;
  if (noticeDate === undefined || responseDays === undefined) return null;
  const computed = computeReplyDeadline({
    noticeIsoDate: noticeDate,
    responseDays: Math.round(responseDays),
    todayIso,
  });
  if (!computed.ok) return null;
  const { deadlineIso, daysLeft, urgency } = computed.value;
  const countdown = countdownLabel(daysLeft);
  const copy = URGENCY_COPY[urgency];

  return (
    <div className={`deadline deadline--${urgency}`}>
      <h4>Reply deadline</h4>
      <p className="deadline__count">
        <span className="deadline__number">{countdown.number}</span>{' '}
        <span className="deadline__unit">{countdown.unit}</span>
      </p>
      <p className="deadline__urgency">
        <span aria-hidden="true">{copy.icon}</span> {copy.text}
      </p>
      <p>
        Reply by <strong>{formatIsoDate(deadlineIso)}</strong> — {Math.round(responseDays)} days
        counted from the date on the notice ({formatIsoDate(noticeDate)}).
      </p>
      <p className="field__hint">
        Some notices count from the day you received them, which can only be later. Check the
        notice’s own wording.
      </p>
      <a
        className="button button--secondary"
        href={buildGoogleCalendarUrl({
          title: 'Reply to legal notice',
          isoDate: deadlineIso,
          details: `Reply due within ${Math.round(responseDays)} days of the notice dated ${formatIsoDate(noticeDate)}. Free legal aid: NALSA 15100.`,
        })}
        target="_blank"
        rel="noopener noreferrer"
      >
        Add the reply deadline to Google Calendar
        <span className="visually-hidden"> (opens in a new tab)</span>
      </a>
    </div>
  );
}
