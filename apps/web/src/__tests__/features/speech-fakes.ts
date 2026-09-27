/**
 * Minimal browser speech and audio fakes for Listen and voice-question tests.
 *
 * Responsibility: stand in for HTMLAudioElement, speechSynthesis and the speech
 * recogniser, recording what the components asked for. Boundary: test-only; each fake
 * implements just the members the components use.
 */
import { vi } from 'vitest';

/** Records every Audio created so a test can finish or inspect playback. */
export class FakeAudio {
  static readonly instances: FakeAudio[] = [];
  readonly src: string;
  readonly play = vi.fn(() => Promise.resolve());
  readonly pause = vi.fn();
  private readonly endedListeners: (() => void)[] = [];

  constructor(src: string) {
    this.src = src;
    FakeAudio.instances.push(this);
  }

  addEventListener(type: string, listener: () => void): void {
    if (type === 'ended') this.endedListeners.push(listener);
  }

  finish(): void {
    for (const listener of this.endedListeners.splice(0)) listener();
  }
}

export class FakeUtterance {
  readonly text: string;
  lang = '';
  voice: SpeechSynthesisVoice | null = null;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(text: string) {
    this.text = text;
  }
}

/** The object URL the fake createObjectURL hands out. */
export const FAKE_BLOB_URL = 'blob:gemini-voice';

/** Installs FakeAudio plus spied object-URL functions (restored by the shared test setup). */
export function installAudioFakes() {
  FakeAudio.instances.length = 0;
  vi.stubGlobal('Audio', FakeAudio);
  return {
    createObjectURL: vi.spyOn(URL, 'createObjectURL').mockReturnValue(FAKE_BLOB_URL),
    revokeObjectURL: vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined),
  };
}

/** Installs a speechSynthesis fake; returns it so tests can read spoken utterances. */
export function installSynthesisFake() {
  const synthesis = {
    speak: vi.fn<(utterance: FakeUtterance) => void>(),
    cancel: vi.fn<() => void>(),
    getVoices: (): SpeechSynthesisVoice[] => [],
  };
  vi.stubGlobal('speechSynthesis', synthesis);
  vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance);
  return synthesis;
}

/** A recogniser fake; the last instance is exposed so tests can emit results. */
export class FakeRecognition {
  static last: FakeRecognition | null = null;
  lang = '';
  interimResults = false;
  continuous = true;
  maxAlternatives = 0;
  onresult: ((event: SpeechRecognitionEvent) => void) | null = null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null = null;
  onend: (() => void) | null = null;
  readonly start = vi.fn();
  readonly stop = vi.fn(() => this.onend?.());
  readonly abort = vi.fn();

  constructor() {
    FakeRecognition.last = this;
  }
}

/** A result event carrying one transcript, interim or final. */
export function resultEvent(transcript: string, isFinal: boolean): SpeechRecognitionEvent {
  const alternative = { transcript, confidence: 0.9 };
  const result = {
    0: alternative,
    length: 1,
    isFinal,
    item: () => alternative,
    [Symbol.iterator]: () => [alternative][Symbol.iterator](),
  };
  const results = {
    0: result,
    length: 1,
    item: () => result,
    [Symbol.iterator]: () => [result][Symbol.iterator](),
  };
  return Object.assign(new Event('result'), { resultIndex: 0, results });
}

/** An error event with the given recogniser error code. */
export function errorEvent(error: SpeechRecognitionErrorCode): SpeechRecognitionErrorEvent {
  return Object.assign(new Event('error'), { error, message: '' });
}
