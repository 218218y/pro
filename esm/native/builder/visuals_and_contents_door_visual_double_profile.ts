import { DOOR_VISUAL_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
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

export function createDoubleProfileDoorVisual(args: StyledDoorVisualArgs) {
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
    grooveLinesCount,
    isSketch,
    zSign,
  } = args;

  const rawFrameW = DOOR_VISUAL_DIMENSIONS.doubleProfile.frameWidthM;
  const frameW = Math.max(
    DOOR_VISUAL_DIMENSIONS.doubleProfile.frameMinM,
    Math.min(
      rawFrameW,
      w / 2 - DOOR_VISUAL_DIMENSIONS.doubleProfile.frameEdgeClearanceM,
      h / 2 - DOOR_VISUAL_DIMENSIONS.doubleProfile.frameEdgeClearanceM
    )
  );
  const recessDepth = Math.max(
    DOOR_VISUAL_DIMENSIONS.doubleProfile.recessDepthMinM,
    Math.min(
      DOOR_VISUAL_DIMENSIONS.doubleProfile.recessDepthMaxM,
      thickness - DOOR_VISUAL_DIMENSIONS.doubleProfile.recessDepthThicknessClearanceM
    )
  );
  const innerW = Math.max(DOOR_VISUAL_DIMENSIONS.common.minPanelDimensionM, w - 2 * frameW);
  const innerH = Math.max(DOOR_VISUAL_DIMENSIONS.common.minPanelDimensionM, h - 2 * frameW);

  const centerPanel = new THREE.Mesh(
    getCachedDoorVisualGeometry(
      App,
      createDoorVisualCacheKey('door_double_profile_center', [
        innerW,
        innerH,
        Math.max(DOOR_VISUAL_DIMENSIONS.common.minPanelDimensionM / 10, thickness - recessDepth),
      ]),
      () =>
        new THREE.BoxGeometry(
          innerW,
          innerH,
          Math.max(DOOR_VISUAL_DIMENSIONS.common.minPanelDimensionM / 10, thickness - recessDepth)
        )
    ),
    mat
  );
  centerPanel.position.set(0, 0, (-recessDepth / 2) * zSign);
  tagDoorVisualPart(centerPanel, 'door_double_profile_center_panel');
  visualGroup.add(centerPanel);

  const hGeo = getCachedDoorVisualGeometry(
    App,
    createDoorVisualCacheKey('door_double_profile_h', [w, frameW, thickness]),
    () => new THREE.BoxGeometry(w, frameW, thickness)
  );
  const top = new THREE.Mesh(hGeo, mat);
  top.position.set(0, h / 2 - frameW / 2, 0);
  visualGroup.add(top);
  const bot = new THREE.Mesh(hGeo, mat);
  bot.position.set(0, -(h / 2 - frameW / 2), 0);
  visualGroup.add(bot);

  const sideSpan = Math.max(DOOR_VISUAL_DIMENSIONS.common.minPanelDimensionM, h - 2 * frameW);
  const vGeo = getCachedDoorVisualGeometry(
    App,
    createDoorVisualCacheKey('door_double_profile_v', [frameW, sideSpan, thickness]),
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
    partPrefix: 'door_double_profile_outer',
    isSketch,
    addSeamLines: true,
  });

  const innerRaisedInset = Math.max(
    DOOR_VISUAL_DIMENSIONS.doubleProfile.innerRaisedInsetMinM,
    Math.min(
      frameW * DOOR_VISUAL_DIMENSIONS.doubleProfile.innerRaisedInsetFrameRatio,
      DOOR_VISUAL_DIMENSIONS.doubleProfile.innerRaisedInsetMaxM
    )
  );
  const innerRaisedOuterW = Math.max(
    DOOR_VISUAL_DIMENSIONS.common.minPanelDimensionM,
    innerW - 2 * innerRaisedInset
  );
  const innerRaisedOuterH = Math.max(
    DOOR_VISUAL_DIMENSIONS.common.minPanelDimensionM,
    innerH - 2 * innerRaisedInset
  );
  const innerRaisedBandW = Math.max(
    DOOR_VISUAL_DIMENSIONS.doubleProfile.innerRaisedBandMinM,
    Math.min(
      frameW * DOOR_VISUAL_DIMENSIONS.doubleProfile.innerRaisedBandFrameRatio,
      innerRaisedOuterW / 2 - DOOR_VISUAL_DIMENSIONS.doubleProfile.innerRaisedBandEdgeClearanceM,
      innerRaisedOuterH / 2 - DOOR_VISUAL_DIMENSIONS.doubleProfile.innerRaisedBandEdgeClearanceM
    )
  );
  const mirrorPlacementW = Math.max(
    DOOR_VISUAL_DIMENSIONS.common.minPanelDimensionM,
    innerRaisedOuterW - 2 * innerRaisedBandW
  );
  const mirrorPlacementH = Math.max(
    DOOR_VISUAL_DIMENSIONS.common.minPanelDimensionM,
    innerRaisedOuterH - 2 * innerRaisedBandW
  );
  applyMirrorPlacementRectMetadata(centerPanel, mirrorPlacementW, mirrorPlacementH);
  const innerRaisedZ =
    Math.max(
      DOOR_VISUAL_DIMENSIONS.doubleProfile.innerRaisedZMinM,
      Math.min(
        DOOR_VISUAL_DIMENSIONS.doubleProfile.innerRaisedZMaxM,
        thickness * DOOR_VISUAL_DIMENSIONS.doubleProfile.innerRaisedZThicknessRatio,
        frameW * DOOR_VISUAL_DIMENSIONS.doubleProfile.innerRaisedZFrameRatio
      )
    ) * zSign;
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
    partPrefix: 'door_double_profile_inner',
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
    inset: Math.min(
      frameW * DOOR_VISUAL_DIMENSIONS.doubleProfile.accentInsetFrameRatio,
      DOOR_VISUAL_DIMENSIONS.doubleProfile.accentInsetMaxM
    ),
    lineT: DOOR_VISUAL_DIMENSIONS.doubleProfile.accentLineThicknessM,
    opacity: DOOR_VISUAL_DIMENSIONS.doubleProfile.accentOpacity,
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
    linesCountOverride: grooveLinesCount,
  });
  return visualGroup;
}
