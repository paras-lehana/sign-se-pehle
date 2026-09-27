/**
 * NextStepsPanel: official forums for the kind, legal aid on Maps, a private legal aid
 * check computed in the browser, a reply countdown for notices and the limitation reminder.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  type EligibilityRequest,
  LAWS,
  buildMapsSearchUrl,
  checkLegalAidEligibility,
  computeReplyDeadline,
  routesForKind,
} from '@sign-se-pehle/core';
import { formatIsoDate } from '../../components/features/common/dates';
import { NextStepsPanel } from '../../components/features/next-steps/NextStepsPanel';
import { stubFetch } from '../helpers';
import { LEGAL_NOTICE_TEXT, analyseText, buildSampleAnalysis } from './feature-fixtures';

const NO_CATEGORIES: EligibilityRequest = {
  isWoman: false,
  isChild: false,
  isScheduledCasteOrTribe: false,
  hasDisability: false,
  isIndustrialWorkman: false,
  isInCustody: false,
  isVictimOfTraffickingOrBegar: false,
  isVictimOfDisasterOrViolence: false,
};

/** 27 September 2026 on the reader's device (JavaScript months are zero-based). */
const TODAY = new Date(2026, 8, 27);
const TODAY_ISO = '2026-09-27';

describe('NextStepsPanel', () => {
  const rental = buildSampleAnalysis('rent-leave-licence');

  afterEach(() => {
    vi.useRealTimers();
  });

  it('lists the official forums for this kind with their sites and helplines', () => {
    render(<NextStepsPanel analysis={rental} />);
    for (const route of routesForKind(rental.kind)) {
      expect(screen.getByRole('heading', { name: route.name })).toBeInTheDocument();
      expect(
        screen.getByRole('link', { name: (name) => name.includes(`of ${route.name}`) }),
      ).toHaveAttribute('href', route.url);
      if (route.phone !== undefined) {
        expect(screen.getByRole('link', { name: `Call ${route.phone}` })).toHaveAttribute(
          'href',
          `tel:${route.phone}`,
        );
      }
    }
    expect(
      screen.getByRole('link', { name: /Find the nearest DLSA on Google Maps/ }),
    ).toHaveAttribute('href', buildMapsSearchUrl('District Legal Services Authority near me'));
  });

  it('checks free legal aid in the browser without sending anything', async () => {
    const user = userEvent.setup();
    const fetchMock = stubFetch();
    render(<NextStepsPanel analysis={rental} />);
    expect(screen.getByText('Your answers never leave this device.')).toBeInTheDocument();

    await user.click(screen.getByRole('checkbox', { name: 'I am a woman' }));
    await user.click(screen.getByRole('button', { name: 'Check free legal aid' }));

    const expected = checkLegalAidEligibility({ ...NO_CATEGORIES, isWoman: true });
    expect(screen.getByText('You are generally eligible for free legal aid')).toBeInTheDocument();
    for (const reason of expected.reasons) expect(screen.getByText(reason)).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /^Source: Legal Services Authorities Act/ }),
    ).toHaveAttribute('href', expected.law.url);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('uses the income when no category applies, and rejects non-numbers', async () => {
    const user = userEvent.setup();
    render(<NextStepsPanel analysis={rental} />);
    const income = screen.getByLabelText('Your yearly income in ₹ (optional)');

    await user.type(income, '2,40,000');
    await user.click(screen.getByRole('button', { name: 'Check free legal aid' }));
    const expected = checkLegalAidEligibility({ ...NO_CATEGORIES, annualIncomeInr: 240_000 });
    expect(expected.status).toBe('likely');
    expect(screen.getByText('You are likely eligible for free legal aid')).toBeInTheDocument();

    await user.clear(income);
    await user.type(income, 'about two lakh');
    expect(screen.getByText(/using digits only/)).toBeInTheDocument();
    expect(income).toHaveAttribute('aria-invalid', 'true');
  });

  it('counts down to the reply deadline of a legal notice', () => {
    vi.useFakeTimers({ now: TODAY, toFake: ['Date'] });
    const notice = analyseText(LEGAL_NOTICE_TEXT, 'legal-notice', 'party');
    const { noticeDate, responseDays } = notice.facts;
    if (noticeDate === undefined || responseDays === undefined)
      throw new Error('Notice facts not extracted');
    const expected = computeReplyDeadline({
      noticeIsoDate: noticeDate,
      responseDays,
      todayIso: TODAY_ISO,
    });
    if (!expected.ok) throw new Error(expected.error.message);

    render(<NextStepsPanel analysis={notice} />);

    expect(screen.getByRole('heading', { name: 'Reply deadline' })).toBeInTheDocument();
    expect(screen.getByText(String(Math.abs(expected.value.daysLeft)))).toBeInTheDocument();
    expect(screen.getByText(formatIsoDate(expected.value.deadlineIso))).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Add the reply deadline to Google Calendar/ }),
    ).toHaveAttribute(
      'href',
      expect.stringContaining(`dates=${expected.value.deadlineIso.replace(/-/g, '')}`),
    );
  });

  it('shows no countdown for documents that are not notices, and links the limitation rule', () => {
    render(<NextStepsPanel analysis={rental} />);
    expect(screen.queryByRole('heading', { name: 'Reply deadline' })).not.toBeInTheDocument();
    const law = LAWS['limitation-act'];
    expect(screen.getByRole('link', { name: new RegExp(`^Source: ${law.act}`) })).toHaveAttribute(
      'href',
      law.url,
    );
  });
});
