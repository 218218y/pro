import type {
  ActionMetaLike,
  AppContainer,
  ConfigStateLike,
  MetaActionsNamespaceLike,
  ModuleConfigLike,
  UiSlicePatch,
  UiStateLike,
  UnknownRecord,
} from '../../../../../types';
import { WARDROBE_DEFAULTS } from '../../../../shared/dimensions/wardrobe_defaults.js';

import { commitUiConfigSnapshot, getConfigSnapshot, getUiSnapshot } from '../actions/store_actions.js';
import { applyStructureTemplateSnapshotRecomputeTransaction } from './structure_tab_core_recompute.js';
import { createStructureTabNoBuildImmediateMeta } from './structure_tab_meta.js';
import {
  SKETCH_NO_MAIN_EXTRA_LIST_KEYS,
  SKETCH_NO_MAIN_FREE_EXTRAS_KEY,
  SKETCH_NO_MAIN_RESTORE_KEY,
  areSketchNoMainSnapshotValuesEqual,
  cloneSketchNoMainSnapshotValue,
  createSketchNoMainFreeExtrasSnapshot,
  createSketchNoMainRestoreSnapshot,
  decodeSketchNoMainFreeExtrasSnapshot,
  decodeSketchNoMainRestoreSnapshot,
  fingerprintSketchNoMainSnapshotValue,
  type SketchNoMainExtraListKey,
  type SketchNoMainFreeExtrasSnapshot,
  type SketchNoMainRestoreSnapshot,
} from './sketch_tab_no_main_snapshot_codec.js';

export {
  SKETCH_NO_MAIN_FREE_EXTRAS_KEY,
  SKETCH_NO_MAIN_RESTORE_KEY,
} from './sketch_tab_no_main_snapshot_codec.js';

export type SketchNoMainToggleResult = { ok: true; active: boolean; restored: boolean };

function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function readRecord(value: unknown): UnknownRecord | null {
  return isRecord(value) ? value : null;
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

function readUiRawNumber(ui: UiStateLike, key: 'height' | 'depth', defaultValue: number): number {
  const value = coerceFiniteNumber(ui.raw?.[key]);
  return value != null ? value : defaultValue;
}

function readUiRawInt(ui: UiStateLike, key: 'doors', defaultValue: number): number {
  const value = coerceFiniteInt(ui.raw?.[key]);
  return value != null ? value : defaultValue;
}

function createDefaultMainRestoreConfig(config: ConfigStateLike): ConfigStateLike {
  const restoreConfig = cloneSketchNoMainSnapshotValue<ConfigStateLike>({
    ...cloneSketchNoMainSnapshotValue(config),
    wardrobeType: 'hinged',
  });
  const modules = readModulesConfiguration(restoreConfig);
  if (!modules.length) return restoreConfig;

  restoreConfig.modulesConfiguration = modules.map(entry => {
    const module = readRecord(entry);
    if (!module) return cloneSketchNoMainSnapshotValue(entry);

    const nextModule = cloneSketchNoMainSnapshotValue(module);
    const extras = readRecord(nextModule.sketchExtras);
    if (!extras) return nextModule;

    const nextExtras = cloneSketchNoMainSnapshotValue(extras);
    let changed = false;

    if (Array.isArray(extras.boxes)) {
      const boxes = cloneSketchExtraList(extras.boxes).filter(box => readRecord(box)?.freePlacement !== true);
      if (boxes.length > 0) nextExtras.boxes = boxes;
      else delete nextExtras.boxes;
      changed = changed || boxes.length !== extras.boxes.length;
    }

    for (const key of SKETCH_NO_MAIN_EXTRA_LIST_KEYS) {
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

function createDefaultRestoreSnapshot(ui: UiStateLike, config: ConfigStateLike): SketchNoMainRestoreSnapshot {
  const defaultDoors = WARDROBE_DEFAULTS.byType.hinged.doorsCount;
  const defaultWidth = defaultDoors * WARDROBE_DEFAULTS.byType.hinged.perDoorWidthCm;
  const restoreUi: UiStateLike = {
    ...ui,
    raw: {
      ...ui.raw,
      width: defaultWidth,
      height: readUiRawNumber(ui, 'height', WARDROBE_DEFAULTS.heightCm),
      depth: readUiRawNumber(ui, 'depth', WARDROBE_DEFAULTS.byType.hinged.depthCm),
      doors: defaultDoors,
    },
    isChestMode: false,
  };
  return createSketchNoMainRestoreSnapshot(restoreUi, createDefaultMainRestoreConfig(config));
}

function mergeUiPatch(base: SketchNoMainRestoreSnapshot['ui'], patch: UiSlicePatch): UiSlicePatch {
  return {
    ...base,
    ...patch,
    raw: {
      ...base.raw,
      ...patch.raw,
    },
  };
}

function createNoMainConfigSnapshot(config: ConfigStateLike): ConfigStateLike {
  return {
    ...cloneSketchNoMainSnapshotValue(config),
    wardrobeType: 'hinged',
    isLibraryMode: false,
    stackSplitLowerModulesConfiguration: [],
  };
}

function createNoMainUiPatch(ui: UiStateLike, restore: SketchNoMainRestoreSnapshot): UiSlicePatch {
  return {
    raw: {
      ...ui.raw,
      width: 0,
      height: readUiRawNumber(ui, 'height', WARDROBE_DEFAULTS.heightCm),
      depth: readUiRawNumber(ui, 'depth', WARDROBE_DEFAULTS.byType.hinged.depthCm),
      doors: 0,
    },
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

function readModulesConfiguration(config: ConfigStateLike): ModuleConfigLike[] {
  return Array.isArray(config.modulesConfiguration) ? config.modulesConfiguration : [];
}

function readSketchExtrasFromFirstModule(config: ConfigStateLike): UnknownRecord | null {
  const modules = readModulesConfiguration(config);
  const first = readRecord(modules[0]);
  return first ? readRecord(first.sketchExtras) : null;
}

function cloneSketchExtraList(value: unknown): unknown[] {
  if (!Array.isArray(value)) return [];
  return value.filter(entry => entry != null).map(entry => cloneSketchNoMainSnapshotValue(entry));
}

function normalizeSketchExtraList(key: SketchNoMainExtraListKey, value: unknown): unknown[] {
  if (key !== 'boxes') return cloneSketchExtraList(value);
  return cloneSketchExtraList(value).filter(entry => readRecord(entry)?.freePlacement === true);
}

function readSketchExtraIdentity(value: unknown): string {
  const rec = readRecord(value);
  const id = rec && typeof rec.id === 'string' ? rec.id.trim() : '';
  return id ? `id:${id}` : `value:${fingerprintSketchNoMainSnapshotValue(value)}`;
}

function mergeSketchExtraLists(base: unknown, incoming: unknown[], key: SketchNoMainExtraListKey): unknown[] {
  const out = cloneSketchExtraList(base);
  const seen = new Set(out.map(readSketchExtraIdentity));
  for (const entry of incoming) {
    const normalized = normalizeSketchExtraList(key, [entry])[0];
    if (typeof normalized === 'undefined') continue;
    const identity = readSketchExtraIdentity(normalized);
    if (seen.has(identity)) continue;
    seen.add(identity);
    out.push(normalized);
  }
  return out;
}

function createSketchExtraIdentitySet(
  sketchExtras: UnknownRecord | null,
  key: SketchNoMainExtraListKey
): Set<string> {
  const list =
    key === 'boxes'
      ? cloneSketchExtraList(sketchExtras?.[key])
      : normalizeSketchExtraList(key, sketchExtras?.[key]);
  return new Set(list.map(readSketchExtraIdentity));
}

function createNoMainFreeExtrasSnapshotFromConfig(args: {
  config: ConfigStateLike;
  restoreConfig?: ConfigStateLike | null;
}): SketchNoMainFreeExtrasSnapshot | null {
  const currentExtras = readSketchExtrasFromFirstModule(args.config);
  if (!currentExtras) return null;

  const restoreExtras = args.restoreConfig ? readSketchExtrasFromFirstModule(args.restoreConfig) : null;
  const sketchExtras: SketchNoMainFreeExtrasSnapshot['sketchExtras'] = {};
  for (const key of SKETCH_NO_MAIN_EXTRA_LIST_KEYS) {
    const restoreIds = createSketchExtraIdentitySet(restoreExtras, key);
    const list = normalizeSketchExtraList(key, currentExtras[key]).filter(
      entry => !restoreIds.has(readSketchExtraIdentity(entry))
    );
    if (list.length > 0) sketchExtras[key] = list;
  }

  return Object.keys(sketchExtras).length > 0 ? createSketchNoMainFreeExtrasSnapshot(sketchExtras) : null;
}

function reconcileMainRestoreConfigWithActiveFreeBoxes(args: {
  restoreConfig: ConfigStateLike;
  activeConfig: ConfigStateLike;
}): ConfigStateLike {
  const restoreConfig = cloneSketchNoMainSnapshotValue(args.restoreConfig);
  const restoreModules = readModulesConfiguration(restoreConfig).map(entry =>
    cloneSketchNoMainSnapshotValue(entry)
  );
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

    const identity = readSketchExtraIdentity(entry);
    const activeEntry = activeByIdentity.get(identity);
    if (activeEntry) {
      nextBoxes.push(cloneSketchNoMainSnapshotValue(activeEntry));
      if (!areSketchNoMainSnapshotValuesEqual(activeEntry, entry)) changed = true;
    } else {
      changed = true;
    }
  }

  if (!changed) return restoreConfig;
  restoreFirstModule.sketchExtras = {
    ...cloneSketchNoMainSnapshotValue(restoreExtras),
    boxes: nextBoxes,
  };
  restoreModules[0] = restoreFirstModule;
  restoreConfig.modulesConfiguration = restoreModules;
  return restoreConfig;
}

function mergeFreeExtrasSnapshotIntoNoMainConfig(args: {
  noMainConfig: ConfigStateLike;
  freeExtras: SketchNoMainFreeExtrasSnapshot | null;
}): ConfigStateLike {
  if (!args.freeExtras) return args.noMainConfig;

  const noMainConfig = cloneSketchNoMainSnapshotValue(args.noMainConfig);
  const modules = readModulesConfiguration(noMainConfig).map(entry => cloneSketchNoMainSnapshotValue(entry));
  const firstModule = readRecord(modules[0]) || {};
  const baseExtras = readRecord(firstModule.sketchExtras) || {};
  const nextExtras: UnknownRecord = { ...baseExtras };

  for (const key of SKETCH_NO_MAIN_EXTRA_LIST_KEYS) {
    const incoming = normalizeSketchExtraList(key, args.freeExtras.sketchExtras[key]);
    if (!incoming.length) continue;
    nextExtras[key] = mergeSketchExtraLists(baseExtras[key], incoming, key);
  }

  firstModule.sketchExtras = nextExtras;
  modules[0] = firstModule;
  noMainConfig.modulesConfiguration = modules.length ? modules : [firstModule];
  return noMainConfig;
}

function readRestoreSnapshot(ui: UiStateLike): SketchNoMainRestoreSnapshot | null {
  return decodeSketchNoMainRestoreSnapshot(ui[SKETCH_NO_MAIN_RESTORE_KEY]);
}

function readFreeExtrasSnapshot(ui: UiStateLike): SketchNoMainFreeExtrasSnapshot | null {
  return decodeSketchNoMainFreeExtrasSnapshot(ui[SKETCH_NO_MAIN_FREE_EXTRAS_KEY]);
}

function applyNoMainTransaction(args: {
  app: AppContainer;
  source: string;
  meta: ActionMetaLike;
  uiPatch: UiSlicePatch;
  configSnapshot: ConfigStateLike;
}): void {
  const { app, source, meta, uiPatch, configSnapshot } = args;
  const recomputeUiPatch: UnknownRecord = { ...uiPatch };
  if (uiPatch.raw) recomputeUiPatch.raw = { ...uiPatch.raw };
  applyStructureTemplateSnapshotRecomputeTransaction({
    app,
    source,
    meta,
    uiPatch: recomputeUiPatch,
    prepareTransaction: () =>
      commitUiConfigSnapshot(
        app,
        {
          ui: uiPatch,
          config: configSnapshot,
        },
        meta
      ),
  });
}

export function hasSketchNoMainRestoreSnapshot(ui: UiStateLike | null | undefined): boolean {
  return !!(ui && readRestoreSnapshot(ui));
}

export function isSketchNoMainWardrobeActive(args: {
  ui: UiStateLike | null | undefined;
  wardrobeType: string;
}): boolean {
  return (
    args.wardrobeType !== 'sliding' &&
    readUiRawInt(args.ui || {}, 'doors', WARDROBE_DEFAULTS.byType.hinged.doorsCount) === 0
  );
}

export function toggleSketchNoMainWardrobe(args: {
  app: AppContainer;
  meta: MetaActionsNamespaceLike;
}): SketchNoMainToggleResult {
  const { app, meta } = args;
  const ui = getUiSnapshot(app) as UiStateLike;
  const config = getConfigSnapshot(app) as ConfigStateLike;
  const wardrobeType = config.wardrobeType === 'sliding' ? 'sliding' : 'hinged';
  const active = isSketchNoMainWardrobeActive({ ui, wardrobeType });

  if (!active) {
    const restore = createSketchNoMainRestoreSnapshot(ui, config);
    const uiPatch = createNoMainUiPatch(ui, restore);
    const configSnapshot = mergeFreeExtrasSnapshotIntoNoMainConfig({
      noMainConfig: createNoMainConfigSnapshot(config),
      freeExtras: readFreeExtrasSnapshot(ui),
    });
    const source = 'react:sketch:noMainWardrobe:enable';
    applyNoMainTransaction({
      app,
      source,
      meta: createStructureTabNoBuildImmediateMeta(meta, source),
      uiPatch,
      configSnapshot,
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
  applyNoMainTransaction({
    app,
    source,
    meta: createStructureTabNoBuildImmediateMeta(meta, source),
    uiPatch,
    configSnapshot,
  });
  return { ok: true, active: false, restored: true };
}
