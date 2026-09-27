/**
 * Key dates as a vertical timeline, with "Add to Google Calendar" links.
 *
 * Responsibility: list the dates a document mentions in order; exact dates get a Calendar
 * link built by core's integrations helper. Boundary: links open Google Calendar's own
 * page — nothing is sent anywhere until the reader chooses to save the event. Dated items
 * come first (oldest to newest); relative ones ("15 days after notice") follow as written.
 */
import type { ReactElement } from 'react';
import { type KeyDate, buildGoogleCalendarUrl } from '@sign-se-pehle/core';
import { Icon } from '../ui/Icon';
import { ReportSection } from './ReportSection';

interface KeyDatesProps {
  readonly keyDates: readonly KeyDate[];
  readonly documentTitle: string;
}

/** ISO dates sort as strings; the sort is stable, so undated entries keep document order. */
function byDate(a: KeyDate, b: KeyDate): number {
  if (a.isoDate !== undefined && b.isoDate !== undefined) return a.isoDate.localeCompare(b.isoDate);
  return Number(a.isoDate === undefined) - Number(b.isoDate === undefined);
}

export function KeyDates({ keyDates, documentTitle }: KeyDatesProps): ReactElement | null {
  if (keyDates.length === 0) return null;
  return (
    <ReportSection id="key-dates" title="Key dates">
      <ol className="plain-list timeline" role="list">
        {[...keyDates].sort(byDate).map((date) => (
          <li
            key={`${date.label}-${date.text}`}
            className={`timeline__item${date.isoDate === undefined ? '' : ' timeline__item--dated'}`}
          >
            <span className="timeline__dot" aria-hidden="true" />
            <p className="timeline__label">{date.label}</p>
            <p className="timeline__text">{date.text}</p>
            {date.isoDate === undefined ? null : (
              <a
                className="button button--glass timeline__action"
                href={buildGoogleCalendarUrl({
                  title: `${date.label} — ${documentTitle}`,
                  isoDate: date.isoDate,
                  details: `From your document: ${date.text}. Reminder created with Sign Se Pehle.`,
                })}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Icon name="calendar" className="button__icon" />
                Add to Google Calendar
                <span className="visually-hidden"> (opens in a new tab)</span>
              </a>
            )}
          </li>
        ))}
      </ol>
    </ReportSection>
  );
}
