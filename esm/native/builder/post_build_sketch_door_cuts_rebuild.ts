// Post-build sketch external-drawer segmented-door rebuild (Pure ESM)
//
// Owns segmented sketch-door rebuild orchestration while focused helpers own segment meta, visuals, and handles.

import { parseNum, readKey } from './post_build_extras_shared.js';
import { MATERIAL_DIMENSIONS, SKETCH_BOX_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';

import type { RebuildSketchSegmentedDoorArgs } from './post_build_sketch_door_cuts_contracts.js';
import { maybeAttachSegmentHandle } from './post_build_sketch_door_cuts_rebuild_handles.js';
import {
  applySegmentPosition,
  applySketchSegmentPickMeta,
  buildSketchSegmentUserData,
  createRemovedDoorRestoreTarget,
  removeAllChildren,
  resolveSegmentHandleAbsY,
  resolveSketchDoorSegmentPartId,
} from './post_build_sketch_door_cuts_rebuild_shared.js';
import {
  createSegmentVisual,
  readSegmentMaterial,
  resolveSketchSegmentVisualFlags,
} from './post_build_sketch_door_cuts_rebuild_visual.js';

export function rebuildSketchSegmentedDoor(args: RebuildSketchSegmentedDoorArgs): void {
  const { runtime, g, ud, visibleSegments, fallbackPartId } = args;
  const width = parseNum(readKey(ud, '__doorWidth'));
  const height = parseNum(readKey(ud, '__doorHeight'));
  const centerY = parseNum(g.position?.y);
  if (
    !Number.isFinite(width) ||
    width <= 0 ||
    !Number.isFinite(height) ||
    height <= 0 ||
    !Number.isFinite(centerY)
  )
    return;

  const partId = typeof ud.partId === 'string' ? String(ud.partId) : fallbackPartId;
  const meshOffsetX = parseNum(readKey(ud, '__doorMeshOffsetX'));
  const doorMeshOffsetX = Number.isFinite(meshOffsetX) ? meshOffsetX : 0;
  const isLeftHinge = !!readKey(ud, '__hingeLeft');
  const handleAbsYRaw = parseNum(readKey(ud, '__handleAbsY'));
  const handleAbsY = Number.isFinite(handleAbsYRaw) ? handleAbsYRaw : null;
  const thicknessRaw = parseNum(readKey(ud, '__wpFrontThickness'));
  const thickness =
    Number.isFinite(thicknessRaw) && thicknessRaw > 0 ? thicknessRaw : MATERIAL_DIMENSIONS.wood.thicknessM;

  removeAllChildren(g);
  ud.__wpSketchCustomHandles = true;
  ud.__wpSketchSegmentedDoor = true;

  for (let segIndex = 0; segIndex < visibleSegments.length; segIndex++) {
    const seg = visibleSegments[segIndex];
    const segHeight = seg.yMax - seg.yMin - SKETCH_BOX_DIMENSIONS.preview.segmentedDoorVisualClearanceM;
    if (!(segHeight > SKETCH_BOX_DIMENSIONS.preview.segmentedDoorMinHeightM)) continue;
    const segCenterLocalY = (seg.yMin + seg.yMax) / 2 - centerY;
    const segmentPartId = resolveSketchDoorSegmentPartId(partId, visibleSegments.length, segIndex);
    const segmentHandleAbsY = resolveSegmentHandleAbsY({ seg, handleAbsY });
    const flags = resolveSketchSegmentVisualFlags({ runtime, segmentPartId });
    const isSegmentRemoved = runtime.isDoorRemoved(segmentPartId);

    if (isSegmentRemoved) {
      const removedTarget = createRemovedDoorRestoreTarget({
        runtime,
        width: Math.max(
          SKETCH_BOX_DIMENSIONS.preview.segmentedDoorMinDimensionM,
          width - SKETCH_BOX_DIMENSIONS.preview.segmentedDoorVisualClearanceM
        ),
        height: Math.max(SKETCH_BOX_DIMENSIONS.preview.segmentedDoorMinDimensionM, segHeight),
        thickness,
        partId: segmentPartId,
        hingeLeft: isLeftHinge,
        handleAbsY: segmentHandleAbsY,
      });
      applySegmentPosition(removedTarget, doorMeshOffsetX, segCenterLocalY);
      buildSketchSegmentUserData({
        node: removedTarget,
        partId: segmentPartId,
        width: Math.max(
          SKETCH_BOX_DIMENSIONS.preview.segmentedDoorMinDimensionM,
          width - SKETCH_BOX_DIMENSIONS.preview.segmentedDoorVisualClearanceM
        ),
        height: Math.max(SKETCH_BOX_DIMENSIONS.preview.segmentedDoorMinDimensionM, segHeight),
        hingeLeft: isLeftHinge,
        thickness,
        handleAbsY: segmentHandleAbsY,
        segmentIndex: segIndex,
        includeSegmentPartId: false,
        removed: true,
      });
      g.add(removedTarget);
      continue;
    }

    const { segmentPartMat, segmentWoodMat, segmentMirrorMat } = readSegmentMaterial({
      runtime,
      segmentPartId,
      segmentIsMirror: flags.segmentIsMirror,
    });
    const visualObj = createSegmentVisual({
      runtime,
      width,
      segHeight,
      thickness,
      segmentPartId,
      flags,
      segmentPartMat,
      segmentWoodMat,
      segmentMirrorMat,
    });
    applySegmentPosition(visualObj, doorMeshOffsetX, segCenterLocalY);
    applySketchSegmentPickMeta(visualObj, segmentPartId);
    buildSketchSegmentUserData({
      node: visualObj,
      partId: segmentPartId,
      width: Math.max(
        SKETCH_BOX_DIMENSIONS.preview.segmentedDoorMinDimensionM,
        width - SKETCH_BOX_DIMENSIONS.preview.segmentedDoorVisualClearanceM
      ),
      height: Math.max(SKETCH_BOX_DIMENSIONS.preview.segmentedDoorMinDimensionM, segHeight),
      hingeLeft: isLeftHinge,
      thickness,
      handleAbsY: segmentHandleAbsY,
      segmentIndex: segIndex,
    });
    g.add(visualObj);

    maybeAttachSegmentHandle({
      runtime,
      g,
      width,
      seg,
      segHeight,
      centerY,
      handleAbsY,
      isLeftHinge,
      segmentPartId,
    });
  }
}
