// Corner connector emission owner.
//
// Keep the public pentagon connector layer focused on orchestration while
// setup / shell policy and the dedicated interior / door / cornice flows live
// in focused helpers.

import {
  isSplitEnabledInMap,
  isSplitExplicitInMap,
  isSplitBottomEnabledInMap,
  readSplitPosListFromMap,
} from '../runtime/maps_access.js';
import { readModulesConfigurationListFromConfigSnapshot } from '../features/modules_configuration/modules_config_api.js';
import { MODES, reportErrorThrottled } from '../runtime/api.js';
import { addToWardrobeGroup } from '../runtime/render_access.js';
import { getOrCreateCacheRecord } from './corner_cache.js';
import {
  __isLongEdgeHandleVariantForPart,
  __topSplitHandleInsetForPart,
  __edgeHandleLongLiftAbsYForCell,
  __edgeHandleLongLiftAbsYForCornerCells,
  __edgeHandleAlignedBaseAbsYForCornerCells,
  __clampHandleAbsYForPart,
  isRecord,
  asRecord,
  readNumFrom,
  cloneMaybe,
} from './corner_geometry_plan.js';

import type { CornerOpsEmitContext } from './corner_ops_emit_common.js';
import { createCornerConnectorSetup } from './corner_connector_emit_shared.js';
import { buildCornerConnectorShell } from './corner_connector_emit_shell.js';
import { applyCornerConnectorInteriorFlow } from './corner_connector_interior_emit.js';
import { applyCornerConnectorDoorFlow } from './corner_connector_door_emit.js';
import { applyCornerConnectorCornice } from './corner_connector_cornice_emit.js';
import { deriveCornerWingCells } from './corner_wing_extension_cells.js';
import { createCornerConfigMapReader } from './corner_config_readers.js';

function readPositiveNumber(value: unknown): number | null {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
}

function readStoredHeightCm(cfgMod: unknown): { heightCm: number | null; baseHeightCm: number | null } {
  const mod = asRecord(cfgMod);
  const specialDims = asRecord(mod.specialDims);
  const heightCm = readPositiveNumber(specialDims.heightCm);
  const baseHeightCm = readPositiveNumber(specialDims.baseHeightCm);
  return { heightCm, baseHeightCm };
}

function resolveModuleBodyHeightFromStoredHeight(args: {
  ctx: CornerOpsEmitContext;
  cfgMod: unknown;
  fallbackBodyHeight: number;
}): number {
  const { ctx, cfgMod, fallbackBodyHeight } = args;
  const { heightCm, baseHeightCm } = readStoredHeightCm(cfgMod);
  const baseAbsCm = baseHeightCm ?? (ctx.startY + fallbackBodyHeight) * 100;
  const hasActiveHeight =
    heightCm != null && Number.isFinite(heightCm) && Math.abs(heightCm - baseAbsCm) > 1e-6;
  if (!hasActiveHeight || heightCm == null) return fallbackBodyHeight;

  const minAbsCm = (ctx.startY + ctx.woodThick * 2) * 100;
  const absCm = Math.max(minAbsCm, heightCm);
  const bodyHeight = absCm / 100 - ctx.startY;
  return Number.isFinite(bodyHeight) && bodyHeight > 0
    ? Math.max(ctx.woodThick * 2, bodyHeight)
    : fallbackBodyHeight;
}

function readMainModulesConfiguration(ctx: CornerOpsEmitContext): unknown[] {
  const bucket =
    ctx.__stackSplitEnabled && ctx.__stackKey === 'bottom'
      ? 'stackSplitLowerModulesConfiguration'
      : 'modulesConfiguration';
  const rootList = readModulesConfigurationListFromConfigSnapshot(ctx.__cfg, bucket);
  if (rootList.length > 0) return rootList;
  return readModulesConfigurationListFromConfigSnapshot(ctx.config, bucket);
}

function resolveConnectorAdjacentMainBodyHeight(ctx: CornerOpsEmitContext): number | undefined {
  try {
    const mainBodyHeight = readPositiveNumber(ctx.mainH) ?? readPositiveNumber(ctx.wingH) ?? 0;
    if (!(mainBodyHeight > 0)) return undefined;

    const moduleConfigs = readMainModulesConfiguration(ctx);
    if (!moduleConfigs.length) return mainBodyHeight;

    const cornerSide = ctx.cornerSide === 'left' ? 'left' : 'right';
    const adjacentIndex = cornerSide === 'left' ? 0 : moduleConfigs.length - 1;
    return resolveModuleBodyHeightFromStoredHeight({
      ctx,
      cfgMod: moduleConfigs[adjacentIndex],
      fallbackBodyHeight: mainBodyHeight,
    });
  } catch {
    return undefined;
  }
}

function resolveConnectorAdjacentWingBodyHeight(ctx: CornerOpsEmitContext): number | null | undefined {
  try {
    if (ctx.activeWidth <= 0 || ctx.wingW <= 0) return null;
    const derived = deriveCornerWingCells({
      App: ctx.App,
      activeWidth: ctx.activeWidth,
      blindWidth: ctx.blindWidth,
      cabinetBodyHeight: ctx.cabinetBodyHeight,
      config: ctx.config,
      startY: ctx.startY,
      uiAny: ctx.uiAny,
      wingD: ctx.wingD,
      wingH: ctx.wingH,
      woodThick: ctx.woodThick,
      __cfg: ctx.__cfg,
      __mirrorX: ctx.__mirrorX,
      __stackKey: ctx.__stackKey,
      __stackSplitEnabled: ctx.__stackSplitEnabled,
    });
    if (!(derived.doorCount > 0)) return null;
    const firstCell = derived.cornerCells[0];
    const bodyHeight = Number(firstCell?.bodyHeight);
    return Number.isFinite(bodyHeight) && bodyHeight > 0 ? bodyHeight : ctx.wingH;
  } catch {
    return undefined;
  }
}

export function emitCornerConnector(ctx: CornerOpsEmitContext): void {
  const setup = createCornerConnectorSetup(ctx);
  if (!setup) return;

  const shell = buildCornerConnectorShell(setup);
  const { App, wingGroup, __applyStableShadowsToModule, __cfg } = ctx;
  const { mx, L, Dmain, shape, pts, interiorX, interiorZ, cornerGroup, showFrontPanel } = setup;
  const { panelThick, backPanelThick, backPanelOutsideInsetZ, addEdgePanel } = shell;
  const readCornerMap = createCornerConfigMapReader(__cfg);

  applyCornerConnectorInteriorFlow({
    ctx,
    cfgSnapshot: asRecord(__cfg),
    locals: {
      mx,
      L,
      Dmain,
      shape,
      pts,
      interiorX,
      interiorZ,
      panelThick,
      backPanelThick,
      __backPanelOutsideInsetZ: backPanelOutsideInsetZ,
      cornerGroup,
    },
    helpers: { reportErrorThrottled },
  });

  applyCornerConnectorDoorFlow({
    ctx,
    locals: {
      pts,
      interiorX,
      interiorZ,
      panelThick,
      showFrontPanel,
      cornerGroup,
      addEdgePanel,
    },
    helpers: {
      cfgSnapshot: asRecord(__cfg),
      readMap: readCornerMap,
      isSplitEnabledInMap,
      isSplitExplicitInMap,
      isSplitBottomEnabledInMap,
      readSplitPosListFromMap,
      readModulesConfigurationListFromConfigSnapshot,
      getOrCreateCacheRecord,
      MODES,
      primaryMode: ctx.__primaryMode,
      __isLongEdgeHandleVariantForPart,
      __topSplitHandleInsetForPart,
      __edgeHandleLongLiftAbsYForCell,
      __edgeHandleLongLiftAbsYForCornerCells,
      __edgeHandleAlignedBaseAbsYForCornerCells,
      __clampHandleAbsYForPart,
      isRecord,
      asRecord,
      readNumFrom,
      cloneMaybe,
      reportErrorThrottled,
    },
  });

  applyCornerConnectorCornice({
    ctx,
    locals: {
      adjacentWingBodyHeight: resolveConnectorAdjacentWingBodyHeight(ctx),
      adjacentMainBodyHeight: resolveConnectorAdjacentMainBodyHeight(ctx),
      pts,
      panelThick,
      backPanelThick,
      showFrontPanel,
      cornerGroup,
      interiorX,
      interiorZ,
      mx,
      L,
    },
    helpers: { readNumFrom, asRecord, reportErrorThrottled },
  });

  __applyStableShadowsToModule(cornerGroup);
  if (!addToWardrobeGroup(App, cornerGroup)) wingGroup.add(cornerGroup);
}
