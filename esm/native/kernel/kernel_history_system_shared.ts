import type { ActionMetaLike, UnknownRecord } from '../../../types';

import type { KernelHistoryStatusListener, KernelHistorySystem } from './kernel_history_system_contracts.js';

function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function readFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readJsonLikeRecord(value: unknown): UnknownRecord | null {
  return isRecord(value) ? value : null;
}

type JsonSerializableLike = { toJSON?: () => unknown };

function readJsonSerializable(value: UnknownRecord): JsonSerializableLike {
  return value;
}

function stableSerializeHistorySnapshotValue(
  value: unknown,
  seen: WeakSet<object> = new WeakSet<object>()
): string {
  if (value === null) return 'null';
  const valueType = typeof value;
  if (valueType === 'string') return JSON.stringify(value);
  if (valueType === 'number') return Number.isFinite(value) ? String(value) : 'null';
  if (valueType === 'boolean') return value ? 'true' : 'false';
  if (valueType === 'undefined' || valueType === 'function' || valueType === 'symbol') return 'null';
  if (Array.isArray(value)) {
    return `[${value.map(item => stableSerializeHistorySnapshotValue(item, seen)).join(',')}]`;
  }
  const rec = readJsonLikeRecord(value);
  if (!rec) return 'null';
  if (seen.has(rec)) return 'null';
  seen.add(rec);
  const parts: string[] = [];
  for (const key of Object.keys(rec).sort()) {
    const next = rec[key];
    if (typeof next === 'undefined') continue;
    parts.push(`${JSON.stringify(key)}:${stableSerializeHistorySnapshotValue(next, seen)}`);
  }
  seen.delete(rec);
  return `{${parts.join(',')}}`;
}

function readKernelHistorySystemSeed(value: unknown): Partial<KernelHistorySystem> & UnknownRecord {
  return isRecord(value) ? value : {};
}

function readHistoryStatusListener(value: unknown): KernelHistoryStatusListener | undefined {
  if (typeof value !== 'function') return undefined;
  return (status, meta?: ActionMetaLike) => {
    Reflect.apply(value, undefined, [status, meta]);
  };
}

function readHistoryListenerSet(value: unknown): Set<KernelHistoryStatusListener> {
  if (!(value instanceof Set)) return new Set();
  const next = new Set<KernelHistoryStatusListener>();
  for (const item of value) {
    if (typeof item === 'function') next.add(item);
  }
  return next;
}

function cloneHistoryProjectJsonValue(
  value: unknown,
  seen: WeakSet<object> = new WeakSet<object>()
): unknown {
  if (value == null) return value;
  const valueType = typeof value;
  const finiteNumber = readFiniteNumber(value);
  if (valueType === 'number') return finiteNumber;
  if (valueType === 'string' || valueType === 'boolean') return value;
  if (valueType === 'bigint' || valueType === 'function' || valueType === 'symbol') return undefined;
  if (Array.isArray(value)) {
    const out: unknown[] = [];
    for (let i = 0; i < value.length; i += 1) {
      const cloned = cloneHistoryProjectJsonValue(value[i], seen);
      out.push(typeof cloned === 'undefined' ? null : cloned);
    }
    return out;
  }
  const rec = readJsonLikeRecord(value);
  if (!rec) return null;
  if (seen.has(rec)) return undefined;
  seen.add(rec);
  try {
    const jsonSerializable = readJsonSerializable(rec);
    const toJsonValue = typeof jsonSerializable.toJSON === 'function' ? jsonSerializable.toJSON() : rec;
    if (toJsonValue !== rec) return cloneHistoryProjectJsonValue(toJsonValue, seen);
    const out: UnknownRecord = {};
    for (const key of Object.keys(rec)) {
      const cloned = cloneHistoryProjectJsonValue(rec[key], seen);
      if (typeof cloned !== 'undefined') out[key] = cloned;
    }
    return out;
  } finally {
    seen.delete(rec);
  }
}

export function cloneHistoryProjectJson(value: unknown): unknown {
  if (typeof value === 'undefined') return null;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    const cloned = cloneHistoryProjectJsonValue(value);
    return typeof cloned === 'undefined' ? null : cloned;
  }
}

export function normalizeUndoSnapshot(
  rec: UnknownRecord,
  isRecordPredicate: (value: unknown) => value is UnknownRecord
): string {
  if (Object.prototype.hasOwnProperty.call(rec, 'savedColors')) delete rec.savedColors;
  if (Object.prototype.hasOwnProperty.call(rec, 'colorSwatchesOrder')) delete rec.colorSwatchesOrder;
  if (Object.prototype.hasOwnProperty.call(rec, 'orderPdfEditorDraft')) delete rec.orderPdfEditorDraft;
  if (Object.prototype.hasOwnProperty.call(rec, 'orderPdfEditorZoom')) delete rec.orderPdfEditorZoom;
  const settings = isRecordPredicate(rec.settings) ? rec.settings : null;
  if (settings) {
    if (Object.prototype.hasOwnProperty.call(settings, 'editState')) delete settings.editState;
    if (Object.prototype.hasOwnProperty.call(settings, '__persistEditState'))
      delete settings.__persistEditState;
  }
  return stableSerializeHistorySnapshotValue(rec);
}

export function preserveUiOnlySnapshotFields(
  rec: UnknownRecord,
  uiNow: UnknownRecord,
  captureSavedNotes: () => unknown
): void {
  if (!Object.prototype.hasOwnProperty.call(rec, 'savedNotes')) {
    rec.savedNotes = captureSavedNotes();
  }
  if (
    !Object.prototype.hasOwnProperty.call(rec, 'orderPdfEditorDraft') &&
    typeof uiNow.orderPdfEditorDraft !== 'undefined'
  ) {
    rec.orderPdfEditorDraft = cloneHistoryProjectJson(uiNow.orderPdfEditorDraft);
  }
  if (
    !Object.prototype.hasOwnProperty.call(rec, 'orderPdfEditorZoom') &&
    typeof uiNow.orderPdfEditorZoom !== 'undefined'
  ) {
    const zoom = Number(uiNow.orderPdfEditorZoom);
    rec.orderPdfEditorZoom = Number.isFinite(zoom) && zoom > 0 ? zoom : 1;
  }
}

export function createKernelHistorySystemShell(existing: unknown): KernelHistorySystem {
  const seed = readKernelHistorySystemSeed(existing);
  return {
    undoStack: Array.isArray(seed.undoStack)
      ? seed.undoStack.filter((item): item is string => typeof item === 'string')
      : [],
    redoStack: Array.isArray(seed.redoStack)
      ? seed.redoStack.filter((item): item is string => typeof item === 'string')
      : [],
    maxSteps: typeof seed.maxSteps === 'number' && seed.maxSteps > 0 ? seed.maxSteps : 30,
    lastSavedJSON:
      typeof seed.lastSavedJSON === 'string' || seed.lastSavedJSON === null ? seed.lastSavedJSON : null,
    isPaused: seed.isPaused === true,
    _lastCoalesceKey: typeof seed._lastCoalesceKey === 'string' ? seed._lastCoalesceKey : '',
    _lastCoalesceAt: typeof seed._lastCoalesceAt === 'number' ? seed._lastCoalesceAt : 0,
    __didInit: seed.__didInit === true,
    pause: () => {},
    resume: () => {},
    flushPendingPush: () => {},
    schedulePush: () => {},
    resumeAfterRestore: () => {},
    getCurrentSnapshot: () => '',
    pushState: () => {},
    undo: () => {},
    redo: () => {},
    applyState: () => {},
    getStatus: () => ({ canUndo: false, canRedo: false, undoCount: 0, redoCount: 0, isPaused: false }),
    updateButtons: () => {},
    resetBaseline: () => {},
    ensureBaseline: () => {},
    init: () => {},
    onStatusChange: readHistoryStatusListener(seed.onStatusChange),
    subscribeStatus: () => () => {},
    _statusListeners: readHistoryListenerSet(seed._statusListeners),
  };
}

export function readHistoryListenerSetSafe(value: unknown): Set<KernelHistoryStatusListener> {
  return readHistoryListenerSet(value);
}
