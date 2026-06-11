// Post-build sketch external-drawer segmented-door rebuild handle helpers (Pure ESM)
//
// Owns handle placement/clamping for segmented sketch-door rebuild flows.

import { DRAWER_DIMENSIONS, HANDLE_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import { clampDoorHandleLocalCenterYToFit } from '../../shared/wardrobe_construction_validation_shared.js';
import { resolveManualHandleLocalPosition } from '../features/manual_handle_position.js';
import { asObject3D, asRecord } from './post_build_extras_shared.js';

import type {
  SketchDoorCutsRuntime,
  SketchDrawerCutSegment,
} from './post_build_sketch_door_cuts_contracts.js';
import {
  resolveSegmentHandleAbsY,
  resolveSegmentHandleClampPadding,
  type SketchDoorNode,
} from './post_build_sketch_door_cuts_rebuild_shared.js';

type SegmentManualPlacementResult = 'placed' | 'suppressed' | 'skipped';

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
  doorMeshOffsetX?: number;
}): 'attached' | 'suppressed' | 'skipped' {
  const { runtime, g, width, seg, segHeight, centerY, handleAbsY, isLeftHinge, segmentPartId } = args;
  const doorMeshOffsetX = Number.isFinite(Number(args.doorMeshOffsetX)) ? Number(args.doorMeshOffsetX) : 0;
  const { createHandleMesh, resolveHandleType } = runtime;
  const resolveHandleColor =
    typeof runtime.resolveHandleColor === 'function' ? runtime.resolveHandleColor : null;
  if (!createHandleMesh) return 'skipped';
  try {
    const handleType = resolveHandleType(segmentPartId);
    if (!handleType || handleType === 'none') return 'skipped';
    const edgeHandleVariant =
      handleType === 'edge' && typeof runtime.resolveEdgeHandleVariant === 'function'
        ? runtime.resolveEdgeHandleVariant(segmentPartId)
        : undefined;
    const segCenterY = (seg.yMin + seg.yMax) / 2;
    const handle = createHandleMesh(
      handleType,
      width,
      Math.max(DRAWER_DIMENSIONS.sketch.rebuiltSegmentHandleMinHeightM, segHeight),
      isLeftHinge,
      {
        edgeHandleVariant,
        handleColor: resolveHandleColor ? resolveHandleColor(segmentPartId) : undefined,
      }
    );
    const handleObj = asObject3D(handle);
    if (!handleObj) return 'skipped';

    const manualPlacement = placeSegmentHandleFromManualPosition({
      runtime,
      handleObj,
      handleType,
      edgeHandleVariant,
      width,
      segHeight,
      segCenterY,
      centerY,
      isLeftHinge,
      segmentPartId,
      doorMeshOffsetX,
    });
    if (manualPlacement === 'suppressed') return 'suppressed';
    if (manualPlacement === 'skipped') {
      const targetAbsY =
        resolveSegmentHandleAbsY({
          seg,
          handleAbsY,
          padding: resolveSegmentHandleClampPadding(edgeHandleVariant),
        }) ?? (seg.yMin + seg.yMax) / 2;
      const clampedLocalY = clampDoorHandleLocalCenterYToFit({
        handleType,
        edgeHandleVariant,
        doorHeightM: segHeight,
        localCenterYM: targetAbsY - segCenterY,
      });
      if (clampedLocalY == null) return 'suppressed';
      if (handleObj.position) handleObj.position.y = segCenterY + clampedLocalY - centerY;
    }

    const handleUd = asRecord(handleObj.userData) || {};
    handleUd.partId = segmentPartId;
    handleObj.userData = handleUd;
    g.add(handleObj);
    return 'attached';
  } catch {
    // ignore optional handle rebuild failures
    return 'skipped';
  }
}

function resolveDefaultSegmentHandleAnchorX(handleType: string, width: number, isLeftHinge: boolean): number {
  if (handleType === 'edge') {
    return isLeftHinge
      ? width + HANDLE_DIMENSIONS.edge.doorAnchorOffsetM
      : -width - HANDLE_DIMENSIONS.edge.doorAnchorOffsetM;
  }
  const offset = HANDLE_DIMENSIONS.standard.doorOffsetM;
  return isLeftHinge ? width - offset : -width + offset;
}

function placeSegmentHandleFromManualPosition(args: {
  runtime: SketchDoorCutsRuntime;
  handleObj: SketchDoorNode;
  handleType: string;
  edgeHandleVariant: 'short' | 'long' | undefined;
  width: number;
  segHeight: number;
  segCenterY: number;
  centerY: number;
  isLeftHinge: boolean;
  segmentPartId: string;
  doorMeshOffsetX: number;
}): SegmentManualPlacementResult {
  const manualPosition = args.runtime.resolveManualHandlePosition(args.segmentPartId);
  if (!manualPosition) return 'skipped';
  const rect = {
    minX: -args.width / 2,
    maxX: args.width / 2,
    minY: -args.segHeight / 2,
    maxY: args.segHeight / 2,
  };
  const local = resolveManualHandleLocalPosition({ rect, position: manualPosition });
  if (!local) return 'skipped';

  const clampedLocalY = clampDoorHandleLocalCenterYToFit({
    handleType: args.handleType,
    edgeHandleVariant: args.edgeHandleVariant,
    doorHeightM: args.segHeight,
    localCenterYM: local.y,
  });
  if (clampedLocalY == null) return 'suppressed';

  const defaultAnchorX = resolveDefaultSegmentHandleAnchorX(
    args.handleType,
    Number(args.width) || 0,
    args.isLeftHinge
  );
  if (args.handleObj.position) {
    args.handleObj.position.x = args.doorMeshOffsetX + local.x - defaultAnchorX;
    args.handleObj.position.y = args.segCenterY + clampedLocalY - args.centerY;
  }
  return 'placed';
}
