import {
  decodeSketchBoxContentCommandHover,
  isStrictSketchBoxContentKind,
  type SketchBoxContentCommand,
} from './canvas_picking_sketch_box_content_command.js';
import {
  decodeSketchStructuralCommandHover,
  isStrictSketchStructuralContentKind,
  type SketchStructuralCommand,
} from './canvas_picking_sketch_structural_command.js';
import { blockRemovableSideContentBuildIfSketchBoxSideMissing } from './canvas_picking_removable_part_remove_constraints.js';
import { __wp_toast } from './canvas_picking_core_helpers.js';
import {
  readRoomArchitectureForDrawerGuard,
  ROOM_COLUMN_DRAWER_ADD_BLOCKED_MESSAGE,
  shouldBlockFreeBoxDrawerBuildForRoomColumn,
  shouldBlockDrawerBuildForRoomColumn,
} from './canvas_picking_drawer_mode_flow_shared.js';
import { tryCommitSketchBoxAdornment } from './canvas_picking_sketch_box_content_commit_adornments.js';
import type { CommitSketchModuleBoxContentArgs } from './canvas_picking_sketch_box_content_commit_contracts.js';
import { tryCommitSketchBoxDoorContent } from './canvas_picking_sketch_box_content_commit_doors.js';
import { tryCommitSketchBoxDrawerContent } from './canvas_picking_sketch_box_content_commit_drawers.js';
import {
  ensureSketchModuleBoxes,
  findSketchModuleBoxById,
  getSketchModuleBoxContentSource,
} from './canvas_picking_sketch_box_content_commit_boxes.js';
import { tryCommitSketchBoxVerticalContent } from './canvas_picking_sketch_box_content_commit_vertical.js';

export { ensureSketchModuleBoxes, findSketchModuleBoxById, getSketchModuleBoxContentSource };

function isSideBlockingBoxContentKind(contentKind: string): boolean {
  return (
    contentKind === 'rod' ||
    contentKind === 'drawers' ||
    contentKind === 'ext_drawers' ||
    contentKind === 'regular_ext_drawers'
  );
}

function isDrawerBoxContentKind(contentKind: string): boolean {
  return contentKind === 'drawers' || contentKind === 'ext_drawers' || contentKind === 'regular_ext_drawers';
}

function blockDrawerBoxContentIfRoomColumnCutsCell(
  args: CommitSketchModuleBoxContentArgs & { hoverOp: 'add' | 'remove' }
): boolean {
  if (args.hoverOp === 'remove' || !args.App || !isDrawerBoxContentKind(args.contentKind)) return false;
  const roomArchitecture = readRoomArchitectureForDrawerGuard(args.App);
  const blocked =
    args.box.freePlacement === true
      ? shouldBlockFreeBoxDrawerBuildForRoomColumn({
          App: args.App,
          roomArchitecture,
          box: args.box,
        })
      : shouldBlockDrawerBuildForRoomColumn({
          App: args.App,
          roomArchitecture,
          moduleKey: args.hoverHost?.moduleKey ?? null,
          isBottomStack: args.hoverHost?.isBottom === true,
        });
  if (!blocked) return false;
  __wp_toast(args.App, ROOM_COLUMN_DRAWER_ADD_BLOCKED_MESSAGE, 'error');
  return true;
}

function blockSideBlockingBoxContentIfSideMissing(
  args: CommitSketchModuleBoxContentArgs & {
    hoverOp: 'add' | 'remove';
    freePlacement: boolean;
  }
): boolean {
  if (args.hoverOp === 'remove') return false;
  if (!args.App || !args.cfg || !isSideBlockingBoxContentKind(args.contentKind)) return false;
  return blockRemovableSideContentBuildIfSketchBoxSideMissing({
    App: args.App,
    cfg: args.cfg,
    box: args.box,
    moduleKey: args.hoverHost?.moduleKey,
    isBottomStack: args.hoverHost?.isBottom,
    freePlacement: args.box.freePlacement === true || args.freePlacement,
  });
}

export function commitSketchModuleBoxContent(
  args: CommitSketchModuleBoxContentArgs
): Record<string, unknown> | null {
  const strictContent = isStrictSketchBoxContentKind(args.contentKind);
  const strictStructuralContent = isStrictSketchStructuralContentKind(args.contentKind);
  if (!strictContent && !strictStructuralContent) return null;
  let command: SketchBoxContentCommand | null = null;
  let structuralCommand: SketchStructuralCommand | null = null;
  if (strictContent) {
    const decoded = decodeSketchBoxContentCommandHover(args.hoverRec);
    if (!decoded.ok || decoded.value.contentKind !== args.contentKind) return null;
    command = decoded.value.command;
    if (args.boxId && command.boxId !== args.boxId) return null;
    if (command.freePlacement !== (args.box.freePlacement === true)) return null;
    if (command.blockedReason) return null;
  } else if (strictStructuralContent) {
    const decoded = decodeSketchStructuralCommandHover(args.hoverRec);
    if (!decoded.ok || decoded.value.contentKind !== args.contentKind) return null;
    structuralCommand = decoded.value.command;
    if (args.boxId && structuralCommand.boxId !== args.boxId) return null;
    if (structuralCommand.freePlacement !== (args.box.freePlacement === true)) return null;
    if (structuralCommand.blockedReason) return null;
  }
  const hoverOp = command?.op ?? structuralCommand?.op;
  const freePlacement = command?.freePlacement ?? structuralCommand?.freePlacement;
  if (!hoverOp || freePlacement == null) return null;

  if (blockDrawerBoxContentIfRoomColumnCutsCell({ ...args, hoverOp })) return null;
  if (blockSideBlockingBoxContentIfSideMissing({ ...args, hoverOp, freePlacement })) return null;

  const adornment = tryCommitSketchBoxAdornment({
    commitArgs: args,
    structuralCommand,
    hoverOp,
  });
  if (adornment.handled) return adornment.nextHover;

  const drawers = tryCommitSketchBoxDrawerContent({ commitArgs: args, command, hoverOp });
  if (drawers.handled) return drawers.nextHover;

  const doors = tryCommitSketchBoxDoorContent({ commitArgs: args, command, hoverOp });
  if (doors.handled) return doors.nextHover;

  const vertical = tryCommitSketchBoxVerticalContent({
    commitArgs: args,
    structuralCommand,
    hoverOp,
  });
  if (vertical.handled) return vertical.nextHover;

  return null;
}
