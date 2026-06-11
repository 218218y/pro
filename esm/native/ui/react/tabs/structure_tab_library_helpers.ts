import type { ActionMetaLike, AppContainer, MetaActionsNamespaceLike } from '../../../../../types';
import {
  getConfigSnapshot,
  getUiSnapshot,
  runHistoryBatch,
  setCfgCurtainMap,
  setCfgDoorSpecialMap,
  setCfgIndividualColors,
  setCfgLibraryMode,
  setCfgLowerModulesConfiguration,
  setCfgModulesConfiguration,
  setCfgMultiColorMode,
  applyProjectConfigSnapshot,
  setUiDoors,
  setUiStackSplitEnabled,
  setUiStackSplitLowerDepth,
  setUiStackSplitLowerDepthManual,
  setUiStackSplitLowerDoors,
  setUiStackSplitLowerDoorsManual,
  setUiStackSplitLowerHeight,
  setUiStackSplitLowerWidth,
  setUiStackSplitLowerWidthManual,
  setUiWidth,
} from '../actions/store_actions.js';
import { exitPaintMode, setMultiEnabled } from '../../multicolor_service.js';
import { runAppStructuralModulesRecompute } from '../../../services/api.js';
import type {
  LibraryPresetEnv,
  LibraryPresetUiOverride,
  LibraryPresetUiSnapshot,
} from '../../../features/library_preset/library_preset.js';

export type SingleDoorPos = 'left' | 'right' | 'center' | 'center-left' | 'center-right';

const LIBRARY_PRESET_UI_OVERRIDE_KEYS: Array<Exclude<keyof LibraryPresetUiOverride, 'raw'>> = [
  'structureSelect',
  'singleDoorPos',
  'stackSplitEnabled',
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isSingleDoorPos(value: string): value is SingleDoorPos {
  return (
    value === 'left' ||
    value === 'right' ||
    value === 'center' ||
    value === 'center-left' ||
    value === 'center-right'
  );
}

export function safeJsonParse(v: string): unknown {
  try {
    return JSON.parse(v);
  } catch {
    return null;
  }
}

export function hasArrayItem(arr: unknown, item: number): boolean {
  if (!Array.isArray(arr)) return false;
  for (const x of arr) {
    if (typeof x === 'number' && x === item) return true;
  }
  return false;
}

export function sumDoorsFromStructure(structureParsed: unknown): number | null {
  if (!Array.isArray(structureParsed)) return null;
  let sum = 0;
  for (const x of structureParsed) {
    const n = typeof x === 'number' ? x : parseInt(String(x ?? ''), 10);
    if (!Number.isFinite(n)) return null;
    sum += Math.max(0, Math.round(n));
  }
  return sum;
}

export function normalizeSingleDoorPos(doors: number, posRaw: unknown): SingleDoorPos | '' {
  const p = String(posRaw || '').trim();
  if (!p) return '';

  if (p === 'left' || p === 'right') return p;

  const allowCenter = doors === 5 || doors > 7;

  if (p === 'center') {
    if (doors === 7) return 'center-left';
    return allowCenter ? 'center' : '';
  }

  if (p === 'center-left' || p === 'center-right') {
    if (doors === 7 && isSingleDoorPos(p)) return p;
    return allowCenter ? 'center' : '';
  }

  return '';
}

export function mergeUiOverride(
  baseUi: LibraryPresetUiSnapshot,
  patch: LibraryPresetUiOverride
): LibraryPresetUiOverride {
  const { raw: _ignoredBaseRaw, ...baseShallow } = isRecord(baseUi) ? baseUi : {};
  const out: LibraryPresetUiOverride = { ...baseShallow };

  for (const key of LIBRARY_PRESET_UI_OVERRIDE_KEYS) {
    if (key in patch) out[key] = patch[key];
  }

  const baseRaw = isRecord(baseUi.raw) ? baseUi.raw : undefined;
  const patchRaw = isRecord(patch.raw) ? patch.raw : undefined;
  if (baseRaw || patchRaw) out.raw = { ...(baseRaw || {}), ...(patchRaw || {}) };

  return out;
}

export function createStructureTabLibraryEnv(
  app: AppContainer,
  meta: MetaActionsNamespaceLike | null | undefined
): LibraryPresetEnv {
  const metaNs = meta || null;

  const merge = (m?: ActionMetaLike, defaults?: ActionMetaLike, src?: string): ActionMetaLike => {
    const fn = metaNs?.merge;
    if (typeof fn === 'function') return fn(m || {}, defaults || {}, src);
    return { ...(defaults || {}), ...(m || {}), ...(src ? { source: src } : {}) };
  };

  const noBuild = (m?: ActionMetaLike, src?: string): ActionMetaLike => {
    const fn = metaNs?.noBuild;
    if (typeof fn === 'function') return fn(m || {}, src);
    const mm = merge(m, {}, src);
    mm.noBuild = true;
    if (src && typeof mm.source !== 'string') mm.source = src;
    return mm;
  };

  const noHistory = (m?: ActionMetaLike, src?: string): ActionMetaLike => {
    const fn = metaNs?.noHistory;
    if (typeof fn === 'function') return fn(m || {}, src);
    const mm = merge(m, {}, src);
    mm.noHistory = true;
    if (src && typeof mm.source !== 'string') mm.source = src;
    return mm;
  };

  const env: LibraryPresetEnv = {
    history: {
      batch: (fn: () => void, m?: ActionMetaLike) => runHistoryBatch(app, fn, m),
    },
    meta: {
      merge,
      noBuild,
      noHistory,
    },
    config: {
      get: () => getConfigSnapshot(app),
      setModulesConfiguration: (next, m?: ActionMetaLike) => setCfgModulesConfiguration(app, next, m),
      setLowerModulesConfiguration: (next, m?: ActionMetaLike) =>
        setCfgLowerModulesConfiguration(app, next, m),
      setLibraryMode: (on: boolean, m?: ActionMetaLike) => setCfgLibraryMode(app, !!on, m),
      setMultiColorMode: (on: boolean, m?: ActionMetaLike) => setCfgMultiColorMode(app, !!on, m),
      setIndividualColors: (next, m?: ActionMetaLike) => setCfgIndividualColors(app, next, m),
      setCurtainMap: (next, m?: ActionMetaLike) => setCfgCurtainMap(app, next, m),
      setDoorSpecialMap: (next, m?: ActionMetaLike) => setCfgDoorSpecialMap(app, next, m),
      applyProjectSnapshot: (snapshot, m?: ActionMetaLike) => applyProjectConfigSnapshot(app, snapshot, m),
    },
    ui: {
      get: () => getUiSnapshot(app),
      setDoors: (next, m?: ActionMetaLike) => setUiDoors(app, next, m),
      setWidth: (next, m?: ActionMetaLike) => setUiWidth(app, next, m),
      setStackSplitEnabled: (on: boolean, m?: ActionMetaLike) => setUiStackSplitEnabled(app, !!on, m),
      setStackSplitLowerHeight: (next, m?: ActionMetaLike) => setUiStackSplitLowerHeight(app, next, m),
      setStackSplitLowerDepth: (next, m?: ActionMetaLike) => setUiStackSplitLowerDepth(app, next, m),
      setStackSplitLowerWidth: (next, m?: ActionMetaLike) => setUiStackSplitLowerWidth(app, next, m),
      setStackSplitLowerDoors: (next, m?: ActionMetaLike) => setUiStackSplitLowerDoors(app, next, m),
      setStackSplitLowerDepthManual: (on: boolean, m?: ActionMetaLike) =>
        setUiStackSplitLowerDepthManual(app, !!on, m),
      setStackSplitLowerWidthManual: (on: boolean, m?: ActionMetaLike) =>
        setUiStackSplitLowerWidthManual(app, !!on, m),
      setStackSplitLowerDoorsManual: (on: boolean, m?: ActionMetaLike) =>
        setUiStackSplitLowerDoorsManual(app, !!on, m),
    },
    runStructuralRecompute: (uiOverride, src) =>
      runAppStructuralModulesRecompute(
        app,
        uiOverride,
        null,
        { source: src, force: true },
        {
          structureChanged: true,
          preserveTemplate: true,
          anchorSide: 'left',
        },
        {}
      ),
    multicolor: {
      setEnabled: (on: boolean, m?: ActionMetaLike) => setMultiEnabled(app, !!on, m),
      exitPaintMode: () => exitPaintMode(app),
    },
  };

  return env;
}
