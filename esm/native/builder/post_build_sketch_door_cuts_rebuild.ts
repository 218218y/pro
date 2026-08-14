// Post-build sketch external-drawer segmented-door rebuild (Pure ESM)
//
// Owns segmented sketch-door rebuild orchestration while focused helpers own segment meta, visuals, and handles.

import { readKey } from './post_build_extras_shared.js';
import { MATERIAL_THICKNESS_POLICY } from '../../shared/dimensions/material_thickness_policy.js';
import { SKETCH_BOX_DOOR_PREVIEW_POLICY } from '../../shared/dimensions/sketch_box_preview_policy.js';

import { readDoorTrimListForPart } from '../features/door_authoring/api.js';
import type { RebuildSketchSegmentedDoorArgs } from './post_build_sketch_door_cuts_contracts.js';
import { maybeAttachSegmentHandle } from './post_build_sketch_door_cuts_rebuild_handles.js';
import { appendDoorTrimVisuals } from './door_trim_visuals.js';
import { notifyHandleFitSuppressions } from './construction_correction_feedback.js';
import {
  appendHingedDoorHardware,
  detachHingedDoorHardwareForDoor,
  readHingedDoorHardwareRuntimeContext,
} from './render_hinged_door_hardware.js';
import {
  applySegmentPosition,
  applySketchSegmentPickMeta,
  buildSketchSegmentUserData,
  createRemovedDoorRestoreTarget,
  removeAllChildren,
  resolveSegmentHandleAbsY,
  resolveSegmentHandleClampPadding,
  resolveSketchDoorSegmentPartId,
} from './post_build_sketch_door_cuts_rebuild_shared.js';
import {
  createSegmentVisual,
  readSegmentMaterial,
  resolveSketchSegmentVisualFlags,
} from './post_build_sketch_door_cuts_rebuild_visual.js';
import {
  readGeometryUserDataNumber,
  readGeometryUserDataNumberKey,
  readGeometryUserDataPositiveNumberKey,
} from './geometry_user_data_contracts.js';

function resolveOriginalDoorHandleAbsY(ud: Record<string, unknown>, doorCenterAbsY: number): number {
  const explicitAbsY = readGeometryUserDataNumberKey(ud, '__handleAbsY');
  if (explicitAbsY != null) return explicitAbsY;

  // A door without an absolute handle anchor is rendered by the generic door-handle pass
  // at the door leaf's local center. Keep that original full-door anchor when the door is
  // rebuilt into drawer-cut segments; only the segment-fit clamp may move it afterward.
  return doorCenterAbsY;
}

function appendSketchSegmentHinges(args: {
  runtime: RebuildSketchSegmentedDoorArgs['runtime'];
  doorGroup: RebuildSketchSegmentedDoorArgs['g'];
  hardwareContext: ReturnType<typeof readHingedDoorHardwareRuntimeContext>;
  segmentPartId: string;
  segmentHeight: number;
  segmentCenterLocalY: number;
  width: number;
  isLeftHinge: boolean;
}): void {
  const { runtime, doorGroup, hardwareContext, segmentPartId, segmentHeight, segmentCenterLocalY } = args;
  const wardrobeGroup = doorGroup.parent;
  if (!hardwareContext || !wardrobeGroup || !(segmentHeight > 0)) return;
  const pivotX = readGeometryUserDataNumber(doorGroup.position?.x) ?? 0;
  const centerY = readGeometryUserDataNumber(doorGroup.position?.y) ?? 0;
  const centerZ = readGeometryUserDataNumber(doorGroup.position?.z) ?? 0;

  appendHingedDoorHardware({
    THREE: runtime.THREE,
    wardrobeGroup,
    doorGroup,
    doorOp: {
      x: 0,
      y: centerY,
      z: centerZ,
      width: args.width,
      height: segmentHeight,
      partId: segmentPartId,
      isLeftHinge: args.isLeftHinge,
      isRemoved: false,
      isMirror: false,
      hasGroove: false,
      pivotX,
      ...(hardwareContext.carcassMountFaceX != null
        ? { carcassMountFaceX: hardwareContext.carcassMountFaceX }
        : null),
    },
    state: hardwareContext.state,
    localCenterY: segmentCenterLocalY,
    frontSign: hardwareContext.frontSign,
  });
}

export function rebuildSketchSegmentedDoor(args: RebuildSketchSegmentedDoorArgs): void {
  const { runtime, g, ud, visibleSegments, basePartId } = args;
  const width = readGeometryUserDataPositiveNumberKey(ud, '__doorWidth') ?? NaN;
  const height = readGeometryUserDataPositiveNumberKey(ud, '__doorHeight') ?? NaN;
  const centerY = readGeometryUserDataNumber(g.position?.y) ?? NaN;
  if (
    !Number.isFinite(width) ||
    width <= 0 ||
    !Number.isFinite(height) ||
    height <= 0 ||
    !Number.isFinite(centerY)
  )
    return;

  const partId = basePartId || (typeof ud.partId === 'string' ? String(ud.partId) : '');
  const doorMeshOffsetX = readGeometryUserDataNumberKey(ud, '__doorMeshOffsetX') ?? 0;
  const isLeftHinge = !!readKey(ud, '__hingeLeft');
  const handleAbsY = resolveOriginalDoorHandleAbsY(ud, centerY);
  const thickness =
    readGeometryUserDataPositiveNumberKey(ud, '__wpFrontThickness') ??
    MATERIAL_THICKNESS_POLICY.wood.thicknessM;
  const suppressedHandlePartIds: string[] = [];
  const hardwareContext = readHingedDoorHardwareRuntimeContext(g);
  const wardrobeGroup = g.parent;
  if (hardwareContext && wardrobeGroup) {
    // Hardware was rendered against the original uncut leaf. Remove both the
    // moving and fixed halves before replacing the leaf with visible segments;
    // shared hinge materials/geometries remain alive in hardwareContext.state.
    detachHingedDoorHardwareForDoor({ wardrobeGroup, doorGroup: g });
  }

  removeAllChildren(g);
  ud.__wpSketchCustomHandles = true;
  ud.__wpSketchSegmentedDoor = true;

  for (let segIndex = 0; segIndex < visibleSegments.length; segIndex++) {
    const seg = visibleSegments[segIndex];
    const segmentConstructionHeight = seg.yMax - seg.yMin;
    const segHeight = seg.yMax - seg.yMin - SKETCH_BOX_DOOR_PREVIEW_POLICY.segmentedDoorVisualClearanceM;
    if (!(segHeight > SKETCH_BOX_DOOR_PREVIEW_POLICY.segmentedDoorMinHeightM)) continue;
    const segCenterLocalY = (seg.yMin + seg.yMax) / 2 - centerY;
    const segmentPartId = resolveSketchDoorSegmentPartId(partId, visibleSegments.length, segIndex);
    const edgeHandleVariantForClamp =
      typeof runtime.resolveEdgeHandleVariant === 'function'
        ? runtime.resolveEdgeHandleVariant(segmentPartId)
        : undefined;
    const segmentHandleAbsY = resolveSegmentHandleAbsY({
      seg,
      handleAbsY,
      padding: resolveSegmentHandleClampPadding(edgeHandleVariantForClamp),
    });
    const segmentVisualWidth = Math.max(
      SKETCH_BOX_DOOR_PREVIEW_POLICY.segmentedDoorMinDimensionM,
      width - SKETCH_BOX_DOOR_PREVIEW_POLICY.segmentedDoorVisualClearanceM
    );
    const segmentVisualHeight = Math.max(
      SKETCH_BOX_DOOR_PREVIEW_POLICY.segmentedDoorMinDimensionM,
      segHeight
    );
    const flags = resolveSketchSegmentVisualFlags({ runtime, segmentPartId, sourceUserData: ud });
    const isSegmentRemoved = runtime.isDoorRemoved(segmentPartId);

    if (isSegmentRemoved) {
      const removedTarget = createRemovedDoorRestoreTarget({
        runtime,
        width: segmentVisualWidth,
        height: segmentVisualHeight,
        constructionHeight: segmentConstructionHeight,
        thickness,
        partId: segmentPartId,
        hingeLeft: isLeftHinge,
        handleAbsY: segmentHandleAbsY,
      });
      applySegmentPosition(removedTarget, doorMeshOffsetX, segCenterLocalY);
      buildSketchSegmentUserData({
        node: removedTarget,
        partId: segmentPartId,
        width: segmentVisualWidth,
        height: segmentVisualHeight,
        constructionHeight: segmentConstructionHeight,
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
      width: segmentVisualWidth,
      height: segmentVisualHeight,
      constructionHeight: segmentConstructionHeight,
      hingeLeft: isLeftHinge,
      thickness,
      handleAbsY: segmentHandleAbsY,
      segmentIndex: segIndex,
    });
    appendDoorTrimVisuals({
      App: runtime.App,
      THREE: runtime.THREE,
      group: visualObj,
      partId: segmentPartId,
      trims: readDoorTrimListForPart({
        map: runtime.doorTrimMap,
        partId,
        scopedPartId: segmentPartId,
      }),
      doorWidth: segmentVisualWidth,
      doorHeight: segmentVisualHeight,
      frontZ: thickness / 2 + 0.0015,
      faceSign: 1,
    });
    g.add(visualObj);
    appendSketchSegmentHinges({
      runtime,
      doorGroup: g,
      hardwareContext,
      segmentPartId,
      segmentHeight: segmentVisualHeight,
      segmentCenterLocalY: segCenterLocalY,
      width: segmentVisualWidth,
      isLeftHinge,
    });

    const handleResult = maybeAttachSegmentHandle({
      runtime,
      g,
      width,
      seg,
      segHeight,
      centerY,
      handleAbsY,
      isLeftHinge,
      segmentPartId,
      doorMeshOffsetX,
    });
    if (handleResult === 'suppressed') suppressedHandlePartIds.push(segmentPartId);
  }

  if (args.collectSuppressedHandlePartIds) {
    args.collectSuppressedHandlePartIds(suppressedHandlePartIds);
    return;
  }

  notifyHandleFitSuppressions(runtime.App, suppressedHandlePartIds, {
    scope: 'sketch-segment-door-handles',
  });
}
