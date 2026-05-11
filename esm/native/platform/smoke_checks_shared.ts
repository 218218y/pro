import { getNormalizedErrorHead, normalizeUnknownError } from '../runtime/error_normalization.js';

import type {
  AppContainer,
  BrowserNamespaceLike,
  SmokeChecksNamespaceLike,
  SmokeChecksStateLike,
  SmokeReportLike,
  UnknownCallable,
  UnknownRecord,
} from '../../../types';
import type { ThreeLike as RuntimeThreeLike } from '../../../types/three';
import { getLocationSearchMaybe as getBrowserLocationSearchMaybe } from '../runtime/api_browser_surface.js';
import { assertApp } from '../runtime/api.js';
import { getPlatformReportError } from '../runtime/platform_access.js';

export type Vector3Like = { x: number; y: number; z: number; project?: (camera: unknown) => void };

export type SmokeThreeLike = RuntimeThreeLike & {
  Box3: new () => { setFromObject: (obj: unknown) => void; getCenter: (target: Vector3Like) => void };
  Vector3: new () => Vector3Like;
};

export type ProjectExportLike = {
  jsonStr?: string;
  projectData?: UnknownRecord;
  [k: string]: unknown;
};

export type SmokeAppRootLike = Partial<AppContainer> &
  UnknownRecord & { smokeChecks?: SmokeChecksNamespaceLike };
export type SmokeInstallOptsLike = UnknownRecord & { autoRun?: boolean };

export type StoreStateSurface = { getState?: () => unknown };
export type MaterialSurface = { visible?: boolean; opacity?: number };
export type ProjectableObjectLike = { getWorldPosition?: (target: Vector3Like) => unknown };
export type BrowserSearchSurface = BrowserNamespaceLike & { locationSearch?: unknown };
export type TraverseSurface = { traverse?: (visitor: (node: UnknownRecord) => void) => unknown };

const smokeChecksReportNonFatalSeen = new Map<string, number>();
const smokeSeen = new Map<string, number>();

export function isObjectRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object';
}

export function asObjectRecord(value: unknown): UnknownRecord | null {
  return isObjectRecord(value) ? value : null;
}

export function readBrowserSearchSurface(value: unknown): BrowserSearchSurface | null {
  const surface: BrowserSearchSurface | null = asObjectRecord(value);
  return surface;
}

export function readStoreStateSurface(value: unknown): StoreStateSurface | null {
  const surface: StoreStateSurface | null = asObjectRecord(value);
  return surface;
}

export function readTraverseSurface(value: unknown): TraverseSurface | null {
  const surface: TraverseSurface | null = asObjectRecord(value);
  return surface;
}

export function readMaterialSurface(value: unknown): MaterialSurface | null {
  const surface: MaterialSurface | null = asObjectRecord(value);
  return surface;
}

export function readProjectableObject(value: unknown): ProjectableObjectLike | null {
  const surface: ProjectableObjectLike | null = asObjectRecord(value);
  return surface;
}

export function readProjectExport(value: unknown): ProjectExportLike | null {
  const surface: ProjectExportLike | null = asObjectRecord(value);
  return surface;
}

export function readSmokeChecksSurface(value: unknown): SmokeChecksNamespaceLike | null {
  const surface: SmokeChecksNamespaceLike | null = asObjectRecord(value);
  return surface;
}

export function readSmokeState(value: unknown): SmokeChecksStateLike | null {
  const surface: SmokeChecksStateLike | null = asObjectRecord(value);
  return surface;
}

export function ensureSmokeChecksSurface(root: SmokeAppRootLike): SmokeChecksNamespaceLike {
  const current = readSmokeChecksSurface(root.smokeChecks);
  if (current) return current;
  const next: SmokeChecksNamespaceLike = {};
  root.smokeChecks = next;
  return next;
}

export function ensureSmokeState(smoke: SmokeChecksNamespaceLike): SmokeChecksStateLike {
  const current = readSmokeState(smoke.state);
  if (current) return current;
  const next: SmokeChecksStateLike = {};
  smoke.state = next;
  return next;
}

export function asAppContainer(root: SmokeAppRootLike): AppContainer {
  return assertApp(root, 'platform/smoke_checks_shared');
}

export function createSmokeReport(): SmokeReportLike {
  return {
    ok: false,
    waited: false,
    ready: false,
    checks: [],
    scenario: null,
    error: null,
    startedAt: new Date().toISOString(),
    durationMs: 0,
  };
}

export function errMsg(err: unknown): string {
  try {
    return normalizeUnknownError(err, 'unknown').message;
  } catch {
    return 'unknown';
  }
}

export function getLocationSearchMaybe(App: UnknownRecord): string {
  try {
    return String(getBrowserLocationSearchMaybe(App) || '');
  } catch (err) {
    smokeSoft(App, 'getLocationSearchMaybe', err, 1500);
    return '';
  }
}

export function getDottedValue(root: UnknownRecord, dotted: string): unknown {
  try {
    const parts = String(dotted || '').split('.');
    let cur: unknown = root;
    for (let i = 0; i < parts.length; i++) {
      if (!cur) return undefined;
      const curRec = asObjectRecord(cur);
      if (!curRec) return undefined;
      const next = curRec[parts[i]];
      cur = asObjectRecord(next) || next;
    }
    return cur;
  } catch (err) {
    smokeSoft(root, 'get.dottedLookup', err, 1500);
    return undefined;
  }
}

export function isFn(value: unknown): value is UnknownCallable {
  return typeof value === 'function';
}

export function assertSmoke(ok: unknown, msg: string, data?: unknown): asserts ok {
  if (ok) return;
  const error: Error & { data?: unknown } = new Error('[WardrobePro SmokeChecks] ' + msg);
  try {
    error.data = data;
  } catch (attachErr) {
    smokeSoft(null, 'assert.attachData', attachErr, 1500);
  }
  throw error;
}

export function reportNonFatal(op: string, err: unknown, throttleMs = 4000): void {
  const now = Date.now();
  const msg = getNormalizedErrorHead(err, 'unknown');
  const key = `${op}::${msg}`;
  const prev = smokeChecksReportNonFatalSeen.get(key) || 0;
  if (throttleMs > 0 && prev && now - prev < throttleMs) return;
  smokeChecksReportNonFatalSeen.set(key, now);
  if (smokeChecksReportNonFatalSeen.size > 600) {
    const pruneOlderThan = Math.max(10000, throttleMs * 4);
    for (const [k, ts] of smokeChecksReportNonFatalSeen) {
      if (now - ts > pruneOlderThan) smokeChecksReportNonFatalSeen.delete(k);
    }
  }
  console.error(`[WardrobePro][smoke_checks] ${op}`, err);
}

export function reportSmoke(App: UnknownRecord, err: unknown, ctx?: string): unknown {
  try {
    const report = getPlatformReportError(App);
    if (typeof report === 'function') {
      return report(err, ctx || 'smoke');
    }
  } catch (reportErr) {
    try {
      console.error('[WardrobePro][smoke.report]', reportErr);
    } catch (consoleErr) {
      reportNonFatal('report.console', consoleErr);
    }
  }
  try {
    console.error(err);
  } catch (consoleErr) {
    reportNonFatal('report.consoleLastResort', consoleErr);
  }
  return undefined;
}

export function smokeSoft(
  App: UnknownRecord | null | undefined,
  op: string,
  err: unknown,
  throttleMs = 1200
): void {
  try {
    const now = Date.now();
    const head = getNormalizedErrorHead(err, 'unknown');
    const key = `${String(op || 'smoke')}::${head}`;
    const prev = smokeSeen.get(key) || 0;
    if (prev && now - prev < throttleMs) return;
    smokeSeen.set(key, now);
    if (smokeSeen.size > 200) {
      for (const [k, ts] of smokeSeen) {
        if (now - ts > throttleMs * 4) smokeSeen.delete(k);
      }
    }
  } catch (trackingErr) {
    reportNonFatal('smoke.soft.track', trackingErr);
  }
  reportSmoke(isObjectRecord(App) ? App : {}, err, 'smoke.' + String(op || 'unknown'));
}

export function isNum(value: unknown): value is number {
  return typeof value === 'number' && isFinite(value);
}
