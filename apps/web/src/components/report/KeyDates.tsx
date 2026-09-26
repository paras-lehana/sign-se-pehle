/**
 * Key dates with "Add to Google Calendar" links.
 *
 * Responsibility: list dates the document mentions; exact dates get a Calendar link
 * built by core's integrations helper. Boundary: links open Google Calendar's own
 * page — nothing is sent anywhere until the reader chooses to save the event.
 */
import type { ReactElement } from 'react';
import { type KeyDate, buildGoogleCalendarUrl } from '@sign-se-pehle/core';
import { ReportSection } from './ReportSection';

interface KeyDatesProps {
  readonly keyDates: readonly KeyDate[];
  readonly documentTitle: string;
}

export function KeyDates({ keyDates, documentTitle }: KeyDatesProps): ReactElement | null {
  if (keyDates.length === 0) return null;
  return (
    <ReportSection id="key-dates" title="Key dates">
      <ul className="plain-list date-list" role="list">
        {keyDates.map((date) => (
          <li key={`${date.label}-${date.text}`} className="date-item">
            <span className="date-item__label">{date.label}</span>
            <span className="date-item__text">{date.text}</span>
            {date.isoDate === undefined ? null : (
              <a
                className="button button--ghost"
                href={buildGoogleCalendarUrl({
                  title: `${date.label} — ${documentTitle}`,
                  isoDate: date.isoDate,
                  details: `From your document: ${date.text}. Reminder created with Sign Se Pehle.`,
                })}
                target="_blank"
                rel="noopener noreferrer"
              >
                Add to Google Calendar
                <span className="visually-hidden"> (opens in a new tab)</span>
              </a>
            )}
          </li>
        ))}
      </ul>
    </ReportSection>
  );
}
