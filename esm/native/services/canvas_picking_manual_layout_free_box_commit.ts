import type { AppContainer } from '../../../types/index.js';

import { formatIdentityValue, readIdentityValue } from '../../shared/identity_value_shared.js';
import { INTERIOR_FITTINGS_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import { getModulesActions } from '../runtime/actions_access_domains.js';
import { __wp_toModuleKey } from './canvas_picking_core_helpers.js';
import {
  __wp_clearSketchHover,
  __wp_readSketchHover,
  __wp_writeSketchHover,
} from './canvas_picking_local_helpers.js';
import {
  clampUnit,
  readContentItemXNorm,
  readRecordNumber,
  readRecordValue,
  type RecordMap,
  resolveManualToolContentKind,
} from './canvas_picking_manual_layout_free_box_contracts.js';
import {
  type BraceShelvesFreeBoxCommand,
  readBraceShelvesFreeBoxCommand,
  readPresetLayoutFreeBoxCommand,
  readShelfGridFreeBoxCommand,
} from './canvas_picking_manual_layout_free_box_hover_protocol.js';
import {
  commitSketchFreePlacementHoverRecord,
  type SketchFreePlacementHostLike,
} from './canvas_picking_sketch_free_commit.js';
import {
  ensureSketchModuleBoxes,
  findSketchModuleBoxById,
} from './canvas_picking_sketch_box_content_commit.js';
import {
  createRandomId,
  ensureSketchBoxContentList,
} from './canvas_picking_sketch_box_content_commit_boxes.js';
import { toastSketchBoxContentBlocked } from './canvas_picking_sketch_box_content_blocked.js';
import { pickSketchFreeBoxHost } from './canvas_picking_sketch_free_boxes.js';
import { matchRecentSketchHover } from './canvas_picking_sketch_hover_matching.js';
import {
  decodeSketchStructuralCommandHover,
  SKETCH_STRUCTURAL_COMMAND_HOVER_KIND,
} from './canvas_picking_sketch_structural_command.js';
import { createCanvasPickingModulesStructuralPatchMeta } from './canvas_picking_modules_patch_meta.js';
import { blockRemovableSideContentBuildIfSketchBoxSideMissing } from './canvas_picking_removable_part_remove_constraints.js';

type ManualFreeVerticalRemovalContentKind = 'shelf' | 'rod' | 'storage';

const MANUAL_FREE_VERTICAL_REMOVAL_BY_TOOL: Record<string, readonly ManualFreeVerticalRemovalContentKind[]> =
  {
    shelf: ['rod', 'storage'],
    rod: ['shelf', 'storage'],
    storage: ['storage'],
  };

function findRecentManualFreeStructuralHover(args: {
  hover: unknown;
  tool: string;
  host: SketchFreePlacementHostLike;
}): { hoverRec: RecordMap; contentKind: ManualFreeVerticalRemovalContentKind; op: 'add' | 'remove' } | null {
  const hoverRec = matchRecentSketchHover({
    hover: args.hover,
    tool: args.tool,
    kind: SKETCH_STRUCTURAL_COMMAND_HOVER_KIND,
    host: args.host,
    toModuleKey: __wp_toModuleKey,
  });
  if (!hoverRec) return null;
  const decoded = decodeSketchStructuralCommandHover(hoverRec);
  if (!decoded.ok || !decoded.value.command.freePlacement) return null;
  const { contentKind, command } = decoded.value;
  if (contentKind !== 'shelf' && contentKind !== 'rod' && contentKind !== 'storage') return null;
  return { hoverRec, contentKind, op: command.op };
}

function findRecentManualFreeVerticalRemovalHover(args: {
  hover: unknown;
  tool: string;
  host: SketchFreePlacementHostLike;
}): { hoverRec: RecordMap; contentKind: ManualFreeVerticalRemovalContentKind } | null {
  const match = findRecentManualFreeStructuralHover(args);
  const removalKinds = MANUAL_FREE_VERTICAL_REMOVAL_BY_TOOL[args.tool] || [];
  if (!match || match.op !== 'remove' || !removalKinds.includes(match.contentKind)) return null;
  return { hoverRec: match.hoverRec, contentKind: match.contentKind };
}

function removeShelvesInGridCell(args: {
  list: RecordMap[];
  cellXNormMin: number;
  cellXNormMax: number;
  cellYNormMin: number;
  cellYNormMax: number;
}): void {
  removeItemsInGridCell(args);
}

function removeItemsInGridCell(args: {
  list: RecordMap[];
  cellXNormMin: number;
  cellXNormMax: number;
  cellYNormMin: number;
  cellYNormMax: number;
}): void {
  const eps = 1e-6;
  for (let i = args.list.length - 1; i >= 0; i -= 1) {
    const item = args.list[i];
    const xNorm = readContentItemXNorm(item);
    const yNorm = readRecordNumber(item, 'yNorm');
    if (xNorm == null || yNorm == null) continue;
    if (
      xNorm >= args.cellXNormMin - eps &&
      xNorm <= args.cellXNormMax + eps &&
      yNorm >= args.cellYNormMin - eps &&
      yNorm <= args.cellYNormMax + eps
    ) {
      args.list.splice(i, 1);
    }
  }
}

function updateFreeBoxShelfVariant(args: { box: RecordMap; command: BraceShelvesFreeBoxCommand }): boolean {
  const shelves = ensureSketchBoxContentList(args.box, 'shelves') as RecordMap[];
  const { shelfId, shelfIdx } = args.command;
  let index = -1;
  if (shelfId) {
    index = shelves.findIndex(
      item => formatIdentityValue(readIdentityValue(readRecordValue(item, 'id'))) === shelfId
    );
  }
  if (index < 0 && shelfIdx != null && shelfIdx >= 0 && shelfIdx < shelves.length)
    index = Math.floor(shelfIdx);
  if (index < 0) return false;
  const item = shelves[index];
  if (!item) return false;
  const { variant, depthM } = args.command;
  item.variant = variant;
  if (depthM != null && depthM > 0) item.depthM = depthM;
  return true;
}

function commitShelfGridHover(args: {
  App: AppContainer;
  host: SketchFreePlacementHostLike;
  hoverRec: RecordMap;
}): boolean {
  const mods = getModulesActions(args.App);
  if (!mods || typeof mods.patchForStack !== 'function') return false;

  const command = readShelfGridFreeBoxCommand(args.hoverRec);
  if (!command) {
    __wp_clearSketchHover(args.App);
    return true;
  }
  if (command.blockedReason) {
    toastSketchBoxContentBlocked(args.App, 'shelf', command.blockedReason);
    __wp_clearSketchHover(args.App);
    return true;
  }
  const {
    boxId,
    shelfYNorms,
    variant,
    depthM,
    contentXNorm,
    cellXNormMin,
    cellXNormMax,
    cellYNormMin,
    cellYNormMax,
  } = command;

  mods.patchForStack(
    args.host.isBottom ? 'bottom' : 'top',
    args.host.moduleKey,
    (cfg: RecordMap) => {
      const box = findSketchModuleBoxById(ensureSketchModuleBoxes(cfg), boxId, { freePlacement: true });
      if (!box) return;
      const shelves = ensureSketchBoxContentList(box, 'shelves') as RecordMap[];
      removeShelvesInGridCell({
        list: shelves,
        cellXNormMin,
        cellXNormMax,
        cellYNormMin,
        cellYNormMax,
      });
      for (const yNorm of shelfYNorms) {
        shelves.push({
          id: createRandomId('sbc'),
          yNorm,
          xNorm: contentXNorm,
          variant,
          ...(depthM != null && depthM > 0 ? { depthM } : {}),
        });
      }
    },
    createCanvasPickingModulesStructuralPatchMeta('manualLayout.freeBoxShelfGrid')
  );
  __wp_clearSketchHover(args.App);
  return true;
}

function commitPresetLayoutHover(args: {
  App: AppContainer;
  host: SketchFreePlacementHostLike;
  hoverRec: RecordMap;
}): boolean {
  const mods = getModulesActions(args.App);
  if (!mods || typeof mods.patchForStack !== 'function') return false;

  const command = readPresetLayoutFreeBoxCommand(args.hoverRec);
  if (!command) {
    __wp_clearSketchHover(args.App);
    return true;
  }
  if (command.blockedReason) {
    toastSketchBoxContentBlocked(args.App, 'shelf', command.blockedReason);
    __wp_clearSketchHover(args.App);
    return true;
  }
  const {
    boxId,
    shelfYNorms,
    rodYNorms,
    storageYNorm,
    storageHeightM,
    variant,
    depthM,
    contentXNorm,
    cellXNormMin,
    cellXNormMax,
    cellYNormMin,
    cellYNormMax,
  } = command;

  mods.patchForStack(
    args.host.isBottom ? 'bottom' : 'top',
    args.host.moduleKey,
    (cfg: RecordMap) => {
      const box = findSketchModuleBoxById(ensureSketchModuleBoxes(cfg), boxId, { freePlacement: true });
      if (!box) return;
      if (
        rodYNorms.length > 0 &&
        blockRemovableSideContentBuildIfSketchBoxSideMissing({
          App: args.App,
          cfg,
          box,
          moduleKey: args.host.moduleKey,
          isBottomStack: args.host.isBottom,
          freePlacement: true,
        })
      ) {
        return;
      }

      const shelves = ensureSketchBoxContentList(box, 'shelves') as RecordMap[];
      const rods = ensureSketchBoxContentList(box, 'rods') as RecordMap[];
      const storageBarriers = ensureSketchBoxContentList(box, 'storageBarriers') as RecordMap[];
      const clearArgs = { cellXNormMin, cellXNormMax, cellYNormMin, cellYNormMax };
      removeItemsInGridCell({ list: shelves, ...clearArgs });
      removeItemsInGridCell({ list: rods, ...clearArgs });
      removeItemsInGridCell({ list: storageBarriers, ...clearArgs });

      for (const yNorm of shelfYNorms) {
        shelves.push({
          id: createRandomId('sbc'),
          yNorm,
          xNorm: contentXNorm,
          variant,
          ...(depthM != null && depthM > 0 ? { depthM } : {}),
        });
      }
      for (const yNorm of rodYNorms) {
        rods.push({ id: createRandomId('sbc'), yNorm, xNorm: contentXNorm });
      }
      if (storageYNorm != null) {
        storageBarriers.push({
          id: createRandomId('sbc'),
          yNorm: clampUnit(storageYNorm),
          xNorm: contentXNorm,
          heightM:
            storageHeightM != null && storageHeightM > 0
              ? storageHeightM
              : INTERIOR_FITTINGS_DIMENSIONS.storage.barrierHeightM,
        });
      }
    },
    createCanvasPickingModulesStructuralPatchMeta('layoutPreset.freeBox')
  );
  __wp_clearSketchHover(args.App);
  return true;
}

function commitBraceShelvesHover(args: {
  App: AppContainer;
  host: SketchFreePlacementHostLike;
  hoverRec: RecordMap;
}): boolean {
  const mods = getModulesActions(args.App);
  if (!mods || typeof mods.patchForStack !== 'function') return false;

  const command = readBraceShelvesFreeBoxCommand(args.hoverRec);
  if (!command) {
    __wp_clearSketchHover(args.App);
    return true;
  }
  const { boxId } = command;
  let updated = false;
  mods.patchForStack(
    args.host.isBottom ? 'bottom' : 'top',
    args.host.moduleKey,
    (cfg: RecordMap) => {
      const box = findSketchModuleBoxById(ensureSketchModuleBoxes(cfg), boxId, { freePlacement: true });
      if (!box) return;
      updated = updateFreeBoxShelfVariant({ box, command });
    },
    createCanvasPickingModulesStructuralPatchMeta('braceShelves.freeBoxToggle')
  );
  __wp_clearSketchHover(args.App);
  return updated;
}

export function tryCommitPresetLayoutFreeBoxFromHover(App: AppContainer): boolean {
  const host = pickSketchFreeBoxHost(App);
  if (!host) return false;
  const hoverRec = matchRecentSketchHover({
    hover: __wp_readSketchHover(App),
    tool: 'layout_preset',
    kind: 'box_content_preset',
    contentKind: 'layout_preset',
    host,
    toModuleKey: __wp_toModuleKey,
    requireFreePlacement: true,
  });
  return hoverRec ? commitPresetLayoutHover({ App, host, hoverRec }) : false;
}

export function tryCommitBraceShelvesFreeBoxFromHover(App: AppContainer): boolean {
  const host = pickSketchFreeBoxHost(App);
  if (!host) return false;
  const hoverRec = matchRecentSketchHover({
    hover: __wp_readSketchHover(App),
    tool: 'brace_shelves',
    kind: 'box_content_brace_shelf',
    contentKind: 'brace_shelf',
    host,
    toModuleKey: __wp_toModuleKey,
    requireFreePlacement: true,
  });
  return hoverRec ? commitBraceShelvesHover({ App, host, hoverRec }) : false;
}

export function tryCommitManualLayoutFreeBoxFromHover(
  App: AppContainer,
  manualTool: unknown,
  floorY?: number
): boolean {
  const tool = typeof manualTool === 'string' ? manualTool : '';
  const contentKind = resolveManualToolContentKind(tool);
  if (!contentKind) return false;

  const host = pickSketchFreeBoxHost(App);
  if (!host) return false;

  const verticalRemoval = findRecentManualFreeVerticalRemovalHover({
    hover: __wp_readSketchHover(App),
    tool,
    host,
  });
  if (verticalRemoval) {
    const commit = commitSketchFreePlacementHoverRecord({
      App,
      host,
      hoverRec: verticalRemoval.hoverRec,
      freeBoxContentKind: verticalRemoval.contentKind,
      floorY,
    });
    if (!commit.committed) return false;
    if (commit.nextHover) __wp_writeSketchHover(App, commit.nextHover);
    else __wp_clearSketchHover(App);
    return true;
  }

  if (contentKind === 'shelf_grid') {
    const hoverRec = matchRecentSketchHover({
      hover: __wp_readSketchHover(App),
      tool,
      kind: 'box_content_grid',
      contentKind: 'shelf_grid',
      host,
      toModuleKey: __wp_toModuleKey,
      requireFreePlacement: true,
    });
    return hoverRec ? commitShelfGridHover({ App, host, hoverRec }) : false;
  }

  const structuralHover = findRecentManualFreeStructuralHover({
    hover: __wp_readSketchHover(App),
    tool,
    host,
  });
  if (!structuralHover || structuralHover.contentKind !== contentKind) return false;
  const hoverRec = structuralHover.hoverRec;
  const commit = commitSketchFreePlacementHoverRecord({
    App,
    host,
    hoverRec,
    freeBoxContentKind: contentKind,
    floorY,
  });
  if (!commit.committed) return false;
  if (commit.nextHover) __wp_writeSketchHover(App, commit.nextHover);
  else __wp_clearSketchHover(App);
  return true;
}
