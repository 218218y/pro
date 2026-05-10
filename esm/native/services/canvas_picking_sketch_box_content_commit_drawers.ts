import type { SketchModuleBoxContentLike } from './canvas_picking_manual_layout_sketch_contracts.js';
import type { ManualLayoutSketchBoxContentHoverIntent } from './canvas_picking_manual_layout_sketch_hover_intent.js';
import {
  createRandomId,
  ensureSketchBoxContentList,
} from './canvas_picking_sketch_box_content_commit_boxes.js';
import type { CommitSketchModuleBoxContentArgs } from './canvas_picking_sketch_box_content_commit_contracts.js';
import { buildToggleHoverRecord } from './canvas_picking_sketch_box_content_commit_toggle.js';

function clampNorm(value: number | null, defaultValue: number): number {
  return value != null ? Math.max(0, Math.min(1, value)) : defaultValue;
}

function removeBoxContentById(list: SketchModuleBoxContentLike[], removeId: string): boolean {
  if (!removeId) return false;
  const idx = list.findIndex(it => it.id != null && String(it.id) === removeId);
  if (idx < 0) return false;
  list.splice(idx, 1);
  return true;
}

function buildDrawerItem(args: {
  idPrefix: string;
  boxYNorm: number | null;
  boxBaseYNorm: number | null;
  contentXNorm: number | null;
  drawerCount?: number;
  drawerHeightM?: number | null;
}): SketchModuleBoxContentLike {
  const item: SketchModuleBoxContentLike = {
    id: createRandomId(args.idPrefix),
    yNormC: clampNorm(args.boxYNorm, 0.5),
    yNorm: args.boxBaseYNorm != null ? clampNorm(args.boxBaseYNorm, 0.5) : undefined,
  };
  if (args.contentXNorm != null) item.xNorm = clampNorm(args.contentXNorm, 0.5);
  if (args.drawerCount != null) item.count = args.drawerCount;
  if (args.drawerHeightM != null && Number.isFinite(args.drawerHeightM) && args.drawerHeightM > 0) {
    item.drawerHeightM = args.drawerHeightM;
  }
  return item;
}

export function tryCommitSketchBoxDrawerContent(args: {
  commitArgs: CommitSketchModuleBoxContentArgs;
  hoverIntent: ManualLayoutSketchBoxContentHoverIntent | null;
  hoverOp: 'add' | 'remove';
}): { handled: boolean; nextHover: Record<string, unknown> | null } {
  const { commitArgs, hoverIntent, hoverOp } = args;
  const hoverMode = commitArgs.hoverMode || 'none';
  const hoverHost = commitArgs.hoverHost || null;
  const boxId = commitArgs.boxId;
  const contentXNorm = hoverIntent?.contentXNorm ?? null;
  const boxYNorm = hoverIntent?.boxYNorm ?? null;
  const boxBaseYNorm = hoverIntent?.boxBaseYNorm ?? null;
  const removeId = hoverIntent?.removeId || '';
  const drawerHeightM = hoverIntent?.drawerHeightM ?? hoverIntent?.drawerH ?? null;
  const drawerH = hoverIntent?.drawerH ?? drawerHeightM;

  if (commitArgs.contentKind === 'drawers') {
    const list = ensureSketchBoxContentList(commitArgs.box, 'drawers');
    if (hoverOp === 'remove' && removeBoxContentById(list, removeId)) {
      return {
        handled: true,
        nextHover: buildToggleHoverRecord({
          hoverMode,
          hoverRec: commitArgs.hoverRec,
          hoverHost,
          boxId,
          contentKind: 'drawers',
          op: 'add',
          removeId: '',
          drawerHeightM,
          drawerH,
        }),
      };
    }

    const item = buildDrawerItem({
      idPrefix: 'sd',
      boxYNorm,
      boxBaseYNorm,
      contentXNorm,
      drawerHeightM,
    });
    list.push(item);
    return {
      handled: true,
      nextHover: buildToggleHoverRecord({
        hoverMode,
        hoverRec: commitArgs.hoverRec,
        hoverHost,
        boxId,
        contentKind: 'drawers',
        op: 'remove',
        removeId: String(item.id),
        drawerHeightM,
        drawerH,
      }),
    };
  }

  if (commitArgs.contentKind === 'ext_drawers') {
    const list = ensureSketchBoxContentList(commitArgs.box, 'extDrawers');
    const drawerCountRaw = hoverIntent?.drawerCount ?? null;
    const drawerCount = drawerCountRaw != null ? Math.max(1, Math.min(5, Math.floor(drawerCountRaw))) : 1;
    if (hoverOp === 'remove' && removeBoxContentById(list, removeId)) {
      return {
        handled: true,
        nextHover: buildToggleHoverRecord({
          hoverMode,
          hoverRec: commitArgs.hoverRec,
          hoverHost,
          boxId,
          contentKind: 'ext_drawers',
          op: 'add',
          removeId: '',
          drawerCount,
          drawerHeightM,
          drawerH,
        }),
      };
    }

    const item = buildDrawerItem({
      idPrefix: 'sed',
      boxYNorm,
      boxBaseYNorm,
      contentXNorm,
      drawerCount,
      drawerHeightM,
    });
    list.push(item);
    return {
      handled: true,
      nextHover: buildToggleHoverRecord({
        hoverMode,
        hoverRec: commitArgs.hoverRec,
        hoverHost,
        boxId,
        contentKind: 'ext_drawers',
        op: 'remove',
        removeId: String(item.id),
        drawerCount,
        drawerHeightM,
        drawerH,
      }),
    };
  }

  return { handled: false, nextHover: null };
}
