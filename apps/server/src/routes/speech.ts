/**
 * POST /api/speech — reads a short text aloud, in the reader's chosen language and voice.
 *
 * Responsibility: validate the request, let the speech service translate and synthesise,
 * and label the audio with the voice that actually spoke. Boundary: the text travels only
 * in the JSON body (never a URL, never a log line); the response is audio and is never
 * cached. When every voice fails it answers 502, and the web falls back to the device's
 * own speech synthesis.
 */
import { SPEECH_TRANSLATED_HEADER, SPEECH_VOICE_HEADER, speechRequestSchema } from '@sign-se-pehle/core';
import type { Router } from 'express';
import { sendError } from '../http/respond.js';
import { validate } from '../middleware/validate.js';
import type { RouteContext } from './context.js';

/** Registers the speech route. */
export function registerSpeech(router: Router, ctx: RouteContext): void {
  router.post(
    '/speech',
    ctx.aiLimiter,
    ctx.smallJson,
    validate(speechRequestSchema, async (body, _req, res) => {
      const result = await ctx.gate.run(() => ctx.speech.speak(body));
      if (!result.ok) {
        sendError(res, result.error);
        return;
      }
      const { bytes, mimeType, voice, translated } = result.value;
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader(SPEECH_VOICE_HEADER, voice);
      res.setHeader(SPEECH_TRANSLATED_HEADER, translated ? '1' : '0');
      res.type(mimeType).send(Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength));
    }),
  );
}
