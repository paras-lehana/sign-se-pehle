/**
 * Narrow declarations for the Web Speech recognition API.
 *
 * Responsibility: type the small part of the browser's speech recogniser that the
 * voice-question button uses. TypeScript's DOM library ships the result and error event
 * types but not the recogniser itself, and Chrome still exposes it with a `webkit` prefix.
 * Boundary: declarations only; feature detection lives in lib/speech.ts.
 */
export {};

declare global {
  /** One recognition session: configure, start, then read `result` events. */
  interface BrowserSpeechRecognition extends EventTarget {
    lang: string;
    interimResults: boolean;
    continuous: boolean;
    maxAlternatives: number;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
    onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
    onend: (() => void) | null;
    start(): void;
    stop(): void;
    abort(): void;
  }

  interface BrowserSpeechRecognitionConstructor {
    new (): BrowserSpeechRecognition;
  }

  interface Window {
    readonly SpeechRecognition?: BrowserSpeechRecognitionConstructor;
    readonly webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
  }
}
