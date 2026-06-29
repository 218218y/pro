import { CARCASS_SHELL_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import { resolveExternalDrawerFitFromBody } from '../../shared/wardrobe_construction_validation_shared.js';
import { resolveModuleDepthProfile } from './module_loop_pipeline_module_depth.js';

import type { ModuleLoopRuntime } from './module_loop_pipeline_runtime.js';
import type { ModuleConfigLike } from '../../../types/index.js';
import type { ModuleLoopMutableState } from './module_loop_pipeline_module_contracts.js';

export interface ResolvedModuleFrame {
  config: ModuleConfigLike;
  modDoors: number;
  modWidth: number;
  moduleTotalDepth: number;
  moduleInternalDepth: number;
  moduleInternalZ: number;
  moduleOuterZ: number;
  moduleFrontZ: number;
  moduleDoorDepth: number;
  moduleDoorFrontZ: number;
  moduleHitDepth: number;
  moduleHitZ: number;
  moduleCabinetBodyHeight: number;
  moduleCabinetTopY: number;
  moduleCenterX: number;
}

export interface ModuleVerticalMetrics {
  innerW: number;
  internalCenterX: number;
  externalW: number;
  externalCenterX: number;
  hasShoe: boolean;
  regCount: number;
  drawerHeightTotal: number;
  effectiveBottomY: number;
  effectiveTopY: number;
  availableInternalHeight: number;
  fullInternalHeight: number;
  localSplitLineY: number;
  gridDivisions: number;
  localGridStep: number;
}

const DEFAULT_MODULE_CONFIG: ModuleConfigLike = {
  layout: 'shelves',
  extDrawers: 0,
  extDrawersCount: 0,
  hasShoeDrawer: false,
  isCustom: false,
};

export function resolveModuleFrame(
  runtime: ModuleLoopRuntime,
  state: ModuleLoopMutableState,
  index: number,
  modDoorsRaw: unknown
): ResolvedModuleFrame {
  const config = runtime.moduleCfgList[index] || DEFAULT_MODULE_CONFIG;
  const depth = resolveModuleDepthProfile(runtime, config);
  const modDoors =
    typeof modDoorsRaw === 'number' && Number.isFinite(modDoorsRaw) && modDoorsRaw > 0
      ? Math.trunc(modDoorsRaw)
      : 1;
  const moduleWidthAtIndex = runtime.moduleInternalWidthsList?.[index];
  const modWidth =
    typeof moduleWidthAtIndex === 'number' && Number.isFinite(moduleWidthAtIndex)
      ? moduleWidthAtIndex
      : runtime.singleUnitWidth * modDoors;
  const moduleCabinetBodyHeight = runtime.moduleBodyHeights[index] || runtime.cabinetBodyHeight;
  const moduleCabinetTopY = runtime.startY + moduleCabinetBodyHeight;
  const moduleCenterX = state.currentX + modWidth / 2;

  return {
    config,
    modDoors,
    modWidth,
    moduleTotalDepth: depth.moduleTotalDepth,
    moduleInternalDepth: depth.moduleInternalDepth,
    moduleInternalZ: depth.moduleInternalZ,
    moduleOuterZ: depth.moduleOuterZ,
    moduleFrontZ: depth.moduleFrontZ,
    moduleDoorDepth: depth.moduleDoorDepth,
    moduleDoorFrontZ: depth.moduleDoorFrontZ,
    moduleHitDepth: depth.moduleHitDepth,
    moduleHitZ: depth.moduleHitZ,
    moduleCabinetBodyHeight,
    moduleCabinetTopY,
    moduleCenterX,
  };
}

export function resolveModuleVerticalMetrics(
  runtime: ModuleLoopRuntime,
  frame: ResolvedModuleFrame
): ModuleVerticalMetrics {
  const innerW = frame.modWidth;
  const internalCenterX = frame.moduleCenterX;
  const externalW = frame.modWidth;
  const externalCenterX = frame.moduleCenterX;
  const internalStartY = runtime.startY + runtime.woodThick;
  const drawerFit =
    runtime.cfg.wardrobeType === 'hinged'
      ? resolveExternalDrawerFitFromBody({
          startY: runtime.startY,
          cabinetBodyHeight: frame.moduleCabinetBodyHeight,
          woodThick: runtime.woodThick,
          hasShoe: frame.config.hasShoeDrawer,
          regCount: frame.config.extDrawersCount,
        })
      : null;
  const hasShoe = drawerFit ? drawerFit.hasShoe : false;
  const regCount = drawerFit ? drawerFit.regCount : 0;
  const drawerHeightTotal = drawerFit ? drawerFit.drawerHeightTotal : 0;

  const effectiveBottomY = internalStartY + drawerHeightTotal;
  const effectiveTopY = runtime.startY + frame.moduleCabinetBodyHeight - runtime.woodThick;
  const availableInternalHeight = effectiveTopY - effectiveBottomY;
  const fullInternalHeight = effectiveTopY - internalStartY;
  const internalTotalH = Math.max(runtime.woodThick, frame.moduleCabinetBodyHeight - 2 * runtime.woodThick);
  const localSplitLineY =
    runtime.startY +
    runtime.woodThick +
    CARCASS_SHELL_DIMENSIONS.drawerSplitGridLineIndex *
      (internalTotalH / CARCASS_SHELL_DIMENSIONS.drawerGridDivisions);
  const gridDivisions =
    frame.config.isCustom && typeof frame.config.gridDivisions === 'number' && frame.config.gridDivisions > 0
      ? frame.config.gridDivisions
      : CARCASS_SHELL_DIMENSIONS.drawerGridDivisions;
  const localGridStep = availableInternalHeight / gridDivisions;

  return {
    innerW,
    internalCenterX,
    externalW,
    externalCenterX,
    hasShoe,
    regCount,
    drawerHeightTotal,
    effectiveBottomY,
    effectiveTopY,
    availableInternalHeight,
    fullInternalHeight,
    localSplitLineY,
    gridDivisions,
    localGridStep,
  };
}

export function writeInternalGridMap(
  runtime: ModuleLoopRuntime,
  index: number,
  frame: ResolvedModuleFrame,
  metrics: ModuleVerticalMetrics
): void {
  try {
    if (!runtime.internalGridMap) return;
    runtime.internalGridMap[index] = {
      effectiveBottomY: metrics.effectiveBottomY,
      effectiveTopY: metrics.effectiveTopY,
      localGridStep: metrics.localGridStep,
      gridDivisions: metrics.gridDivisions,
      innerW: metrics.innerW,
      internalCenterX: metrics.internalCenterX,
      internalDepth: frame.moduleInternalDepth,
      internalZ: frame.moduleInternalZ,
      woodThick: runtime.woodThick,
      D: frame.moduleTotalDepth,
      startY: runtime.startY,
    };
  } catch (_error) {
    // ignore cache write issues in tests / detached previews
  }
}
