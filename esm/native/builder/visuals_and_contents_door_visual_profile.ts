import { appendSubtleDoorAccentBorder } from './visuals_and_contents_door_visual_accent.js';
import { appendGrooveStrips } from './visuals_and_contents_door_visual_grooves.js';
import { appendProfileDoorFrame } from './visuals_and_contents_door_visual_profile_frame.js';
import { applyMirrorPlacementRectMetadata } from './visuals_and_contents_door_visual_tagging.js';
import {
  createDoorVisualCacheKey,
  getCachedDoorVisualGeometry,
} from './visuals_and_contents_door_visual_cache.js';

import type { StyledDoorVisualArgs } from './visuals_and_contents_door_visual_style_contracts.js';

export function createProfileDoorVisual(args: StyledDoorVisualArgs) {
  const {
    App,
    THREE,
    visualGroup,
    addOutlines,
    tagDoorVisualPart,
    w,
    h,
    thickness,
    mat,
    hasGrooves,
    groovePartId,
    isSketch,
    zSign,
  } = args;

  const layout = appendProfileDoorFrame({
    App,
    THREE,
    visualGroup,
    addOutlines,
    tagDoorVisualPart,
    isSketch,
    w,
    h,
    thickness,
    mat,
    zSign,
  });
  const { centerW, centerH, centerDepth, innerFrameW, stepSpanW, stepSpanH, centerFaceZ } = layout;

  const centerPanel = new THREE.Mesh(
    getCachedDoorVisualGeometry(
      App,
      createDoorVisualCacheKey('door_profile_center', [
        centerW,
        centerH,
        Math.max(0.002, thickness - centerDepth),
      ]),
      () => new THREE.BoxGeometry(centerW, centerH, Math.max(0.002, thickness - centerDepth))
    ),
    mat
  );
  centerPanel.position.z = (-centerDepth / 2) * zSign;
  tagDoorVisualPart(centerPanel, 'door_profile_center_panel');
  applyMirrorPlacementRectMetadata(centerPanel, centerW, centerH);
  visualGroup.add(centerPanel);

  appendSubtleDoorAccentBorder({
    App,
    THREE,
    visualGroup,
    tagDoorVisualPart,
    isSketch,
    zSign,
    targetW: centerW,
    targetH: centerH,
    faceZ: centerFaceZ,
    inset: Math.min(innerFrameW * 0.2, 0.01),
    lineT: 0.0018,
    opacity: 0.14,
  });
  appendSubtleDoorAccentBorder({
    App,
    THREE,
    visualGroup,
    tagDoorVisualPart,
    isSketch,
    zSign,
    targetW: stepSpanW,
    targetH: stepSpanH,
    faceZ: (thickness / 2 - layout.stepDepth) * zSign,
    inset: Math.min(innerFrameW * 0.28, 0.012),
    lineT: 0.0016,
    opacity: 0.1,
  });
  appendGrooveStrips({
    App,
    THREE,
    visualGroup,
    tagDoorVisualPart,
    hasGrooves,
    isSketch,
    groovePartId,
    zSign,
    targetW: centerW,
    targetH: centerH,
    zOffset: centerFaceZ,
    densityOverride: 12,
  });

  return visualGroup;
}
