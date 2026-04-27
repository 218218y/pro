import type { AppContainer } from '../../../types';
import {
  commitSketchModuleBoxContent,
  ensureSketchModuleBoxes,
  findSketchModuleBoxById,
  getSketchModuleBoxContentSource,
} from './canvas_picking_sketch_box_content_commit.js';
import {
  readManualLayoutSketchBoxContentHoverIntent,
  readManualLayoutSketchRodHoverIntent,
  readManualLayoutSketchShelfHoverIntent,
} from './canvas_picking_manual_layout_sketch_hover_intent.js';
import {
  removeManualLayoutBaseRod,
  removeManualLayoutBaseShelf,
  removeManualLayoutSketchExtraByIndex,
} from './canvas_picking_manual_layout_config_ops.js';

type RecordMap = Record<string, unknown>;
type ModuleKey = number | 'corner' | `corner:${number}` | null;

type ManualLayoutSketchClickHoverApplyArgs = {
  App: AppContainer;
  __activeModuleKey: ModuleKey;
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
    topY,
    bottomY,
    __gridInfo,
    __hoverRec,
    __hoverOk,
    __patchConfigForKey,
    __wp_clearSketchHover,
  } = args;

  const boxContentHover = __hoverOk ? readManualLayoutSketchBoxContentHoverIntent(__hoverRec) : null;
  if (boxContentHover && !boxContentHover.freePlacement && boxContentHover.boxId) {
    const contentKind = boxContentHover.contentKind;
    if (
      contentKind === 'divider' ||
      contentKind === 'shelf' ||
      contentKind === 'rod' ||
      contentKind === 'storage' ||
      contentKind === 'door' ||
      contentKind === 'double_door' ||
      contentKind === 'door_hinge'
    ) {
      const boxId = boxContentHover.boxId;
      __patchConfigForKey(
        __activeModuleKey,
        cfg => {
          const boxes = ensureSketchModuleBoxes(cfg);
          const box = findSketchModuleBoxById(boxes, boxId, { freePlacement: false });
          if (!box) return;
          commitSketchModuleBoxContent({
            box,
            boxId,
            contentKind,
            hoverRec: __hoverRec,
          });
        },
        {
          source: getSketchModuleBoxContentSource(contentKind),
          immediate: true,
        }
      );
      __wp_clearSketchHover(App);
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
      { source: 'sketch.hoverRemoveRod', immediate: true }
    );
    return true;
  }

  const shelfHover = __hoverOk ? readManualLayoutSketchShelfHoverIntent(__hoverRec) : null;
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
      { source: 'sketch.hoverRemoveShelf', immediate: true }
    );
    return true;
  }

  return false;
}
