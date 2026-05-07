import type { AppContainer, UnknownRecord } from '../../../types';
import type { HitObjectLike } from './canvas_picking_engine.js';
import { getInternalGridMap } from '../runtime/cache_access.js';
import { readModulesConfigurationListFromConfigSnapshot } from '../features/modules_configuration/modules_config_api.js';
import type { ModulesConfigBucketKey } from '../features/modules_configuration/modules_config_api.js';
import { readCornerConfigurationCellForStack } from '../features/modules_configuration/corner_cells_api.js';
import { __wp_asRecord, __wp_cfg, __wp_isCornerKey, __wp_toModuleKey } from './canvas_picking_core_shared.js';
import type { SplitHoverDoorBounds } from './canvas_picking_split_hover_bounds.js';
import {
  CARCASS_BASE_DIMENSIONS,
  CARCASS_SHELL_DIMENSIONS,
  DOOR_SYSTEM_DIMENSIONS,
  DRAWER_DIMENSIONS,
  INTERIOR_FITTINGS_DIMENSIONS,
  MATERIAL_DIMENSIONS,
} from '../../shared/wardrobe_dimension_tokens_shared.js';

function clampSplitHoverLineY(
  bounds: SplitHoverDoorBounds,
  y: unknown,
  padBottom = DOOR_SYSTEM_DIMENSIONS.hinged.split.bottomClampOffsetM,
  padTop = DOOR_SYSTEM_DIMENSIONS.hinged.split.topClampOffsetM
): number | null {
  const minY = Number(bounds.minY);
  const maxY = Number(bounds.maxY);
  const n = typeof y === 'number' ? y : Number(y);
  if (!Number.isFinite(minY) || !Number.isFinite(maxY) || !Number.isFinite(n)) return null;
  const lo = minY + padBottom;
  const hi = maxY - padTop;
  if (!(hi > lo)) return null;
  return Math.max(lo, Math.min(hi, n));
}

function readSplitHoverPreviewModuleConfig(args: {
  App: AppContainer;
  moduleKey: string | number | null;
  isBottomStack: boolean;
}): UnknownRecord | null {
  const { App, moduleKey, isBottomStack } = args;
  const cfg = __wp_cfg(App);
  if (moduleKey != null && !__wp_isCornerKey(moduleKey)) {
    const bucket: ModulesConfigBucketKey = isBottomStack
      ? 'stackSplitLowerModulesConfiguration'
      : 'modulesConfiguration';
    const list = readModulesConfigurationListFromConfigSnapshot(cfg, bucket);
    const idx = typeof moduleKey === 'number' ? moduleKey : Number(moduleKey);
    return Array.isArray(list) && Number.isInteger(idx) && idx >= 0 ? __wp_asRecord(list[idx]) || null : null;
  }
  if (__wp_isCornerKey(moduleKey)) {
    let idx = 0;
    if (typeof moduleKey === 'string' && moduleKey.startsWith('corner:')) {
      const n = Number(moduleKey.slice('corner:'.length));
      if (Number.isFinite(n) && n >= 0) idx = Math.floor(n);
    }
    return __wp_asRecord(readCornerConfigurationCellForStack(cfg, isBottomStack ? 'bottom' : 'top', idx));
  }
  return null;
}

function readSplitHoverPreviewMetrics(args: {
  App: AppContainer;
  hitDoorGroup: HitObjectLike;
  bounds: SplitHoverDoorBounds;
}): {
  effectiveBottomY: number;
  effectiveTopY: number;
  woodThick: number | null;
  drawerHeightTotal: number;
} {
  const { App, hitDoorGroup, bounds } = args;
  let effectiveBottomY = Number(bounds.minY);
  let effectiveTopY = Number(bounds.maxY);
  let woodThick: number | null = null;
  let drawerHeightTotal = 0;

  try {
    const ud = __wp_asRecord(hitDoorGroup?.userData);
    const moduleKey = __wp_toModuleKey(ud ? ud.moduleIndex : null);
    const isBottomStack = ud?.__wpStack === 'bottom';
    const grid = getInternalGridMap(App, !!isBottomStack);
    const info = moduleKey != null ? __wp_asRecord(grid?.[moduleKey]) : null;

    if (info) {
      if (typeof info.effectiveBottomY === 'number' && Number.isFinite(info.effectiveBottomY)) {
        effectiveBottomY = Number(info.effectiveBottomY);
      }
      if (typeof info.effectiveTopY === 'number' && Number.isFinite(info.effectiveTopY)) {
        effectiveTopY = Number(info.effectiveTopY);
      }
      if (typeof info.woodThick === 'number' && Number.isFinite(info.woodThick) && info.woodThick > 0) {
        woodThick = Number(info.woodThick);
      }
    }

    const cfgRef = readSplitHoverPreviewModuleConfig({ App, moduleKey, isBottomStack: !!isBottomStack });
    if (cfgRef) {
      if (cfgRef.hasShoeDrawer) drawerHeightTotal += DRAWER_DIMENSIONS.external.shoeHeightM;
      const extCount = Number(cfgRef.extDrawersCount || 0);
      if (Number.isFinite(extCount) && extCount > 0)
        drawerHeightTotal += extCount * DRAWER_DIMENSIONS.external.regularHeightM;
    }
  } catch {
    // Best-effort hover helper only.
  }

  if (!(effectiveTopY > effectiveBottomY)) {
    effectiveBottomY = Number(bounds.minY);
    effectiveTopY = Number(bounds.maxY);
  }

  if (!(woodThick != null && woodThick > 0)) {
    const est = 2 * (Number(bounds.maxY) - effectiveTopY);
    woodThick =
      Number.isFinite(est) &&
      est > CARCASS_SHELL_DIMENSIONS.boardMinDimensionM &&
      est < CARCASS_BASE_DIMENSIONS.plinth.heightM
        ? est
        : MATERIAL_DIMENSIONS.wood.thicknessM;
  }

  return { effectiveBottomY, effectiveTopY, woodThick, drawerHeightTotal };
}

export function __wp_getRegularSplitPreviewLineY(args: {
  App: AppContainer;
  hitDoorGroup: HitObjectLike;
  bounds: SplitHoverDoorBounds;
  isBottomRegion: boolean;
}): number | null {
  const { App, hitDoorGroup, bounds, isBottomRegion } = args;

  const minY = Number(bounds.minY);
  const maxY = Number(bounds.maxY);
  const span = maxY - minY;
  if (!Number.isFinite(minY) || !Number.isFinite(maxY) || !(span > 0.05)) return null;

  const { effectiveBottomY, effectiveTopY, woodThick, drawerHeightTotal } = readSplitHoverPreviewMetrics({
    App,
    hitDoorGroup,
    bounds,
  });

  const internalStartY = effectiveBottomY - Math.max(0, drawerHeightTotal);
  const gapAboveDrawer = drawerHeightTotal > 0 ? DRAWER_DIMENSIONS.external.doorTopGapM : 0;
  const doorBottomY = effectiveBottomY + gapAboveDrawer;
  const effectiveTopLimit = effectiveTopY + Number(woodThick || 0) / 2;
  const splitGap = DOOR_SYSTEM_DIMENSIONS.hinged.split.splitGapM;

  if (isBottomRegion) {
    let y = effectiveBottomY + INTERIOR_FITTINGS_DIMENSIONS.storage.barrierHeightM;
    if (doorBottomY > effectiveBottomY) y += doorBottomY - effectiveBottomY + splitGap / 2;
    y = Math.max(y, doorBottomY + DOOR_SYSTEM_DIMENSIONS.hinged.split.bottomClampOffsetM);
    y = Math.min(y, effectiveTopLimit - DOOR_SYSTEM_DIMENSIONS.hinged.split.topClampOffsetM);
    return clampSplitHoverLineY(bounds, y);
  }

  const fullInternalHeight = effectiveTopY - internalStartY;
  if (
    Number.isFinite(fullInternalHeight) &&
    fullInternalHeight > DOOR_SYSTEM_DIMENSIONS.hinged.split.minHeightForSplitM
  ) {
    const y =
      internalStartY +
      (CARCASS_SHELL_DIMENSIONS.drawerSplitGridLineIndex * fullInternalHeight) /
        CARCASS_SHELL_DIMENSIONS.drawerGridDivisions;
    return clampSplitHoverLineY(bounds, y);
  }

  return clampSplitHoverLineY(
    bounds,
    minY +
      (CARCASS_SHELL_DIMENSIONS.drawerSplitGridLineIndex * span) /
        CARCASS_SHELL_DIMENSIONS.drawerGridDivisions
  );
}
