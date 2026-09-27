/**
 * Process entry point — wires real dependencies and starts listening.
 *
 * Responsibility: load config, choose the Gemini or offline client, write logs to
 * stdout (Cloud Logging ingests JSON lines), and shut down gracefully on SIGTERM,
 * which Cloud Run sends before stopping an instance. Boundary: no application logic.
 */
import { loadConfig } from './config.js';
import { createJsonLogger } from './logger.js';
import { buildApp } from './server.js';
import { createGeminiCaller, createGeminiSpeechCaller } from './services/gemini-sdk.js';
import { createGenAiClient, createOfflineGenAiClient } from './services/genai-client.js';
import { createOfflineSpeechClient, createSpeechClient } from './services/speech-client.js';

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

const speech =
  config.geminiApiKey === undefined
    ? createOfflineSpeechClient()
    : createSpeechClient({
        caller: createGeminiSpeechCaller(config.geminiApiKey),
        models: config.geminiTtsModels,
        timeoutMs: config.geminiTimeoutMs,
        now: Date.now,
      });

const app = buildApp(config, { genai, speech, now: Date.now, logger });
const server = app.listen(config.port, () => {
  logger.log('INFO', 'server listening', {
    port: config.port,
    version: config.appVersion,
    aiConfigured: genai.configured,
    speechConfigured: speech.configured,
  });
});

process.on('SIGTERM', () => {
  logger.log('INFO', 'SIGTERM received, closing server');
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), SHUTDOWN_GRACE_MS).unref();
});
