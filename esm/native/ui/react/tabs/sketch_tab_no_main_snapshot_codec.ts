import type { ConfigStateLike, UiRawInputsLike, UiStateLike, UnknownRecord } from '../../../../../types';
import { cloneUiRawInputs } from '../../../../../types/ui_raw.js';

export const SKETCH_NO_MAIN_RESTORE_VERSION = 1 as const;
export const SKETCH_NO_MAIN_FREE_EXTRAS_VERSION = 1 as const;

export const SKETCH_NO_MAIN_RESTORE_KEY = 'noMainSketchRestoreSnapshot' as const;
export const SKETCH_NO_MAIN_FREE_EXTRAS_KEY = 'noMainSketchFreeExtrasSnapshot' as const;

export const SKETCH_NO_MAIN_RESTORE_UI_KEYS = [
  'baseType',
  'baseLegStyle',
  'baseLegColor',
  'basePlinthHeightCm',
  'baseLegHeightCm',
  'baseLegWidthCm',
  'colorChoice',
  'customColor',
  'doorStyle',
  'frontColorShelfInheritanceMode',
  'groovesEnabled',
  'splitDoors',
  'removeDoorsEnabled',
  'hasCornice',
  'corniceType',
  'currentCurtainChoice',
  'handleControl',
  'hingeDirection',
  'singleDoorPos',
  'structureSelect',
  'isChestMode',
  'chestCommodeEnabled',
  'chestCommodeMirrorWidthManual',
  'cornerMode',
  'cornerSide',
  'cornerWidth',
  'cornerDoors',
  'cornerHeight',
  'cornerDepth',
  'stackSplitEnabled',
  'stackSplitDecorativeSeparatorEnabled',
  'cellDimsPanelOpen',
  'cellDimsHexPanelOpen',
  'showHanger',
  'showContents',
  'libraryUpperDoorsHidden',
  'currentLayoutType',
  'currentGridDivisions',
  'currentGridShelfVariant',
  'currentExtDrawerType',
  'currentExtDrawerCount',
  'currentHandleToolType',
  'currentHandleToolColor',
  'currentHandleToolEdgeVariant',
  'internalDrawersEnabled',
  'activeGridCellId',
  'sketchMode',
  'globalClickMode',
] as const satisfies readonly (keyof UiStateLike)[];

export const SKETCH_NO_MAIN_EXTRA_LIST_KEYS = [
  'boxes',
  'shelves',
  'storageBarriers',
  'rods',
  'drawers',
] as const;

export type SketchNoMainRestoreUiKey = (typeof SKETCH_NO_MAIN_RESTORE_UI_KEYS)[number];
export type SketchNoMainExtraListKey = (typeof SKETCH_NO_MAIN_EXTRA_LIST_KEYS)[number];

export type SketchNoMainRestoreUiSnapshot = Partial<Pick<UiStateLike, SketchNoMainRestoreUiKey>> & {
  raw: UiRawInputsLike;
};

export type SketchNoMainRestoreSnapshot = {
  version: typeof SKETCH_NO_MAIN_RESTORE_VERSION;
  capturedAt: number;
  ui: SketchNoMainRestoreUiSnapshot;
  config: ConfigStateLike;
};

export type SketchNoMainExtrasSnapshotValue = Partial<Record<SketchNoMainExtraListKey, unknown[]>>;

export type SketchNoMainFreeExtrasSnapshot = {
  version: typeof SKETCH_NO_MAIN_FREE_EXTRAS_VERSION;
  capturedAt: number;
  sketchExtras: SketchNoMainExtrasSnapshotValue;
};

function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function serializeCanonicalSnapshotValue(value: unknown): string {
  const seen = new WeakSet<object>();

  function serialize(entry: unknown, inArray: boolean): string | undefined {
    if (entry === null) return 'null';
    if (typeof entry === 'string') return JSON.stringify(entry);
    if (typeof entry === 'boolean') return entry ? 'true' : 'false';
    if (typeof entry === 'number') {
      if (!Number.isFinite(entry)) {
        throw new TypeError('Sketch No-Main snapshot values must contain only finite numbers.');
      }
      return String(entry);
    }
    if (typeof entry === 'undefined' || typeof entry === 'function' || typeof entry === 'symbol') {
      return inArray ? 'null' : undefined;
    }
    if (typeof entry === 'bigint') {
      throw new TypeError('Sketch No-Main snapshot values cannot contain bigint values.');
    }
    if (typeof entry !== 'object') return undefined;
    if (seen.has(entry)) {
      throw new TypeError('Sketch No-Main snapshot values cannot contain circular references.');
    }

    seen.add(entry);
    try {
      if (Array.isArray(entry)) {
        return `[${entry.map(item => serialize(item, true) ?? 'null').join(',')}]`;
      }
      const record = entry as UnknownRecord;
      const parts: string[] = [];
      for (const key of Object.keys(record).sort()) {
        const serialized = serialize(record[key], false);
        if (typeof serialized !== 'undefined') parts.push(`${JSON.stringify(key)}:${serialized}`);
      }
      return `{${parts.join(',')}}`;
    } finally {
      seen.delete(entry);
    }
  }

  const serialized = serialize(value, false);
  if (typeof serialized === 'undefined') {
    throw new TypeError('Sketch No-Main snapshot requires a serializable root value.');
  }
  return serialized;
}

export function cloneSketchNoMainSnapshotValue<T>(value: T): T {
  if (value == null || typeof value !== 'object') return value;
  return JSON.parse(serializeCanonicalSnapshotValue(value)) as T;
}

export function fingerprintSketchNoMainSnapshotValue(value: unknown): string {
  return serializeCanonicalSnapshotValue(value);
}

export function areSketchNoMainSnapshotValuesEqual(left: unknown, right: unknown): boolean {
  return fingerprintSketchNoMainSnapshotValue(left) === fingerprintSketchNoMainSnapshotValue(right);
}

export function captureSketchNoMainRestoreUiSnapshot(ui: UiStateLike): SketchNoMainRestoreUiSnapshot {
  const out: Partial<Pick<UiStateLike, SketchNoMainRestoreUiKey>> = {};
  for (const key of SKETCH_NO_MAIN_RESTORE_UI_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(ui, key)) continue;
    Object.assign(out, { [key]: cloneSketchNoMainSnapshotValue(ui[key]) });
  }
  return {
    ...out,
    raw: cloneUiRawInputs(ui.raw),
  };
}

export function createSketchNoMainRestoreSnapshot(
  ui: UiStateLike,
  config: ConfigStateLike,
  capturedAt = Date.now()
): SketchNoMainRestoreSnapshot {
  return {
    version: SKETCH_NO_MAIN_RESTORE_VERSION,
    capturedAt,
    ui: captureSketchNoMainRestoreUiSnapshot(ui),
    config: cloneSketchNoMainSnapshotValue(config),
  };
}

export function decodeSketchNoMainRestoreSnapshot(value: unknown): SketchNoMainRestoreSnapshot | null {
  if (value == null) return null;
  if (!isRecord(value) || value.version !== SKETCH_NO_MAIN_RESTORE_VERSION) {
    throw new Error('[WardrobePro] Invalid Sketch No-Main restore snapshot envelope.');
  }
  if (
    typeof value.capturedAt !== 'number' ||
    !Number.isFinite(value.capturedAt) ||
    !isRecord(value.ui) ||
    !isRecord(value.config)
  ) {
    throw new Error('[WardrobePro] Invalid Sketch No-Main restore snapshot payload.');
  }
  if (!isRecord(value.ui.raw)) {
    throw new Error('[WardrobePro] Sketch No-Main restore snapshot requires canonical ui.raw.');
  }

  const ui = captureSketchNoMainRestoreUiSnapshot(value.ui as UiStateLike);
  return {
    version: SKETCH_NO_MAIN_RESTORE_VERSION,
    capturedAt: value.capturedAt,
    ui,
    config: cloneSketchNoMainSnapshotValue(value.config) as ConfigStateLike,
  };
}

export function createSketchNoMainFreeExtrasSnapshot(
  sketchExtras: SketchNoMainExtrasSnapshotValue,
  capturedAt = Date.now()
): SketchNoMainFreeExtrasSnapshot {
  return {
    version: SKETCH_NO_MAIN_FREE_EXTRAS_VERSION,
    capturedAt,
    sketchExtras: cloneSketchNoMainSnapshotValue(sketchExtras),
  };
}

export function decodeSketchNoMainFreeExtrasSnapshot(value: unknown): SketchNoMainFreeExtrasSnapshot | null {
  if (value == null) return null;
  if (!isRecord(value) || value.version !== SKETCH_NO_MAIN_FREE_EXTRAS_VERSION) {
    throw new Error('[WardrobePro] Invalid Sketch No-Main free-extras snapshot envelope.');
  }
  if (
    typeof value.capturedAt !== 'number' ||
    !Number.isFinite(value.capturedAt) ||
    !isRecord(value.sketchExtras)
  ) {
    throw new Error('[WardrobePro] Invalid Sketch No-Main free-extras snapshot payload.');
  }

  const sketchExtras: SketchNoMainExtrasSnapshotValue = {};
  for (const key of SKETCH_NO_MAIN_EXTRA_LIST_KEYS) {
    const list = value.sketchExtras[key];
    if (typeof list === 'undefined') continue;
    if (!Array.isArray(list)) {
      throw new Error(`[WardrobePro] Sketch No-Main free-extras ${key} must be an array.`);
    }
    sketchExtras[key] = cloneSketchNoMainSnapshotValue(list);
  }

  return {
    version: SKETCH_NO_MAIN_FREE_EXTRAS_VERSION,
    capturedAt: value.capturedAt,
    sketchExtras,
  };
}

export const sketchNoMainRestoreSnapshotCodec = Object.freeze({
  create: createSketchNoMainRestoreSnapshot,
  decode: decodeSketchNoMainRestoreSnapshot,
  clone(value: SketchNoMainRestoreSnapshot): SketchNoMainRestoreSnapshot {
    return cloneSketchNoMainSnapshotValue(value);
  },
  fingerprint(value: SketchNoMainRestoreSnapshot): string {
    return fingerprintSketchNoMainSnapshotValue(value);
  },
});

export const sketchNoMainFreeExtrasSnapshotCodec = Object.freeze({
  create: createSketchNoMainFreeExtrasSnapshot,
  decode: decodeSketchNoMainFreeExtrasSnapshot,
  clone(value: SketchNoMainFreeExtrasSnapshot): SketchNoMainFreeExtrasSnapshot {
    return cloneSketchNoMainSnapshotValue(value);
  },
  fingerprint(value: SketchNoMainFreeExtrasSnapshot): string {
    return fingerprintSketchNoMainSnapshotValue(value);
  },
});
