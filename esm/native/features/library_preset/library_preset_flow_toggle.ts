import type { ActionMetaLike } from '../../../../types';
import type {
  LibraryPresetEnv,
  LibraryPresetPreState,
  LibraryPresetToggleArgs,
  MergeUiOverrideFn,
} from './library_preset_types.js';

import { createLibraryPresetRuntime } from './library_preset_runtime.js';
import {
  applyBottomLibraryDoorPolicy,
  applyLibraryPresetUiRawState,
  applyTopLibraryDoorPolicy,
  buildLibraryUiOverride,
  captureLibraryPresetPreState,
  createLibraryDoorMaps,
  isRec,
  seedBottomDimensions,
} from './library_preset_flow_shared.js';
import { buildLibraryModuleConfigLists } from './library_preset_shared.js';

export function restoreLibraryPresetPreState(
  env: LibraryPresetEnv,
  args: LibraryPresetToggleArgs,
  mergeUiOverride: MergeUiOverrideFn,
  preState: LibraryPresetPreState | null
): LibraryPresetPreState | null {
  const src = 'react:structure:library';
  const runtime = createLibraryPresetRuntime(env);

  const preUi = preState ? preState.ui : null;
  const preCfg = preState ? preState.cfg : null;
  const restoreStack = preUi ? preUi.stackSplitEnabled : args.stackSplitEnabled;
  const rawRestore = preUi ? preUi.raw : null;
  const restoreMulti = preCfg ? preCfg.isMultiColorMode : false;
  const meta: ActionMetaLike = runtime.metaNoBuild({ source: src + ':off', immediate: true }, src + ':off');

  runtime.batch(() => {
    env.config.applyProjectSnapshot(
      {
        isLibraryMode: false,
        modulesConfiguration: preCfg ? (preCfg.modulesConfiguration ?? null) : null,
        stackSplitLowerModulesConfiguration: preCfg
          ? (preCfg.stackSplitLowerModulesConfiguration ?? null)
          : null,
        isMultiColorMode: restoreMulti,
        individualColors: preCfg && isRec(preCfg.individualColors) ? preCfg.individualColors : {},
        curtainMap: preCfg && isRec(preCfg.curtainMap) ? preCfg.curtainMap : {},
        doorSpecialMap: preCfg && isRec(preCfg.doorSpecialMap) ? preCfg.doorSpecialMap : {},
        doorStyleMap: preCfg && isRec(preCfg.doorStyleMap) ? preCfg.doorStyleMap : {},
      },
      { ...meta, source: src + ':restoreCfg' }
    );

    runtime.setUiStackSplitEnabled(restoreStack, meta);
    applyLibraryPresetUiRawState(env, rawRestore, meta);
    runtime.setMulticolorEnabled(restoreMulti, src + ':multiRestore');
    if (!restoreMulti) runtime.exitPaintMode();

    try {
      runtime.runStructuralRecompute(
        buildLibraryUiOverride(env, mergeUiOverride, {
          stackSplitEnabled: restoreStack,
          ...(rawRestore ? { raw: rawRestore } : {}),
        }),
        src + ':off'
      );
    } catch {
      // ignore
    }
  }, meta);

  return null;
}

export function applyLibraryPresetMode(
  env: LibraryPresetEnv,
  args: LibraryPresetToggleArgs,
  mergeUiOverride: MergeUiOverrideFn
): LibraryPresetPreState | null {
  const src = 'react:structure:library';
  const runtime = createLibraryPresetRuntime(env);
  const preState = captureLibraryPresetPreState(env);
  const { bottomH, bottomD, bottomW, topDoorsCount, bottomDoorsCount } = seedBottomDimensions(args);
  const { topCfgList, bottomCfgList } = buildLibraryModuleConfigLists(
    topDoorsCount,
    bottomDoorsCount,
    args.wardrobeType,
    env.ui.get()
  );

  const nextDoorMaps = createLibraryDoorMaps(env);
  applyTopLibraryDoorPolicy(nextDoorMaps, topDoorsCount);
  applyBottomLibraryDoorPolicy(nextDoorMaps, bottomDoorsCount);

  const meta: ActionMetaLike = runtime.metaNoBuild({ source: src + ':on', immediate: true }, src + ':on');

  runtime.batch(() => {
    env.config.applyProjectSnapshot(
      {
        modulesConfiguration: topCfgList,
        stackSplitLowerModulesConfiguration: bottomCfgList,
        isLibraryMode: true,
        isMultiColorMode: true,
        individualColors: nextDoorMaps.colors,
        curtainMap: nextDoorMaps.curtains,
        doorSpecialMap: nextDoorMaps.special,
        doorStyleMap: nextDoorMaps.style,
      },
      meta
    );

    runtime.setCfgLibraryMode(true, meta);
    runtime.setUiStackSplitEnabled(true, meta);
    runtime.setUiStackSplitLowerHeight(bottomH, meta);
    runtime.setUiStackSplitLowerDepth(bottomD, meta);
    runtime.setUiStackSplitLowerWidth(bottomW, meta);
    runtime.setUiStackSplitLowerDoors(bottomDoorsCount, meta);
    runtime.setUiStackSplitLowerDepthManual(!!args.stackSplitLowerDepthManual, meta);
    runtime.setUiStackSplitLowerWidthManual(!!args.stackSplitLowerWidthManual, meta);
    runtime.setUiStackSplitLowerDoorsManual(!!args.stackSplitLowerDoorsManual, meta);
    runtime.setMulticolorEnabled(true, src + ':multi');

    try {
      runtime.runStructuralRecompute(
        buildLibraryUiOverride(env, mergeUiOverride, {
          stackSplitEnabled: true,
          raw: {
            stackSplitLowerHeight: bottomH,
            stackSplitLowerDepth: bottomD,
            stackSplitLowerWidth: bottomW,
            stackSplitLowerDoors: bottomDoorsCount,
            stackSplitLowerDepthManual: !!args.stackSplitLowerDepthManual,
            stackSplitLowerWidthManual: !!args.stackSplitLowerWidthManual,
            stackSplitLowerDoorsManual: !!args.stackSplitLowerDoorsManual,
          },
        }),
        src + ':on'
      );
    } catch {
      // ignore
    }
  }, meta);

  return preState;
}
