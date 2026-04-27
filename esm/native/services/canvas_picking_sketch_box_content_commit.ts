import { readManualLayoutSketchBoxContentHoverIntent } from './canvas_picking_manual_layout_sketch_hover_intent.js';
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

export function commitSketchModuleBoxContent(
  args: CommitSketchModuleBoxContentArgs
): Record<string, unknown> | null {
  const hoverIntent = readManualLayoutSketchBoxContentHoverIntent(args.hoverRec);
  const hoverOp = hoverIntent?.op || 'add';

  const adornment = tryCommitSketchBoxAdornment({ commitArgs: args, hoverIntent, hoverOp });
  if (adornment.handled) return adornment.nextHover;

  const drawers = tryCommitSketchBoxDrawerContent({ commitArgs: args, hoverIntent, hoverOp });
  if (drawers.handled) return drawers.nextHover;

  const doors = tryCommitSketchBoxDoorContent({ commitArgs: args, hoverIntent, hoverOp });
  if (doors.handled) return doors.nextHover;

  const vertical = tryCommitSketchBoxVerticalContent({ commitArgs: args, hoverIntent, hoverOp });
  if (vertical.handled) return vertical.nextHover;

  return null;
}
