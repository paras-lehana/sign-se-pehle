/**
 * Process entry point — wires real dependencies and starts listening.
 *
 * Responsibility: load config, choose the Gemini or offline client, assemble the read-aloud
 * voices (Google's free voice always, Sarvam when a key is set, Gemini), write logs to
 * stdout (Cloud Logging ingests JSON lines), and shut down gracefully on SIGTERM,
 * which Cloud Run sends before stopping an instance. Boundary: no application logic.
 */
import { loadConfig } from './config.js';
import { createJsonLogger } from './logger.js';
import { buildApp } from './server.js';
import { createGeminiCaller, createGeminiSpeechCaller } from './services/gemini-sdk.js';
import { createGenAiClient, createOfflineGenAiClient } from './services/genai-client.js';
import { createGoogleFreeClient } from './services/google-free-client.js';
import { createSarvamClient } from './services/sarvam-client.js';
import { createOfflineSpeechClient, createSpeechClient, geminiVoice } from './services/speech-client.js';
import { createSpeechService } from './services/speech-service.js';
import { unconfiguredTranslator, unconfiguredVoice } from './services/voice-engine.js';

/** Cloud Run allows 10 s between SIGTERM and SIGKILL; exit a little before that. */
const SHUTDOWN_GRACE_MS = 8_000;

const config = loadConfig();
const logger = createJsonLogger((line) => process.stdout.write(`${line}\n`));
const genai =
  config.geminiApiKey === undefined
    ? createOfflineGenAiClient()
    : createGenAiClient({
        caller: createGeminiCaller(config.geminiApiKey),
        models: config.geminiModels,
        timeoutMs: config.geminiTimeoutMs,
        now: Date.now,
      });

const geminiSpeech =
  config.geminiApiKey === undefined
    ? createOfflineSpeechClient()
    : createSpeechClient({
        caller: createGeminiSpeechCaller(config.geminiApiKey),
        models: config.geminiTtsModels,
        timeoutMs: config.geminiTimeoutMs,
        now: Date.now,
      });

const google = createGoogleFreeClient({ fetch, timeoutMs: config.speechTimeoutMs });
const sarvam =
  config.sarvamApiKey === undefined
    ? undefined
    : createSarvamClient({
        apiKey: config.sarvamApiKey,
        ttsModel: config.sarvamTtsModel,
        speaker: config.sarvamSpeaker,
        translateModel: config.sarvamTranslateModel,
        timeoutMs: config.speechTimeoutMs,
        fetch,
      });

const speech = createSpeechService({
  voices: {
    google: google.voice,
    sarvam: sarvam?.voice ?? unconfiguredVoice('sarvam speech'),
    gemini: geminiVoice(geminiSpeech),
  },
  translators: {
    google: google.translator,
    sarvam: sarvam?.translator ?? unconfiguredTranslator('sarvam translate'),
  },
  logger,
});

const app = buildApp(config, { genai, speech, now: Date.now, logger });
const server = app.listen(config.port, () => {
  logger.log('INFO', 'server listening', {
    port: config.port,
    version: config.appVersion,
    aiConfigured: genai.configured,
    speechVoices: speech.voices.join(','),
  });
});

process.on('SIGTERM', () => {
  logger.log('INFO', 'SIGTERM received, closing server');
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), SHUTDOWN_GRACE_MS).unref();
});
