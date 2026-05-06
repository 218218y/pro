import { DOOR_VISUAL_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import {
  createDoorVisualCacheKey,
  getCachedDoorVisualGeometry,
  getCachedDoorVisualMaterial,
} from './visuals_and_contents_door_visual_cache.js';
import type { AppContainer, Object3DLike, ThreeLike } from '../../../types/index.js';
import type { TagDoorVisualPartFn } from './visuals_and_contents_door_visual_support_contracts.js';

export function appendSubtleDoorAccentBorder(args: {
  App: AppContainer;
  THREE: ThreeLike;
  visualGroup: Object3DLike;
  tagDoorVisualPart: TagDoorVisualPartFn;
  isSketch: boolean;
  zSign: number;
  targetW: number;
  targetH: number;
  faceZ: number;
  inset?: number;
  lineT?: number;
  opacity?: number;
}): void {
  const {
    App,
    THREE,
    visualGroup,
    tagDoorVisualPart,
    isSketch,
    zSign,
    targetW,
    targetH,
    faceZ,
    inset = DOOR_VISUAL_DIMENSIONS.accent.defaultInsetM,
    lineT = DOOR_VISUAL_DIMENSIONS.accent.defaultLineThicknessM,
    opacity = DOOR_VISUAL_DIMENSIONS.accent.defaultOpacity,
  } = args;
  if (
    !Number.isFinite(targetW) ||
    !Number.isFinite(targetH) ||
    !(targetW > DOOR_VISUAL_DIMENSIONS.common.minDoorDimensionForAccentM) ||
    !(targetH > DOOR_VISUAL_DIMENSIONS.common.minDoorDimensionForAccentM)
  ) {
    return;
  }

  const safeInset = Math.max(
    0,
    Math.min(
      inset,
      targetW / 2 - DOOR_VISUAL_DIMENSIONS.accent.safeInsetEdgeM,
      targetH / 2 - DOOR_VISUAL_DIMENSIONS.accent.safeInsetEdgeM
    )
  );
  const innerW = targetW - 2 * safeInset;
  const innerH = targetH - 2 * safeInset;
  if (
    !(innerW > DOOR_VISUAL_DIMENSIONS.common.minPanelDimensionM) ||
    !(innerH > DOOR_VISUAL_DIMENSIONS.common.minPanelDimensionM)
  ) {
    return;
  }
  const t = Math.max(
    DOOR_VISUAL_DIMENSIONS.accent.minLineThicknessM,
    Math.min(lineT, innerW / 6, innerH / 6)
  );
  if (!(innerW > 2 * t) || !(innerH > 2 * t)) return;

  const accentMat = getCachedDoorVisualMaterial(
    App,
    createDoorVisualCacheKey('door_accent_material', [isSketch, opacity]),
    () =>
      new THREE.MeshBasicMaterial({
        color: isSketch ? 0x000000 : 0x2b2b2b,
        transparent: true,
        opacity: isSketch
          ? Math.min(
              DOOR_VISUAL_DIMENSIONS.accent.sketchOpacityMax,
              opacity + DOOR_VISUAL_DIMENSIONS.accent.sketchOpacityExtra
            )
          : opacity,
        depthWrite: false,
      })
  );
  try {
    accentMat.userData = accentMat.userData || {};
    accentMat.userData.__keepMaterial = true;
  } catch {
    // ignore
  }

  const z = faceZ + DOOR_VISUAL_DIMENSIONS.common.frontSurfaceNudgeM * zSign;
  const addStrip = (sw: number, sh: number, x: number, y: number, partId: string) => {
    if (!(sw > 0) || !(sh > 0)) return;
    const geometry = getCachedDoorVisualGeometry(
      App,
      createDoorVisualCacheKey('door_accent_strip', [sw, sh]),
      () => new THREE.BoxGeometry(sw, sh, DOOR_VISUAL_DIMENSIONS.accent.stripDepthM)
    );
    const strip = new THREE.Mesh(geometry, accentMat);
    strip.position.set(x, y, z);
    strip.renderOrder = DOOR_VISUAL_DIMENSIONS.accent.renderOrder;
    tagDoorVisualPart(strip, partId);
    visualGroup.add(strip);
  };

  const sideH = Math.max(DOOR_VISUAL_DIMENSIONS.common.minStripThicknessM, innerH - 2 * t);
  addStrip(innerW, t, 0, innerH / 2 - t / 2, 'door_accent_top');
  addStrip(innerW, t, 0, -(innerH / 2 - t / 2), 'door_accent_bottom');
  addStrip(t, sideH, -(innerW / 2 - t / 2), 0, 'door_accent_left');
  addStrip(t, sideH, innerW / 2 - t / 2, 0, 'door_accent_right');
}
