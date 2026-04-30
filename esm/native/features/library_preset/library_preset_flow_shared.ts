import type {
  ActionMetaLike,
  CurtainMap,
  DoorSpecialMap,
  DoorStyleMap,
  IndividualColorsMap,
} from '../../../../types';
import type {
  LibraryPresetEnv,
  LibraryPresetPreState,
  LibraryPresetToggleArgs,
  LibraryPresetUiOverride,
  LibraryPresetUiRawState,
  LibraryPresetUiSnapshot,
  MergeUiOverrideFn,
} from './library_preset_types.js';

import { createLibraryPresetRuntime } from './library_preset_runtime.js';
import { readDoorStyleMap } from '../door_style_overrides.js';
import {
  captureModulesConfigurationSnapshot,
  cloneDoorSpecialMap,
  cloneStringMap,
  doorPartKeys,
  isRec,
  normDoorCount,
  readLibraryPresetUiRawState,
} from './library_preset_shared.js';

type LibraryDoorMaps = {
  colors: IndividualColorsMap;
  curtains: CurtainMap;
  special: DoorSpecialMap;
  style: DoorStyleMap;
};

export function applyLibraryPresetUiRawState(
  env: LibraryPresetEnv,
  raw: Partial<LibraryPresetUiRawState> | null | undefined,
  meta: ActionMetaLike
): void {
  const next = raw || {};
  const runtime = createLibraryPresetRuntime(env);
  runtime.setUiStackSplitLowerHeight(next.stackSplitLowerHeight, meta);
  runtime.setUiStackSplitLowerDepth(next.stackSplitLowerDepth, meta);
  runtime.setUiStackSplitLowerWidth(next.stackSplitLowerWidth, meta);
  runtime.setUiStackSplitLowerDoors(next.stackSplitLowerDoors, meta);
  runtime.setUiStackSplitLowerDepthManual(!!next.stackSplitLowerDepthManual, meta);
  runtime.setUiStackSplitLowerWidthManual(!!next.stackSplitLowerWidthManual, meta);
  runtime.setUiStackSplitLowerDoorsManual(!!next.stackSplitLowerDoorsManual, meta);
}

export function createLibraryDoorMaps(env: LibraryPresetEnv): LibraryDoorMaps {
  try {
    const cfg = env.config.get();
    return {
      colors: cloneStringMap(cfg.individualColors),
      curtains: cloneStringMap(cfg.curtainMap),
      special: cloneDoorSpecialMap(cfg.doorSpecialMap),
      style: readDoorStyleMap(cfg.doorStyleMap),
    };
  } catch {
    return { colors: {}, curtains: {}, special: {}, style: {} };
  }
}

export function applyTopLibraryDoorPolicy(target: LibraryDoorMaps, topDoorsCount: number): void {
  for (let id = 1; id <= topDoorsCount; id++) {
    const base = `d${id}`;
    target.special[`${base}_full`] = 'glass';
    target.special[base] = 'glass';
    for (const key of doorPartKeys(id)) {
      target.curtains[key] = 'none';
    }
  }
}

export function applyBottomLibraryDoorPolicy(target: LibraryDoorMaps, bottomDoorsCount: number): void {
  const bottomBase = 1000;
  for (let i = 1; i <= bottomDoorsCount; i++) {
    const doorId = bottomBase + i;
    const base = `d${doorId}`;
    if (Object.prototype.hasOwnProperty.call(target.special, base)) delete target.special[base];
    for (const key of doorPartKeys(doorId)) {
      if (Object.prototype.hasOwnProperty.call(target.colors, key)) delete target.colors[key];
      if (Object.prototype.hasOwnProperty.call(target.special, key)) delete target.special[key];
      if (Object.prototype.hasOwnProperty.call(target.curtains, key) && target.curtains[key] === 'none') {
        delete target.curtains[key];
      }
    }
  }
}

export function buildLibraryUiOverride(
  env: LibraryPresetEnv,
  mergeUiOverride: MergeUiOverrideFn,
  patch: LibraryPresetUiOverride
): LibraryPresetUiOverride {
  return mergeUiOverride(env.ui.get(), patch);
}

export function buildLibraryUiSnapshotOverride(ui: LibraryPresetUiSnapshot): LibraryPresetUiOverride {
  const baseUi = isRec(ui) ? ui : {};
  const { raw: _ignoredRaw, ...baseShallow } = baseUi;
  const out: LibraryPresetUiOverride = { ...baseShallow };
  const raw = readLibraryPresetUiRawState(baseUi.raw);
  if (Object.keys(raw).length) out.raw = raw;
  return out;
}

export function seedBottomDimensions(args: LibraryPresetToggleArgs): {
  bottomH: number;
  bottomD: number;
  bottomW: number;
  bottomDoorsCount: number;
  topDoorsCount: number;
} {
  const minTopCm = 40;
  const maxBottom = Math.max(0, args.height - minTopCm);
  const preserveExistingLowerHeight =
    !!args.stackSplitEnabled &&
    Number.isFinite(args.stackSplitLowerHeight) &&
    args.stackSplitLowerHeight > 0 &&
    Math.abs(args.stackSplitLowerHeight - 60) > 0.01;

  const seededBottomH = preserveExistingLowerHeight
    ? args.stackSplitLowerHeight
    : Math.min(80, maxBottom || 80);
  const bottomH = Math.max(20, Math.min(seededBottomH, maxBottom || seededBottomH));

  const seededBottomD =
    Number.isFinite(args.stackSplitLowerDepth) && args.stackSplitLowerDepth > 0
      ? args.stackSplitLowerDepth
      : Math.max(20, Math.min(args.depth - 5, args.depth));
  const bottomD = Math.max(20, seededBottomD);

  const seededBottomW =
    Number.isFinite(args.stackSplitLowerWidth) && args.stackSplitLowerWidth > 0
      ? args.stackSplitLowerWidth
      : args.width;
  const bottomW = Math.max(20, seededBottomW);

  return {
    bottomH,
    bottomD,
    bottomW,
    topDoorsCount: normDoorCount(args.doors, args.wardrobeType),
    bottomDoorsCount: normDoorCount(args.stackSplitLowerDoors, args.wardrobeType),
  };
}

export function captureLibraryPresetPreState(env: LibraryPresetEnv): LibraryPresetPreState | null {
  try {
    const cfg = env.config.get();
    const ui = env.ui.get();
    return {
      ui: {
        stackSplitEnabled: !!ui.stackSplitEnabled,
        raw: readLibraryPresetUiRawState(ui.raw),
      },
      cfg: {
        modulesConfiguration: captureModulesConfigurationSnapshot(cfg, 'modulesConfiguration'),
        stackSplitLowerModulesConfiguration: captureModulesConfigurationSnapshot(
          cfg,
          'stackSplitLowerModulesConfiguration'
        ),
        isMultiColorMode: !!cfg.isMultiColorMode,
        individualColors: cloneStringMap(cfg.individualColors),
        curtainMap: cloneStringMap(cfg.curtainMap),
        doorSpecialMap: cloneDoorSpecialMap(cfg.doorSpecialMap),
        doorStyleMap: readDoorStyleMap(cfg.doorStyleMap),
      },
    };
  } catch {
    return null;
  }
}

export type LibraryPresetInvariantDoorMutators = {
  nextColors: IndividualColorsMap | null;
  nextCurtains: CurtainMap | null;
  nextSpecial: DoorSpecialMap | null;
  markChanged: () => boolean;
  setCurtain: (key: string, val: string) => void;
  setSpecial: (key: string, val: 'glass' | 'mirror' | null) => void;
  delSpecial: (key: string) => void;
  delColor: (key: string) => void;
  delCurtainIfNone: (key: string) => void;
};

export function createInvariantDoorMapMutators(
  baseColors: IndividualColorsMap,
  baseCurtains: CurtainMap,
  baseSpecial: DoorSpecialMap
): LibraryPresetInvariantDoorMutators {
  let nextColors: IndividualColorsMap | null = null;
  let nextCurtains: CurtainMap | null = null;
  let nextSpecial: DoorSpecialMap | null = null;
  let changed = false;

  return {
    get nextColors() {
      return nextColors;
    },
    get nextCurtains() {
      return nextCurtains;
    },
    get nextSpecial() {
      return nextSpecial;
    },
    markChanged: () => changed,
    setCurtain: (key, val) => {
      const cur = nextCurtains ? nextCurtains[key] : baseCurtains[key];
      if (cur === val) return;
      if (!nextCurtains) nextCurtains = { ...baseCurtains };
      nextCurtains[key] = val;
      changed = true;
    },
    setSpecial: (key, val) => {
      const cur = nextSpecial ? nextSpecial[key] : baseSpecial[key];
      if (cur === val) return;
      if (!nextSpecial) nextSpecial = { ...baseSpecial };
      if (val == null) {
        if (Object.prototype.hasOwnProperty.call(nextSpecial, key)) delete nextSpecial[key];
      } else {
        nextSpecial[key] = val;
      }
      changed = true;
    },
    delSpecial: key => {
      const srcMap = nextSpecial || baseSpecial;
      if (!Object.prototype.hasOwnProperty.call(srcMap, key)) return;
      if (!nextSpecial) nextSpecial = { ...baseSpecial };
      if (Object.prototype.hasOwnProperty.call(nextSpecial, key)) {
        delete nextSpecial[key];
        changed = true;
      }
    },
    delColor: key => {
      const has = Object.prototype.hasOwnProperty.call(nextColors ? nextColors : baseColors, key);
      if (!has) return;
      if (!nextColors) nextColors = { ...baseColors };
      if (Object.prototype.hasOwnProperty.call(nextColors, key)) {
        delete nextColors[key];
        changed = true;
      }
    },
    delCurtainIfNone: key => {
      const srcMap = nextCurtains || baseCurtains;
      if (!Object.prototype.hasOwnProperty.call(srcMap, key)) return;
      const v = srcMap[key];
      if (v !== 'none') return;
      if (!nextCurtains) nextCurtains = { ...baseCurtains };
      if (Object.prototype.hasOwnProperty.call(nextCurtains, key)) {
        delete nextCurtains[key];
        changed = true;
      }
    },
  };
}

export { isRec };
