import { getActiveDepthCmFromConfig } from '../features/special_dims/index.js';
import { resolveHexCellGeometry } from '../features/hex_cell/index.js';
import { CARCASS_INTERIOR_DIMENSIONS } from '../../shared/dimensions/carcass_interior_policy.js';
import { CARCASS_SHELL_DIMENSIONS } from '../../shared/dimensions/carcass_shell_policy.js';
import { CM_PER_METER } from '../../shared/dimensions/units.js';

import type { ModuleLoopRuntime } from './module_loop_pipeline_runtime.js';
import type { ModuleConfigLike } from '../../../types/index.js';

export function resolveRearClearanceForDepth(panelDepth: number, woodThick: number): number {
  const safePanelDepth = Math.max(woodThick, panelDepth);
  const requestedClearance = Math.max(0, CARCASS_SHELL_DIMENSIONS.sideDepthClearanceM);
  return Math.min(requestedClearance, Math.max(0, safePanelDepth - woodThick));
}

export function resolveRearClearedPanelDepth(args: {
  cabinetDepth: number;
  panelDepth: number;
  woodThick: number;
}): { depth: number; z: number } {
  const panelDepth = Math.max(args.woodThick, args.panelDepth);
  const backClearance = resolveRearClearanceForDepth(panelDepth, args.woodThick);
  const depth = Math.max(args.woodThick, panelDepth - backClearance);
  const z = -args.cabinetDepth / 2 + backClearance + depth / 2;
  return { depth, z };
}

export function resolveRearClearedBackZ(args: {
  cabinetDepth: number;
  minPanelDepth: number;
  woodThick: number;
}): number {
  return -args.cabinetDepth / 2 + resolveRearClearanceForDepth(args.minPanelDepth, args.woodThick);
}

export interface ModuleDepthProfile {
  moduleTotalDepth: number;
  moduleInternalDepth: number;
  moduleInternalZ: number;
  moduleOuterZ: number;
  moduleFrontZ: number;
  moduleDoorDepth: number;
  moduleDoorFrontZ: number;
  moduleHitDepth: number;
  moduleHitZ: number;
}

export function resolveModuleDepthProfile(
  runtime: ModuleLoopRuntime,
  config: ModuleConfigLike
): ModuleDepthProfile {
  const depthCmActive = getActiveDepthCmFromConfig(config);
  const requestedTotalDepth =
    typeof depthCmActive === 'number' && Number.isFinite(depthCmActive) && depthCmActive > 0
      ? depthCmActive / CM_PER_METER
      : runtime.D;
  const hexGeometry = resolveHexCellGeometry({
    cfgMod: config,
    moduleWidthM: runtime.D,
    defaultDepthM: runtime.D,
    woodThickM: runtime.woodThick,
  });
  const moduleDoorDepth = hexGeometry ? hexGeometry.doorDepthM : requestedTotalDepth;
  const moduleTotalDepth = hexGeometry ? hexGeometry.sideDepthM : requestedTotalDepth;
  const moduleInternalDepth = Math.max(runtime.woodThick, moduleTotalDepth - runtime.depthReduction);
  const moduleInternalZ =
    -runtime.D / 2 + moduleInternalDepth / 2 + CARCASS_INTERIOR_DIMENSIONS.internalBackInsetM;
  const moduleOuterZ = -runtime.D / 2 + moduleTotalDepth / 2;
  const moduleFrontZ = -runtime.D / 2 + moduleTotalDepth;
  const moduleDoorFrontZ = -runtime.D / 2 + moduleDoorDepth;
  const moduleHitDepth = Math.max(moduleTotalDepth, moduleDoorDepth);
  const moduleHitZ = -runtime.D / 2 + moduleHitDepth / 2;

  return {
    moduleTotalDepth,
    moduleInternalDepth,
    moduleInternalZ,
    moduleOuterZ,
    moduleFrontZ,
    moduleDoorDepth,
    moduleDoorFrontZ,
    moduleHitDepth,
    moduleHitZ,
  };
}
