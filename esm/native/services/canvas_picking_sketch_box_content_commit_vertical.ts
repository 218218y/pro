import type { SketchModuleBoxContentLike } from './canvas_picking_manual_layout_sketch_contracts.js';
import type { SketchStructuralCommand } from './canvas_picking_sketch_structural_command.js';
import {
  createRandomId,
  ensureSketchBoxContentList,
} from './canvas_picking_sketch_box_content_commit_boxes.js';
import type { CommitSketchModuleBoxContentArgs } from './canvas_picking_sketch_box_content_commit_contracts.js';
import {
  writeSketchCommitClampedUnitNumber,
  writeSketchCommitPositiveNumber,
} from './canvas_picking_sketch_commit_geometry.js';

function resolveVerticalContentKey(contentKind: string): 'shelves' | 'rods' | 'storageBarriers' {
  return contentKind === 'shelf' ? 'shelves' : contentKind === 'rod' ? 'rods' : 'storageBarriers';
}

function removeBoxContent(args: {
  list: SketchModuleBoxContentLike[];
  removeId: string | null;
  removeIdx: number | null;
}): boolean {
  if (args.removeId) {
    const index = args.list.findIndex(item => item.id != null && String(item.id) === args.removeId);
    if (index >= 0) {
      args.list.splice(index, 1);
      return true;
    }
  }
  if (args.removeIdx != null && args.removeIdx >= 0 && args.removeIdx < args.list.length) {
    args.list.splice(Math.floor(args.removeIdx), 1);
    return true;
  }
  return false;
}

function isCommandForContentKind(command: SketchStructuralCommand, contentKind: string): boolean {
  return (
    (contentKind === 'shelf' && (command.kind === 'add-shelf' || command.kind === 'remove-shelf')) ||
    (contentKind === 'rod' && (command.kind === 'add-rod' || command.kind === 'remove-rod')) ||
    (contentKind === 'storage' && (command.kind === 'add-storage' || command.kind === 'remove-storage'))
  );
}

export function tryCommitSketchBoxVerticalContent(args: {
  commitArgs: CommitSketchModuleBoxContentArgs;
  structuralCommand: SketchStructuralCommand | null;
  hoverOp: 'add' | 'remove';
}): { handled: boolean; nextHover: null } {
  const { commitArgs, structuralCommand, hoverOp } = args;
  if (
    commitArgs.contentKind !== 'shelf' &&
    commitArgs.contentKind !== 'rod' &&
    commitArgs.contentKind !== 'storage'
  ) {
    return { handled: false, nextHover: null };
  }
  if (!structuralCommand || !isCommandForContentKind(structuralCommand, commitArgs.contentKind)) {
    return { handled: true, nextHover: null };
  }

  const list = ensureSketchBoxContentList(commitArgs.box, resolveVerticalContentKey(commitArgs.contentKind));
  if (hoverOp === 'remove') {
    if (
      structuralCommand.kind !== 'remove-shelf' &&
      structuralCommand.kind !== 'remove-rod' &&
      structuralCommand.kind !== 'remove-storage'
    ) {
      return { handled: true, nextHover: null };
    }
    removeBoxContent({
      list,
      removeId: structuralCommand.removeId,
      removeIdx: structuralCommand.removeIdx,
    });
    return { handled: true, nextHover: null };
  }

  const item: SketchModuleBoxContentLike = { id: createRandomId('sbc') };
  if (structuralCommand.kind === 'add-shelf') {
    writeSketchCommitClampedUnitNumber(item, 'yNorm', structuralCommand.boxYNorm, 0.5);
    item.variant = structuralCommand.variant;
    writeSketchCommitPositiveNumber(item, 'depthM', structuralCommand.depthM);
    writeSketchCommitClampedUnitNumber(item, 'xNorm', structuralCommand.contentXNorm, 0.5);
  } else if (structuralCommand.kind === 'add-rod') {
    writeSketchCommitClampedUnitNumber(item, 'yNorm', structuralCommand.boxYNorm, 0.5);
    writeSketchCommitClampedUnitNumber(item, 'xNorm', structuralCommand.contentXNorm, 0.5);
  } else if (structuralCommand.kind === 'add-storage') {
    writeSketchCommitClampedUnitNumber(item, 'yNorm', structuralCommand.boxYNorm, 0.5);
    writeSketchCommitPositiveNumber(item, 'heightM', structuralCommand.heightM);
    writeSketchCommitClampedUnitNumber(item, 'xNorm', structuralCommand.contentXNorm, 0.5);
  } else {
    return { handled: true, nextHover: null };
  }
  list.push(item);
  return { handled: true, nextHover: null };
}
