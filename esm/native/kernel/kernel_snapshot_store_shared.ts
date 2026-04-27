import type { ActionMetaLike, UnknownRecord } from '../../../types';

import type {
  CreateKernelSnapshotStoreSystemArgs,
  KernelSnapshotStoreMetaLike,
} from './kernel_snapshot_store_contracts.js';

export type SnapshotStoreRecordTools = Pick<
  CreateKernelSnapshotStoreSystemArgs,
  'asRecord' | 'asRecordOrNull'
>;

type KernelSnapshotStoreBooleanMetaKey = keyof Pick<
  KernelSnapshotStoreMetaLike,
  | 'immediate'
  | 'noBuild'
  | 'noAutosave'
  | 'noPersist'
  | 'noHistory'
  | 'noCapture'
  | 'force'
  | 'forceBuild'
  | 'silent'
  | 'captureConfig'
>;

const KERNEL_SNAPSHOT_STORE_BOOLEAN_META_KEYS: readonly KernelSnapshotStoreBooleanMetaKey[] = [
  'immediate',
  'noBuild',
  'noAutosave',
  'noPersist',
  'noHistory',
  'noCapture',
  'force',
  'forceBuild',
  'silent',
  'captureConfig',
];

const KERNEL_UI_EPHEMERAL_KEYS = new Set(['__snapshot', '__capturedAt']);

function isComparableRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function cloneSnapshotComparableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(item => cloneSnapshotComparableValue(item));
  if (!isComparableRecord(value)) return value;
  const out: UnknownRecord = {};
  for (const key of Object.keys(value)) out[key] = cloneSnapshotComparableValue(value[key]);
  return out;
}

function cloneSnapshotComparableRecord(
  asRecord: SnapshotStoreRecordTools['asRecord'],
  value: unknown
): UnknownRecord {
  const rec = asRecord(value, {});
  const cloned = cloneSnapshotComparableValue(rec);
  return isComparableRecord(cloned) ? cloned : {};
}

function snapshotStoreValueEqualInternal(
  left: unknown,
  right: unknown,
  ignoreKeys: ReadonlySet<string> | null
): boolean {
  if (Object.is(left, right)) return true;

  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right)) return false;
    if (left.length !== right.length) return false;
    for (let i = 0; i < left.length; i += 1) {
      if (!snapshotStoreValueEqualInternal(left[i], right[i], ignoreKeys)) return false;
    }
    return true;
  }

  if (!isComparableRecord(left) || !isComparableRecord(right)) return false;

  const leftKeys = Object.keys(left).filter(key => !ignoreKeys?.has(key));
  const rightKeys = Object.keys(right).filter(key => !ignoreKeys?.has(key));
  if (leftKeys.length !== rightKeys.length) return false;
  for (const key of leftKeys) {
    if (!Object.prototype.hasOwnProperty.call(right, key)) return false;
    if (!snapshotStoreValueEqualInternal(left[key], right[key], ignoreKeys)) return false;
  }
  return true;
}

export function snapshotStoreValueEqual(left: unknown, right: unknown): boolean {
  return snapshotStoreValueEqualInternal(left, right, null);
}

export function uiSnapshotValueEqual(left: unknown, right: unknown): boolean {
  return snapshotStoreValueEqualInternal(left, right, KERNEL_UI_EPHEMERAL_KEYS);
}

export function ensureUiSnapshot(
  asRecord: SnapshotStoreRecordTools['asRecord'],
  uiIn: unknown
): UnknownRecord {
  const ui = asRecord(uiIn, {});
  const out = cloneSnapshotComparableRecord(asRecord, ui);
  out.__snapshot = true;
  out.__capturedAt = typeof ui.__capturedAt === 'number' ? ui.__capturedAt : Date.now();
  if (out.els) delete out.els;
  return out;
}

export function mergeUiOverride(
  asRecord: SnapshotStoreRecordTools['asRecord'],
  asRecordOrNull: SnapshotStoreRecordTools['asRecordOrNull'],
  baseIn: unknown,
  patchIn: unknown
): UnknownRecord {
  const base = asRecord(baseIn, {});
  const patch = asRecord(patchIn, {});
  const out: UnknownRecord = Object.assign({}, base, patch);

  const br = asRecordOrNull(base.raw);
  const pr = asRecordOrNull(patch.raw);
  if (br || pr) {
    const rawOut: UnknownRecord = Object.assign({}, br || {});
    if (pr) {
      for (const key of Object.keys(pr)) rawOut[key] = cloneSnapshotComparableValue(pr[key]);
    }
    out.raw = rawOut;
  }

  const bv = asRecordOrNull(base.view);
  const pv = asRecordOrNull(patch.view);
  if (bv || pv) {
    const viewOut: UnknownRecord = Object.assign({}, bv || {});
    if (pv) {
      for (const key of Object.keys(pv)) viewOut[key] = cloneSnapshotComparableValue(pv[key]);
    }
    out.view = viewOut;
  }

  for (const key of Object.keys(patch)) {
    if (key === 'raw' || key === 'view') continue;
    out[key] = cloneSnapshotComparableValue(patch[key]);
  }

  return out;
}

export function mergeSnapshotOnPrev(
  asRecord: SnapshotStoreRecordTools['asRecord'],
  prev: unknown,
  snap: unknown
): UnknownRecord {
  const out: UnknownRecord = {};
  const prevRec = asRecord(prev, {});
  for (const k of Object.keys(prevRec)) out[k] = prevRec[k];

  const snapRec = asRecord(snap, {});
  for (const key of Object.keys(snapRec)) {
    if (key === 'raw') {
      const prevRaw = asRecord(out.raw, {});
      const snapRaw = asRecord(snapRec.raw, {});
      const rawOut: UnknownRecord = Object.assign({}, prevRaw);
      for (const rawKey of Object.keys(snapRaw)) {
        rawOut[rawKey] = cloneSnapshotComparableValue(snapRaw[rawKey]);
      }
      out.raw = rawOut;
      continue;
    }
    out[key] = cloneSnapshotComparableValue(snapRec[key]);
  }

  if ('els' in out) delete out.els;
  out.__snapshot = true;
  out.__capturedAt = Date.now();
  return out;
}

export function buildStoreMeta(source: string, meta: UnknownRecord): ActionMetaLike {
  const out: ActionMetaLike = {
    source,
    immediate: !!meta.immediate,
    noBuild: !!meta.noBuild,
    noAutosave: !!meta.noAutosave,
    noPersist: !!meta.noPersist,
    noHistory: !!meta.noHistory,
    noCapture: !!meta.noCapture,
    force: !!meta.force,
    forceBuild: !!meta.forceBuild,
    silent: !!meta.silent,
    uiOnly: false,
  };
  if (typeof meta.reason === 'string' && meta.reason) out.reason = meta.reason;
  return out;
}

export function normalizeSnapshotStoreMeta(
  asRecord: SnapshotStoreRecordTools['asRecord'],
  meta: unknown
): KernelSnapshotStoreMetaLike {
  const rec = asRecord(meta, {});
  const out: KernelSnapshotStoreMetaLike = {};

  if (typeof rec.source === 'string' && rec.source) out.source = rec.source;
  if (typeof rec.reason === 'string' && rec.reason) out.reason = rec.reason;

  for (const key of KERNEL_SNAPSHOT_STORE_BOOLEAN_META_KEYS) {
    if (typeof rec[key] === 'boolean') out[key] = rec[key];
  }

  return out;
}

export function withDefaultSource(
  meta: KernelSnapshotStoreMetaLike,
  source: string
): KernelSnapshotStoreMetaLike {
  return typeof meta.source === 'string' && meta.source ? meta : { ...meta, source };
}
