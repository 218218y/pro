import type { AppContainer } from '../../../types';
import { getCfg, getUi } from '../kernel/api.js';
import { readModulesConfigurationListFromConfigSnapshot } from '../features/modules_configuration/modules_config_api.js';
import { readCornerConfigurationCellListForStack } from '../features/modules_configuration/corner_cells_api.js';
import { asRecord } from '../runtime/record.js';
import { getInternalGridMap } from '../runtime/cache_access.js';
import type { ModuleKey } from './canvas_picking_sketch_free_box_workflow.js';

export type {
  ModuleKey,
  ProjectWorldPointToLocalFn,
  ResolveSketchFreeBoxHoverPlacementArgs,
} from './canvas_picking_sketch_free_box_workflow.js';
export {
  clampSketchFreeBoxCenterY,
  doesSketchFreeBoxPartiallyOverlapWardrobe,
  findSketchFreeBoxLocalHit,
  getSketchFreeBoxPartPrefix,
  isWithinSketchFreeBoxRemoveZone,
  isWithinSketchFreePlacementBounds,
  resolveSketchFreeBoxAttachPlacement,
  resolveSketchFreeBoxGeometry,
  resolveSketchFreeBoxHoverPlacement,
  resolveSketchFreeBoxNonOverlappingPlacement,
  resolveSketchFreeBoxOutsideWardrobeSnapX,
} from './canvas_picking_sketch_free_box_workflow.js';

function readModuleConfigList(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function pickFirstGridModuleKey(grid: unknown): ModuleKey | null {
  const rec = asRecord(grid);
  if (!rec) return null;

  const keys = Object.keys(rec);
  let bestNumeric: number | null = null;
  let bestCorner: ModuleKey | null = null;

  for (let i = 0; i < keys.length; i++) {
    const raw = String(keys[i] || '').trim();
    if (!raw) continue;

    if (/^\d+$/.test(raw)) {
      const idx = Number(raw);
      if (!Number.isFinite(idx) || idx < 0) continue;
      if (bestNumeric == null || idx < bestNumeric) bestNumeric = idx;
      continue;
    }

    const cornerMatch = /^corner:(\d+)$/.exec(raw);
    if (cornerMatch) {
      if (bestCorner == null) bestCorner = `corner:${Number(cornerMatch[1])}`;
      continue;
    }
  }

  if (bestNumeric != null) return bestNumeric;
  return bestCorner;
}

export function pickSketchFreeBoxHost(App: AppContainer): { moduleKey: ModuleKey; isBottom: boolean } | null {
  try {
    const cfg = getCfg(App);
    const topList = readModuleConfigList(
      readModulesConfigurationListFromConfigSnapshot(cfg, 'modulesConfiguration')
    );
    if (topList.length) return { moduleKey: 0, isBottom: false };

    const bottomList = readModuleConfigList(
      readModulesConfigurationListFromConfigSnapshot(cfg, 'stackSplitLowerModulesConfiguration')
    );
    if (bottomList.length) return { moduleKey: 0, isBottom: true };

    if (readCornerConfigurationCellListForStack(cfg, 'top').length)
      return { moduleKey: 'corner:0', isBottom: false };
    if (readCornerConfigurationCellListForStack(cfg, 'bottom').length)
      return { moduleKey: 'corner:0', isBottom: true };

    const topGridHost = pickFirstGridModuleKey(getInternalGridMap(App, false));
    if (topGridHost != null) return { moduleKey: topGridHost, isBottom: false };

    const bottomGridHost = pickFirstGridModuleKey(getInternalGridMap(App, true));
    if (bottomGridHost != null) return { moduleKey: bottomGridHost, isBottom: true };

    const ui = asRecord(getUi(App));
    const raw = asRecord(ui?.raw);
    const doorsRaw = raw?.doors ?? ui?.doors;
    const doors = Number(doorsRaw);
    const wardrobeType = cfg && cfg.wardrobeType === 'sliding' ? 'sliding' : 'hinged';
    if (wardrobeType !== 'sliding' && Number.isFinite(doors) && Math.round(doors) === 0) {
      return { moduleKey: 0, isBottom: false };
    }
  } catch {
    // ignore
  }
  return null;
}
