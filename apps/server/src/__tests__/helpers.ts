/**
 * Test helpers — fake clock, scripted model caller, config and app builders.
 *
 * Boundary: fixtures pin only inputs (document text, config); expected outputs are
 * derived from core at test time so tests never hardcode engine results.
 */
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Express } from 'express';
import type { ServerConfig } from '../config.js';
import { type Logger, createJsonLogger } from '../logger.js';
import { buildApp } from '../server.js';
import {
  type GenAiClient,
  type ModelCall,
  type ModelCaller,
  createGenAiClient,
  createOfflineGenAiClient,
} from '../services/genai-client.js';
import { type SpeechClient, createOfflineSpeechClient } from '../services/speech-client.js';

/** A realistic (fictional) Indian rent agreement: deposit is 5x rent, so rules must fire. */
export const RENTAL_TEXT = [
  'RENT AGREEMENT',
  'This Rent Agreement is made at Pune between Mr. Ramesh Kulkarni (Landlord) and Ms. Priya Sharma (Tenant).',
  '1. Rent: The Tenant shall pay a monthly rent of Rs. 25,000 (Rupees Twenty Five Thousand only) on or before the 5th of every month.',
  '2. Security Deposit: The Tenant shall pay an interest-free security deposit of Rs. 1,25,000 (Rupees One Lakh Twenty Five Thousand only), refundable at the end of the tenancy.',
  '3. Lock-in: There is a lock-in period of 11 months. If the Tenant vacates during the lock-in period, the Tenant shall pay rent for the entire remaining lock-in period.',
  '4. Notice: The Tenant shall give 90 days notice before vacating. The Landlord may terminate with 30 days notice.',
  '5. Entry: The Landlord may enter the premises at any time without prior notice for inspection.',
  '6. Repairs: All repairs, including structural repairs, shall be borne by the Tenant.',
  '7. Term: This agreement is for a period of 11 months from 1 October 2026.',
].join('\n\n');

/** A second draft with a lower deposit, for comparisons. */
export const RENTAL_TEXT_REVISED = RENTAL_TEXT.replace('Rs. 1,25,000 (Rupees One Lakh Twenty Five Thousand only)', 'Rs. 50,000 (Rupees Fifty Thousand only)');

/** Manually advanced clock so rate limits, caches and latencies are deterministic. */
export interface FakeClock {
  readonly now: () => number;
  advance(ms: number): void;
}

/** Arbitrary fixed epoch; only differences between readings matter. */
const CLOCK_START_MS = 1_790_000_000_000;

export function createFakeClock(): FakeClock {
  let current = CLOCK_START_MS;
  return {
    now: () => current,
    advance(ms) {
      current += ms;
    },
  };
}

/** A scripted step: return text, or throw an error with an HTTP status. */
export type Script = (call: ModelCall) => Promise<string | undefined>;

export interface ScriptedCaller {
  readonly caller: ModelCaller;
  readonly calls: ModelCall[];
}

/** Records every call and answers with `script`. */
export function scriptedCaller(script: Script): ScriptedCaller {
  const calls: ModelCall[] = [];
  return {
    calls,
    caller: async (call) => {
      calls.push(call);
      return script(call);
    },
  };
}

/** An error shaped like the SDK's ApiError (carries an HTTP status). */
export function statusError(status: number): Error & { status: number } {
  return Object.assign(new Error(`upstream said ${status} with secret body`), { status });
}

export const TEST_MODELS = ['model-a', 'model-b', 'model-c'] as const;

export const TEST_TTS_MODELS = ['tts-a', 'tts-b'] as const;

export function makeConfig(overrides: Partial<ServerConfig> = {}): ServerConfig {
  return {
    port: 0,
    geminiApiKey: 'test-key',
    geminiModels: TEST_MODELS,
    geminiTtsModels: TEST_TTS_MODELS,
    geminiTimeoutMs: 1_000,
    webDistDir: join(tmpdir(), 'sign-se-pehle-no-web-build'),
    nodeEnv: 'test',
    appVersion: '9.9.9',
    ...overrides,
  };
}

export interface TestApp {
  readonly app: Express;
  readonly clock: FakeClock;
  readonly logs: string[];
  readonly logger: Logger;
}

/** Builds the real app with a fake clock, captured logs and the given clients. */
export function makeApp(
  genai: GenAiClient = createOfflineGenAiClient(),
  overrides: Partial<ServerConfig> = {},
  speech: SpeechClient = createOfflineSpeechClient(),
): TestApp {
  const clock = createFakeClock();
  const logs: string[] = [];
  const logger = createJsonLogger((line) => logs.push(line));
  const app = buildApp(makeConfig(overrides), { genai, speech, now: clock.now, logger });
  return { app, clock, logs, logger };
}

/** A failover client over {@link TEST_MODELS} driven by `caller`. */
export function makeClient(caller: ModelCaller, now: () => number = Date.now): GenAiClient {
  return createGenAiClient({ caller, models: TEST_MODELS, timeoutMs: 1_000, now });
}

/** Creates a temporary web build with an index.html and one hashed asset. */
export function makeWebDist(): string {
  const dir = mkdtempSync(join(tmpdir(), 'sign-se-pehle-web-'));
  mkdirSync(join(dir, 'assets'));
  writeFileSync(join(dir, 'index.html'), '<!doctype html><title>Sign Se Pehle</title><div id="root"></div>');
  writeFileSync(join(dir, 'assets', 'app-abc123.js'), 'export {};');
  return dir;
}
