import type { AppContainer } from '../../../types';
import {
  commitSketchModuleBoxContent,
  ensureSketchModuleBoxes,
  findSketchModuleBoxById,
  getSketchModuleBoxContentSource,
} from './canvas_picking_sketch_box_content_commit.js';
import { createCanvasPickingConfigStructuralPatchMeta } from './canvas_picking_config_patch_meta.js';
import {
  readManualLayoutSketchRodHoverIntent,
  readManualLayoutSketchShelfHoverIntent,
  readManualLayoutSketchStorageHoverIntent,
} from './canvas_picking_manual_layout_sketch_hover_intent.js';
import {
  removeManualLayoutBaseRod,
  removeManualLayoutBaseShelf,
  removeManualLayoutBaseStorage,
  removeManualLayoutSketchExtraByIndex,
} from './canvas_picking_manual_layout_config_ops.js';
import { commitSketchModuleShelf } from './canvas_picking_sketch_module_vertical_content.js';
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
  __patchConfigForKey: (mk: ModuleKey, patchFn: (cfg: RecordMap) => void, meta: RecordMap) => unknown;
  __wp_clearSketchHover: (App: AppContainer) => void;
};

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
    manualHoverKind === 'drawers' ||
    manualHoverKind === 'ext_drawers';
  if (__hoverOk && isManualCommandHover && !decodeManualLayoutCommand(__hoverRec).ok) {
    __wp_clearSketchHover(App);
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

  return false;
}
