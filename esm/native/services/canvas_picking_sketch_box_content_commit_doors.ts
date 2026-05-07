import { MATERIAL_DIMENSIONS, SKETCH_BOX_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import type { ManualLayoutSketchBoxContentHoverIntent } from './canvas_picking_manual_layout_sketch_hover_intent.js';
import {
  readSketchBoxDividers,
  removeSketchBoxDoorForSegment,
  removeSketchBoxDoubleDoorPairForSegment,
  resolveSketchBoxSegments,
  toggleSketchBoxDoorHingeForSegment,
  upsertSketchBoxDoorForSegment,
  upsertSketchBoxDoubleDoorPairForSegment,
} from './canvas_picking_sketch_box_dividers.js';
import type { CommitSketchModuleBoxContentArgs } from './canvas_picking_sketch_box_content_commit_contracts.js';
import { readNumber } from './canvas_picking_sketch_box_content_commit_records.js';

function resolveSegmentContext(box: CommitSketchModuleBoxContentArgs['box']) {
  const boxCenterX = readNumber(box.absX) ?? 0;
  const woodThick = MATERIAL_DIMENSIONS.wood.thicknessM;
  const innerW = Math.max(
    SKETCH_BOX_DIMENSIONS.geometry.minInnerDimensionM,
    (readNumber(box.widthM) ?? SKETCH_BOX_DIMENSIONS.geometry.defaultOuterWidthM) - woodThick * 2
  );
  const segments = resolveSketchBoxSegments({
    dividers: readSketchBoxDividers(box),
    boxCenterX,
    innerW,
    woodThick,
  });
  return { boxCenterX, innerW, segments };
}

export function tryCommitSketchBoxDoorContent(args: {
  commitArgs: CommitSketchModuleBoxContentArgs;
  hoverIntent: ManualLayoutSketchBoxContentHoverIntent | null;
  hoverOp: 'add' | 'remove';
}): { handled: boolean; nextHover: null } {
  const { commitArgs, hoverIntent, hoverOp } = args;
  const contentXNorm = hoverIntent?.contentXNorm ?? null;

  if (commitArgs.contentKind === 'door') {
    const { boxCenterX, innerW, segments } = resolveSegmentContext(commitArgs.box);
    if (hoverOp === 'remove') {
      removeSketchBoxDoorForSegment({
        box: commitArgs.box,
        segments,
        boxCenterX,
        innerW,
        xNorm: contentXNorm,
        doorId: hoverIntent?.doorId ?? commitArgs.hoverRec.doorId,
      });
    } else {
      upsertSketchBoxDoorForSegment({
        box: commitArgs.box,
        segments,
        boxCenterX,
        innerW,
        xNorm: contentXNorm,
        hinge: hoverIntent?.hinge === 'right' ? 'right' : 'left',
        doorId: hoverIntent?.doorId ?? commitArgs.hoverRec.doorId,
      });
    }
    return { handled: true, nextHover: null };
  }

  if (commitArgs.contentKind === 'double_door') {
    const { boxCenterX, innerW, segments } = resolveSegmentContext(commitArgs.box);
    if (hoverOp === 'remove') {
      removeSketchBoxDoubleDoorPairForSegment({
        box: commitArgs.box,
        segments,
        boxCenterX,
        innerW,
        xNorm: contentXNorm,
      });
    } else {
      upsertSketchBoxDoubleDoorPairForSegment({
        box: commitArgs.box,
        segments,
        boxCenterX,
        innerW,
        xNorm: contentXNorm,
      });
    }
    return { handled: true, nextHover: null };
  }

  if (commitArgs.contentKind === 'door_hinge') {
    const { boxCenterX, innerW, segments } = resolveSegmentContext(commitArgs.box);
    toggleSketchBoxDoorHingeForSegment({
      box: commitArgs.box,
      segments,
      boxCenterX,
      innerW,
      xNorm: contentXNorm,
      doorId: hoverIntent?.doorId ?? null,
    });
    return { handled: true, nextHover: null };
  }

  return { handled: false, nextHover: null };
}
