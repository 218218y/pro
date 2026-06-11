import {
  appendMiterFaceFrameCaps,
  appendRoundedMiterDoorFrame,
} from './visuals_and_contents_door_visual_miter_frame.js';
import {
  createDoorVisualCacheKey,
  getCachedDoorVisualGeometry,
} from './visuals_and_contents_door_visual_cache.js';

import type { StyledDoorVisualArgs } from './visuals_and_contents_door_visual_style_contracts.js';

export type ProfileDoorFrameLayout = {
  outerFrameW: number;
  innerFrameW: number;
  centerDepth: number;
  stepDepth: number;
  roundBulgeScale: number;
  totalFrameW: number;
  centerW: number;
  centerH: number;
  stepSpanW: number;
  stepSpanH: number;
  centerFaceZ: number;
};

function resolveProfileDoorFrameLayout(args: {
  w: number;
  h: number;
  thickness: number;
  zSign: number;
}): ProfileDoorFrameLayout {
  const { w, h, thickness, zSign } = args;
  const rawOuterFrameW = 0.03;
  const rawInnerFrameW = 0.027;
  const outerFrameW = Math.max(0.015, Math.min(rawOuterFrameW, w / 2 - 0.03, h / 2 - 0.03));
  const innerFrameW = Math.max(
    0.012,
    Math.min(rawInnerFrameW, w / 2 - outerFrameW - 0.015, h / 2 - outerFrameW - 0.015)
  );
  const centerDepth = Math.max(0.01, Math.min(0.02, thickness - 0.004));
  const stepDepth = Math.max(0.002, Math.min(0.004, centerDepth - 0.004));
  const roundBulgeScale = 0.94;
  const totalFrameW = outerFrameW + innerFrameW;
  const centerW = Math.max(0.02, w - 2 * totalFrameW);
  const centerH = Math.max(0.02, h - 2 * totalFrameW);
  const stepSpanW = Math.max(0.02, w - 2 * outerFrameW);
  const stepSpanH = Math.max(0.02, h - 2 * outerFrameW);
  const centerFaceZ = (thickness / 2 - centerDepth) * zSign;
  return {
    outerFrameW,
    innerFrameW,
    centerDepth,
    stepDepth,
    roundBulgeScale,
    totalFrameW,
    centerW,
    centerH,
    stepSpanW,
    stepSpanH,
    centerFaceZ,
  };
}

export function appendProfileDoorFrame(args: {
  App: StyledDoorVisualArgs['App'];
  THREE: StyledDoorVisualArgs['THREE'];
  visualGroup: StyledDoorVisualArgs['visualGroup'];
  addOutlines: StyledDoorVisualArgs['addOutlines'];
  tagDoorVisualPart: StyledDoorVisualArgs['tagDoorVisualPart'];
  isSketch: StyledDoorVisualArgs['isSketch'];
  w: StyledDoorVisualArgs['w'];
  h: StyledDoorVisualArgs['h'];
  thickness: StyledDoorVisualArgs['thickness'];
  mat: StyledDoorVisualArgs['mat'];
  zSign: StyledDoorVisualArgs['zSign'];
}): ProfileDoorFrameLayout {
  const { App, THREE, visualGroup, addOutlines, tagDoorVisualPart, isSketch, w, h, thickness, mat, zSign } =
    args;
  const layout = resolveProfileDoorFrameLayout({ w, h, thickness, zSign });
  const { outerFrameW, innerFrameW, stepDepth, roundBulgeScale, totalFrameW, stepSpanW, stepSpanH } = layout;

  const outerHGeo = getCachedDoorVisualGeometry(
    App,
    createDoorVisualCacheKey('door_profile_outer_h', [w, outerFrameW, thickness]),
    () => new THREE.BoxGeometry(w, outerFrameW, thickness)
  );
  const outerTop = new THREE.Mesh(outerHGeo, mat);
  outerTop.position.set(0, h / 2 - outerFrameW / 2, 0);
  visualGroup.add(outerTop);

  const outerBot = new THREE.Mesh(outerHGeo, mat);
  outerBot.position.set(0, -(h / 2 - outerFrameW / 2), 0);
  visualGroup.add(outerBot);

  const outerSideSpan = Math.max(0.02, h - 2 * outerFrameW);
  const outerVGeo = getCachedDoorVisualGeometry(
    App,
    createDoorVisualCacheKey('door_profile_outer_v', [outerFrameW, outerSideSpan, thickness]),
    () => new THREE.BoxGeometry(outerFrameW, outerSideSpan, thickness)
  );
  const outerLeft = new THREE.Mesh(outerVGeo, mat);
  outerLeft.position.set(-(w / 2 - outerFrameW / 2), 0, 0);
  visualGroup.add(outerLeft);

  const outerRight = new THREE.Mesh(outerVGeo, mat);
  outerRight.position.set(w / 2 - outerFrameW / 2, 0, 0);
  visualGroup.add(outerRight);

  const stepGroup = new THREE.Group();
  const stepZ = (-stepDepth / 2) * zSign;
  const stepDepthValue = Math.max(0.002, thickness - stepDepth);
  const stepGeoH = getCachedDoorVisualGeometry(
    App,
    createDoorVisualCacheKey('door_profile_step_h', [stepSpanW, innerFrameW, stepDepthValue]),
    () => new THREE.BoxGeometry(stepSpanW, innerFrameW, stepDepthValue)
  );
  const stepGeoV = getCachedDoorVisualGeometry(
    App,
    createDoorVisualCacheKey('door_profile_step_v', [
      innerFrameW,
      Math.max(0.02, h - 2 * totalFrameW),
      stepDepthValue,
    ]),
    () => new THREE.BoxGeometry(innerFrameW, Math.max(0.02, h - 2 * totalFrameW), stepDepthValue)
  );

  const stepTop = new THREE.Mesh(stepGeoH, mat);
  stepTop.position.set(0, h / 2 - outerFrameW - innerFrameW / 2, stepZ);
  stepGroup.add(stepTop);

  const stepBot = new THREE.Mesh(stepGeoH, mat);
  stepBot.position.set(0, -(h / 2 - outerFrameW - innerFrameW / 2), stepZ);
  stepGroup.add(stepBot);

  const stepLeft = new THREE.Mesh(stepGeoV, mat);
  stepLeft.position.set(-(w / 2 - outerFrameW - innerFrameW / 2), 0, stepZ);
  stepGroup.add(stepLeft);

  const stepRight = new THREE.Mesh(stepGeoV, mat);
  stepRight.position.set(w / 2 - outerFrameW - innerFrameW / 2, 0, stepZ);
  stepGroup.add(stepRight);
  visualGroup.add(stepGroup);

  const roundInset = Math.max(0.003, Math.min(outerFrameW * 0.24, 0.012));
  const roundSpanW = Math.max(0.02, w - outerFrameW - 2 * roundInset);
  const roundSpanH = Math.max(0.02, h - outerFrameW - 2 * roundInset);
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
    outerW: roundSpanW,
    outerH: roundSpanH,
    bandW: outerFrameW,
    roundBulgeScale,
    partPrefix: 'door_profile_outer',
  });

  appendMiterFaceFrameCaps({
    App,
    THREE,
    visualGroup,
    tagDoorVisualPart,
    addOutlines,
    zSign,
    outerW: stepSpanW,
    outerH: stepSpanH,
    bandW: innerFrameW,
    faceZ: (thickness / 2 - stepDepth) * zSign,
    material: mat,
    partPrefix: 'door_profile_inner',
  });

  return layout;
}
