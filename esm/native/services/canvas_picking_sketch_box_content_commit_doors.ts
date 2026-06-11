import { MATERIAL_DIMENSIONS, SKETCH_BOX_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import type { ManualLayoutSketchBoxContentHoverIntent } from './canvas_picking_manual_layout_sketch_hover_intent.js';
import {
  readSketchBoxDividers,
  readSketchBoxHorizontalDividers,
  removeSketchBoxDoorForSegment,
  removeSketchBoxDoubleDoorPairForSegment,
  resolveSketchBoxSegments,
  resolveSketchBoxVerticalSegments,
  toggleSketchBoxDoorHingeForSegment,
  upsertSketchBoxDoorForSegment,
  upsertSketchBoxDoubleDoorPairForSegment,
} from './canvas_picking_sketch_box_dividers.js';
import type { CommitSketchModuleBoxContentArgs } from './canvas_picking_sketch_box_content_commit_contracts.js';
import { readNumber } from './canvas_picking_sketch_box_content_commit_records.js';

function resolveSegmentContext(
  box: CommitSketchModuleBoxContentArgs['box'],
  args?: {
    xNorm?: number | null;
    yNorm?: number | null;
  }
) {
  const boxCenterX = readNumber(box.absX) ?? 0;
  const boxCenterY = readNumber(box.absY) ?? 0;
  const woodThick = MATERIAL_DIMENSIONS.wood.thicknessM;
  const innerW = Math.max(
    SKETCH_BOX_DIMENSIONS.geometry.minInnerDimensionM,
    (readNumber(box.widthM) ?? SKETCH_BOX_DIMENSIONS.geometry.defaultOuterWidthM) - woodThick * 2
  );
  const innerH = Math.max(
    SKETCH_BOX_DIMENSIONS.geometry.minInnerDimensionM,
    (readNumber(box.heightM) ?? SKETCH_BOX_DIMENSIONS.geometry.defaultOuterHeightM) - woodThick * 2
  );
  const dividers = readSketchBoxDividers(box);
  const horizontalDividers = readSketchBoxHorizontalDividers(box);
  const segments = resolveSketchBoxSegments({
    dividers,
    horizontalDividers,
    boxCenterX,
    innerW,
    boxCenterY,
    innerH,
    woodThick,
    xNorm: args?.xNorm ?? null,
    yNorm: args?.yNorm ?? null,
  });
  const verticalSegments = resolveSketchBoxVerticalSegments({
    dividers: horizontalDividers,
    verticalDividers: dividers,
    boxCenterX,
    innerW,
    boxCenterY,
    innerH,
    woodThick,
    xNorm: args?.xNorm ?? null,
  });
  return { boxCenterX, innerW, boxCenterY, innerH, segments, verticalSegments };
}

export function tryCommitSketchBoxDoorContent(args: {
  commitArgs: CommitSketchModuleBoxContentArgs;
  hoverIntent: ManualLayoutSketchBoxContentHoverIntent | null;
  hoverOp: 'add' | 'remove';
}): { handled: boolean; nextHover: null } {
  const { commitArgs, hoverIntent, hoverOp } = args;
  const contentXNorm = hoverIntent?.contentXNorm ?? null;
  const boxYNorm = hoverIntent?.boxYNorm ?? null;

  if (commitArgs.contentKind === 'door') {
    const { boxCenterX, innerW, boxCenterY, innerH, segments, verticalSegments } = resolveSegmentContext(
      commitArgs.box,
      {
        xNorm: contentXNorm,
        yNorm: boxYNorm,
      }
    );
    if (hoverOp === 'remove') {
      removeSketchBoxDoorForSegment({
        box: commitArgs.box,
        segments,
        verticalSegments,
        boxCenterX,
        innerW,
        boxCenterY,
        innerH,
        xNorm: contentXNorm,
        yNorm: boxYNorm,
        doorId: hoverIntent?.doorId ?? commitArgs.hoverRec.doorId,
      });
    } else {
      upsertSketchBoxDoorForSegment({
        box: commitArgs.box,
        segments,
        verticalSegments,
        boxCenterX,
        innerW,
        boxCenterY,
        innerH,
        xNorm: contentXNorm,
        yNorm: boxYNorm,
        hinge: hoverIntent?.hinge === 'right' ? 'right' : 'left',
        doorId: hoverIntent?.doorId ?? commitArgs.hoverRec.doorId,
      });
    }
    return { handled: true, nextHover: null };
  }

  if (commitArgs.contentKind === 'double_door') {
    const { boxCenterX, innerW, boxCenterY, innerH, segments, verticalSegments } = resolveSegmentContext(
      commitArgs.box,
      {
        xNorm: contentXNorm,
        yNorm: boxYNorm,
      }
    );
    if (hoverOp === 'remove') {
      removeSketchBoxDoubleDoorPairForSegment({
        box: commitArgs.box,
        segments,
        verticalSegments,
        boxCenterX,
        innerW,
        boxCenterY,
        innerH,
        xNorm: contentXNorm,
        yNorm: boxYNorm,
      });
    } else {
      upsertSketchBoxDoubleDoorPairForSegment({
        box: commitArgs.box,
        segments,
        verticalSegments,
        boxCenterX,
        innerW,
        boxCenterY,
        innerH,
        xNorm: contentXNorm,
        yNorm: boxYNorm,
      });
    }
    return { handled: true, nextHover: null };
  }

  if (commitArgs.contentKind === 'door_hinge') {
    const { boxCenterX, innerW, boxCenterY, innerH, segments, verticalSegments } = resolveSegmentContext(
      commitArgs.box,
      {
        xNorm: contentXNorm,
        yNorm: boxYNorm,
      }
    );
    toggleSketchBoxDoorHingeForSegment({
      box: commitArgs.box,
      segments,
      verticalSegments,
      boxCenterX,
      innerW,
      boxCenterY,
      innerH,
      xNorm: contentXNorm,
      yNorm: boxYNorm,
      doorId: hoverIntent?.doorId ?? null,
    });
    return { handled: true, nextHover: null };
  }

  return { handled: false, nextHover: null };
}
