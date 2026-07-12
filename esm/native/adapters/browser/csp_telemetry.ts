const CSP_TELEMETRY_STORAGE_KEY = 'wp:csp-violations:v1';
const CSP_TELEMETRY_EVENT_NAME = 'wardrobepro:csp-violation';
const DEFAULT_ENDPOINT = '/__csp-report';
const DEFAULT_SAMPLE_RATE = 0.1;
const DEFAULT_MAX_RECORDS = 50;
const DEFAULT_THROTTLE_MS = 30_000;

type CspViolationRecord = {
  version: 1;
  timestamp: string;
  buildId: string;
  route: string;
  documentPath: string;
  effectiveDirective: string;
  violatedDirective: string;
  blockedResource: string;
  sourceLocation: string;
  lineNumber: number;
  columnNumber: number;
  disposition: string;
};

export type BrowserCspTelemetryOptions = {
  endpoint?: string;
  sampleRate?: number;
  maxRecords?: number;
  throttleMs?: number;
  buildId?: string;
  now?: () => number;
  random?: () => number;
};

const installedDocuments = new WeakMap<Document, () => void>();

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function readMetaContent(document: Document, name: string): string {
  const content = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)?.content;
  return typeof content === 'string' ? content.trim() : '';
}

function sanitizeUrl(value: unknown, baseUrl: string): string {
  if (typeof value !== 'string' || !value) return '';
  if (value === 'inline' || value === 'eval') return value;
  try {
    const url = new URL(value, baseUrl);
    const base = new URL(baseUrl);
    return url.origin === base.origin ? url.pathname : url.origin;
  } catch {
    return '';
  }
}

function readViolationField(
  event: SecurityPolicyViolationEvent,
  key: keyof SecurityPolicyViolationEvent
): string {
  const value = event[key];
  return typeof value === 'string' ? value : '';
}

export function createCspViolationRecord(args: {
  event: SecurityPolicyViolationEvent;
  locationHref: string;
  route: string;
  buildId: string;
  timestamp: number;
}): CspViolationRecord {
  const { event } = args;
  return {
    version: 1,
    timestamp: new Date(args.timestamp).toISOString(),
    buildId: args.buildId || 'unknown',
    route: args.route || '/',
    documentPath: sanitizeUrl(readViolationField(event, 'documentURI'), args.locationHref),
    effectiveDirective: readViolationField(event, 'effectiveDirective'),
    violatedDirective: readViolationField(event, 'violatedDirective'),
    blockedResource: sanitizeUrl(readViolationField(event, 'blockedURI'), args.locationHref),
    sourceLocation: sanitizeUrl(readViolationField(event, 'sourceFile'), args.locationHref),
    lineNumber: Number.isFinite(event.lineNumber) ? event.lineNumber : 0,
    columnNumber: Number.isFinite(event.columnNumber) ? event.columnNumber : 0,
    disposition: readViolationField(event, 'disposition'),
  };
}

function readStoredRecords(storage: Storage): CspViolationRecord[] {
  try {
    const parsed = JSON.parse(storage.getItem(CSP_TELEMETRY_STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? (parsed as CspViolationRecord[]) : [];
  } catch {
    return [];
  }
}

function storeRecord(storage: Storage, record: CspViolationRecord, maxRecords: number): void {
  try {
    const records = readStoredRecords(storage);
    records.push(record);
    storage.setItem(CSP_TELEMETRY_STORAGE_KEY, JSON.stringify(records.slice(-maxRecords)));
  } catch {
    // Storage can be unavailable in private or locked-down browser contexts.
  }
}

function recordFingerprint(record: CspViolationRecord): string {
  return [record.route, record.effectiveDirective, record.blockedResource, record.sourceLocation].join('|');
}

function publishRecord(window: Window, endpoint: string, record: CspViolationRecord): void {
  try {
    window.dispatchEvent(new CustomEvent(CSP_TELEMETRY_EVENT_NAME, { detail: record }));
  } catch {
    // CustomEvent is optional telemetry and must never interfere with boot.
  }

  try {
    const payload = new Blob([JSON.stringify(record)], { type: 'application/json' });
    window.navigator.sendBeacon?.(endpoint, payload);
  } catch {
    // Network reporting is best-effort; the bounded session baseline remains available.
  }
}

export function installBrowserCspTelemetry(
  window: Window | null,
  document: Document | null,
  options: BrowserCspTelemetryOptions = {}
): () => void {
  if (!window || !document) return () => undefined;
  const existing = installedDocuments.get(document);
  if (existing) return existing;

  const endpoint =
    options.endpoint || readMetaContent(document, 'wp-csp-report-endpoint') || DEFAULT_ENDPOINT;
  const buildId = options.buildId || readMetaContent(document, 'wp-build-id') || 'unknown';
  const sampleRate = clamp(options.sampleRate ?? DEFAULT_SAMPLE_RATE, 0, 1);
  const maxRecords = Math.max(1, Math.floor(options.maxRecords ?? DEFAULT_MAX_RECORDS));
  const throttleMs = Math.max(0, options.throttleMs ?? DEFAULT_THROTTLE_MS);
  const now = options.now || Date.now;
  const random = options.random || Math.random;
  const lastSeen = new Map<string, number>();

  const onViolation = (rawEvent: Event): void => {
    if (random() > sampleRate) return;
    const record = createCspViolationRecord({
      event: rawEvent as SecurityPolicyViolationEvent,
      locationHref: window.location.href,
      route: window.location.pathname,
      buildId,
      timestamp: now(),
    });
    const fingerprint = recordFingerprint(record);
    const previous = lastSeen.get(fingerprint);
    const current = now();
    if (previous != null && current - previous < throttleMs) return;
    lastSeen.set(fingerprint, current);
    storeRecord(window.sessionStorage, record, maxRecords);
    publishRecord(window, endpoint, record);
  };

  document.addEventListener('securitypolicyviolation', onViolation);
  const uninstall = (): void => {
    document.removeEventListener('securitypolicyviolation', onViolation);
    installedDocuments.delete(document);
  };
  installedDocuments.set(document, uninstall);
  return uninstall;
}

export const BROWSER_CSP_TELEMETRY_CONTRACT = Object.freeze({
  storageKey: CSP_TELEMETRY_STORAGE_KEY,
  eventName: CSP_TELEMETRY_EVENT_NAME,
  defaultEndpoint: DEFAULT_ENDPOINT,
  defaultSampleRate: DEFAULT_SAMPLE_RATE,
  defaultMaxRecords: DEFAULT_MAX_RECORDS,
  defaultThrottleMs: DEFAULT_THROTTLE_MS,
});
