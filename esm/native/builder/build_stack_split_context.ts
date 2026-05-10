import { createBuildContext } from './build_context.js';
import { readBuildContext } from './build_flow_readers.js';

import type { BuildContextLike } from '../../../types';
import type {
  BuildStackSplitLowerUnitArgs,
  PreparedStackSplitLowerSetup,
} from './build_stack_split_shared.js';

export function createStackSplitLowerBuildContext(args: {
  buildArgs: BuildStackSplitLowerUnitArgs;
  prepared: PreparedStackSplitLowerSetup;
}): BuildContextLike {
  const { buildArgs, prepared } = args;

  return createBuildContext({
    App: buildArgs.App,
    THREE: buildArgs.THREE,
    state: buildArgs.state,
    ui: prepared.uiBottom,
    runtime: buildArgs.runtime,
    cfg: buildArgs.cfg,
    label: buildArgs.label,

    flags: {
      sketchMode: buildArgs.sketchMode,
      globalClickMode: !!buildArgs.globalClickMode,
      hadEditHold: !!buildArgs.hadEditHold,
      isCornerMode: !!buildArgs.isCornerMode,
      handleControlEnabled: !!buildArgs.handleControlEnabled,
      showHangerEnabled: !!buildArgs.showHangerEnabled,
      showContentsEnabled: !!buildArgs.showContentsEnabled,
      splitDoors: !!buildArgs.splitDoors,
      hasCornice: !!buildArgs.hasCornice,
      isGroovesEnabled: !!buildArgs.isGroovesEnabled,
      isInternalDrawersEnabled: !!buildArgs.isInternalDrawersEnabled,

      stackSplitEnabled: !!buildArgs.stackSplitEnabled,
      stackSplitDecorativeSeparatorEnabled: !!buildArgs.stackSplitDecorativeSeparatorEnabled,
      stackSplitActive: true,
      stackSplitLowerHeightCm: buildArgs.lowerHeightCm,
      stackSplitLowerDepthCm: buildArgs.lowerDepthCm,
      stackSplitLowerWidthCm: prepared.bottomWidthCm,
      stackSplitLowerDoorsCount: prepared.bottomDoorsCount,

      __wpStack: 'bottom',
      doorIdStart: prepared.lowerDoorIdStart,
    },

    dims: {
      widthCm: prepared.bottomWidthCm,
      heightCm: prepared.splitBottomHeightCm,
      depthCm: prepared.splitBottomDepthCm,
      doorsCount: prepared.bottomDoorsCount,
      chestDrawersCount: buildArgs.chestDrawersCount,
      H: prepared.bottomH,
      defaultH: prepared.bottomH,
      totalW: prepared.bottomTotalW,
      D: prepared.bottomD,
      defaultD: prepared.bottomD,
      woodThick: buildArgs.woodThick,
      startY: prepared.bottomStartY,
      cabinetBodyHeight: prepared.bottomCabinetBodyHeight,
      cabinetTopY: prepared.bottomCabinetTopY,
      internalDepth: prepared.bottomInternalDepth,
      internalZ: prepared.bottomInternalZ,
      splitLineY: prepared.bottomSplitLineY,
    },

    strings: {
      doorStyle: buildArgs.doorStyle,
      baseType: buildArgs.baseTypeBottom,
      baseLegStyle: buildArgs.baseLegStyle,
      baseLegColor: buildArgs.baseLegColor,
      baseLegHeightCm: buildArgs.baseLegHeightCm,
      baseLegWidthCm: buildArgs.baseLegWidthCm,
    },

    layout: {
      modules: prepared.bottomModules,
      moduleCfgList: prepared.bottomModuleCfgList,
      singleUnitWidth: prepared.bottomSingleUnitWidth,
      moduleInternalWidths: prepared.bottomModuleInternalWidths,
      hingedDoorPivotMap: prepared.bottomHingedDoorPivotMap,
    },

    materials: {
      colorHex: buildArgs.colorHex,
      useTexture: buildArgs.useTexture,
      textureDataURL: buildArgs.textureDataURL,
      globalFrontMat: buildArgs.globalFrontMat,
      bodyMat: buildArgs.bodyMat,
      masoniteMat: buildArgs.masoniteMat,
      whiteMat: buildArgs.whiteMat,
      shadowMat: buildArgs.shadowMat,
      legMat: buildArgs.legMat,
    },

    create: {
      createBoard: buildArgs.createBoard,
      createDoorVisual: buildArgs.createDoorVisual,
      createInternalDrawerBox: buildArgs.createInternalDrawerBox,
      createHandleMesh: buildArgs.createHandleMesh,
    },

    resolvers: {
      doorState: buildArgs.doorState,
      getPartMaterial: buildArgs.getPartMaterial,
      getPartColorValue: buildArgs.getPartColorValue,
      getHandleType: prepared.getHandleTypeBottom,
      isDoorRemoved: buildArgs.isDoorRemoved,
      isRemoveDoorMode: buildArgs.isRemoveDoorMode,
      removeDoorsEnabled: buildArgs.removeDoorsEnabled,
    },

    hinged: {
      useOps: !!prepared.useLowerHingedDoorOps,
      opsList: prepared.lowerHingedDoorOpsList,
      globalHandleAbsY: prepared.lowerGlobalHingedHandleAbsY,
    },

    fns: {
      getMaterial: buildArgs.getMaterial,
      addOutlines: buildArgs.addOutlines,
      buildCornerWing: buildArgs.buildCornerWing,
      addDimensionLine: buildArgs.addDimensionLine,
      restoreNotesFromSave: buildArgs.restoreNotesFromSave,
      addHangingClothes: buildArgs.addHangingClothes,
      addFoldedClothes: buildArgs.addFoldedClothes,
      addRealisticHanger: buildArgs.addRealisticHanger,
      rebuildDrawerMeta: buildArgs.rebuildDrawerMeta,
      pruneCachesSafe: buildArgs.pruneCachesSafe,
      triggerRender: buildArgs.triggerRender,
      showToast: buildArgs.showToast,
    },

    notesToPreserve: buildArgs.notesToPreserve,
  });
}

export function applyStackSplitLowerCornerWingIfNeeded(args: {
  buildArgs: BuildStackSplitLowerUnitArgs;
  lowerCtx: BuildContextLike;
}): void {
  const { buildArgs, lowerCtx } = args;
  if (!buildArgs.isCornerMode) return;

  if (typeof buildArgs.buildCornerWing !== 'function') {
    const msg = '[WardrobePro] buildCornerWing is required for stack-split corner mode but is not available.';
    console.error(msg);
    if (typeof buildArgs.showToast === 'function') buildArgs.showToast(msg, 'error');
    throw new Error(msg);
  }

  const lowerDims = readBuildContext(lowerCtx)?.dims;
  if (!lowerDims || typeof lowerDims !== 'object') {
    throw new Error('[WardrobePro] Lower build context dims missing for stack-split corner wing build.');
  }

  buildArgs.buildCornerWing(
    Number(lowerDims.totalW),
    Number(lowerDims.cabinetBodyHeight),
    Number(lowerDims.D),
    buildArgs.woodThick,
    Number(lowerDims.startY),
    { body: buildArgs.bodyMat, front: buildArgs.globalFrontMat },
    {
      stackKey: 'bottom',
      baseType: buildArgs.baseTypeBottom,
      baseLegStyle: buildArgs.baseLegStyle,
      baseLegColor: buildArgs.baseLegColor,
      baseLegHeightCm: buildArgs.baseLegHeightCm,
      baseLegWidthCm: buildArgs.baseLegWidthCm,
      stackSplitEnabled: true,
      stackOffsetZ: Number.isFinite(Number(lowerDims.startZ)) ? Number(lowerDims.startZ) : 0,
    }
  );
}
