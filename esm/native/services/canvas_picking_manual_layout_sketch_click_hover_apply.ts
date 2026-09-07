import type { ActionMetaLike, AppContainer } from '../../../types';
import {
  commitSketchModuleBoxContent,
  ensureSketchModuleBoxes,
  findSketchModuleBoxById,
  getSketchModuleBoxContentSource,
} from './canvas_picking_sketch_box_content_commit.js';
import { createCanvasPickingConfigStructuralPatchMeta } from './canvas_picking_config_patch_meta.js';
import { applyCanvasLinearCellDoorCountFromSketch } from './canvas_picking_cell_dims_flow.js';
import { removeStandardExternalDrawerFromConfig } from './canvas_picking_drawer_cross_family.js';
import { restoreShoeDrawerBaseIfNoShoeDrawersRemain } from './canvas_picking_shoe_drawer_base_auto_none.js';
import {
  readManualLayoutSketchRodHoverIntent,
  readManualLayoutSketchShelfHoverIntent,
  readManualLayoutSketchStackHoverIntent,
  readManualLayoutSketchStorageHoverIntent,
} from './canvas_picking_manual_layout_sketch_hover_intent.js';
import {
  removeManualLayoutBaseRod,
  removeManualLayoutBaseShelf,
  removeManualLayoutBaseStorage,
  removeManualLayoutSketchExtraByIndex,
} from './canvas_picking_manual_layout_config_ops.js';
import {
  commitSketchModuleRod,
  commitSketchModuleShelf,
  commitSketchModuleStorageBarrier,
} from './canvas_picking_sketch_module_vertical_content.js';
import { toastSketchBoxContentBlocked } from './canvas_picking_sketch_box_content_blocked.js';
import {
  decodeSketchBoxContentCommandHover,
  SKETCH_BOX_CONTENT_COMMAND_HOVER_KIND,
} from './canvas_picking_sketch_box_content_command.js';
import {
  decodeSketchStructuralCommandHover,
  SKETCH_STRUCTURAL_COMMAND_HOVER_KIND,
} from './canvas_picking_sketch_structural_command.js';
import { decodeManualLayoutCommand } from './canvas_picking_manual_layout_command.js';
import { parseSketchStorageHeight } from './canvas_picking_sketch_module_surface_commit_shared.js';
import {
  hasSketchModulePartitions,
  setSketchModulePartitionCellDoorCount,
} from './canvas_picking_sketch_module_partition.js';
import {
  addSketchBoxDividerState,
  addSketchBoxHorizontalDividerState,
  removeSketchBoxDividerState,
  removeSketchBoxHorizontalDividerState,
} from './canvas_picking_sketch_box_divider_state_mutation.js';

type RecordMap = Record<string, unknown>;
type ModuleKey = number | 'corner' | `corner:${number}` | null;

type ManualLayoutSketchClickHoverApplyArgs = {
  App: AppContainer;
  __activeModuleKey: ModuleKey;
  __isBottomStack?: boolean;
  topY: number;
  bottomY: number;
  __gridInfo: RecordMap | null;
  __hoverRec: RecordMap;
  __hoverOk: boolean;
  __patchConfigForKey: (mk: ModuleKey, patchFn: (cfg: RecordMap) => void, meta: ActionMetaLike) => unknown;
  __wp_clearSketchHover: (App: AppContainer) => void;
};

function readRecord(value: unknown): RecordMap | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as RecordMap) : null;
}

function readGridDivisions(gridInfo: RecordMap | null): number {
  const raw = gridInfo?.gridDivisions;
  const value = typeof raw === 'number' ? raw : Number(raw);
  return Number.isFinite(value) && value > 0 ? Math.round(value) : 6;
}

export function tryApplyManualLayoutSketchHoverClick(args: ManualLayoutSketchClickHoverApplyArgs): boolean {
  const {
    App,
    __activeModuleKey,
    __isBottomStack,
    topY,
    bottomY,
    __gridInfo,
    __hoverRec,
    __hoverOk,
    __patchConfigForKey,
    __wp_clearSketchHover,
  } = args;

  const manualHoverKind = __hoverRec.kind;
  const isManualCommandHover =
    manualHoverKind === 'box' ||
    manualHoverKind === 'box_blocked' ||
    manualHoverKind === 'shelf' ||
    manualHoverKind === 'rod' ||
    manualHoverKind === 'storage' ||
    manualHoverKind === 'module_divider' ||
    manualHoverKind === 'cell_door_count' ||
    manualHoverKind === 'drawers' ||
    manualHoverKind === 'ext_drawers';
  const manualCommand = __hoverOk && isManualCommandHover ? decodeManualLayoutCommand(__hoverRec) : null;
  if (__hoverOk && isManualCommandHover && !manualCommand?.ok) {
    __wp_clearSketchHover(App);
    return true;
  }

  if (manualCommand?.ok && manualCommand.command.kind === 'module_divider') {
    const command = manualCommand.command;
    if (typeof __activeModuleKey !== 'number' || !Number.isInteger(__activeModuleKey)) {
      __wp_clearSketchHover(App);
      return true;
    }
    const committed = __patchConfigForKey(
      __activeModuleKey,
      cfg => {
        let sketchExtras = readRecord(cfg.sketchExtras);
        if (!sketchExtras) {
          sketchExtras = {};
          cfg.sketchExtras = sketchExtras;
        }
        if (command.op === 'add') {
          if (command.axis === 'horizontal') {
            addSketchBoxHorizontalDividerState(sketchExtras, command.dividerYNorm, command.dividerId, {
              xNorm: command.dividerXNorm,
            });
          } else {
            addSketchBoxDividerState(sketchExtras, command.dividerXNorm, command.dividerId, {
              yNorm: command.dividerYNorm,
            });
          }
          return;
        }
        if (command.axis === 'horizontal') {
          removeSketchBoxHorizontalDividerState(
            sketchExtras,
            command.dividerId,
            command.dividerYNorm,
            command.dividerXNorm
          );
        } else {
          removeSketchBoxDividerState(
            sketchExtras,
            command.dividerId,
            command.dividerXNorm,
            command.dividerYNorm
          );
        }
      },
      createCanvasPickingConfigStructuralPatchMeta('sketch.moduleDivider')
    );
    if (committed !== false) __wp_clearSketchHover(App);
    return true;
  }

  if (manualCommand?.ok && manualCommand.command.kind === 'cell_door_count') {
    if (typeof __activeModuleKey !== 'number' || !Number.isInteger(__activeModuleKey)) {
      __wp_clearSketchHover(App);
      return true;
    }
    const command = manualCommand.command;
    const ownershipXNorm =
      typeof __hoverRec.xNorm === 'number' &&
      Number.isFinite(__hoverRec.xNorm) &&
      __hoverRec.xNorm >= 0 &&
      __hoverRec.xNorm <= 1
        ? __hoverRec.xNorm
        : null;
    const ownershipYNorm =
      typeof __hoverRec.yNorm === 'number' &&
      Number.isFinite(__hoverRec.yNorm) &&
      __hoverRec.yNorm >= 0 &&
      __hoverRec.yNorm <= 1
        ? __hoverRec.yNorm
        : null;
    const ownershipScopeOrder =
      typeof __hoverRec.scopeOrder === 'number' &&
      Number.isFinite(__hoverRec.scopeOrder) &&
      __hoverRec.scopeOrder > 0
        ? __hoverRec.scopeOrder
        : null;
    if (ownershipXNorm == null || ownershipYNorm == null || ownershipScopeOrder == null) {
      applyCanvasLinearCellDoorCountFromSketch({
        App,
        foundModuleIndex: __activeModuleKey,
        isBottomStack: !!__isBottomStack,
        doorCount: command.doorCount,
      });
      __wp_clearSketchHover(App);
      return true;
    }
    let appliedToPartitionCell = false;
    const patched = __patchConfigForKey(
      __activeModuleKey,
      cfg => {
        if (!hasSketchModulePartitions(cfg.sketchExtras)) return;
        appliedToPartitionCell = setSketchModulePartitionCellDoorCount({
          cfg,
          xNorm: ownershipXNorm,
          yNorm: ownershipYNorm,
          scopeOrder: ownershipScopeOrder,
          doorCount: command.doorCount,
        });
      },
      createCanvasPickingConfigStructuralPatchMeta('sketch.partitionCellDoorCount')
    );
    if (!appliedToPartitionCell) {
      applyCanvasLinearCellDoorCountFromSketch({
        App,
        foundModuleIndex: __activeModuleKey,
        isBottomStack: !!__isBottomStack,
        doorCount: command.doorCount,
      });
    }
    if (patched !== false || !appliedToPartitionCell) __wp_clearSketchHover(App);
    return true;
  }

  const strictHover = __hoverOk ? decodeSketchBoxContentCommandHover(__hoverRec) : null;
  if (__hoverOk && __hoverRec.kind === SKETCH_BOX_CONTENT_COMMAND_HOVER_KIND) {
    if (!strictHover?.ok) {
      __wp_clearSketchHover(App);
      return true;
    }
    const { command, contentKind } = strictHover.value;
    if (
      !command.freePlacement &&
      (contentKind === 'door' || contentKind === 'double_door' || contentKind === 'door_hinge')
    ) {
      if (command.blockedReason) {
        toastSketchBoxContentBlocked(App, contentKind, command.blockedReason);
        __wp_clearSketchHover(App);
        return true;
      }
      const committed = __patchConfigForKey(
        __activeModuleKey,
        cfg => {
          const boxes = ensureSketchModuleBoxes(cfg);
          const box = findSketchModuleBoxById(boxes, command.boxId, { freePlacement: false });
          if (!box) return;
          commitSketchModuleBoxContent({
            App,
            cfg,
            box,
            boxId: command.boxId,
            contentKind,
            hoverRec: __hoverRec,
            hoverHost: {
              tool: typeof __hoverRec.tool === 'string' ? __hoverRec.tool : '',
              moduleKey: __activeModuleKey,
              isBottom: !!__isBottomStack,
            },
          });
        },
        createCanvasPickingConfigStructuralPatchMeta(getSketchModuleBoxContentSource(contentKind))
      );
      if (committed !== false) __wp_clearSketchHover(App);
      return true;
    }
  }

  const structuralHover = __hoverOk ? decodeSketchStructuralCommandHover(__hoverRec) : null;
  if (__hoverOk && __hoverRec.kind === SKETCH_STRUCTURAL_COMMAND_HOVER_KIND) {
    if (!structuralHover?.ok) {
      __wp_clearSketchHover(App);
      return true;
    }
    const { command, contentKind } = structuralHover.value;
    if (!command.freePlacement) {
      if (command.blockedReason) {
        toastSketchBoxContentBlocked(App, contentKind, command.blockedReason);
        __wp_clearSketchHover(App);
        return true;
      }
      const committed = __patchConfigForKey(
        __activeModuleKey,
        cfg => {
          const boxes = ensureSketchModuleBoxes(cfg);
          const box = findSketchModuleBoxById(boxes, command.boxId, { freePlacement: false });
          if (!box) return;
          commitSketchModuleBoxContent({
            App,
            cfg,
            box,
            boxId: command.boxId,
            contentKind,
            hoverRec: __hoverRec,
            hoverHost: {
              tool: typeof __hoverRec.tool === 'string' ? __hoverRec.tool : '',
              moduleKey: __activeModuleKey,
              isBottom: !!__isBottomStack,
            },
          });
        },
        createCanvasPickingConfigStructuralPatchMeta(getSketchModuleBoxContentSource(contentKind))
      );
      if (committed !== false) __wp_clearSketchHover(App);
      return true;
    }
  }

  const rodHover = __hoverOk ? readManualLayoutSketchRodHoverIntent(__hoverRec) : null;
  if (rodHover && rodHover.op === 'add') {
    if (rodHover.blockedReason) {
      toastSketchBoxContentBlocked(App, 'rod', rodHover.blockedReason);
      __wp_clearSketchHover(App);
      return true;
    }
    const totalHeight = topY - bottomY;
    if (!(totalHeight > 0)) return false;
    const yNorm = Math.max(0, Math.min(1, rodHover.yNorm));
    const committed = __patchConfigForKey(
      __activeModuleKey,
      cfg => {
        commitSketchModuleRod({
          cfg,
          bottomY,
          totalHeight,
          pointerY: bottomY + yNorm * totalHeight,
          yNorm,
          ...(rodHover.xNorm !== undefined ? { xNorm: rodHover.xNorm } : {}),
          ...(rodHover.scopeOrder !== undefined ? { scopeOrder: rodHover.scopeOrder } : {}),
          removeEps: -1,
        });
      },
      createCanvasPickingConfigStructuralPatchMeta('sketch.hoverAddRod')
    );
    if (committed !== false) __wp_clearSketchHover(App);
    return true;
  }
  if (rodHover && rodHover.op === 'remove') {
    __patchConfigForKey(
      __activeModuleKey,
      cfg => {
        if (rodHover.removeKind === 'sketch') {
          removeManualLayoutSketchExtraByIndex(cfg, 'rods', rodHover.removeIdx ?? NaN);
          return;
        }
        if (rodHover.removeKind !== 'base' || !Number.isFinite(rodHover.rodIndex)) return;
        removeManualLayoutBaseRod(cfg, {
          divs: readGridDivisions(__gridInfo),
          rodIndex: Number(rodHover.rodIndex),
          topY,
          bottomY,
        });
      },
      createCanvasPickingConfigStructuralPatchMeta('sketch.hoverRemoveRod')
    );
    return true;
  }

  const storageHover = __hoverOk ? readManualLayoutSketchStorageHoverIntent(__hoverRec) : null;
  if (storageHover && storageHover.op === 'add') {
    if (storageHover.blockedReason) {
      toastSketchBoxContentBlocked(App, 'storage', storageHover.blockedReason);
      __wp_clearSketchHover(App);
      return true;
    }
    const totalHeight = topY - bottomY;
    if (!(totalHeight > 0)) return false;
    const yNorm = Math.max(0, Math.min(1, storageHover.yNorm));
    const committed = __patchConfigForKey(
      __activeModuleKey,
      cfg => {
        commitSketchModuleStorageBarrier({
          cfg,
          bottomY,
          topY,
          totalHeight,
          pad: 0,
          pointerY: bottomY + yNorm * totalHeight,
          ...(storageHover.xNorm !== undefined ? { xNorm: storageHover.xNorm } : {}),
          ...(storageHover.scopeOrder !== undefined ? { scopeOrder: storageHover.scopeOrder } : {}),
          heightM: parseSketchStorageHeight(
            typeof __hoverRec.tool === 'string' ? __hoverRec.tool : 'sketch_storage:'
          ),
          removeEps: -1,
          idFactory: () => `ss_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36)}`,
        });
      },
      createCanvasPickingConfigStructuralPatchMeta('sketch.hoverAddStorage')
    );
    if (committed !== false) __wp_clearSketchHover(App);
    return true;
  }
  if (storageHover && storageHover.op === 'remove') {
    __patchConfigForKey(
      __activeModuleKey,
      cfg => {
        if (storageHover.removeKind === 'sketch') {
          removeManualLayoutSketchExtraByIndex(cfg, 'storageBarriers', storageHover.removeIdx ?? NaN);
          return;
        }
        if (storageHover.removeKind !== 'base') return;
        removeManualLayoutBaseStorage(cfg, {
          divs: readGridDivisions(__gridInfo),
          topY,
          bottomY,
        });
      },
      createCanvasPickingConfigStructuralPatchMeta('sketch.hoverRemoveStorage')
    );
    return true;
  }

  const shelfHover = __hoverOk ? readManualLayoutSketchShelfHoverIntent(__hoverRec) : null;
  if (shelfHover && shelfHover.op === 'add') {
    if (shelfHover.blockedReason) {
      toastSketchBoxContentBlocked(App, 'shelf', shelfHover.blockedReason);
      __wp_clearSketchHover(App);
      return true;
    }
    const totalHeight = topY - bottomY;
    const yNorm = shelfHover.yNorm;
    if (!(totalHeight > 0) || typeof yNorm !== 'number' || !Number.isFinite(yNorm)) return false;
    const committed = __patchConfigForKey(
      __activeModuleKey,
      cfg => {
        const yNormClamped = Math.max(0, Math.min(1, Number(yNorm)));
        commitSketchModuleShelf({
          cfg,
          bottomY,
          totalHeight,
          pointerY: bottomY + yNormClamped * totalHeight,
          yNorm: yNormClamped,
          ...(shelfHover.xNorm !== undefined ? { xNorm: shelfHover.xNorm } : {}),
          ...(shelfHover.scopeOrder !== undefined ? { scopeOrder: shelfHover.scopeOrder } : {}),
          variant: shelfHover.variant || 'double',
          shelfDepthM: shelfHover.depthM,
          removeEps: -1,
        });
      },
      createCanvasPickingConfigStructuralPatchMeta('sketch.hoverAddShelf')
    );
    if (committed !== false) __wp_clearSketchHover(App);
    return true;
  }
  if (shelfHover && shelfHover.op === 'remove') {
    __patchConfigForKey(
      __activeModuleKey,
      cfg => {
        if (shelfHover.removeKind === 'sketch') {
          removeManualLayoutSketchExtraByIndex(cfg, 'shelves', shelfHover.removeIdx ?? NaN);
          return;
        }
        if (shelfHover.removeKind !== 'base' || !Number.isFinite(shelfHover.shelfIndex)) return;
        const divs = readGridDivisions(__gridInfo);
        if (divs <= 1) return;
        removeManualLayoutBaseShelf(cfg, {
          divs,
          shelfIndex: Number(shelfHover.shelfIndex),
          topY,
          bottomY,
        });
      },
      createCanvasPickingConfigStructuralPatchMeta('sketch.hoverRemoveShelf')
    );
    return true;
  }

  const stackHover = __hoverOk ? readManualLayoutSketchStackHoverIntent(__hoverRec) : null;
  if (
    stackHover?.kind === 'ext_drawers' &&
    stackHover.op === 'remove' &&
    stackHover.removeKind === 'std' &&
    stackHover.removePid
  ) {
    let removed = false;
    __patchConfigForKey(
      __activeModuleKey,
      cfg => {
        removed = removeStandardExternalDrawerFromConfig(cfg, stackHover.removePid || '') || removed;
      },
      createCanvasPickingConfigStructuralPatchMeta('sketch.hoverRemoveStandardExternalDrawer')
    );
    if (removed) {
      restoreShoeDrawerBaseIfNoShoeDrawersRemain(
        App,
        'sketch.hoverRemoveStandardExternalDrawer:autoBaseRestore'
      );
    }
    __wp_clearSketchHover(App);
    return true;
  }

  return false;
}
