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
  buildLibraryStructureSelectPatch,
  buildLibraryUiOverride,
  captureLibraryPresetPreState,
  createLibraryDoorMaps,
  createLibraryDoorMapsFromConfig,
  isRec,
  seedBottomDimensions,
} from './library_preset_flow_shared.js';
import {
  buildLibraryModuleConfigLists,
  buildNextLibraryModuleCfgList,
  cloneModuleConfigList,
} from './library_preset_shared.js';

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
  mergeUiOverride: MergeUiOverrideFn,
  resumeState: LibraryPresetPreState | null = null
): LibraryPresetPreState | null {
  const src = 'react:structure:library';
  const runtime = createLibraryPresetRuntime(env);
  const preState = captureLibraryPresetPreState(env);
  const resumeRaw = resumeState ? resumeState.ui.raw : null;
  const { bottomH, bottomD, topW, bottomW, topDoorsCount, bottomDoorsCount } = seedBottomDimensions(
    args,
    resumeRaw
  );
  const uiSnapshot = env.ui.get();
  const structurePatch = buildLibraryStructureSelectPatch(uiSnapshot, topDoorsCount, args.wardrobeType);
  const uiForLibraryStructure = { ...uiSnapshot, ...structurePatch };
  const expectedCfgs = buildLibraryModuleConfigLists(
    topDoorsCount,
    bottomDoorsCount,
    args.wardrobeType,
    uiForLibraryStructure
  );
  const resumeTopCfgs = resumeState ? resumeState.cfg.modulesConfiguration : null;
  const resumeBottomCfgs = resumeState ? resumeState.cfg.stackSplitLowerModulesConfiguration : null;
  const topCfgList = resumeState
    ? buildNextLibraryModuleCfgList(resumeTopCfgs, expectedCfgs.topCfgList) ||
      cloneModuleConfigList(resumeTopCfgs) ||
      expectedCfgs.topCfgList
    : expectedCfgs.topCfgList;
  const bottomCfgList = resumeState
    ? buildNextLibraryModuleCfgList(resumeBottomCfgs, expectedCfgs.bottomCfgList) ||
      cloneModuleConfigList(resumeBottomCfgs) ||
      expectedCfgs.bottomCfgList
    : expectedCfgs.bottomCfgList;

  const nextDoorMaps = resumeState
    ? createLibraryDoorMapsFromConfig(resumeState.cfg)
    : createLibraryDoorMaps(env);
  if (!resumeState) {
    applyTopLibraryDoorPolicy(nextDoorMaps, topDoorsCount);
    applyBottomLibraryDoorPolicy(nextDoorMaps, bottomDoorsCount);
  }

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
    runtime.setUiDoors(topDoorsCount, meta);
    runtime.setUiWidth(topW, meta);
    runtime.setUiStackSplitEnabled(true, meta);
    runtime.setUiStackSplitLowerHeight(bottomH, meta);
    runtime.setUiStackSplitLowerDepth(bottomD, meta);
    runtime.setUiStackSplitLowerWidth(bottomW, meta);
    runtime.setUiStackSplitLowerDoors(bottomDoorsCount, meta);
    runtime.setUiStackSplitLowerDepthManual(
      resumeRaw ? !!resumeRaw.stackSplitLowerDepthManual : !!args.stackSplitLowerDepthManual,
      meta
    );
    runtime.setUiStackSplitLowerWidthManual(resumeRaw ? !!resumeRaw.stackSplitLowerWidthManual : false, meta);
    runtime.setUiStackSplitLowerDoorsManual(
      resumeRaw ? !!resumeRaw.stackSplitLowerDoorsManual : !!args.stackSplitLowerDoorsManual,
      meta
    );
    runtime.setMulticolorEnabled(true, src + ':multi');

    try {
      runtime.runStructuralRecompute(
        buildLibraryUiOverride(env, mergeUiOverride, {
          stackSplitEnabled: true,
          ...structurePatch,
          raw: {
            doors: topDoorsCount,
            width: topW,
            stackSplitLowerHeight: bottomH,
            stackSplitLowerDepth: bottomD,
            stackSplitLowerWidth: bottomW,
            stackSplitLowerDoors: bottomDoorsCount,
            stackSplitLowerDepthManual: resumeRaw
              ? !!resumeRaw.stackSplitLowerDepthManual
              : !!args.stackSplitLowerDepthManual,
            stackSplitLowerWidthManual: resumeRaw ? !!resumeRaw.stackSplitLowerWidthManual : false,
            stackSplitLowerDoorsManual: resumeRaw
              ? !!resumeRaw.stackSplitLowerDoorsManual
              : !!args.stackSplitLowerDoorsManual,
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
