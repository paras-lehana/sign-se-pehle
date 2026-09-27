import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadConfig } from '../config.js';

const packageVersion: unknown = JSON.parse(
  readFileSync(fileURLToPath(new URL('../../package.json', import.meta.url)), 'utf8'),
);

describe('loadConfig', () => {
  it('applies defaults when the environment is empty', () => {
    const config = loadConfig({});
    expect(config.port).toBe(8080);
    expect(config.geminiApiKey).toBeUndefined();
    expect(config.geminiModels[0]).toBe('gemini-3.5-flash-lite');
    expect(config.geminiTtsModels).toEqual(['gemini-3.1-flash-tts-preview', 'gemini-2.5-flash-preview-tts']);
    expect(config.geminiTimeoutMs).toBe(45_000);
    expect(config.nodeEnv).toBe('development');
    expect(config.webDistDir.replaceAll('\\', '/')).toMatch(/apps\/web\/dist$/);
    expect(Object.isFrozen(config)).toBe(true);
  });

  it('reads the version from package.json', () => {
    expect(packageVersion).toMatchObject({ version: loadConfig({}).appVersion });
  });

  it('parses and trims every variable', () => {
    const config = loadConfig({
      PORT: '3000',
      GEMINI_API_KEY: '  secret  ',
      GEMINI_MODELS: ' first , ,second ',
      GEMINI_TTS_MODELS: ' voice-1 ,, voice-2 ',
      GEMINI_TIMEOUT_MS: '5000',
      WEB_DIST_DIR: '/srv/web',
      NODE_ENV: 'production',
    });
    expect(config).toMatchObject({
      port: 3000,
      geminiApiKey: 'secret',
      geminiModels: ['first', 'second'],
      geminiTtsModels: ['voice-1', 'voice-2'],
      geminiTimeoutMs: 5000,
      webDistDir: '/srv/web',
      nodeEnv: 'production',
    });
  });

  it('treats a blank key as offline mode and a blank model list as the defaults', () => {
    const config = loadConfig({ GEMINI_API_KEY: '   ', GEMINI_MODELS: ' , ', GEMINI_TTS_MODELS: ' ' });
    expect(config.geminiApiKey).toBeUndefined();
    expect(config.geminiModels.length).toBeGreaterThan(0);
    expect(config.geminiTtsModels).toEqual(loadConfig({}).geminiTtsModels);
  });

  it('fails fast on an invalid port', () => {
    expect(() => loadConfig({ PORT: 'eighty' })).toThrow();
    expect(() => loadConfig({ PORT: '70000' })).toThrow();
  });
});
