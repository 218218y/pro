import type { ActionMetaLike, RootStateLike, RootSliceKey, StoreSourceDebugStat } from '../../../types';
import {
  ensureRootMetaRecord,
  ensureRootStateContract,
  isPlainRecord,
  shallowCloneRecord,
} from './store_contract.js';
import { canonicalizeProjectConfigStructuralSnapshot } from '../features/project_config/project_config_lists_canonical.js';

export type UnknownRecord = Record<string, unknown>;
export type RootSliceValue = RootStateLike[RootSliceKey];
export type StoreDebugSourceStatsMap = Record<string, StoreSourceDebugStat>;
export type StoreDebugState = {
  commitCount: number;
  noopSkipCount: number;
  selectorListenerCount: number;
  selectorNotifyCount: number;
  sources: StoreDebugSourceStatsMap;
};

const DEFAULT_HELPER_META: Record<
  'ui' | 'runtime' | 'config' | 'mode' | 'meta' | 'dirty',
  Partial<ActionMetaLike> & { source: string }
> = {
  ui: { source: 'ui', noBuild: true, noHistory: true, noAutosave: true, noPersist: true, noCapture: true },
  runtime: {
    source: 'runtime',
    noBuild: true,
    noHistory: true,
    noAutosave: true,
    noPersist: true,
    noCapture: true,
  },
  config: { source: 'config' },
  mode: {
    source: 'mode',
    noBuild: true,
    noHistory: true,
    noAutosave: true,
    noPersist: true,
    noCapture: true,
  },
  meta: { source: 'meta', noBuild: true, noHistory: true, noPersist: true, noCapture: true },
  dirty: { source: 'dirty', noBuild: true, noHistory: true, noPersist: true, noCapture: true },
};

export type ActionMetaBooleanKey =
  | 'silent'
  | 'traceStorePatch'
  | 'noHistory'
  | 'noAutosave'
  | 'noPersist'
  | 'noBuild'
  | 'noCapture'
  | 'uiOnly'
  | 'force'
  | 'forceBuild'
  | 'immediate';

export function hasOwn(obj: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

export function isObj(v: unknown): v is UnknownRecord {
  return isPlainRecord(v);
}

export function asRecordOrNull(v: unknown): UnknownRecord | null {
  return isObj(v) ? v : null;
}

export function asRecordOrEmpty(v: unknown): UnknownRecord {
  return asRecordOrNull(v) || {};
}

function asModeSlice(v: unknown): RootStateLike['mode'] | null {
  return asRecordOrNull(v);
}

export function readRecordString(v: unknown, key: string): string {
  const rec = asRecordOrNull(v);
  const value = rec ? rec[key] : undefined;
  return typeof value === 'string' ? value : '';
}

export function readRecordBoolean(v: unknown, key: ActionMetaBooleanKey): boolean {
  const rec = asRecordOrNull(v);
  return !!(rec && rec[key] === true);
}

export function readRecordNumber(v: unknown, key: string): number | undefined {
  const rec = asRecordOrNull(v);
  const value = rec ? rec[key] : undefined;
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

export function collectPayloadSlices(payload: unknown): RootSliceKey[] {
  const rec = asRecordOrNull(payload);
  if (!rec) return [];
  const out: RootSliceKey[] = [];
  if (rec.ui) out.push('ui');
  if (rec.config) out.push('config');
  if (rec.runtime) out.push('runtime');
  if (rec.mode) out.push('mode');
  if (rec.meta) out.push('meta');
  return out;
}

export function cloneRecordInput(input: unknown): UnknownRecord {
  return shallowCloneRecord(asRecordOrEmpty(input));
}

export function asPatchRecord(v: unknown): UnknownRecord {
  return asRecordOrEmpty(v);
}

export function deleteOwn(obj: UnknownRecord, key: string): void {
  if (hasOwn(obj, key)) {
    delete obj[key];
  }
}

export function normalizeHelperMeta(kind: keyof typeof DEFAULT_HELPER_META, meta: unknown): UnknownRecord {
  const base = DEFAULT_HELPER_META[kind];
  const baseRec = shallowCloneRecord(base);
  const out = shallowCloneRecord(asRecordOrEmpty(meta));

  if (!out.source) out.source = base.source;

  for (const k in baseRec) {
    if (!hasOwn(baseRec, k)) continue;
    if (k === 'source') continue;
    if (typeof out[k] === 'undefined') out[k] = baseRec[k];
  }

  return out;
}

export function arrayShallowEqual(a: unknown[], b: unknown[]): boolean {
  if (a === b) return true;
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (!Object.is(a[i], b[i])) return false;
  }
  return true;
}

export function objectIs(a: unknown, b: unknown): boolean {
  return Object.is(a, b);
}

function storeValueEqualInternal(
  left: unknown,
  right: unknown,
  ignoreKeys: ReadonlySet<string> | null = null
): boolean {
  if (Object.is(left, right)) return true;

  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right)) return false;
    if (left.length !== right.length) return false;
    for (let i = 0; i < left.length; i += 1) {
      if (!storeValueEqualInternal(left[i], right[i], ignoreKeys)) return false;
    }
    return true;
  }

  if (!isObj(left) || !isObj(right)) return false;

  const leftKeys = Object.keys(left).filter(key => !ignoreKeys?.has(key));
  const rightKeys = Object.keys(right).filter(key => !ignoreKeys?.has(key));
  if (leftKeys.length !== rightKeys.length) return false;
  for (const key of leftKeys) {
    if (!Object.prototype.hasOwnProperty.call(right, key)) return false;
    if (!storeValueEqualInternal(left[key], right[key], ignoreKeys)) return false;
  }
  return true;
}

const ROOT_META_EPHEMERAL_KEYS = new Set(['version', 'updatedAt', 'lastAction']);

export function storeValueEqual(left: unknown, right: unknown): boolean {
  return storeValueEqualInternal(left, right, null);
}

export function storeMetaValueEqual(left: unknown, right: unknown): boolean {
  return storeValueEqualInternal(left, right, ROOT_META_EPHEMERAL_KEYS);
}

export function nowMs(): number {
  try {
    if (typeof performance !== 'undefined' && performance && typeof performance.now === 'function') {
      return performance.now();
    }
  } catch {
    // ignore
  }
  return Date.now();
}

export function cloneDebugSources(src: StoreDebugSourceStatsMap): StoreDebugSourceStatsMap {
  const out: StoreDebugSourceStatsMap = {};
  for (const key in src) {
    if (!hasOwn(src, key)) continue;
    const entry = src[key];
    out[key] = {
      source: String(entry.source || ''),
      type: String(entry.type || ''),
      slices: Array.isArray(entry.slices) ? entry.slices.slice() : [],
      count: Number(entry.count || 0),
      totalMs: Number(entry.totalMs || 0),
      maxMs: Number(entry.maxMs || 0),
      lastMs: Number(entry.lastMs || 0),
      slowCount: Number(entry.slowCount || 0),
      lastUpdatedAt: Number(entry.lastUpdatedAt || 0),
    };
  }
  return out;
}

export function createEmptyDebugState(): StoreDebugState {
  return {
    commitCount: 0,
    noopSkipCount: 0,
    selectorListenerCount: 0,
    selectorNotifyCount: 0,
    sources: {},
  };
}

export function recordDebugPatchStat(
  debugState: StoreDebugState,
  type: string,
  payload: unknown,
  meta: ActionMetaLike | undefined,
  dtMs: number,
  slowThresholdMs: number
): void {
  const src = readRecordString(meta, 'source');
  const slices = collectPayloadSlices(payload);
  const key = `${type}:${src || 'unknown'}:${slices.join('+') || 'none'}`;
  const entry = debugState.sources[key] || {
    source: src,
    type: String(type || ''),
    slices: slices.slice(),
    count: 0,
    totalMs: 0,
    maxMs: 0,
    lastMs: 0,
    slowCount: 0,
    lastUpdatedAt: 0,
  };
  entry.count += 1;
  entry.totalMs += dtMs;
  entry.lastMs = dtMs;
  entry.maxMs = Math.max(entry.maxMs, dtMs);
  if (dtMs >= slowThresholdMs) entry.slowCount += 1;
  entry.lastUpdatedAt = Date.now();
  debugState.sources[key] = entry;
}

type EnsureRootStateOpts = {
  preserveSourceSliceRefs?: boolean;
};

export function ensureRootState(
  input: unknown,
  getNoneMode: () => string,
  opts: EnsureRootStateOpts = {}
): RootStateLike {
  const root = ensureRootStateContract(input, getNoneMode);
  const src = asRecordOrEmpty(input);
  const preserveSourceSliceRefs = opts.preserveSourceSliceRefs !== false;

  const srcUi = asRecordOrNull(src.ui);
  if (preserveSourceSliceRefs && srcUi && storeValueEqual(root.ui, srcUi)) root.ui = srcUi;

  const srcRuntime = asRecordOrNull(src.runtime);
  if (preserveSourceSliceRefs && srcRuntime && storeValueEqual(root.runtime, srcRuntime))
    root.runtime = srcRuntime;

  const srcMode = asModeSlice(src.mode);
  if (preserveSourceSliceRefs && srcMode && storeValueEqual(root.mode, srcMode)) root.mode = srcMode;

  const cfgSeed = shallowCloneRecord(asRecordOrEmpty(root.config));
  const cfg = canonicalizeProjectConfigStructuralSnapshot(cfgSeed, {
    uiSnapshot: root.ui,
    cfgSnapshot: cfgSeed,
    cornerMode: 'auto',
    topMode: 'materialize',
  });

  const srcConfig = asRecordOrNull(src.config);
  root.config = preserveSourceSliceRefs && srcConfig && storeValueEqual(cfg, srcConfig) ? srcConfig : cfg;
  return root;
}

export function ensureMeta(state: RootStateLike): RootStateLike['meta'] {
  return ensureRootMetaRecord(state);
}

export function cloneMetaForWrite(state: RootStateLike): RootStateLike['meta'] {
  const meta = ensureMeta(state);
  const cloned = shallowCloneRecord(meta);
  state.meta = cloned;
  return cloned;
}
