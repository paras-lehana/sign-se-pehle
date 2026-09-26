import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { createGenAiClient, createOfflineGenAiClient, parseModelJson } from '../services/genai-client.js';
import { TEST_MODELS, createFakeClock, makeClient, scriptedCaller, statusError } from './helpers.js';

const answerSchema = z.object({ answer: z.string() });
const request = {
  system: 'system',
  prompt: 'prompt',
  schema: answerSchema,
  jsonSchema: { type: 'object' },
};

describe('genai client failover', () => {
  it('returns the first model result and its timing', async () => {
    const clock = createFakeClock();
    const scripted = scriptedCaller(() => {
      clock.advance(250);
      return Promise.resolve('{"answer":"yes"}');
    });
    const result = await makeClient(scripted.caller, clock.now).generateJson(request);
    expect(result).toEqual({ ok: true, value: { value: { answer: 'yes' }, model: 'model-a', ms: 250 } });
    expect(scripted.calls[0]).toMatchObject({ model: 'model-a', system: 'system', jsonSchema: { type: 'object' } });
  });

  it('fails over on 503/429 in order and remembers the last good model', async () => {
    const scripted = scriptedCaller((call) =>
      call.model === 'model-c' ? Promise.resolve('{"answer":"ok"}') : Promise.reject(statusError(call.model === 'model-a' ? 503 : 429)),
    );
    const client = makeClient(scripted.caller);
    const first = await client.generateJson(request);
    expect(first.ok && first.value.model).toBe('model-c');
    expect(scripted.calls.map((call) => call.model)).toEqual([...TEST_MODELS]);

    await client.generateJson(request);
    expect(scripted.calls.map((call) => call.model).slice(TEST_MODELS.length)).toEqual(['model-c']);
  });

  it('stops on a key error and never leaks the upstream message', async () => {
    const scripted = scriptedCaller(() => Promise.reject(statusError(403)));
    const result = await makeClient(scripted.caller).generateJson(request);
    expect(scripted.calls).toHaveLength(1);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('UPSTREAM_FAILURE');
      expect(result.error.message).not.toContain('secret');
    }
  });

  it('tries the next model when output is not valid for the schema', async () => {
    const scripted = scriptedCaller((call) =>
      Promise.resolve(call.model === 'model-a' ? '{"wrong":1}' : '```json\n{"answer":"fenced"}\n```'),
    );
    const result = await makeClient(scripted.caller).generateJson(request);
    expect(result.ok && result.value.value).toEqual({ answer: 'fenced' });
  });

  it('treats empty responses and unknown errors as transient', async () => {
    const scripted = scriptedCaller((call) =>
      call.model === 'model-a' ? Promise.resolve('  ') : Promise.reject(new Error('socket hang up')),
    );
    const result = await makeClient(scripted.caller).generateText(request);
    expect(scripted.calls).toHaveLength(TEST_MODELS.length);
    expect(result.ok).toBe(false);
  });

  it('reports a timeout when a model never answers', async () => {
    const scripted = scriptedCaller(() => new Promise<string>(() => undefined));
    const client = createGenAiClient({ caller: scripted.caller, models: ['slow'], timeoutMs: 20, now: Date.now });
    const result = await client.generateText(request);
    expect(result.ok ? 'ok' : result.error.code).toBe('UPSTREAM_TIMEOUT');
  });

  it('stops failing over once the caller aborts', async () => {
    const controller = new AbortController();
    controller.abort();
    const scripted = scriptedCaller(() => Promise.reject(statusError(503)));
    const result = await makeClient(scripted.caller).generateText({ ...request, signal: controller.signal });
    expect(result.ok).toBe(false);
    expect(scripted.calls.length).toBeLessThanOrEqual(1);
  });

  it('returns trimmed plain text for generateText', async () => {
    const scripted = scriptedCaller(() => Promise.resolve('  transcribed text  '));
    const result = await makeClient(scripted.caller).generateText({ ...request, files: [{ mimeType: 'application/pdf', dataBase64: 'AAAA' }] });
    expect(result.ok && result.value.value).toBe('transcribed text');
    expect(scripted.calls[0]?.jsonSchema).toBeUndefined();
    expect(scripted.calls[0]?.files).toHaveLength(1);
  });
});

describe('parseModelJson', () => {
  it('rejects non-JSON output', () => {
    const result = parseModelJson('not json', answerSchema);
    expect(result.ok).toBe(false);
  });
});

describe('offline client', () => {
  it('is unconfigured and fails every call', async () => {
    const client = createOfflineGenAiClient();
    expect(client.configured).toBe(false);
    expect(client.models).toEqual([]);
    expect((await client.generateJson(request)).ok).toBe(false);
    expect((await client.generateText(request)).ok).toBe(false);
  });
});
