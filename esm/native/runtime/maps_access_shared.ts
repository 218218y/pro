import type {
  ActionMetaLike,
  HandleType,
  HingeDir,
  KnownMapName,
  MapsByName,
  MapsNamespaceLike,
  UnknownRecord,
} from '../../../types';

import { reportError } from './errors.js';

export {
  normalizeColorSwatchesOrder,
  normalizeSavedColor,
  normalizeSavedColorsList,
} from '../../shared/maps_access_collections_shared.js';

export type MapRecord = Record<string, unknown>;
export type ErrorMetaLike = { stack?: unknown; message?: unknown };
export type MapsBagLike = MapsNamespaceLike & UnknownRecord;
export type KnownMapValue<K extends KnownMapName> = MapsByName[K][string];
export type HandleValue = HandleType | string | null | undefined;
export type HingeValue = HingeDir | string | UnknownRecord | null | undefined;
export type SavedColorsList = readonly unknown[];
export type ColorSwatchesOrderList = readonly unknown[];
export type DoorReader<T> = (doorId: string) => T;
export type MapsWriteMeta = ActionMetaLike | undefined;

export function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function createMapRecord(): MapRecord {
  return Object.create(null);
}

export function asMapRecord(value: unknown): MapRecord | null {
  return isRecord(value) ? value : null;
}

export function readOwn(record: UnknownRecord | MapRecord, key: string): unknown {
  return record[key];
}

export function writeOwn(record: UnknownRecord | MapRecord, key: string, value: unknown): void {
  record[key] = value;
}

const mapsAccessReportNonFatalSeen = new Map<string, number>();

function readErrorFingerprint(err: unknown): string {
  if (typeof err === 'string') return err;
  if (typeof err === 'number' || typeof err === 'boolean') return String(err);
  if (isRecord(err)) {
    const e: ErrorMetaLike = err;
    if (typeof e.stack === 'string' && e.stack) return e.stack.split('\n')[0] || e.stack;
    if (typeof e.message === 'string' && e.message) return e.message;
  }
  return 'unknown';
}

function readMapsReportArgs(
  contextOrThrottle?: unknown,
  throttleMsArg?: number
): { app: unknown; throttleMs: number } {
  if (typeof contextOrThrottle === 'number') return { app: null, throttleMs: contextOrThrottle };
  return {
    app: contextOrThrottle ?? null,
    throttleMs: typeof throttleMsArg === 'number' ? throttleMsArg : 4000,
  };
}

export function mapsAccessReportNonFatal(
  op: string,
  err: unknown,
  contextOrThrottle?: unknown,
  throttleMsArg?: number
): void {
  const { app, throttleMs } = readMapsReportArgs(contextOrThrottle, throttleMsArg);
  const now = Date.now();
  const msg = readErrorFingerprint(err);
  const key = `${op}::${msg}`;
  const prev = mapsAccessReportNonFatalSeen.get(key) || 0;
  if (throttleMs > 0 && prev && now - prev < throttleMs) return;
  mapsAccessReportNonFatalSeen.set(key, now);
  if (mapsAccessReportNonFatalSeen.size > 600) {
    const pruneOlderThan = Math.max(10000, throttleMs * 4);
    for (const [k, ts] of mapsAccessReportNonFatalSeen) {
      if (now - ts > pruneOlderThan) mapsAccessReportNonFatalSeen.delete(k);
    }
  }

  reportError(app, err, {
    where: 'native/runtime/maps_access',
    op,
    fatal: false,
  });
}

export function asRecord(value: unknown): UnknownRecord | null {
  return isRecord(value) ? value : null;
}

export function asMapsBag(value: unknown): MapsBagLike | null {
  return isRecord(value) ? value : null;
}

export function mapsBagMaybe(App: unknown): MapsBagLike | null {
  const a = asRecord(App);
  if (!a) return null;
  return asMapsBag(a.maps);
}

export function bindMapReader<T>(
  fn: DoorReader<T> | null | undefined,
  maps: MapsBagLike
): DoorReader<T> | null {
  return typeof fn === 'function' ? (doorId: string) => fn.call(maps, doorId) : null;
}

export function readMapFromBag(
  maps: MapsBagLike,
  mapName: string,
  reportContext?: unknown
): MapRecord | null {
  try {
    const getMap = maps.getMap;
    if (typeof getMap === 'function') {
      const v = getMap.call(maps, mapName);
      return asMapRecord(v);
    }
  } catch (err) {
    mapsAccessReportNonFatal('maps_access.readMapFromBag.getMap', err, reportContext);
  }
  return asMapRecord(readOwn(maps, mapName));
}

export function ensureMapRecord(maps: MapsBagLike, mapName: string): MapRecord {
  const existing = readMapFromBag(maps, mapName);
  if (existing) return existing;
  const next = createMapRecord();
  writeOwn(maps, mapName, next);
  return next;
}

export function cloneRecordEntry(value: unknown): unknown {
  const rec = asRecord(value);
  return rec ? { ...rec } : value;
}

export function cloneMapRecord(value: unknown): MapRecord | null {
  const rec = asMapRecord(value);
  if (!rec) return null;
  const out = createMapRecord();
  for (const key of Object.keys(rec)) out[key] = cloneRecordEntry(rec[key]);
  return out;
}

export function normalizeHandleValue(value: unknown): HandleValue {
  if (typeof value === 'string') return value;
  if (value === null) return null;
  if (typeof value === 'undefined') return undefined;
  return undefined;
}

export function readFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const text = value.trim().replace(',', '.');
    if (!text) return null;
    const parsed = Number(text);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}
