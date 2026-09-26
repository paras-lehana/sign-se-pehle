/**
 * Catalog of the Google services Sign Se Pehle uses.
 *
 * Responsibility: one typed, honest list of each Google service, its status and where
 * it lives in the code, served by GET /api/google-services and shown on the About page.
 * Boundary: env var NAMES only — never values or secrets.
 */
import { z } from 'zod';

export const SERVICE_STATUSES = ['live', 'ready', 'planned'] as const;

export const serviceCatalogEntrySchema = z.strictObject({
  id: z.string().min(1).max(64),
  name: z.string().min(1).max(80),
  status: z.enum(SERVICE_STATUSES),
  purpose: z.string().min(1).max(300),
  codePaths: z.array(z.string().min(1).max(160)).max(8),
  envVars: z.array(z.string().regex(/^[A-Z][A-Z0-9_]*$/)).max(8),
});

export type ServiceCatalogEntry = z.infer<typeof serviceCatalogEntrySchema>;

export const googleServicesResponseSchema = z.strictObject({
  services: z.array(serviceCatalogEntrySchema).max(20),
});

export type GoogleServicesResponse = z.infer<typeof googleServicesResponseSchema>;

export const GOOGLE_SERVICES: readonly ServiceCatalogEntry[] = [
  {
    id: 'gemini-api',
    name: 'Gemini API',
    status: 'live',
    purpose: 'Explains every clause in plain language in 11 languages, answers questions, compares drafts and reads PDFs and phone photos.',
    codePaths: ['apps/server/src/services/genai-client.ts', 'apps/server/src/services/analysis-service.ts', 'packages/core/src/genai/prompts.ts'],
    envVars: ['GEMINI_API_KEY', 'GEMINI_MODELS', 'GEMINI_TIMEOUT_MS'],
  },
  {
    id: 'gemini-structured-output',
    name: 'Gemini structured output',
    status: 'live',
    purpose: 'Forces responses into a JSON schema generated from the same zod contracts the app validates against, so every answer is machine-checked.',
    codePaths: ['packages/core/src/genai/model-output.ts'],
    envVars: [],
  },
  {
    id: 'cloud-run',
    name: 'Cloud Run',
    status: 'ready',
    purpose: 'Hosts the single container that serves the API and the web app, scaling with demand in asia-south1 (Mumbai).',
    codePaths: ['Dockerfile', 'cloudbuild.yaml', 'apps/server/src/index.ts'],
    envVars: ['PORT'],
  },
  {
    id: 'cloud-build',
    name: 'Cloud Build',
    status: 'ready',
    purpose: 'Builds, pushes and deploys the container, then smoke-tests the health endpoint.',
    codePaths: ['cloudbuild.yaml'],
    envVars: [],
  },
  {
    id: 'artifact-registry',
    name: 'Artifact Registry',
    status: 'ready',
    purpose: 'Stores the versioned container images Cloud Run deploys.',
    codePaths: ['cloudbuild.yaml'],
    envVars: [],
  },
  {
    id: 'secret-manager',
    name: 'Secret Manager',
    status: 'ready',
    purpose: 'Keeps the Gemini API key out of code and images; Cloud Run injects it at start-up.',
    codePaths: ['cloudbuild.yaml', 'apps/server/src/config.ts'],
    envVars: ['GEMINI_API_KEY'],
  },
  {
    id: 'cloud-logging',
    name: 'Cloud Logging',
    status: 'ready',
    purpose: 'Collects one structured JSON log line per request (never document text) for monitoring latency and errors.',
    codePaths: ['apps/server/src/middleware/request-log.ts'],
    envVars: [],
  },
  {
    id: 'google-calendar-links',
    name: 'Google Calendar links',
    status: 'live',
    purpose: 'Adds a document’s key dates, such as rent due dates or notice deadlines, to Google Calendar in one tap.',
    codePaths: ['packages/core/src/integrations/google-links.ts'],
    envVars: [],
  },
  {
    id: 'google-maps-links',
    name: 'Google Maps links',
    status: 'live',
    purpose: 'Finds the nearest legal services authority or consumer commission in Google Maps.',
    codePaths: ['packages/core/src/integrations/google-links.ts'],
    envVars: [],
  },
];
