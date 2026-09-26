import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createGeminiCaller, minimalThinking } from '../services/gemini-sdk.js';

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
