import { applyExternalDrawersForModule } from './external_drawers_pipeline.js';
import { makeRodCreator } from './contents_pipeline.js';
import { makeInternalDrawerCreator } from './internal_drawers_pipeline.js';
import { applyInteriorLayout } from './interior_pipeline.js';
import { appendHingedDoorOpsForModule } from './hinged_doors_pipeline.js';
import { getWardrobeGroup } from '../runtime/render_access.js';

import type { ModuleLoopRuntime } from './module_loop_pipeline_runtime.js';
import type { ModuleLoopMutableState } from './module_loop_pipeline_module_contracts.js';
import type { ModuleVerticalMetrics, ResolvedModuleFrame } from './module_loop_pipeline_module_frame.js';

export function applyModuleContents(
  runtime: ModuleLoopRuntime,
  state: ModuleLoopMutableState,
  index: number,
  frame: ResolvedModuleFrame,
  metrics: ModuleVerticalMetrics,
  startDoorOfModule: number
): void {
  const wardrobeGroup = getWardrobeGroup(runtime.App);

  if (metrics.drawerHeightTotal > 0) {
    const doorSpan = runtime.computeModuleDoorSpan(
      startDoorOfModule,
      frame.modDoors,
      metrics.externalCenterX,
      metrics.externalW
    );
    const drawerFaceW = Number.isFinite(doorSpan.spanW) ? doorSpan.spanW : metrics.externalW;
    const drawerFaceOffsetX = Number.isFinite(doorSpan.centerX)
      ? doorSpan.centerX - metrics.externalCenterX
      : 0;

    applyExternalDrawersForModule({
      App: runtime.App,
      THREE: runtime.THREE,
      cfg: runtime.cfg,
      __wpStack: runtime.stackKey,
      config: frame.config,
      moduleIndex: index,
      startDoorId: startDoorOfModule,
      externalCenterX: metrics.externalCenterX,
      externalW: metrics.externalW,
      drawerFaceW,
      drawerFaceOffsetX,
      depth: frame.moduleTotalDepth,
      frontZ: frame.moduleFrontZ,
      startY: runtime.startY,
      woodThick: runtime.woodThick,
      keyPrefix: runtime.drawerKeyPrefix,
      hasShoe: metrics.hasShoe,
      regCount: metrics.regCount,
      doorStyle: runtime.doorStyle,
      globalFrontMat: runtime.globalFrontMat,
      isGroovesEnabled: runtime.isGroovesEnabled,
      bodyMat: runtime.bodyMat,
      addOutlines: runtime.addOutlines,
      getPartMaterial: runtime.getPartMaterial,
      getPartColorValue: runtime.getPartColorValue,
      createDoorVisual: runtime.createDoorVisual,
      createInternalDrawerBox: runtime.createInternalDrawerBox,
      createBoard: runtime.createBoard,
      innerW: metrics.innerW,
      internalDepth: frame.moduleInternalDepth,
      internalCenterX: metrics.internalCenterX,
      internalZ: frame.moduleInternalZ,
      effectiveBottomY: metrics.effectiveBottomY,
    });
  }

  const createRod = makeRodCreator({
    App: runtime.App,
    THREE: runtime.THREE,
    cfg: runtime.cfg,
    config: frame.config,
    moduleIndex: index,
    effectiveBottomY: metrics.effectiveBottomY,
    localGridStep: metrics.localGridStep,
    isInternalDrawersEnabled: runtime.isInternalDrawersEnabled,
    innerW: metrics.innerW,
    internalCenterX: metrics.internalCenterX,
    internalZ: frame.moduleInternalZ,
    internalDepth: frame.moduleInternalDepth,
    doorFrontZ: frame.moduleFrontZ,
    legMat: runtime.legMat,
    wardrobeGroup,
    addOutlines: runtime.addOutlines,
    showHangerEnabled: runtime.showHangerEnabled,
    addRealisticHanger: runtime.addRealisticHanger,
    showContentsEnabled: runtime.showContentsEnabled,
    addHangingClothes: runtime.addHangingClothes,
    doorStyle: runtime.doorStyle,
  });

  const checkAndCreateInternalDrawer = makeInternalDrawerCreator({
    App: runtime.App,
    THREE: runtime.THREE,
    cfg: runtime.cfg,
    config: frame.config,
    moduleIndex: index,
    keyPrefix: runtime.drawerKeyPrefix,
    effectiveBottomY: metrics.effectiveBottomY,
    localGridStep: metrics.localGridStep,
    drawerSizingGridStep:
      metrics.fullInternalHeight > 0 ? metrics.fullInternalHeight / 6 : metrics.localGridStep,
    internalCenterX: metrics.internalCenterX,
    internalZ: frame.moduleInternalZ,
    internalDepth: frame.moduleInternalDepth,
    innerW: metrics.innerW,
    isInternalDrawersEnabled: runtime.isInternalDrawersEnabled,
    wardrobeGroup,
    createInternalDrawerBox: runtime.createInternalDrawerBox,
    addOutlines: runtime.addOutlines,
    getPartMaterial: runtime.getPartMaterial,
    bodyMat: runtime.bodyMat,
    showContentsEnabled: runtime.showContentsEnabled,
    addFoldedClothes: runtime.addFoldedClothes,
  });

  const currentShelfMat =
    runtime.cfg.isMultiColorMode && runtime.getPartColorValue && runtime.getPartColorValue('all_shelves')
      ? runtime.getPartMaterial('all_shelves')
      : runtime.bodyMat;

  applyInteriorLayout({
    App: runtime.App,
    THREE: runtime.THREE,
    cfg: runtime.cfg,
    config: frame.config,
    gridDivisions: metrics.gridDivisions,
    wardrobeGroup,
    createBoard: runtime.createBoard,
    createRod,
    addFoldedClothes: runtime.addFoldedClothes,
    checkAndCreateInternalDrawer,
    effectiveBottomY: metrics.effectiveBottomY,
    effectiveTopY: metrics.effectiveTopY,
    localGridStep: metrics.localGridStep,
    innerW: metrics.innerW,
    woodThick: runtime.woodThick,
    internalDepth: frame.moduleInternalDepth,
    internalCenterX: metrics.internalCenterX,
    internalZ: frame.moduleInternalZ,
    D: runtime.D,
    moduleIndex: index,
    modulesLength: runtime.modules.length,
    moduleKey: runtime.stackKey === 'bottom' ? `lower_${index}` : undefined,
    startY: runtime.startY,
    startDoorId: startDoorOfModule,
    moduleDoors: frame.modDoors,
    hingedDoorPivotMap: runtime.hingedDoorPivotMap,
    externalW: metrics.externalW,
    externalCenterX: metrics.externalCenterX,
    currentShelfMat,
    bodyMat: runtime.bodyMat,
    isInternalDrawersEnabled: runtime.isInternalDrawersEnabled,
    getPartMaterial: runtime.getPartMaterial,
    getPartColorValue: runtime.getPartColorValue,
    createDoorVisual: runtime.createDoorVisual,
    doorStyle: runtime.doorStyle,
    createInternalDrawerBox: runtime.createInternalDrawerBox,
    addOutlines: runtime.addOutlines,
    showContentsEnabled: runtime.showContentsEnabled,
  });

  if (runtime.cfg.wardrobeType !== 'hinged') return;

  state.globalDoorCounter = appendHingedDoorOpsForModule({
    App: runtime.App,
    THREE: runtime.THREE,
    __wpStack: runtime.stackKey,
    cfg: runtime.cfg,
    ui: runtime.ui,
    moduleIndex: index,
    modulesLength: runtime.modules.length,
    moduleDoors: frame.modDoors,
    modWidth: frame.modWidth,
    currentX: state.currentX,
    globalDoorCounter: state.globalDoorCounter,
    drawerHeightTotal: metrics.drawerHeightTotal,
    effectiveBottomY: metrics.effectiveBottomY,
    startY: runtime.startY,
    woodThick: runtime.woodThick,
    cabinetBodyHeight: frame.moduleCabinetBodyHeight,
    cabinetTopY: frame.moduleCabinetTopY,
    D: runtime.D,
    moduleDoorFrontZ: frame.moduleFrontZ,
    splitLineY: metrics.localSplitLineY,
    splitDoors: runtime.splitDoors,
    opsList: runtime.hingedDoorOpsList,
    hingedDoorPivotMap: runtime.hingedDoorPivotMap,
    globalHandleAbsY: runtime.globalHandleAbsY,
    config: frame.config,
    moduleCfgList: runtime.moduleCfgList,
    getPartColorValue: runtime.getPartColorValue,
    isGroovesEnabled: runtime.isGroovesEnabled,
    removeDoorsEnabled: runtime.removeDoorsEnabled,
    isDoorRemoved: runtime.isDoorRemoved,
    shadowMat: runtime.shadowMat,
    externalW: metrics.externalW,
    externalCenterX: metrics.externalCenterX,
    getHingeDir: runtime.getHingeDir,
    isDoorSplit: runtime.isDoorSplit,
    isDoorSplitBottom: runtime.isDoorSplitBottom,
    curtainVal: runtime.curtainVal,
    grooveVal: runtime.grooveVal,
  });
}
