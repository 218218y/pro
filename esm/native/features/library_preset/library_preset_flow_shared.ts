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
  normalizeLibraryStructureSelectForDoors,
  readLibraryPresetUiRawState,
} from './library_preset_shared.js';
import {
  LIBRARY_PRESET_DIMENSIONS,
  WARDROBE_DEFAULTS,
} from '../../../shared/wardrobe_dimension_tokens_shared.js';
import { calcLibraryPresetAutoWidth, LIBRARY_PRESET_DEFAULT_DOORS } from './module_defaults.js';

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
  runtime.setUiDoors(next.doors, meta);
  runtime.setUiWidth(next.width, meta);
  runtime.setUiStackSplitLowerHeight(next.stackSplitLowerHeight, meta);
  runtime.setUiStackSplitLowerDepth(next.stackSplitLowerDepth, meta);
  runtime.setUiStackSplitLowerWidth(next.stackSplitLowerWidth, meta);
  runtime.setUiStackSplitLowerDoors(next.stackSplitLowerDoors, meta);
  runtime.setUiStackSplitLowerDepthManual(!!next.stackSplitLowerDepthManual, meta);
  runtime.setUiStackSplitLowerWidthManual(!!next.stackSplitLowerWidthManual, meta);
  runtime.setUiStackSplitLowerDoorsManual(!!next.stackSplitLowerDoorsManual, meta);
}

export function createLibraryDoorMapsFromConfig(cfg: unknown): LibraryDoorMaps {
  if (!isRec(cfg)) return { colors: {}, curtains: {}, special: {}, style: {} };
  return {
    colors: cloneStringMap(cfg.individualColors),
    curtains: cloneStringMap(cfg.curtainMap),
    special: cloneDoorSpecialMap(cfg.doorSpecialMap),
    style: readDoorStyleMap(cfg.doorStyleMap),
  };
}

export function createLibraryDoorMaps(env: LibraryPresetEnv): LibraryDoorMaps {
  try {
    return createLibraryDoorMapsFromConfig(env.config.get());
  } catch {
    return { colors: {}, curtains: {}, special: {}, style: {} };
  }
}

export function applyTopLibraryDoorPolicy(target: LibraryDoorMaps, topDoorsCount: number): void {
  for (let id = 1; id <= topDoorsCount; id++) {
    const base = `d${id}`;
    target.special[`${base}_full`] = 'glass';
    target.special[base] = 'glass';
    target.style[`${base}_full`] = 'profile';
    target.style[base] = 'profile';
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
      if (Object.prototype.hasOwnProperty.call(target.style, key)) delete target.style[key];
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

export function buildLibraryStructureSelectPatch(
  ui: LibraryPresetUiSnapshot,
  doorsCount: number,
  wardrobeType: 'hinged' | 'sliding'
): Pick<LibraryPresetUiOverride, 'structureSelect'> | {} {
  const next = normalizeLibraryStructureSelectForDoors(doorsCount, wardrobeType, ui.structureSelect);
  return next === ui.structureSelect ? {} : { structureSelect: next };
}

export function buildLibraryUiSnapshotOverride(
  ui: LibraryPresetUiSnapshot,
  wardrobeType: 'hinged' | 'sliding' = 'hinged'
): LibraryPresetUiOverride {
  const baseUi = isRec(ui) ? ui : {};
  const { raw: _ignoredRaw, ...baseShallow } = baseUi;
  const out: LibraryPresetUiOverride = { ...baseShallow };
  const raw = readLibraryPresetUiRawState(baseUi.raw);
  if (Object.keys(raw).length) out.raw = raw;
  const rawDoors = Number(raw.doors);
  if (Number.isFinite(rawDoors)) {
    Object.assign(out, buildLibraryStructureSelectPatch(baseUi, rawDoors, wardrobeType));
  }
  return out;
}

export function readLibraryPresetDefaultDoorCount(wardrobeType: 'hinged' | 'sliding'): number {
  return normDoorCount(LIBRARY_PRESET_DEFAULT_DOORS, wardrobeType);
}

function readPositiveNumber(raw: unknown, defaultValue: number): number {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : defaultValue;
}

export function seedBottomDimensions(
  args: LibraryPresetToggleArgs,
  resumeRaw?: Partial<LibraryPresetUiRawState> | null
): {
  bottomH: number;
  bottomD: number;
  topW: number;
  bottomW: number;
  bottomDoorsCount: number;
  topDoorsCount: number;
} {
  const minTopCm = LIBRARY_PRESET_DIMENSIONS.minTopHeightCm;
  const maxBottom = Math.max(0, args.height - minTopCm);
  const libraryDefaultDoors = readLibraryPresetDefaultDoorCount(args.wardrobeType);
  const topDoorsCount = resumeRaw ? normDoorCount(resumeRaw.doors, args.wardrobeType) : libraryDefaultDoors;
  const bottomDoorsCount = resumeRaw
    ? normDoorCount(resumeRaw.stackSplitLowerDoors ?? topDoorsCount, args.wardrobeType)
    : libraryDefaultDoors;
  const preserveExistingLowerHeight =
    !resumeRaw &&
    !!args.stackSplitEnabled &&
    Number.isFinite(args.stackSplitLowerHeight) &&
    args.stackSplitLowerHeight > 0 &&
    Math.abs(args.stackSplitLowerHeight - WARDROBE_DEFAULTS.stackSplit.lowerHeightCm) > 0.01;

  const defaultBottomH = Math.min(
    LIBRARY_PRESET_DIMENSIONS.defaultLowerHeightCm,
    maxBottom || LIBRARY_PRESET_DIMENSIONS.defaultLowerHeightCm
  );
  const seededBottomH = resumeRaw
    ? readPositiveNumber(resumeRaw.stackSplitLowerHeight, defaultBottomH)
    : preserveExistingLowerHeight
      ? args.stackSplitLowerHeight
      : defaultBottomH;
  const bottomH = Math.max(
    LIBRARY_PRESET_DIMENSIONS.minLowerHeightCm,
    Math.min(seededBottomH, maxBottom || seededBottomH)
  );

  const defaultBottomD = Math.max(
    LIBRARY_PRESET_DIMENSIONS.minLowerDepthCm,
    Math.min(args.depth - LIBRARY_PRESET_DIMENSIONS.lowerDepthInsetCm, args.depth)
  );
  const seededBottomD = resumeRaw
    ? readPositiveNumber(resumeRaw.stackSplitLowerDepth, defaultBottomD)
    : Number.isFinite(args.stackSplitLowerDepth) && args.stackSplitLowerDepth > 0
      ? args.stackSplitLowerDepth
      : defaultBottomD;
  const bottomD = Math.max(LIBRARY_PRESET_DIMENSIONS.minLowerDepthCm, seededBottomD);

  const topW = Math.max(
    LIBRARY_PRESET_DIMENSIONS.minWidthCm,
    readPositiveNumber(resumeRaw?.width, calcLibraryPresetAutoWidth(topDoorsCount))
  );
  const bottomW = Math.max(
    LIBRARY_PRESET_DIMENSIONS.minWidthCm,
    readPositiveNumber(resumeRaw?.stackSplitLowerWidth, topW)
  );

  return {
    bottomH,
    bottomD,
    topW,
    bottomW,
    topDoorsCount,
    bottomDoorsCount,
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
  nextStyle: DoorStyleMap | null;
  markChanged: () => boolean;
  setCurtain: (key: string, val: string) => void;
  setSpecial: (key: string, val: 'glass' | 'mirror' | null) => void;
  delSpecial: (key: string) => void;
  delColor: (key: string) => void;
  delCurtainIfNone: (key: string) => void;
  setStyle: (key: string, val: 'flat' | 'profile' | 'tom') => void;
  delStyle: (key: string) => void;
};

export function createInvariantDoorMapMutators(
  baseColors: IndividualColorsMap,
  baseCurtains: CurtainMap,
  baseSpecial: DoorSpecialMap,
  baseStyle: DoorStyleMap
): LibraryPresetInvariantDoorMutators {
  let nextColors: IndividualColorsMap | null = null;
  let nextCurtains: CurtainMap | null = null;
  let nextSpecial: DoorSpecialMap | null = null;
  let nextStyle: DoorStyleMap | null = null;
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
    get nextStyle() {
      return nextStyle;
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
    setStyle: (key, val) => {
      const cur = nextStyle ? nextStyle[key] : baseStyle[key];
      if (cur === val) return;
      if (!nextStyle) nextStyle = { ...baseStyle };
      nextStyle[key] = val;
      changed = true;
    },
    delStyle: key => {
      const srcMap = nextStyle || baseStyle;
      if (!Object.prototype.hasOwnProperty.call(srcMap, key)) return;
      if (!nextStyle) nextStyle = { ...baseStyle };
      if (Object.prototype.hasOwnProperty.call(nextStyle, key)) {
        delete nextStyle[key];
        changed = true;
      }
    },
  };
}

export { isRec };
