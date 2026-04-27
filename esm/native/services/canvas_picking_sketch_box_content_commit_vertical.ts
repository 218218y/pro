import type { SketchModuleBoxContentLike } from './canvas_picking_manual_layout_sketch_contracts.js';
import type { ManualLayoutSketchBoxContentHoverIntent } from './canvas_picking_manual_layout_sketch_hover_intent.js';
import {
  createRandomId,
  ensureSketchBoxContentList,
} from './canvas_picking_sketch_box_content_commit_boxes.js';
import type { CommitSketchModuleBoxContentArgs } from './canvas_picking_sketch_box_content_commit_contracts.js';

function clampNorm(value: number | null, fallback: number): number {
  return value != null ? Math.max(0, Math.min(1, value)) : fallback;
}

function resolveVerticalContentKey(contentKind: string): 'shelves' | 'rods' | 'storageBarriers' {
  return contentKind === 'shelf' ? 'shelves' : contentKind === 'rod' ? 'rods' : 'storageBarriers';
}

function removeBoxContent(args: {
  list: SketchModuleBoxContentLike[];
  removeId: string;
  removeIdx: number | null;
}): boolean {
  if (args.removeId) {
    const idx = args.list.findIndex(it => it.id != null && String(it.id) === args.removeId);
    if (idx >= 0) {
      args.list.splice(idx, 1);
      return true;
    }
  }
  if (args.removeIdx != null && args.removeIdx >= 0 && args.removeIdx < args.list.length) {
    args.list.splice(Math.floor(args.removeIdx), 1);
    return true;
  }
  return false;
}

export function tryCommitSketchBoxVerticalContent(args: {
  commitArgs: CommitSketchModuleBoxContentArgs;
  hoverIntent: ManualLayoutSketchBoxContentHoverIntent | null;
  hoverOp: 'add' | 'remove';
}): { handled: boolean; nextHover: null } {
  const { commitArgs, hoverIntent, hoverOp } = args;
  if (
    commitArgs.contentKind !== 'shelf' &&
    commitArgs.contentKind !== 'rod' &&
    commitArgs.contentKind !== 'storage'
  ) {
    return { handled: false, nextHover: null };
  }

  const boxYNorm = hoverIntent?.boxYNorm ?? null;
  const contentXNorm = hoverIntent?.contentXNorm ?? null;
  const shelfDepthM = hoverIntent?.depthM ?? null;
  const storageHM = hoverIntent?.heightM ?? null;
  const shelfVariant = hoverIntent?.variant || 'regular';
  const removeId = hoverIntent?.removeId || '';
  const removeIdx = hoverIntent?.removeIdx ?? null;
  const list = ensureSketchBoxContentList(commitArgs.box, resolveVerticalContentKey(commitArgs.contentKind));

  if (hoverOp === 'remove' && removeBoxContent({ list, removeId, removeIdx })) {
    return { handled: true, nextHover: null };
  }

  const item: SketchModuleBoxContentLike = {
    id: createRandomId('sbc'),
    yNorm: clampNorm(boxYNorm, 0.5),
  };
  if (commitArgs.contentKind === 'shelf') {
    item.variant = shelfVariant;
    if (shelfDepthM != null && shelfDepthM > 0) item.depthM = shelfDepthM;
    if (contentXNorm != null) item.xNorm = clampNorm(contentXNorm, 0.5);
  }
  if (commitArgs.contentKind === 'rod' && contentXNorm != null) {
    item.xNorm = clampNorm(contentXNorm, 0.5);
  }
  if (commitArgs.contentKind === 'storage') {
    item.heightM = storageHM != null && storageHM > 0 ? storageHM : 0.5;
    if (contentXNorm != null) item.xNorm = clampNorm(contentXNorm, 0.5);
  }
  list.push(item);
  return { handled: true, nextHover: null };
}
