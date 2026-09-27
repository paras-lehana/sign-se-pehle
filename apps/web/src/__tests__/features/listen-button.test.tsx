/**
 * ListenButton: Gemini audio first, device voice as fallback, one voice at a time, and
 * nothing left playing or allocated after stop, end or unmount.
 */
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LANGUAGES } from '@sign-se-pehle/core';
import { ListenButton } from '../../components/features/listen/ListenButton';
import { jsonResponse, requestBody, stubFetch } from '../helpers';
import { FAKE_BLOB_URL, FakeAudio, installAudioFakes, installSynthesisFake } from './speech-fakes';

const TEXT = 'Your deposit is ten months of rent. The landlord can enter without notice.';
const HTTP_BAD_GATEWAY = 502;

function audioResponse(): Response {
  return new Response(new Uint8Array([82, 73, 70, 70]), {
    headers: { 'Content-Type': 'audio/wav' },
  });
}

describe('ListenButton', () => {
  it('hides itself when the browser has no way to play speech', () => {
    vi.stubGlobal('Audio', undefined);
    const { container } = render(<ListenButton text={TEXT} language="en" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('plays the Gemini voice, then stops and frees the audio', async () => {
    const user = userEvent.setup();
    const { revokeObjectURL } = installAudioFakes();
    const fetchMock = stubFetch(audioResponse());
    render(<ListenButton text={TEXT} language="hi" label="Listen to the summary" />);
    const listen = screen.getByRole('button', { name: 'Listen to the summary' });
    expect(listen).toHaveAttribute('aria-pressed', 'false');

    await user.click(listen);

    const stop = await screen.findByRole('button', { name: 'Stop' });
    expect(stop).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('status')).toHaveTextContent('Playing the Gemini voice.');
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/speech');
    expect(requestBody(fetchMock, 0)).toEqual({ text: TEXT, language: 'hi' });
    const audio = FakeAudio.instances[0];
    expect(audio?.src).toBe(FAKE_BLOB_URL);

    await user.click(stop);

    expect(audio?.pause).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith(FAKE_BLOB_URL);
    expect(screen.getByRole('button', { name: 'Listen to the summary' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('returns to Listen and revokes the URL when the audio ends', async () => {
    const user = userEvent.setup();
    const { revokeObjectURL } = installAudioFakes();
    stubFetch(audioResponse());
    render(<ListenButton text={TEXT} language="en" />);
    await user.click(screen.getByRole('button', { name: 'Listen' }));
    await screen.findByRole('button', { name: 'Stop' });

    act(() => FakeAudio.instances[0]?.finish());

    expect(screen.getByRole('button', { name: 'Listen' })).toHaveAttribute('aria-pressed', 'false');
    expect(revokeObjectURL).toHaveBeenCalledWith(FAKE_BLOB_URL);
  });

  it('stops playback and frees the audio on unmount', async () => {
    const user = userEvent.setup();
    const { revokeObjectURL } = installAudioFakes();
    stubFetch(audioResponse());
    const { unmount } = render(<ListenButton text={TEXT} language="en" />);
    await user.click(screen.getByRole('button', { name: 'Listen' }));
    await screen.findByRole('button', { name: 'Stop' });

    unmount();

    expect(FakeAudio.instances[0]?.pause).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith(FAKE_BLOB_URL);
  });

  it('falls back to the device voice in the reader’s language when Gemini audio fails', async () => {
    const user = userEvent.setup();
    installAudioFakes();
    const synthesis = installSynthesisFake();
    stubFetch(
      jsonResponse(
        { error: { code: 'UPSTREAM_FAILURE', message: 'Unavailable' } },
        HTTP_BAD_GATEWAY,
      ),
    );
    render(<ListenButton text={TEXT} language="ta" />);

    await user.click(screen.getByRole('button', { name: 'Listen' }));

    await screen.findByRole('button', { name: 'Stop' });
    expect(screen.getByRole('status')).toHaveTextContent('Playing with your device’s voice.');
    const utterance = synthesis.speak.mock.calls[0]?.[0];
    expect(utterance?.lang).toBe(LANGUAGES.ta.bcp47);
    expect(utterance?.text).toBe(TEXT);
    expect(FakeAudio.instances).toHaveLength(0);

    act(() => utterance?.onend?.());

    expect(screen.getByRole('button', { name: 'Listen' })).toBeInTheDocument();
  });

  it('keeps one voice at a time across the page', async () => {
    const user = userEvent.setup();
    installAudioFakes();
    stubFetch(audioResponse(), audioResponse());
    render(
      <>
        <ListenButton text="The summary." language="en" label="Listen to the summary" />
        <ListenButton text="The answer." language="en" label="Listen to the answer" />
      </>,
    );
    await user.click(screen.getByRole('button', { name: 'Listen to the summary' }));
    await screen.findByRole('button', { name: 'Stop' });

    await user.click(screen.getByRole('button', { name: 'Listen to the answer' }));

    await screen.findByRole('button', { name: 'Listen to the summary' });
    expect(screen.getAllByRole('button', { name: 'Stop' })).toHaveLength(1);
    expect(FakeAudio.instances[0]?.pause).toHaveBeenCalled();
    expect(FakeAudio.instances).toHaveLength(2);
  });
});
