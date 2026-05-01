import type {
  ActionMetaLike,
  CurtainMap,
  DoorSpecialMap,
  IndividualColorsMap,
  ModulesConfigurationLike,
} from '../../../../types';
import type { LibraryPresetEnsureArgs, LibraryPresetEnv } from './library_preset_types.js';

import { createLibraryPresetRuntime } from './library_preset_runtime.js';
import {
  buildLibraryModuleConfigLists,
  buildNextLibraryModuleCfgList,
  cloneDoorSpecialMap,
  cloneStringMap,
  doorPartKeys,
  normDoorCount,
} from './library_preset_shared.js';
import {
  buildLibraryUiSnapshotOverride,
  createInvariantDoorMapMutators,
  type LibraryPresetInvariantDoorMutators,
} from './library_preset_flow_shared.js';

function readSeededDoorCount(raw: unknown, currentCount: number): number {
  const n = Math.round(Number(raw));
  if (!Number.isFinite(n)) return currentCount;
  return Math.max(0, Math.min(currentCount, n));
}

function seedTopLibraryDoorDefault(mutators: LibraryPresetInvariantDoorMutators, doorId: number): void {
  const base = `d${doorId}`;
  mutators.setSpecial(`${base}_full`, 'glass');
  mutators.setSpecial(base, 'glass');
  for (const key of doorPartKeys(doorId)) mutators.setCurtain(key, 'none');
}

function cleanNewBottomLibraryDoorDefault(
  mutators: LibraryPresetInvariantDoorMutators,
  doorId: number
): void {
  const base = `d${doorId}`;
  mutators.delSpecial(base);
  for (const key of doorPartKeys(doorId)) {
    mutators.delColor(key);
    mutators.delSpecial(key);
    mutators.delCurtainIfNone(key);
  }
}

export function ensureLibraryPresetInvariants(env: LibraryPresetEnv, args: LibraryPresetEnsureArgs): void {
  if (!args.isLibraryMode) return;
  const src = 'react:structure:library:ensure';
  const runtime = createLibraryPresetRuntime(env);

  try {
    const cfg = env.config.get();
    const ui = env.ui.get();
    const topDoorsCount = normDoorCount(args.doors, args.wardrobeType);
    const bottomDoorsCount = normDoorCount(args.stackSplitLowerDoors, args.wardrobeType);
    const seededTopDoorsCount = readSeededDoorCount(args.seededTopDoorsCount, topDoorsCount);
    const seededBottomDoorsCount = readSeededDoorCount(args.seededBottomDoorsCount, bottomDoorsCount);
    const { topCfgList, bottomCfgList } = buildLibraryModuleConfigLists(
      topDoorsCount,
      bottomDoorsCount,
      args.wardrobeType,
      ui
    );

    const curTopCfgs: ModulesConfigurationLike = cfg.modulesConfiguration || [];
    const curBottomCfgs: ModulesConfigurationLike = cfg.stackSplitLowerModulesConfiguration || [];
    const baseColors: IndividualColorsMap = cloneStringMap(cfg.individualColors);
    const baseCurtains: CurtainMap = cloneStringMap(cfg.curtainMap);
    const baseSpecial: DoorSpecialMap = cloneDoorSpecialMap(cfg.doorSpecialMap);
    const mutators = createInvariantDoorMapMutators(baseColors, baseCurtains, baseSpecial);

    for (let id = seededTopDoorsCount + 1; id <= topDoorsCount; id++) {
      seedTopLibraryDoorDefault(mutators, id);
    }

    const bottomBase = 1000;
    for (let i = seededBottomDoorsCount + 1; i <= bottomDoorsCount; i++) {
      cleanNewBottomLibraryDoorDefault(mutators, bottomBase + i);
    }

    const nextTopCfgs = buildNextLibraryModuleCfgList(curTopCfgs, topCfgList);
    const nextBottomCfgs = buildNextLibraryModuleCfgList(curBottomCfgs, bottomCfgList);
    const doorMapsChanged = mutators.markChanged();
    const structuralStateChanged = doorMapsChanged || !!nextTopCfgs || !!nextBottomCfgs;
    const changed = structuralStateChanged || !cfg.isMultiColorMode;

    if (!changed) return;

    const meta: ActionMetaLike = runtime.metaNoHistory({ source: src, immediate: true }, src);
    runtime.batch(() => {
      runtime.setCfgMultiColorMode(true, meta);
      if (mutators.nextColors) runtime.setCfgIndividualColors(mutators.nextColors, meta);
      if (mutators.nextCurtains) runtime.setCfgCurtainMap(mutators.nextCurtains, meta);
      if (mutators.nextSpecial) runtime.setCfgDoorSpecialMap(mutators.nextSpecial, meta);
      if (nextTopCfgs) runtime.setCfgModulesConfiguration(nextTopCfgs, meta);
      if (nextBottomCfgs) runtime.setCfgLowerModulesConfiguration(nextBottomCfgs, meta);

      if (structuralStateChanged) {
        runtime.runStructuralRecompute(buildLibraryUiSnapshotOverride(ui), `${src}:rebuild`);
      }
    }, meta);
  } catch {
    // ignore
  }
}
