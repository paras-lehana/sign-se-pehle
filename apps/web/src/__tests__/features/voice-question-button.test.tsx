/**
 * VoiceQuestionButton: browser speech recognition in the reader's language, live status,
 * final transcript handed to the parent, and clean-up on unmount.
 */
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LANGUAGES } from '@sign-se-pehle/core';
import { VoiceQuestionButton } from '../../components/features/listen/VoiceQuestionButton';
import { FakeRecognition, errorEvent, resultEvent } from './speech-fakes';

const HEARD = 'kya mera deposit wapas milega';

describe('VoiceQuestionButton', () => {
  beforeEach(() => {
    FakeRecognition.last = null;
  });

  it('renders nothing where the browser has no speech recognition', () => {
    const { container } = render(<VoiceQuestionButton language="en" onText={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('listens in the reader’s language and hands over only the final transcript', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('webkitSpeechRecognition', FakeRecognition);
    const onText = vi.fn();
    render(<VoiceQuestionButton language="hi" onText={onText} />);

    await user.click(screen.getByRole('button', { name: 'Ask by voice' }));

    const session = FakeRecognition.last;
    expect(session?.start).toHaveBeenCalled();
    expect(session?.lang).toBe(LANGUAGES.hi.bcp47);
    expect(screen.getByRole('button', { name: 'Stop listening' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('status')).toHaveTextContent('Listening… ask your question.');

    act(() => session?.onresult?.(resultEvent(HEARD, false)));
    expect(screen.getByRole('status')).toHaveTextContent(`Listening… “${HEARD}”`);
    expect(onText).not.toHaveBeenCalled();

    act(() => session?.onresult?.(resultEvent(HEARD, true)));
    expect(onText).toHaveBeenCalledWith(HEARD);
    expect(screen.getByRole('status')).toHaveTextContent(`Heard: “${HEARD}”`);

    act(() => session?.onend?.());
    expect(screen.getByRole('button', { name: 'Ask by voice' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('explains a blocked microphone in plain words', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('webkitSpeechRecognition', FakeRecognition);
    render(<VoiceQuestionButton language="en" onText={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Ask by voice' }));

    act(() => FakeRecognition.last?.onerror?.(errorEvent('not-allowed')));

    expect(screen.getByRole('status')).toHaveTextContent('Microphone access is blocked');
  });

  it('stops on a second press and aborts a running session on unmount', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('SpeechRecognition', FakeRecognition);
    const { unmount } = render(<VoiceQuestionButton language="en" onText={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Ask by voice' }));
    await user.click(screen.getByRole('button', { name: 'Stop listening' }));
    expect(FakeRecognition.last?.stop).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Ask by voice' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Ask by voice' }));
    const running = FakeRecognition.last;
    unmount();

    expect(running?.abort).toHaveBeenCalled();
  });
});
