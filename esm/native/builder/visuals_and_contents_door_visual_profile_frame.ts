import { DOOR_VISUAL_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
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
  const rawOuterFrameW = DOOR_VISUAL_DIMENSIONS.profile.outerFrameWidthM;
  const rawInnerFrameW = DOOR_VISUAL_DIMENSIONS.profile.innerFrameWidthM;
  const outerFrameW = Math.max(
    DOOR_VISUAL_DIMENSIONS.profile.outerFrameMinM,
    Math.min(
      rawOuterFrameW,
      w / 2 - DOOR_VISUAL_DIMENSIONS.profile.frameEdgeClearanceM,
      h / 2 - DOOR_VISUAL_DIMENSIONS.profile.frameEdgeClearanceM
    )
  );
  const innerFrameW = Math.max(
    DOOR_VISUAL_DIMENSIONS.profile.innerFrameMinM,
    Math.min(
      rawInnerFrameW,
      w / 2 - outerFrameW - DOOR_VISUAL_DIMENSIONS.profile.innerFrameEdgeClearanceM,
      h / 2 - outerFrameW - DOOR_VISUAL_DIMENSIONS.profile.innerFrameEdgeClearanceM
    )
  );
  const centerDepth = Math.max(
    DOOR_VISUAL_DIMENSIONS.profile.centerDepthMinM,
    Math.min(
      DOOR_VISUAL_DIMENSIONS.profile.centerDepthMaxM,
      thickness - DOOR_VISUAL_DIMENSIONS.profile.centerDepthThicknessClearanceM
    )
  );
  const stepDepth = Math.max(
    DOOR_VISUAL_DIMENSIONS.profile.stepDepthMinM,
    Math.min(
      DOOR_VISUAL_DIMENSIONS.profile.stepDepthMaxM,
      centerDepth - DOOR_VISUAL_DIMENSIONS.profile.centerDepthThicknessClearanceM
    )
  );
  const roundBulgeScale = DOOR_VISUAL_DIMENSIONS.profile.roundBulgeScale;
  const totalFrameW = outerFrameW + innerFrameW;
  const centerW = Math.max(DOOR_VISUAL_DIMENSIONS.common.minPanelDimensionM, w - 2 * totalFrameW);
  const centerH = Math.max(DOOR_VISUAL_DIMENSIONS.common.minPanelDimensionM, h - 2 * totalFrameW);
  const stepSpanW = Math.max(DOOR_VISUAL_DIMENSIONS.common.minPanelDimensionM, w - 2 * outerFrameW);
  const stepSpanH = Math.max(DOOR_VISUAL_DIMENSIONS.common.minPanelDimensionM, h - 2 * outerFrameW);
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

  const outerSideSpan = Math.max(DOOR_VISUAL_DIMENSIONS.common.minPanelDimensionM, h - 2 * outerFrameW);
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
  const stepDepthValue = Math.max(DOOR_VISUAL_DIMENSIONS.profile.stepDepthMinM, thickness - stepDepth);
  const stepGeoH = getCachedDoorVisualGeometry(
    App,
    createDoorVisualCacheKey('door_profile_step_h', [stepSpanW, innerFrameW, stepDepthValue]),
    () => new THREE.BoxGeometry(stepSpanW, innerFrameW, stepDepthValue)
  );
  const stepGeoV = getCachedDoorVisualGeometry(
    App,
    createDoorVisualCacheKey('door_profile_step_v', [
      innerFrameW,
      Math.max(DOOR_VISUAL_DIMENSIONS.common.minPanelDimensionM, h - 2 * totalFrameW),
      stepDepthValue,
    ]),
    () =>
      new THREE.BoxGeometry(
        innerFrameW,
        Math.max(DOOR_VISUAL_DIMENSIONS.common.minPanelDimensionM, h - 2 * totalFrameW),
        stepDepthValue
      )
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

  const roundInset = Math.max(
    DOOR_VISUAL_DIMENSIONS.profile.roundInsetMinM,
    Math.min(
      outerFrameW * DOOR_VISUAL_DIMENSIONS.profile.roundInsetOuterFrameRatio,
      DOOR_VISUAL_DIMENSIONS.profile.roundInsetMaxM
    )
  );
  const roundSpanW = Math.max(
    DOOR_VISUAL_DIMENSIONS.common.minPanelDimensionM,
    w - outerFrameW - 2 * roundInset
  );
  const roundSpanH = Math.max(
    DOOR_VISUAL_DIMENSIONS.common.minPanelDimensionM,
    h - outerFrameW - 2 * roundInset
  );
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
