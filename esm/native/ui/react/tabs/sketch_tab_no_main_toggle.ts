import type {
  ActionMetaLike,
  AppContainer,
  MetaActionsNamespaceLike,
  UnknownRecord,
} from '../../../../../types';
import { UI_RAW_SCALAR_KEYS } from '../../../../../types/ui_raw.js';
import { WARDROBE_DEFAULTS } from '../../../../shared/wardrobe_dimension_tokens_shared.js';

import {
  applyProjectConfigSnapshot,
  getConfigSnapshot,
  getUiSnapshot,
  patchUi,
} from '../actions/store_actions.js';
import { applyStructureTemplateRecomputeBatch } from './structure_tab_core_recompute.js';

export const SKETCH_NO_MAIN_RESTORE_KEY = 'noMainSketchRestoreSnapshot';
export const SKETCH_NO_MAIN_FREE_EXTRAS_KEY = 'noMainSketchFreeExtrasSnapshot';

type SketchNoMainRestoreSnapshot = {
  version: 1;
  capturedAt: number;
  ui: UnknownRecord;
  config: UnknownRecord;
};

type SketchNoMainFreeExtrasSnapshot = {
  version: 1;
  capturedAt: number;
  sketchExtras: UnknownRecord;
};

type SketchNoMainToggleResult = { ok: true; active: boolean; restored: boolean };

const STRUCTURE_UI_SNAPSHOT_KEYS = [
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
] as const;

const SKETCH_EXTRA_LIST_KEYS = ['boxes', 'shelves', 'storageBarriers', 'rods', 'drawers'] as const;

function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function readRecord(value: unknown): UnknownRecord | null {
  return isRecord(value) ? value : null;
}

function cloneSerializable<T>(value: T): T {
  if (value == null || typeof value !== 'object') return value;
  try {
    return JSON.parse(JSON.stringify(value)) as T;
  } catch {
    if (Array.isArray(value)) return value.map(entry => cloneSerializable(entry)) as T;
    const rec = value as UnknownRecord;
    const out: UnknownRecord = {};
    for (const key of Object.keys(rec)) out[key] = cloneSerializable(rec[key]);
    return out as T;
  }
}

function coerceFiniteNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function coerceFiniteInt(value: unknown): number | null {
  const n = coerceFiniteNumber(value);
  return n == null ? null : Math.round(n);
}

function readRawRecord(ui: UnknownRecord): UnknownRecord {
  return readRecord(ui.raw) || {};
}

function readUiRawNumber(ui: UnknownRecord, key: string, defaultValue: number): number {
  const raw = readRawRecord(ui);
  const fromRaw = coerceFiniteNumber(raw[key]);
  if (fromRaw != null) return fromRaw;
  const fromUi = coerceFiniteNumber(ui[key]);
  return fromUi != null ? fromUi : defaultValue;
}

function readUiRawInt(ui: UnknownRecord, key: string, defaultValue: number): number {
  const raw = readRawRecord(ui);
  const fromRaw = coerceFiniteInt(raw[key]);
  if (fromRaw != null) return fromRaw;
  const fromUi = coerceFiniteInt(ui[key]);
  return fromUi != null ? fromUi : defaultValue;
}

function pickRestoreUiSnapshot(ui: UnknownRecord): UnknownRecord {
  const out: UnknownRecord = {};
  const raw = readRawRecord(ui);
  const rawOut: UnknownRecord = cloneSerializable(raw);

  for (const key of UI_RAW_SCALAR_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(rawOut, key) && Object.prototype.hasOwnProperty.call(ui, key)) {
      rawOut[key] = cloneSerializable(ui[key]);
    }
  }

  out.raw = rawOut;
  for (const key of STRUCTURE_UI_SNAPSHOT_KEYS) {
    if (Object.prototype.hasOwnProperty.call(ui, key)) out[key] = cloneSerializable(ui[key]);
  }
  delete out[SKETCH_NO_MAIN_RESTORE_KEY];
  delete out[SKETCH_NO_MAIN_FREE_EXTRAS_KEY];
  return out;
}

function cloneMainWardrobeRestoreConfig(config: UnknownRecord): UnknownRecord {
  return cloneSerializable(config);
}

function createRestoreSnapshot(ui: UnknownRecord, config: UnknownRecord): SketchNoMainRestoreSnapshot {
  return {
    version: 1,
    capturedAt: Date.now(),
    ui: pickRestoreUiSnapshot(ui),
    config: cloneMainWardrobeRestoreConfig(config),
  };
}

function readRestoreSnapshot(ui: UnknownRecord): SketchNoMainRestoreSnapshot | null {
  const snap = readRecord(ui[SKETCH_NO_MAIN_RESTORE_KEY]);
  if (!snap || snap.version !== 1) return null;
  const restoreUi = readRecord(snap.ui);
  const restoreConfig = readRecord(snap.config);
  if (!restoreUi || !restoreConfig) return null;
  return {
    version: 1,
    capturedAt: Number(snap.capturedAt) || 0,
    ui: cloneSerializable(restoreUi),
    config: cloneSerializable(restoreConfig),
  };
}

function readFreeExtrasSnapshot(ui: UnknownRecord): SketchNoMainFreeExtrasSnapshot | null {
  const snap = readRecord(ui[SKETCH_NO_MAIN_FREE_EXTRAS_KEY]);
  if (!snap || snap.version !== 1) return null;
  const sketchExtras = readRecord(snap.sketchExtras);
  if (!sketchExtras) return null;
  return {
    version: 1,
    capturedAt: Number(snap.capturedAt) || 0,
    sketchExtras: cloneSerializable(sketchExtras),
  };
}

function createDefaultMainRestoreConfig(config: UnknownRecord): UnknownRecord {
  const restoreConfig = cloneMainWardrobeRestoreConfig({
    ...cloneSerializable(config),
    wardrobeType: 'hinged',
  });
  const modules = readModulesConfiguration(restoreConfig);
  if (!modules.length) return restoreConfig;

  restoreConfig.modulesConfiguration = modules.map(entry => {
    const module = readRecord(entry);
    if (!module) return cloneSerializable(entry);

    const nextModule = cloneSerializable(module);
    const extras = readRecord(nextModule.sketchExtras);
    if (!extras) return nextModule;

    const nextExtras = cloneSerializable(extras);
    let changed = false;

    if (Array.isArray(extras.boxes)) {
      const boxes = cloneSketchExtraList(extras.boxes).filter(box => readRecord(box)?.freePlacement !== true);
      if (boxes.length > 0) nextExtras.boxes = boxes;
      else delete nextExtras.boxes;
      changed = changed || boxes.length !== extras.boxes.length;
    }

    for (const key of SKETCH_EXTRA_LIST_KEYS) {
      if (key === 'boxes') continue;
      if (!Object.prototype.hasOwnProperty.call(nextExtras, key)) continue;
      delete nextExtras[key];
      changed = true;
    }

    if (!changed) return nextModule;
    if (Object.keys(nextExtras).length > 0) nextModule.sketchExtras = nextExtras;
    else delete nextModule.sketchExtras;
    return nextModule;
  });

  return restoreConfig;
}

function createDefaultRestoreSnapshot(ui: UnknownRecord, config: UnknownRecord): SketchNoMainRestoreSnapshot {
  const defaultDoors = WARDROBE_DEFAULTS.byType.hinged.doorsCount;
  const defaultWidth = defaultDoors * WARDROBE_DEFAULTS.byType.hinged.perDoorWidthCm;
  const restoreUi = pickRestoreUiSnapshot(ui);
  const raw = readRecord(restoreUi.raw) || {};
  restoreUi.raw = {
    ...raw,
    width: defaultWidth,
    height: readUiRawNumber(ui, 'height', WARDROBE_DEFAULTS.heightCm),
    depth: readUiRawNumber(ui, 'depth', WARDROBE_DEFAULTS.byType.hinged.depthCm),
    doors: defaultDoors,
  };
  restoreUi.isChestMode = false;
  return {
    version: 1,
    capturedAt: Date.now(),
    ui: restoreUi,
    config: createDefaultMainRestoreConfig(config),
  };
}

function mergeUiPatch(base: UnknownRecord, patch: UnknownRecord): UnknownRecord {
  const out: UnknownRecord = { ...base, ...patch };
  const baseRaw = readRecord(base.raw) || {};
  const patchRaw = readRecord(patch.raw) || {};
  out.raw = { ...baseRaw, ...patchRaw };
  return out;
}

function createNoMainConfigPatch(config: UnknownRecord): UnknownRecord {
  return {
    ...cloneSerializable(config),
    wardrobeType: 'hinged',
    isLibraryMode: false,
    stackSplitLowerModulesConfiguration: [],
  };
}

function createNoMainUiPatch(ui: UnknownRecord, restore: SketchNoMainRestoreSnapshot): UnknownRecord {
  const raw = {
    ...readRawRecord(ui),
    width: 0,
    height: readUiRawNumber(ui, 'height', WARDROBE_DEFAULTS.heightCm),
    depth: readUiRawNumber(ui, 'depth', WARDROBE_DEFAULTS.byType.hinged.depthCm),
    doors: 0,
  };

  return {
    raw,
    [SKETCH_NO_MAIN_RESTORE_KEY]: restore,
    structureSelect: '',
    singleDoorPos: '',
    isChestMode: false,
    cornerMode: false,
    stackSplitEnabled: false,
    stackSplitDecorativeSeparatorEnabled: false,
    libraryUpperDoorsHidden: false,
  };
}

function readModulesConfiguration(config: UnknownRecord): unknown[] {
  return Array.isArray(config.modulesConfiguration) ? config.modulesConfiguration : [];
}

function readSketchExtrasFromFirstModule(config: UnknownRecord): UnknownRecord | null {
  const modules = readModulesConfiguration(config);
  const first = readRecord(modules[0]);
  return first ? readRecord(first.sketchExtras) : null;
}

function cloneSketchExtraList(value: unknown): unknown[] {
  if (!Array.isArray(value)) return [];
  return value.filter(entry => entry != null).map(entry => cloneSerializable(entry));
}

function normalizeSketchExtraList(key: (typeof SKETCH_EXTRA_LIST_KEYS)[number], value: unknown): unknown[] {
  if (key !== 'boxes') return cloneSketchExtraList(value);
  return cloneSketchExtraList(value).filter(entry => {
    const rec = readRecord(entry);
    return !!rec && rec.freePlacement === true;
  });
}

function readSketchExtraIdentity(value: unknown): string {
  const rec = readRecord(value);
  const id = rec && typeof rec.id === 'string' ? rec.id.trim() : '';
  if (id) return `id:${id}`;
  try {
    return `json:${JSON.stringify(value)}`;
  } catch {
    return `ref:${String(value)}`;
  }
}

function mergeSketchExtraLists(
  base: unknown,
  incoming: unknown[],
  key: (typeof SKETCH_EXTRA_LIST_KEYS)[number]
): unknown[] {
  const out = cloneSketchExtraList(base);
  const seen = new Set(out.map(readSketchExtraIdentity));
  for (const entry of incoming) {
    const normalized = normalizeSketchExtraList(key, [entry])[0];
    if (typeof normalized === 'undefined') continue;
    const id = readSketchExtraIdentity(normalized);
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(normalized);
  }
  return out;
}

function createSketchExtraIdentitySet(
  sketchExtras: UnknownRecord | null,
  key: (typeof SKETCH_EXTRA_LIST_KEYS)[number]
): Set<string> {
  const list =
    key === 'boxes'
      ? cloneSketchExtraList(sketchExtras?.[key])
      : normalizeSketchExtraList(key, sketchExtras?.[key]);
  return new Set(list.map(readSketchExtraIdentity));
}

function createNoMainFreeExtrasSnapshotFromConfig(args: {
  config: UnknownRecord;
  restoreConfig?: UnknownRecord | null;
}): SketchNoMainFreeExtrasSnapshot | null {
  const currentExtras = readSketchExtrasFromFirstModule(args.config);
  if (!currentExtras) return null;

  const restoreExtras = args.restoreConfig ? readSketchExtrasFromFirstModule(args.restoreConfig) : null;
  const sketchExtras: UnknownRecord = {};
  for (const key of SKETCH_EXTRA_LIST_KEYS) {
    const restoreIds = createSketchExtraIdentitySet(restoreExtras, key);
    const list = normalizeSketchExtraList(key, currentExtras[key]).filter(
      entry => !restoreIds.has(readSketchExtraIdentity(entry))
    );
    if (list.length > 0) sketchExtras[key] = list;
  }

  return Object.keys(sketchExtras).length > 0 ? { version: 1, capturedAt: Date.now(), sketchExtras } : null;
}

function reconcileMainRestoreConfigWithActiveFreeBoxes(args: {
  restoreConfig: UnknownRecord;
  activeConfig: UnknownRecord;
}): UnknownRecord {
  const restoreConfig = cloneSerializable(args.restoreConfig);
  const restoreModules = readModulesConfiguration(restoreConfig).map(entry => cloneSerializable(entry));
  const restoreFirstModule = readRecord(restoreModules[0]);
  const restoreExtras = restoreFirstModule ? readRecord(restoreFirstModule.sketchExtras) : null;
  const restoreBoxes = Array.isArray(restoreExtras?.boxes) ? cloneSketchExtraList(restoreExtras.boxes) : null;
  if (!restoreFirstModule || !restoreExtras || !restoreBoxes) return restoreConfig;

  const activeExtras = readSketchExtrasFromFirstModule(args.activeConfig);
  const activeBoxes = cloneSketchExtraList(activeExtras?.boxes);
  const activeByIdentity = new Map(activeBoxes.map(entry => [readSketchExtraIdentity(entry), entry]));

  const nextBoxes: unknown[] = [];
  let changed = false;
  for (const entry of restoreBoxes) {
    const rec = readRecord(entry);
    if (!rec || rec.freePlacement !== true) {
      nextBoxes.push(entry);
      continue;
    }

    const id = readSketchExtraIdentity(entry);
    const activeEntry = activeByIdentity.get(id);
    if (activeEntry) {
      nextBoxes.push(cloneSerializable(activeEntry));
      if (JSON.stringify(activeEntry) !== JSON.stringify(entry)) changed = true;
    } else {
      changed = true;
    }
  }

  if (!changed) return restoreConfig;
  restoreFirstModule.sketchExtras = {
    ...cloneSerializable(restoreExtras),
    boxes: nextBoxes,
  };
  restoreModules[0] = restoreFirstModule;
  restoreConfig.modulesConfiguration = restoreModules;
  return restoreConfig;
}

function mergeFreeExtrasSnapshotIntoNoMainConfig(args: {
  noMainConfig: UnknownRecord;
  freeExtras: SketchNoMainFreeExtrasSnapshot | null;
}): UnknownRecord {
  if (!args.freeExtras) return args.noMainConfig;

  const noMainConfig = cloneSerializable(args.noMainConfig);
  const modules = readModulesConfiguration(noMainConfig).map(entry => cloneSerializable(entry));
  const firstModule = readRecord(modules[0]) || {};
  const baseExtras = readRecord(firstModule.sketchExtras) || {};
  const nextExtras: UnknownRecord = { ...baseExtras };

  for (const key of SKETCH_EXTRA_LIST_KEYS) {
    const incoming = normalizeSketchExtraList(key, args.freeExtras.sketchExtras[key]);
    if (!incoming.length) continue;
    nextExtras[key] = mergeSketchExtraLists(baseExtras[key], incoming, key);
  }

  firstModule.sketchExtras = nextExtras;
  modules[0] = firstModule;
  noMainConfig.modulesConfiguration = modules.length ? modules : [firstModule];
  return noMainConfig;
}

function applyNoMainBatch(args: {
  app: AppContainer;
  source: string;
  meta: ActionMetaLike;
  uiPatch: UnknownRecord;
  configPatch?: UnknownRecord | null;
  configSnapshot?: UnknownRecord | null;
}): void {
  const { app, source, meta, uiPatch, configPatch, configSnapshot } = args;
  applyStructureTemplateRecomputeBatch({
    app,
    source,
    meta,
    uiPatch,
    statePatch: configSnapshot ? null : { ui: uiPatch, ...(configPatch ? { config: configPatch } : {}) },
    mutate: configSnapshot
      ? () => {
          applyProjectConfigSnapshot(app, configSnapshot, meta);
          patchUi(app, uiPatch, meta);
        }
      : undefined,
  });
}

function createNoBuildMeta(meta: MetaActionsNamespaceLike, source: string): ActionMetaLike {
  return typeof meta.noBuildImmediate === 'function'
    ? meta.noBuildImmediate(source)
    : { source, noBuild: true };
}

export function hasSketchNoMainRestoreSnapshot(ui: UnknownRecord | null | undefined): boolean {
  return !!(ui && readRestoreSnapshot(ui));
}

export function isSketchNoMainWardrobeActive(args: {
  ui: UnknownRecord | null | undefined;
  wardrobeType: string;
}): boolean {
  const ui = readRecord(args.ui) || {};
  return (
    args.wardrobeType !== 'sliding' &&
    readUiRawInt(ui, 'doors', WARDROBE_DEFAULTS.byType.hinged.doorsCount) === 0
  );
}

export function toggleSketchNoMainWardrobe(args: {
  app: AppContainer;
  meta: MetaActionsNamespaceLike;
}): SketchNoMainToggleResult {
  const { app, meta } = args;
  const ui = getUiSnapshot(app);
  const config = getConfigSnapshot(app);
  const wardrobeType = config.wardrobeType === 'sliding' ? 'sliding' : 'hinged';
  const active = isSketchNoMainWardrobeActive({ ui, wardrobeType });

  if (!active) {
    const restore = createRestoreSnapshot(ui, config);
    const uiPatch = createNoMainUiPatch(ui, restore);
    const configPatch = mergeFreeExtrasSnapshotIntoNoMainConfig({
      noMainConfig: createNoMainConfigPatch(config),
      freeExtras: readFreeExtrasSnapshot(ui),
    });
    const source = 'react:sketch:noMainWardrobe:enable';
    applyNoMainBatch({
      app,
      source,
      meta: createNoBuildMeta(meta, source),
      uiPatch,
      configPatch,
    });
    return { ok: true, active: true, restored: false };
  }

  const restore = readRestoreSnapshot(ui) || createDefaultRestoreSnapshot(ui, config);
  const configSnapshot = reconcileMainRestoreConfigWithActiveFreeBoxes({
    restoreConfig: restore.config,
    activeConfig: config,
  });
  const freeExtras = createNoMainFreeExtrasSnapshotFromConfig({
    config,
    restoreConfig: restore.config,
  });
  const uiPatch = mergeUiPatch(restore.ui, {
    [SKETCH_NO_MAIN_RESTORE_KEY]: null,
    [SKETCH_NO_MAIN_FREE_EXTRAS_KEY]: freeExtras,
  });
  const source = 'react:sketch:noMainWardrobe:restore';
  applyNoMainBatch({
    app,
    source,
    meta: createNoBuildMeta(meta, source),
    uiPatch,
    configSnapshot,
  });
  return { ok: true, active: false, restored: true };
}
