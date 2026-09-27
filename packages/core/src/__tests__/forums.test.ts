import { describe, expect, it } from 'vitest';
import { DOCUMENT_KINDS } from '../domain/document-kinds.js';
import { routesForKind } from '../knowledge/forums.js';

/** The contract asks for two to four places to go per kind. */
const MIN_ROUTES = 2;
const MAX_ROUTES = 4;

/** Government, regulator or scheme domains the curated forums live on. */
const OFFICIAL_HOST = /(?:\.gov\.in|\.nic\.in|^cms\.rbi\.org\.in|^www\.cioins\.co\.in|^www\.tele-law\.in)$/;

describe('routesForKind', () => {
  it.each(DOCUMENT_KINDS)('lists two to four distinct official forums for %s', (kind) => {
    const routes = routesForKind(kind);
    expect(routes.length).toBeGreaterThanOrEqual(MIN_ROUTES);
    expect(routes.length).toBeLessThanOrEqual(MAX_ROUTES);
    expect(new Set(routes.map((route) => route.id)).size).toBe(routes.length);
    for (const route of routes) {
      const url = new URL(route.url);
      expect(url.protocol).toBe('https:');
      expect(url.hostname).toMatch(OFFICIAL_HOST);
      expect(route.name.length).toBeGreaterThan(0);
      expect(route.when.length).toBeGreaterThan(0);
    }
  });

  it('lists only short numeric helplines', () => {
    const phones = DOCUMENT_KINDS.flatMap((kind) => routesForKind(kind).flatMap((route) => (route.phone === undefined ? [] : [route.phone])));
    expect(phones.length).toBeGreaterThan(0);
    for (const phone of phones) expect(phone).toMatch(/^\d{4,5}$/);
  });

  it('puts the most specific forum first', () => {
    expect(routesForKind('insurance')[0]?.id).toBe('bima-bharosa');
    expect(routesForKind('loan')[0]?.id).toBe('rbi-cms');
    expect(routesForKind('online-terms')[0]?.id).toBe('consumer-helpline');
  });

  it('always offers free legal aid or a Tele-Law lawyer to notices and general documents', () => {
    for (const kind of ['legal-notice', 'other', 'rental'] as const) {
      expect(routesForKind(kind).map((route) => route.id)).toEqual(expect.arrayContaining(['nalsa', 'tele-law']));
    }
  });
});
