// Post-build sketch external-drawer segmented-door rebuild handle helpers (Pure ESM)
//
// Owns handle placement/clamping for segmented sketch-door rebuild flows.

import { DRAWER_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import { asObject3D, asRecord } from './post_build_extras_shared.js';

import type {
  SketchDoorCutsRuntime,
  SketchDrawerCutSegment,
} from './post_build_sketch_door_cuts_contracts.js';
import {
  resolveSegmentHandleAbsY,
  type SketchDoorNode,
} from './post_build_sketch_door_cuts_rebuild_shared.js';

export function maybeAttachSegmentHandle(args: {
  runtime: SketchDoorCutsRuntime;
  g: SketchDoorNode;
  width: number;
  seg: SketchDrawerCutSegment;
  segHeight: number;
  centerY: number;
  handleAbsY: number | null;
  isLeftHinge: boolean;
  segmentPartId: string;
}): void {
  const { runtime, g, width, seg, segHeight, centerY, handleAbsY, isLeftHinge, segmentPartId } = args;
  const { createHandleMesh, resolveHandleType } = runtime;
  const resolveHandleColor =
    typeof runtime.resolveHandleColor === 'function' ? runtime.resolveHandleColor : null;
  if (!createHandleMesh || segHeight < DRAWER_DIMENSIONS.sketch.rebuiltSegmentMinHeightForHandleM) return;
  try {
    const handleType = resolveHandleType(segmentPartId);
    const handle = createHandleMesh(
      handleType,
      width,
      Math.max(DRAWER_DIMENSIONS.sketch.rebuiltSegmentHandleMinHeightM, segHeight),
      isLeftHinge,
      {
        handleColor: resolveHandleColor ? resolveHandleColor(segmentPartId) : undefined,
      }
    );
    const handleObj = asObject3D(handle);
    if (!handleObj) return;
    const segPad = Math.min(
      DRAWER_DIMENSIONS.sketch.rebuiltSegmentHandlePaddingMaxM,
      Math.max(
        DRAWER_DIMENSIONS.sketch.rebuiltSegmentHandlePaddingMinM,
        segHeight * DRAWER_DIMENSIONS.sketch.rebuiltSegmentHandlePaddingHeightRatio
      )
    );
    const targetAbsY =
      resolveSegmentHandleAbsY({
        seg,
        handleAbsY,
        padding: segPad,
      }) ?? (seg.yMin + seg.yMax) / 2;
    if (handleObj.position) handleObj.position.y = targetAbsY - centerY;
    const handleUd = asRecord(handleObj.userData) || {};
    handleUd.partId = segmentPartId;
    handleObj.userData = handleUd;
    g.add(handleObj);
  } catch {
    // ignore optional handle rebuild failures
  }
}
