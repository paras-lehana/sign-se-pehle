/**
 * POST /api/speech — reads a short text aloud and returns it as a WAV file.
 *
 * Responsibility: validate the text, synthesise it and wrap the PCM in a WAV header.
 * Boundary: the text travels only in the JSON body (never a URL, never a log line); the
 * response is audio/wav and is never cached. Offline, it answers 502 so the web falls back
 * to the browser's own speech synthesis.
 */
import { pcmToWav, speechRequestSchema } from '@sign-se-pehle/core';
import type { Router } from 'express';
import { sendError } from '../http/respond.js';
import { validate } from '../middleware/validate.js';
import type { RouteContext } from './context.js';

const WAV_CONTENT_TYPE = 'audio/wav';

/** Registers the speech route. */
export function registerSpeech(router: Router, ctx: RouteContext): void {
  router.post(
    '/speech',
    ctx.aiLimiter,
    ctx.smallJson,
    validate(speechRequestSchema, async (body, _req, res) => {
      const result = await ctx.gate.run(() => ctx.speech.synthesize({ text: body.text }));
      if (!result.ok) {
        sendError(res, result.error);
        return;
      }
      const wav = pcmToWav(result.value.pcm, result.value.sampleRate);
      res.setHeader('Cache-Control', 'no-store');
      res.type(WAV_CONTENT_TYPE).send(Buffer.from(wav.buffer, wav.byteOffset, wav.byteLength));
    }),
  );
}
