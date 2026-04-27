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
import { createInvariantDoorMapMutators } from './library_preset_flow_shared.js';

export function ensureLibraryPresetInvariants(env: LibraryPresetEnv, args: LibraryPresetEnsureArgs): void {
  if (!args.isLibraryMode) return;
  const src = 'react:structure:library:ensure';
  const runtime = createLibraryPresetRuntime(env);

  try {
    const cfg = env.config.get();
    const ui = env.ui.get();
    const topDoorsCount = normDoorCount(args.doors, args.wardrobeType);
    const bottomDoorsCount = normDoorCount(args.stackSplitLowerDoors, args.wardrobeType);
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

    for (let id = 1; id <= topDoorsCount; id++) {
      const base = `d${id}`;
      mutators.setSpecial(`${base}_full`, 'glass');
      mutators.setSpecial(base, 'glass');
      // Keep the top library doors as glass, but do not force curtainMap back to "none" here.
      // Library-mode activation seeds the default no-curtain state once; after that, curtain
      // selection is user-editable and invariants must preserve the override instead of erasing it.
    }

    const bottomBase = 1000;
    for (let i = 1; i <= bottomDoorsCount; i++) {
      const doorId = bottomBase + i;
      const base = `d${doorId}`;
      mutators.delSpecial(base);
      for (const key of doorPartKeys(doorId)) {
        mutators.delColor(key);
        mutators.delSpecial(key);
        mutators.delCurtainIfNone(key);
      }
    }

    const nextTopCfgs = buildNextLibraryModuleCfgList(curTopCfgs, topCfgList);
    const nextBottomCfgs = buildNextLibraryModuleCfgList(curBottomCfgs, bottomCfgList);
    const changed = mutators.markChanged() || !!nextTopCfgs || !!nextBottomCfgs || !cfg.isMultiColorMode;

    if (!changed) return;

    const meta: ActionMetaLike = runtime.metaNoHistory({ source: src, immediate: true }, src);
    runtime.batch(() => {
      runtime.setCfgMultiColorMode(true, meta);
      if (mutators.nextColors) runtime.setCfgIndividualColors(mutators.nextColors, meta);
      if (mutators.nextCurtains) runtime.setCfgCurtainMap(mutators.nextCurtains, meta);
      if (mutators.nextSpecial) runtime.setCfgDoorSpecialMap(mutators.nextSpecial, meta);
      if (nextTopCfgs) runtime.setCfgModulesConfiguration(nextTopCfgs, meta);
      if (nextBottomCfgs) runtime.setCfgLowerModulesConfiguration(nextBottomCfgs, meta);
    }, meta);
  } catch {
    // ignore
  }
}
