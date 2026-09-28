/**
 * playAudioBlob: normal playback, a play() rejection, and the case a locked-down or
 * automated browser context never settles play() at all.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { playAudioBlob } from '../../lib/speech';
import { FakeAudio, installAudioFakes } from './speech-fakes';

const BLOB = new Blob(['fake wav bytes']);

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('playAudioBlob', () => {
  it('resolves to a stop function once play() resolves', async () => {
    const { revokeObjectURL } = installAudioFakes();
    const onEnd = vi.fn();
    const stop = await playAudioBlob(BLOB, onEnd);

    expect(stop).not.toBeNull();
    expect(FakeAudio.instances[0]?.play).toHaveBeenCalled();

    stop?.();
    expect(FakeAudio.instances[0]?.pause).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalled();
    expect(onEnd).not.toHaveBeenCalled();
  });

  it('resolves to null when play() rejects (autoplay refused)', async () => {
    installAudioFakes();
    class RefusingAudio extends FakeAudio {
      override play = vi.fn(() => Promise.reject(new DOMException('blocked', 'NotAllowedError')));
    }
    vi.stubGlobal('Audio', RefusingAudio);

    const stop = await playAudioBlob(BLOB, vi.fn());

    expect(stop).toBeNull();
  });

  it('resolves to null and cleans up when play() never settles', async () => {
    const { revokeObjectURL } = installAudioFakes();
    class HangingAudio extends FakeAudio {
      override play = vi.fn(() => new Promise<void>(() => undefined));
    }
    vi.stubGlobal('Audio', HangingAudio);

    const pending = playAudioBlob(BLOB, vi.fn());
    await vi.advanceTimersByTimeAsync(4_000);
    const stop = await pending;

    expect(stop).toBeNull();
    expect(FakeAudio.instances[0]?.pause).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalled();
  });

  it('does not fire an unhandled rejection once a normal play() has already resolved', async () => {
    installAudioFakes();
    const unhandled = vi.fn();
    process.on('unhandledRejection', unhandled);

    const stop = await playAudioBlob(BLOB, vi.fn());
    stop?.();
    await vi.advanceTimersByTimeAsync(5_000);

    expect(unhandled).not.toHaveBeenCalled();
    process.off('unhandledRejection', unhandled);
  });
});
