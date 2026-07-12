import { readManualLayoutSketchBoxContentHoverIntent } from './canvas_picking_manual_layout_sketch_hover_intent.js';
import {
  decodeSketchBoxContentCommandHover,
  isStrictSketchBoxContentKind,
  type SketchBoxContentCommand,
} from './canvas_picking_sketch_box_content_command.js';
import { blockRemovableSideContentBuildIfSketchBoxSideMissing } from './canvas_picking_removable_part_remove_constraints.js';
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
  const hoverIntent = strictContent ? null : readManualLayoutSketchBoxContentHoverIntent(args.hoverRec);
  let command: SketchBoxContentCommand | null = null;
  if (strictContent) {
    const decoded = decodeSketchBoxContentCommandHover(args.hoverRec);
    if (!decoded.ok || decoded.value.contentKind !== args.contentKind) return null;
    command = decoded.value.command;
    if (args.boxId && command.boxId !== args.boxId) return null;
    if (command.freePlacement !== (args.box.freePlacement === true)) return null;
    if (command.blockedReason) return null;
  }
  const hoverOp = command?.op || hoverIntent?.op || 'add';
  const freePlacement = command?.freePlacement ?? hoverIntent?.freePlacement ?? false;

  if (blockSideBlockingBoxContentIfSideMissing({ ...args, hoverOp, freePlacement })) return null;

  const adornment = tryCommitSketchBoxAdornment({ commitArgs: args, hoverIntent, hoverOp });
  if (adornment.handled) return adornment.nextHover;

  const drawers = tryCommitSketchBoxDrawerContent({ commitArgs: args, command, hoverOp });
  if (drawers.handled) return drawers.nextHover;

  const doors = tryCommitSketchBoxDoorContent({ commitArgs: args, command, hoverOp });
  if (doors.handled) return doors.nextHover;

  const vertical = tryCommitSketchBoxVerticalContent({ commitArgs: args, hoverIntent, hoverOp });
  if (vertical.handled) return vertical.nextHover;

  return null;
}
