import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createGeminiCaller, createGeminiSpeechCaller, minimalThinking } from '../services/gemini-sdk.js';

// vi.mock is hoisted above imports, so the shared fakes must be hoisted with it.
const { generateContent, constructorArgs } = vi.hoisted(() => {
  const args: unknown[] = [];
  return { generateContent: vi.fn(), constructorArgs: args };
});

vi.mock('@google/genai', () => ({
  ThinkingLevel: { MINIMAL: 'MINIMAL' },
  GoogleGenAI: class {
    readonly models = { generateContent };
    constructor(options: unknown) {
      constructorArgs.push(options);
    }
  },
}));

describe('gemini sdk adapter', () => {
  beforeEach(() => {
    generateContent.mockReset();
    generateContent.mockResolvedValue({ text: '{"ok":true}' });
  });

  it('sends structured-output config with files before the prompt', async () => {
    const signal = new AbortController().signal;
    const caller = createGeminiCaller('key-123');
    const text = await caller({
      model: 'gemini-test',
      system: 'sys',
      prompt: 'explain',
      files: [{ mimeType: 'image/png', dataBase64: 'AAAA' }],
      jsonSchema: { type: 'object' },
      maxOutputTokens: 100,
      signal,
    });

    expect(text).toBe('{"ok":true}');
    expect(constructorArgs.at(-1)).toEqual({ apiKey: 'key-123' });
    expect(generateContent).toHaveBeenCalledWith({
      model: 'gemini-test',
      contents: [{ role: 'user', parts: [{ inlineData: { mimeType: 'image/png', data: 'AAAA' } }, { text: 'explain' }] }],
      config: expect.objectContaining({
        systemInstruction: 'sys',
        responseMimeType: 'application/json',
        responseJsonSchema: { type: 'object' },
        maxOutputTokens: 100,
        abortSignal: signal,
      }),
    });
  });

  it('uses thinkingLevel for Gemini 3 and a zero budget for older models', () => {
    expect(minimalThinking('gemini-3.5-flash-lite')).toEqual({ thinkingLevel: 'MINIMAL' });
    expect(minimalThinking('gemini-2.5-flash')).toEqual({ thinkingBudget: 0 });
  });

  it('asks for plain text when no schema is given', async () => {
    const caller = createGeminiCaller('key');
    await caller({ model: 'm', system: 's', prompt: 'p', files: [], jsonSchema: undefined, maxOutputTokens: 1, signal: new AbortController().signal });
    const config: unknown = generateContent.mock.calls[0]?.[0];
    expect(config).not.toHaveProperty('config.responseMimeType');
  });
});

describe('gemini speech adapter', () => {
  const audioPart = { inlineData: { data: 'AAAA', mimeType: 'audio/L16;codec=pcm;rate=24000' } };

  beforeEach(() => {
    generateContent.mockReset();
  });

  it('sends only audio settings and returns the inline audio', async () => {
    generateContent.mockResolvedValue({ candidates: [{ content: { parts: [audioPart] } }] });
    const signal = new AbortController().signal;
    const audio = await createGeminiSpeechCaller('key-tts')({ model: 'tts-model', text: 'Read this', signal });

    expect(audio).toEqual({ dataBase64: 'AAAA', mimeType: 'audio/L16;codec=pcm;rate=24000' });
    expect(constructorArgs.at(-1)).toEqual({ apiKey: 'key-tts' });
    expect(generateContent).toHaveBeenCalledWith({
      model: 'tts-model',
      contents: [{ role: 'user', parts: [{ text: 'Read this' }] }],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
        abortSignal: signal,
      },
    });
  });

  it('finds audio after a text part and defaults a missing MIME type to empty', async () => {
    generateContent.mockResolvedValue({ candidates: [{ content: { parts: [{ text: 'note' }, { inlineData: { data: 'BBBB' } }] } }] });
    const audio = await createGeminiSpeechCaller('key')({ model: 'm', text: 't', signal: new AbortController().signal });
    expect(audio).toEqual({ dataBase64: 'BBBB', mimeType: '' });
  });

  it('returns undefined when the response has no audio', async () => {
    generateContent.mockResolvedValue({ candidates: [] });
    const audio = await createGeminiSpeechCaller('key')({ model: 'm', text: 't', signal: new AbortController().signal });
    expect(audio).toBeUndefined();
  });
});
