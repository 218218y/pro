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

  const rawFrameW = DOOR_VISUAL_DIMENSIONS.tom.frameWidthM;
  const frameW = Math.max(
    DOOR_VISUAL_DIMENSIONS.tom.frameMinM,
    Math.min(
      rawFrameW,
      w / 2 - DOOR_VISUAL_DIMENSIONS.tom.frameEdgeClearanceM,
      h / 2 - DOOR_VISUAL_DIMENSIONS.tom.frameEdgeClearanceM
    )
  );
  const recessDepth = Math.max(
    DOOR_VISUAL_DIMENSIONS.tom.recessDepthMinM,
    Math.min(
      DOOR_VISUAL_DIMENSIONS.tom.recessDepthMaxM,
      thickness - DOOR_VISUAL_DIMENSIONS.tom.recessDepthThicknessClearanceM
    )
  );
  const innerW = Math.max(DOOR_VISUAL_DIMENSIONS.common.minPanelDimensionM, w - 2 * frameW);
  const innerH = Math.max(DOOR_VISUAL_DIMENSIONS.common.minPanelDimensionM, h - 2 * frameW);

  const centerPanel = new THREE.Mesh(
    getCachedDoorVisualGeometry(
      App,
      createDoorVisualCacheKey('door_tom_center', [
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

  const sideSpan = Math.max(DOOR_VISUAL_DIMENSIONS.common.minPanelDimensionM, h - 2 * frameW);
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

  const innerRaisedInset = Math.max(
    DOOR_VISUAL_DIMENSIONS.tom.innerRaisedInsetMinM,
    Math.min(
      frameW * DOOR_VISUAL_DIMENSIONS.tom.innerRaisedInsetFrameRatio,
      DOOR_VISUAL_DIMENSIONS.tom.innerRaisedInsetMaxM
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
    DOOR_VISUAL_DIMENSIONS.tom.innerRaisedBandMinM,
    Math.min(
      frameW * DOOR_VISUAL_DIMENSIONS.tom.innerRaisedBandFrameRatio,
      innerRaisedOuterW / 2 - DOOR_VISUAL_DIMENSIONS.tom.innerRaisedBandEdgeClearanceM,
      innerRaisedOuterH / 2 - DOOR_VISUAL_DIMENSIONS.tom.innerRaisedBandEdgeClearanceM
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
      DOOR_VISUAL_DIMENSIONS.tom.innerRaisedZMinM,
      Math.min(
        DOOR_VISUAL_DIMENSIONS.tom.innerRaisedZMaxM,
        thickness * DOOR_VISUAL_DIMENSIONS.tom.innerRaisedZThicknessRatio,
        frameW * DOOR_VISUAL_DIMENSIONS.tom.innerRaisedZFrameRatio
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
    inset: Math.min(
      frameW * DOOR_VISUAL_DIMENSIONS.tom.accentInsetFrameRatio,
      DOOR_VISUAL_DIMENSIONS.tom.accentInsetMaxM
    ),
    lineT: DOOR_VISUAL_DIMENSIONS.tom.accentLineThicknessM,
    opacity: DOOR_VISUAL_DIMENSIONS.tom.accentOpacity,
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
