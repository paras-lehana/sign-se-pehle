/**
 * ListenSettings: the voice and listening-language pickers, defaults, and that a choice
 * is stored so every Listen button on the page picks it up.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { ListenSettings } from '../../components/features/listen/ListenSettings';
import { LISTEN_LANGUAGE_STORAGE_KEY, VOICE_STORAGE_KEY } from '../../components/layout/preferences';

beforeEach(() => {
  window.localStorage.clear();
});

describe('ListenSettings', () => {
  it('defaults to the free Google voice and "same as explanation"', () => {
    render(<ListenSettings />);
    expect(screen.getByLabelText('Voice')).toHaveValue('google');
    expect(screen.getByLabelText('Listen in')).toHaveValue('same');
  });

  it('offers every voice and every app language', () => {
    render(<ListenSettings />);
    expect(
      Array.from(screen.getByLabelText('Voice').querySelectorAll('option')).map((o) => o.textContent),
    ).toEqual(['Google Translate (free)', 'Sarvam AI (Indian voices)', 'Gemini (AI voice)']);
    const languageLabels = Array.from(screen.getByLabelText('Listen in').querySelectorAll('option')).map(
      (o) => o.textContent,
    );
    expect(languageLabels[0]).toBe('Same as explanation');
    expect(languageLabels).toContain('हिन्दी (Hindi)');
    expect(languageLabels).toContain('ଓଡ଼ିଆ (Odia)');
    expect(languageLabels).toHaveLength(12);
  });

  it('stores a voice choice so a later Listen button picks it up', async () => {
    const user = userEvent.setup();
    render(<ListenSettings />);
    await user.selectOptions(screen.getByLabelText('Voice'), 'sarvam');
    expect(window.localStorage.getItem(VOICE_STORAGE_KEY)).toBe('sarvam');
  });

  it('stores a listening-language choice, and "Same as explanation" stores the sentinel', async () => {
    const user = userEvent.setup();
    render(<ListenSettings />);
    await user.selectOptions(screen.getByLabelText('Listen in'), 'ta');
    expect(window.localStorage.getItem(LISTEN_LANGUAGE_STORAGE_KEY)).toBe('ta');

    await user.selectOptions(screen.getByLabelText('Listen in'), 'Same as explanation');
    expect(window.localStorage.getItem(LISTEN_LANGUAGE_STORAGE_KEY)).toBe('same');
  });

  it('picks up a previously stored choice on mount', () => {
    window.localStorage.setItem(VOICE_STORAGE_KEY, 'gemini');
    window.localStorage.setItem(LISTEN_LANGUAGE_STORAGE_KEY, 'bn');
    render(<ListenSettings />);
    expect(screen.getByLabelText('Voice')).toHaveValue('gemini');
    expect(screen.getByLabelText('Listen in')).toHaveValue('bn');
  });
});
