import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BROWSER_CSP_TELEMETRY_CONTRACT,
  createCspViolationRecord,
  installBrowserCspTelemetry,
} from '../esm/native/adapters/browser/csp_telemetry.ts';

function createMemoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear() {
      values.clear();
    },
    getItem(key) {
      return values.get(key) ?? null;
    },
    key(index) {
      return [...values.keys()][index] ?? null;
    },
    removeItem(key) {
      values.delete(key);
    },
    setItem(key, value) {
      values.set(key, value);
    },
  };
}

test('CSP telemetry records only sanitized route/build/directive data', () => {
  const record = createCspViolationRecord({
    event: {
      documentURI: 'https://app.example.test/editor?room=secret',
      effectiveDirective: 'style-src-attr',
      violatedDirective: "style-src 'self'",
      blockedURI: 'https://cdn.example.test/file.css?token=secret',
      sourceFile: 'https://app.example.test/esm/entry.js?private=1',
      lineNumber: 12,
      columnNumber: 4,
      disposition: 'report',
    } as SecurityPolicyViolationEvent,
    locationHref: 'https://app.example.test/editor',
    route: '/editor',
    buildId: 'build-42',
    timestamp: 1_700_000_000_000,
  });

  assert.equal(record.buildId, 'build-42');
  assert.equal(record.route, '/editor');
  assert.equal(record.documentPath, '/editor');
  assert.equal(record.blockedResource, 'https://cdn.example.test');
  assert.equal(record.sourceLocation, '/esm/entry.js');
  assert.doesNotMatch(JSON.stringify(record), /secret|private/);
});

test('CSP telemetry samples, throttles duplicates, stores a bounded baseline and supports uninstall', async () => {
  const listeners = new Map<string, EventListener>();
  const storage = createMemoryStorage();
  const beacons: Array<{ endpoint: string; payload: Blob }> = [];
  const document = {
    querySelector(selector: string) {
      if (selector.includes('wp-csp-report-endpoint')) return { content: '/reports/csp' };
      if (selector.includes('wp-build-id')) return { content: 'release-7' };
      return null;
    },
    addEventListener(type: string, listener: EventListener) {
      listeners.set(type, listener);
    },
    removeEventListener(type: string) {
      listeners.delete(type);
    },
  } as unknown as Document;
  const window = {
    location: { href: 'https://app.example.test/editor?room=secret', pathname: '/editor' },
    navigator: {
      sendBeacon(endpoint: string, payload: Blob) {
        beacons.push({ endpoint, payload });
        return true;
      },
    },
    sessionStorage: storage,
    dispatchEvent() {
      return true;
    },
  } as unknown as Window;

  const uninstall = installBrowserCspTelemetry(window, document, {
    sampleRate: 1,
    throttleMs: 60_000,
    maxRecords: 2,
    now: () => 1_700_000_000_000,
    random: () => 0,
  });
  const listener = listeners.get('securitypolicyviolation');
  assert.ok(listener);

  const event = {
    documentURI: 'https://app.example.test/editor?room=secret',
    effectiveDirective: 'script-src-elem',
    violatedDirective: "script-src 'self'",
    blockedURI: 'inline',
    sourceFile: 'https://app.example.test/editor',
    lineNumber: 1,
    columnNumber: 1,
    disposition: 'report',
  } as unknown as Event;
  listener(event);
  listener(event);

  assert.equal(beacons.length, 1);
  assert.equal(beacons[0]?.endpoint, '/reports/csp');
  assert.match(await beacons[0]!.payload.text(), /"buildId":"release-7"/);
  const stored = JSON.parse(storage.getItem(BROWSER_CSP_TELEMETRY_CONTRACT.storageKey) || '[]');
  assert.equal(stored.length, 1);

  uninstall();
  assert.equal(listeners.has('securitypolicyviolation'), false);
});
