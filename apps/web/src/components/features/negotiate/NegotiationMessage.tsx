/**
 * The drafted change-request message, editable, with one-tap Copy / WhatsApp / email.
 *
 * Responsibility: let the reader adjust the wording and send it from their own apps.
 * Boundary: nothing is sent by Sign Se Pehle — the buttons copy text or open WhatsApp or
 * the mail app with it filled in, and the reader chooses the recipient.
 */
import { type ReactElement, useId, useState } from 'react';
import type { NegotiateRequest, NegotiateResponse } from '@sign-se-pehle/core';
import { CopyButton } from '../common/CopyButton';
import { buildMailtoUrl, buildWhatsAppShareUrl } from '../common/share-links';

interface NegotiationMessageProps {
  readonly draft: NegotiateResponse;
  readonly channel: NegotiateRequest['channel'];
}

/** Used when an email draft comes back without a subject line. */
const FALLBACK_SUBJECT = 'Request to revise a few terms before signing';

export function NegotiationMessage({ draft, channel }: NegotiationMessageProps): ReactElement {
  const fieldId = useId();
  const [subject, setSubject] = useState(draft.subject ?? FALLBACK_SUBJECT);
  const [message, setMessage] = useState(draft.message);
  const isEmail = channel === 'email';
  const copyText = isEmail ? `Subject: ${subject}\n\n${message}` : message;

  return (
    <div className="negotiate-message">
      <h4>Your message</h4>
      {isEmail ? (
        <div className="field">
          <label htmlFor={`${fieldId}-subject`}>Subject</label>
          <input
            id={`${fieldId}-subject`}
            type="text"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
          />
        </div>
      ) : null}
      <div className="field">
        <label htmlFor={`${fieldId}-body`}>Message (you can edit it)</label>
        <textarea
          id={`${fieldId}-body`}
          className="negotiate-message__body"
          rows={isEmail ? 12 : 8}
          value={message}
          aria-describedby={`${fieldId}-hint`}
          onChange={(event) => setMessage(event.target.value)}
        />
        <p id={`${fieldId}-hint`} className="field__hint">
          {message.length} characters · Nothing is sent until you pick an app below.
        </p>
      </div>
      <div className="feature-actions">
        <CopyButton text={copyText} label="Copy message" copiedMessage="Message copied." />
        <a
          className={`button ${isEmail ? 'button--secondary' : 'button--primary'}`}
          href={buildWhatsAppShareUrl(message)}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open in WhatsApp
          <span className="visually-hidden"> (opens in a new tab)</span>
        </a>
        <a
          className={`button ${isEmail ? 'button--primary' : 'button--secondary'}`}
          href={buildMailtoUrl(subject, message)}
        >
          Open in email
        </a>
      </div>
    </div>
  );
}
