import { asRecord } from '../runtime/record.js';
import { getCfg } from '../kernel/api.js';
import { readModulesConfigurationListFromConfigSnapshot } from '../features/modules_configuration/modules_config_api.js';
import type { ModulesConfigBucketKey } from '../features/modules_configuration/modules_config_api.js';
import {
  readCornerConfigurationCellForStack,
  readCornerConfigurationCellListForStack,
  readCornerConfigurationSnapshotForStack,
} from '../features/modules_configuration/corner_cells_api.js';
import type {
  ManualLayoutSketchHoverModuleContext,
  ManualLayoutSketchHoverModuleFlowArgs,
} from './canvas_picking_manual_layout_sketch_hover_module_contracts.js';
import {
  asRecordList,
  isRecord,
  readRecordList,
  readRecordValue,
  type RecordMap,
} from './canvas_picking_manual_layout_sketch_hover_module_shared.js';

type ManualLayoutSketchHoverModuleConfigContext = Pick<
  ManualLayoutSketchHoverModuleContext,
  'boxes' | 'storageBarriers' | 'shelves' | 'rods' | 'drawers' | 'extDrawers' | 'cfgRef' | 'activeModuleBox'
>;

type ResolveManualLayoutSketchHoverModuleConfigContextArgs = Pick<
  ManualLayoutSketchHoverModuleFlowArgs,
  | 'App'
  | 'hitModuleKey'
  | '__wp_isCornerKey'
  | '__wp_isDefaultCornerCellCfgLike'
  | '__wp_findSketchModuleBoxAtPoint'
> &
  Pick<
    ManualLayoutSketchHoverModuleContext,
    | 'isBottom'
    | 'hitLocalX'
    | 'yClamped'
    | 'bottomY'
    | 'spanH'
    | 'innerW'
    | 'internalCenterX'
    | 'internalDepth'
    | 'internalZ'
    | 'woodThick'
  >;

function createDefaultCornerCellConfig(cellIdx: number): RecordMap {
  return {
    layout: cellIdx === 0 ? 'hanging_top2' : 'shelves',
    isCustom: false,
    gridDivisions: 6,
    customData: { shelves: [], rods: [], storage: false },
    braceShelves: [],
  };
}

function resolveCornerCellIndex(moduleKey: unknown): number {
  if (typeof moduleKey !== 'string' || !moduleKey.startsWith('corner:')) return 0;
  const n = Number(moduleKey.slice('corner:'.length));
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
}

export function resolveManualLayoutSketchHoverModuleConfigContext(
  args: ResolveManualLayoutSketchHoverModuleConfigContextArgs
): ManualLayoutSketchHoverModuleConfigContext {
  const {
    App,
    hitModuleKey,
    isBottom,
    hitLocalX,
    yClamped,
    bottomY,
    spanH,
    innerW,
    internalCenterX,
    internalDepth,
    internalZ,
    woodThick,
    __wp_isCornerKey,
    __wp_isDefaultCornerCellCfgLike,
    __wp_findSketchModuleBoxAtPoint,
  } = args;

  let boxes: RecordMap[] = [];
  let storageBarriers: RecordMap[] = [];
  let shelves: RecordMap[] = [];
  let rods: RecordMap[] = [];
  let drawers: RecordMap[] = [];
  let extDrawers: RecordMap[] = [];
  let cfgRef: RecordMap | null = null;
  try {
    const cfg = getCfg(App);
    const mk = hitModuleKey;

    let extra: RecordMap | null = null;

    if (typeof mk === 'number') {
      const bucket: ModulesConfigBucketKey = isBottom
        ? 'stackSplitLowerModulesConfiguration'
        : 'modulesConfiguration';
      const list = asRecordList(readModulesConfigurationListFromConfigSnapshot(cfg, bucket));
      const mc = list[mk] || null;
      extra = asRecord(readRecordValue(mc, 'sketchExtras'));
      cfgRef = mc;
    } else if (__wp_isCornerKey(mk)) {
      const cellIdx = resolveCornerCellIndex(mk);
      let cornerRootCfg: RecordMap | null = asRecord(
        readCornerConfigurationSnapshotForStack(cfg, isBottom ? 'bottom' : 'top')
      );
      let cellList: RecordMap[] = [];

      if (cornerRootCfg) {
        cellList = asRecordList(readCornerConfigurationCellListForStack(cfg, isBottom ? 'bottom' : 'top'));
        const cell = asRecord(readCornerConfigurationCellForStack(cfg, isBottom ? 'bottom' : 'top', cellIdx));
        extra = asRecord(readRecordValue(cell, 'sketchExtras'));
        cfgRef = cell;
      }

      if (!cfgRef) {
        const hasAnyCellCfg = Array.isArray(cellList)
          ? cellList.some(v => v && typeof v === 'object')
          : false;

        const rootCfg = isRecord(cornerRootCfg) ? cornerRootCfg : null;
        const isDefaultRoot = __wp_isDefaultCornerCellCfgLike(rootCfg);

        cfgRef =
          !hasAnyCellCfg && rootCfg && !isDefaultRoot ? rootCfg : createDefaultCornerCellConfig(cellIdx);

        try {
          const ex0 = asRecord(readRecordValue(cfgRef, 'sketchExtras'));
          if (ex0) extra = ex0;
        } catch {
          // ignore
        }
      }
    }

    boxes = readRecordList(extra, 'boxes');
    shelves = readRecordList(extra, 'shelves');
    drawers = readRecordList(extra, 'drawers');
    extDrawers = readRecordList(extra, 'extDrawers');
    rods = readRecordList(extra, 'rods');
    storageBarriers = readRecordList(extra, 'storageBarriers');
  } catch {
    // best-effort only
  }

  const activeModuleBox = boxes.length
    ? __wp_findSketchModuleBoxAtPoint({
        boxes,
        cursorY: yClamped,
        cursorX: Number.isFinite(hitLocalX) ? Number(hitLocalX) : null,
        bottomY,
        spanH,
        innerW,
        internalCenterX,
        internalDepth,
        internalZ,
        woodThick,
      })
    : null;

  return {
    boxes,
    storageBarriers,
    shelves,
    rods,
    drawers,
    extDrawers,
    cfgRef,
    activeModuleBox,
  };
}
