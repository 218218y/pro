import { appendSubtleDoorAccentBorder } from './visuals_and_contents_door_visual_accent.js';
import { appendGrooveStrips } from './visuals_and_contents_door_visual_grooves.js';
import {
  appendMiterFaceFrameCaps,
  appendRoundedMiterDoorFrame,
} from './visuals_and_contents_door_visual_miter_frame.js';
import { applyMirrorPlacementRectMetadata } from './visuals_and_contents_door_visual_tagging.js';
import {
  createDoorVisualCacheKey,
  getCachedDoorVisualGeometry,
} from './visuals_and_contents_door_visual_cache.js';

import type { StyledDoorVisualArgs } from './visuals_and_contents_door_visual_style_contracts.js';

export function createTomDoorVisual(args: StyledDoorVisualArgs) {
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

  const rawFrameW = 0.045;
  const frameW = Math.max(0.02, Math.min(rawFrameW, w / 2 - 0.02, h / 2 - 0.02));
  const recessDepth = Math.max(0.008, Math.min(0.014, thickness - 0.004));
  const innerW = Math.max(0.02, w - 2 * frameW);
  const innerH = Math.max(0.02, h - 2 * frameW);

  const centerPanel = new THREE.Mesh(
    getCachedDoorVisualGeometry(
      App,
      createDoorVisualCacheKey('door_tom_center', [innerW, innerH, Math.max(0.002, thickness - recessDepth)]),
      () => new THREE.BoxGeometry(innerW, innerH, Math.max(0.002, thickness - recessDepth))
    ),
    mat
  );
  centerPanel.position.set(0, 0, (-recessDepth / 2) * zSign);
  tagDoorVisualPart(centerPanel, 'door_tom_center_panel');
  visualGroup.add(centerPanel);

  const hGeo = getCachedDoorVisualGeometry(
    App,
    createDoorVisualCacheKey('door_tom_h', [w, frameW, thickness]),
    () => new THREE.BoxGeometry(w, frameW, thickness)
  );
  const top = new THREE.Mesh(hGeo, mat);
  top.position.set(0, h / 2 - frameW / 2, 0);
  visualGroup.add(top);
  const bot = new THREE.Mesh(hGeo, mat);
  bot.position.set(0, -(h / 2 - frameW / 2), 0);
  visualGroup.add(bot);

  const sideSpan = Math.max(0.02, h - 2 * frameW);
  const vGeo = getCachedDoorVisualGeometry(
    App,
    createDoorVisualCacheKey('door_tom_v', [frameW, sideSpan, thickness]),
    () => new THREE.BoxGeometry(frameW, sideSpan, thickness)
  );
  const left = new THREE.Mesh(vGeo, mat);
  left.position.set(-(w / 2 - frameW / 2), 0, 0);
  visualGroup.add(left);
  const right = new THREE.Mesh(vGeo, mat);
  right.position.set(w / 2 - frameW / 2, 0, 0);
  visualGroup.add(right);

  appendMiterFaceFrameCaps({
    App,
    THREE,
    visualGroup,
    tagDoorVisualPart,
    addOutlines,
    zSign,
    outerW: w,
    outerH: h,
    bandW: frameW,
    faceZ: (thickness / 2) * zSign,
    material: mat,
    partPrefix: 'door_tom_outer',
    isSketch,
    addSeamLines: true,
  });

  const innerRaisedInset = Math.max(0.006, Math.min(frameW * 0.22, 0.014));
  const innerRaisedOuterW = Math.max(0.02, innerW - 2 * innerRaisedInset);
  const innerRaisedOuterH = Math.max(0.02, innerH - 2 * innerRaisedInset);
  const innerRaisedBandW = Math.max(
    0.006,
    Math.min(frameW * 0.24, innerRaisedOuterW / 2 - 0.012, innerRaisedOuterH / 2 - 0.012)
  );
  const mirrorPlacementW = Math.max(0.02, innerRaisedOuterW - 2 * innerRaisedBandW);
  const mirrorPlacementH = Math.max(0.02, innerRaisedOuterH - 2 * innerRaisedBandW);
  applyMirrorPlacementRectMetadata(centerPanel, mirrorPlacementW, mirrorPlacementH);
  const innerRaisedZ = Math.max(0.0022, Math.min(0.0042, thickness * 0.24, frameW * 0.08)) * zSign;
  appendRoundedMiterDoorFrame({
    App,
    THREE,
    visualGroup,
    addOutlines,
    tagDoorVisualPart,
    zSign,
    isSketch,
    thickness,
    mat,
    outerW: innerRaisedOuterW,
    outerH: innerRaisedOuterH,
    bandW: innerRaisedBandW,
    roundBulgeScale: 1,
    partPrefix: 'door_tom_inner',
    zOffset: innerRaisedZ,
  });

  const centerFaceZ = (thickness / 2 - recessDepth) * zSign;
  appendSubtleDoorAccentBorder({
    App,
    THREE,
    visualGroup,
    tagDoorVisualPart,
    isSketch,
    zSign,
    targetW: innerW,
    targetH: innerH,
    faceZ: centerFaceZ,
    inset: Math.min(frameW * 0.18, 0.012),
    lineT: 0.0022,
    opacity: 0.16,
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
    targetW: innerW,
    targetH: innerH,
    zOffset: centerFaceZ,
  });
  return visualGroup;
}
