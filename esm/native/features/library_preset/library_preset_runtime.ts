import type {
  ActionMetaLike,
  CurtainMap,
  DoorSpecialMap,
  DoorStyleMap,
  IndividualColorsMap,
  ModulesConfigurationLike,
  UiRawInputsLike,
} from '../../../../types';
import type { LibraryPresetEnv, LibraryPresetUiOverride } from './library_preset_types.js';

export type LibraryPresetRuntimeSurface = {
  batch: (fn: () => void, meta: ActionMetaLike) => unknown;
  metaMerge: (meta?: ActionMetaLike, defaults?: ActionMetaLike, src?: string) => ActionMetaLike;
  metaNoBuild: (meta?: ActionMetaLike, src?: string) => ActionMetaLike;
  metaNoHistory: (meta?: ActionMetaLike, src?: string) => ActionMetaLike;
  setCfgModulesConfiguration: (next: ModulesConfigurationLike | null, meta: ActionMetaLike) => unknown;
  setCfgLowerModulesConfiguration: (next: ModulesConfigurationLike | null, meta: ActionMetaLike) => unknown;
  setCfgLibraryMode: (on: boolean, meta: ActionMetaLike) => unknown;
  setCfgMultiColorMode: (on: boolean, meta: ActionMetaLike) => unknown;
  setCfgIndividualColors: (next: IndividualColorsMap, meta: ActionMetaLike) => unknown;
  setCfgCurtainMap: (next: CurtainMap, meta: ActionMetaLike) => unknown;
  setCfgDoorSpecialMap: (next: DoorSpecialMap, meta: ActionMetaLike) => unknown;
  setCfgDoorStyleMap: (next: DoorStyleMap, meta: ActionMetaLike) => unknown;
  setUiDoors: (value: UiRawInputsLike['doors'], meta: ActionMetaLike) => unknown;
  setUiWidth: (value: UiRawInputsLike['width'], meta: ActionMetaLike) => unknown;
  setUiStackSplitEnabled: (on: boolean, meta: ActionMetaLike) => unknown;
  setUiStackSplitLowerHeight: (
    value: UiRawInputsLike['stackSplitLowerHeight'],
    meta: ActionMetaLike
  ) => unknown;
  setUiStackSplitLowerDepth: (
    value: UiRawInputsLike['stackSplitLowerDepth'],
    meta: ActionMetaLike
  ) => unknown;
  setUiStackSplitLowerWidth: (
    value: UiRawInputsLike['stackSplitLowerWidth'],
    meta: ActionMetaLike
  ) => unknown;
  setUiStackSplitLowerDoors: (
    value: UiRawInputsLike['stackSplitLowerDoors'],
    meta: ActionMetaLike
  ) => unknown;
  setUiStackSplitLowerDepthManual: (on: boolean, meta: ActionMetaLike) => unknown;
  setUiStackSplitLowerWidthManual: (on: boolean, meta: ActionMetaLike) => unknown;
  setUiStackSplitLowerDoorsManual: (on: boolean, meta: ActionMetaLike) => unknown;
  runStructuralRecompute: (uiOverride: LibraryPresetUiOverride, src: string) => unknown;
  setMulticolorEnabled: (on: boolean, src: string) => unknown;
  exitPaintMode: () => unknown;
};

export function createLibraryPresetRuntime(env: LibraryPresetEnv): LibraryPresetRuntimeSurface {
  const metaMerge = (meta?: ActionMetaLike, defaults?: ActionMetaLike, src?: string): ActionMetaLike => {
    const fn = env && env.meta && typeof env.meta.merge === 'function' ? env.meta.merge : null;
    if (fn) return fn(meta || {}, defaults || {}, src || meta?.source || 'meta:merge');
    return { ...(defaults || {}), ...(meta || {}) };
  };

  const metaNoBuild = (meta?: ActionMetaLike, src?: string): ActionMetaLike => {
    const fn = env && env.meta && typeof env.meta.noBuild === 'function' ? env.meta.noBuild : null;
    if (fn) return fn(meta || {}, src || meta?.source || 'meta:noBuild');
    return { ...metaMerge(meta, undefined, src), noBuild: true };
  };

  const metaNoHistory = (meta?: ActionMetaLike, src?: string): ActionMetaLike => {
    const fn = env && env.meta && typeof env.meta.noHistory === 'function' ? env.meta.noHistory : null;
    if (fn) return fn(meta || {}, src || meta?.source || 'meta:noHistory');
    return { ...metaMerge(meta, undefined, src), noHistory: true };
  };

  return {
    batch: (fn, meta) => {
      if (env && env.history && typeof env.history.batch === 'function') return env.history.batch(fn, meta);
      return fn();
    },
    metaMerge,
    metaNoBuild,
    metaNoHistory,
    setCfgModulesConfiguration: (next, meta) => env.config.setModulesConfiguration(next, meta),
    setCfgLowerModulesConfiguration: (next, meta) => env.config.setLowerModulesConfiguration(next, meta),
    setCfgLibraryMode: (on, meta) => env.config.setLibraryMode(!!on, meta),
    setCfgMultiColorMode: (on, meta) => env.config.setMultiColorMode(!!on, meta),
    setCfgIndividualColors: (next, meta) => env.config.setIndividualColors(next, meta),
    setCfgCurtainMap: (next, meta) => env.config.setCurtainMap(next, meta),
    setCfgDoorSpecialMap: (next, meta) => env.config.setDoorSpecialMap(next, meta),
    setCfgDoorStyleMap: (next, meta) => env.config.applyProjectSnapshot({ doorStyleMap: next }, meta),
    setUiDoors: (value, meta) => env.ui.setDoors(value, meta),
    setUiWidth: (value, meta) => env.ui.setWidth(value, meta),
    setUiStackSplitEnabled: (on, meta) => env.ui.setStackSplitEnabled(!!on, meta),
    setUiStackSplitLowerHeight: (value, meta) => env.ui.setStackSplitLowerHeight(value, meta),
    setUiStackSplitLowerDepth: (value, meta) => env.ui.setStackSplitLowerDepth(value, meta),
    setUiStackSplitLowerWidth: (value, meta) => env.ui.setStackSplitLowerWidth(value, meta),
    setUiStackSplitLowerDoors: (value, meta) => env.ui.setStackSplitLowerDoors(value, meta),
    setUiStackSplitLowerDepthManual: (on, meta) => env.ui.setStackSplitLowerDepthManual(!!on, meta),
    setUiStackSplitLowerWidthManual: (on, meta) => env.ui.setStackSplitLowerWidthManual(!!on, meta),
    setUiStackSplitLowerDoorsManual: (on, meta) => env.ui.setStackSplitLowerDoorsManual(!!on, meta),
    runStructuralRecompute: (uiOverride, src) => env.runStructuralRecompute(uiOverride, src),
    setMulticolorEnabled: (on, src) => {
      const fn =
        env.multicolor && typeof env.multicolor.setEnabled === 'function' ? env.multicolor.setEnabled : null;
      if (fn) return fn(!!on, { source: src, immediate: true });
      return undefined;
    },
    exitPaintMode: () => {
      const fn =
        env.multicolor && typeof env.multicolor.exitPaintMode === 'function'
          ? env.multicolor.exitPaintMode
          : null;
      if (fn) return fn();
      return undefined;
    },
  };
}
