/**
 * Runtime configuration — the only module that reads `process.env`.
 *
 * Responsibility: turn environment variables into one typed, frozen config object
 * with safe defaults. Boundary: everything else receives config as a parameter,
 * which keeps the server testable without touching the real environment.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

/** Cloud Run injects PORT; 8080 is its documented default. */
const DEFAULT_PORT = 8080;

/**
 * 45 s per model attempt: a 20-page analysis on a lite model takes 5–15 s, and the Cloud Run
 * request timeout (120 s in cloudbuild.yaml) still leaves room for one failover attempt.
 */
const DEFAULT_GEMINI_TIMEOUT_MS = 45_000;

/** Upper bound for the per-attempt timeout so a typo cannot hold connections for hours. */
const MAX_GEMINI_TIMEOUT_MS = 110_000;

/** Fastest structured-output models first; the failover walks this list in order. */
const DEFAULT_GEMINI_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3.5-flash'];

/**
 * Text-to-speech models, newest first; both were verified live on Vertex AI express mode and
 * the older preview is the fallback when the newer one is unavailable.
 */
const DEFAULT_GEMINI_TTS_MODELS = ['gemini-3.1-flash-tts-preview', 'gemini-2.5-flash-preview-tts'];

/** Highest valid TCP port. */
const MAX_PORT = 65_535;

/**
 * The web build sits next to this package in the monorepo and in the container
 * (`apps/server/dist` → `apps/web/dist`), so it is resolved from this file, not the cwd.
 */
const DEFAULT_WEB_DIST_DIR = fileURLToPath(new URL('../../web/dist', import.meta.url));

/** Typed, immutable server configuration. */
export interface ServerConfig {
  readonly port: number;
  /** Absent means the server runs in offline (rules-only) mode. */
  readonly geminiApiKey: string | undefined;
  readonly geminiModels: readonly string[];
  /** Failover order for read-aloud (Gemini text-to-speech). */
  readonly geminiTtsModels: readonly string[];
  readonly geminiTimeoutMs: number;
  readonly webDistDir: string;
  readonly nodeEnv: 'production' | 'development' | 'test';
  readonly appVersion: string;
}

const packageJsonSchema = z.object({ version: z.string().min(1) });

const envSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(MAX_PORT).default(DEFAULT_PORT),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODELS: z.string().optional(),
  GEMINI_TTS_MODELS: z.string().optional(),
  GEMINI_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_GEMINI_TIMEOUT_MS)
    .default(DEFAULT_GEMINI_TIMEOUT_MS),
  WEB_DIST_DIR: z.string().trim().min(1).optional(),
  NODE_ENV: z.enum(['production', 'development', 'test']).default('development'),
});

/** Environment shape accepted by {@link loadConfig}; matches `process.env`. */
export type EnvSource = Readonly<Record<string, string | undefined>>;

/** Reads the version from this package's package.json (same relative path from src/ and dist/). */
function readAppVersion(): string {
  const raw: unknown = JSON.parse(
    readFileSync(fileURLToPath(new URL('../package.json', import.meta.url)), 'utf8'),
  );
  const parsed = packageJsonSchema.safeParse(raw);
  return parsed.success ? parsed.data.version : '0.0.0';
}

/** Splits a comma list, trimming blanks; falls back to the defaults when nothing usable is left. */
function parseModels(value: string | undefined, defaults: readonly string[]): readonly string[] {
  const models = (value ?? '')
    .split(',')
    .map((model) => model.trim())
    .filter((model) => model.length > 0);
  return Object.freeze(models.length > 0 ? models : [...defaults]);
}

/**
 * Parses the environment into a frozen {@link ServerConfig}. Invalid numeric values
 * throw at startup on purpose: a misconfigured service should fail its deploy, not serve.
 * @example
 * loadConfig({ PORT: '3000' }).port; // 3000
 */
export function loadConfig(env: EnvSource = process.env): ServerConfig {
  const parsed = envSchema.parse(env);
  const key = parsed.GEMINI_API_KEY?.trim();
  return Object.freeze({
    port: parsed.PORT,
    geminiApiKey: key !== undefined && key.length > 0 ? key : undefined,
    geminiModels: parseModels(parsed.GEMINI_MODELS, DEFAULT_GEMINI_MODELS),
    geminiTtsModels: parseModels(parsed.GEMINI_TTS_MODELS, DEFAULT_GEMINI_TTS_MODELS),
    geminiTimeoutMs: parsed.GEMINI_TIMEOUT_MS,
    webDistDir: parsed.WEB_DIST_DIR ?? DEFAULT_WEB_DIST_DIR,
    nodeEnv: parsed.NODE_ENV,
    appVersion: readAppVersion(),
  });
}
