/**
 * API client tests for the v0.2 feature calls: negotiate (schema-validated JSON) and
 * synthesizeSpeech (audio blob, content-type checked), with a mocked fetch.
 */
import { describe, expect, it, vi } from 'vitest';
import { negotiate, synthesizeSpeech } from '../../lib/api';
import { jsonResponse, requestBody, stubFetch } from '../helpers';
import { buildNegotiation, buildSampleAnalysis } from './feature-fixtures';

const HTTP_BAD_GATEWAY = 502;
const WAV_BYTES = new Uint8Array([82, 73, 70, 70, 0, 0, 0, 0]);

function audioResponse(
  contentType: string,
  headers: Record<string, string> = {},
): Response {
  return new Response(WAV_BYTES, { status: 200, headers: { 'Content-Type': contentType, ...headers } });
}

describe('negotiate', () => {
  const { request, response } = buildNegotiation(buildSampleAnalysis('rent-leave-licence'), {
    tone: 'polite',
    channel: 'email',
  });

  it('posts the request and returns the schema-validated draft', async () => {
    const fetchMock = stubFetch(jsonResponse(response));
    const result = await negotiate(request);
    expect(result).toEqual({ ok: true, value: response });
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/negotiate');
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe('POST');
    expect(requestBody(fetchMock, 0)).toEqual(request);
  });

  it('rejects a 200 reply that is not a negotiation draft', async () => {
    stubFetch(jsonResponse({ message: 'hello' }));
    const result = await negotiate(request);
    expect(result.ok ? null : result.error.code).toBe('INTERNAL');
  });
});

describe('synthesizeSpeech', () => {
  const payload = { text: 'Your deposit is ten months of rent.', language: 'hi' } as const;

  it('returns the audio blob, the voice that spoke and whether it was translated', async () => {
    const fetchMock = stubFetch(audioResponse('audio/mpeg', { 'X-Speech-Voice': 'sarvam', 'X-Speech-Translated': '1' }));
    const result = await synthesizeSpeech({ ...payload, textLanguage: 'en', voice: 'sarvam' });
    expect(result.ok).toBe(true);
    expect(result.ok ? result.value.blob.type : '').toBe('audio/mpeg');
    expect(result.ok ? result.value.blob.size : 0).toBe(WAV_BYTES.length);
    expect(result.ok ? result.value.voice : '').toBe('sarvam');
    expect(result.ok ? result.value.translated : false).toBe(true);
    expect(requestBody(fetchMock, 0)).toEqual({ ...payload, textLanguage: 'en', voice: 'sarvam' });
    const headers = new Headers(fetchMock.mock.calls[0]?.[1]?.headers);
    expect(headers.get('Accept')).toBe('audio/mpeg, audio/wav');
  });

  it('reports an unknown or missing voice header as undefined, translated as false', async () => {
    stubFetch(audioResponse('audio/mpeg'));
    const result = await synthesizeSpeech(payload);
    expect(result.ok ? result.value.voice : 'x').toBeUndefined();
    expect(result.ok ? result.value.translated : true).toBe(false);
  });

  it('rejects a successful reply that is not audio', async () => {
    stubFetch(new Response('<html>proxy</html>', { headers: { 'Content-Type': 'text/html' } }));
    const result = await synthesizeSpeech(payload);
    expect(result.ok ? null : result.error.code).toBe('INTERNAL');
  });

  it('maps the offline 502 envelope so the caller can fall back', async () => {
    stubFetch(
      jsonResponse(
        { error: { code: 'UPSTREAM_FAILURE', message: 'Speech is not available right now.' } },
        HTTP_BAD_GATEWAY,
      ),
    );
    const result = await synthesizeSpeech(payload);
    expect(result).toEqual({
      ok: false,
      error: {
        code: 'UPSTREAM_FAILURE',
        message: 'Speech is not available right now.',
        status: HTTP_BAD_GATEWAY,
      },
    });
  });

  it('reports a network failure with status 0', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockRejectedValueOnce(new TypeError('offline'));
    vi.stubGlobal('fetch', fetchMock);
    const result = await synthesizeSpeech(payload);
    expect(result.ok ? null : result.error.status).toBe(0);
  });
});
