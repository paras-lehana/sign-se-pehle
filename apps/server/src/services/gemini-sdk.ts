/**
 * Gemini SDK adapter — the only file that imports `@google/genai`.
 *
 * Responsibility: translate one {@link ModelCall} into `models.generateContent`
 * with structured output and minimal thinking, and one {@link SpeechCall} into a
 * text-to-speech request. Boundary: no retries, timeouts or parsing here —
 * genai-client.ts and speech-client.ts own those so they are testable without the SDK.
 */
import { GoogleGenAI, type Part, type ThinkingConfig, ThinkingLevel } from '@google/genai';
import type { ModelCaller } from './genai-client.js';
import type { SpeechCall, SpeechCaller } from './speech-client.js';

/**
 * Low temperature: explanations should be faithful to the document, not creative.
 * 0.2 keeps wording natural while making facts and categories stable across runs.
 */
const TEMPERATURE = 0.2;

/**
 * Minimal thinking: the lite models return excellent structured output without it,
 * while thinking multiplies latency for no visible gain on extraction tasks.
 * Gemini 3 models reject `thinkingBudget: 0` with HTTP 400 (verified live) and take
 * `thinkingLevel` instead; older families still take a zero budget.
 */
const THINKING_BUDGET_DISABLED = 0;
const THINKING_LEVEL_MODEL_PREFIX = 'gemini-3';

/** Lowest thinking setting the given model family accepts. */
export function minimalThinking(model: string): ThinkingConfig {
  return model.startsWith(THINKING_LEVEL_MODEL_PREFIX)
    ? { thinkingLevel: ThinkingLevel.MINIMAL }
    : { thinkingBudget: THINKING_BUDGET_DISABLED };
}

/**
 * Creates a {@link ModelCaller} backed by the Gemini API.
 * @example
 * const caller = createGeminiCaller(config.geminiApiKey);
 */
export function createGeminiCaller(apiKey: string): ModelCaller {
  const ai = new GoogleGenAI({ apiKey });
  return async (call) => {
    // Files go before the instruction text, as recommended for single-document prompts.
    const parts: Part[] = [
      ...call.files.map((file) => ({ inlineData: { mimeType: file.mimeType, data: file.dataBase64 } })),
      { text: call.prompt },
    ];
    const structured =
      call.jsonSchema === undefined
        ? {}
        : { responseMimeType: 'application/json', responseJsonSchema: call.jsonSchema };
    const response = await ai.models.generateContent({
      model: call.model,
      contents: [{ role: 'user', parts }],
      config: {
        systemInstruction: call.system,
        temperature: TEMPERATURE,
        maxOutputTokens: call.maxOutputTokens,
        abortSignal: call.signal,
        thinkingConfig: minimalThinking(call.model),
        ...structured,
      },
    });
    return response.text;
  };
}

/** "Kore", one of Gemini's prebuilt voices: firm and clear, which suits reading explanations. */
const SPEECH_VOICE = 'Kore';

/**
 * Creates a {@link SpeechCaller} backed by Gemini text-to-speech. Uses the same key as the
 * text client; the SDK picks Vertex AI when GOOGLE_GENAI_USE_VERTEXAI is set.
 * @example
 * const speak = createGeminiSpeechCaller(config.geminiApiKey);
 */
export function createGeminiSpeechCaller(apiKey: string): SpeechCaller {
  const ai = new GoogleGenAI({ apiKey });
  return async (call: SpeechCall) => {
    const response = await ai.models.generateContent({
      model: call.model,
      contents: [{ role: 'user', parts: [{ text: call.text }] }],
      // TTS models reject system instructions, thinking and JSON options, so only audio settings
      // are sent; abortSignal is a client-side option and never leaves the process.
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: SPEECH_VOICE } } },
        abortSignal: call.signal,
      },
    });
    const parts = response.candidates?.[0]?.content?.parts ?? [];
    const inline = parts.find((part) => part.inlineData?.data !== undefined)?.inlineData;
    return inline?.data === undefined ? undefined : { dataBase64: inline.data, mimeType: inline.mimeType ?? '' };
  };
}
