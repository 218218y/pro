import { DOOR_VISUAL_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import { resolveGrooveLinesCount } from './groove_lines_count.js';
import {
  createDoorVisualCacheKey,
  getCachedDoorVisualGeometry,
  getCachedDoorVisualMaterial,
} from './visuals_and_contents_door_visual_cache.js';

import type { AppContainer, Object3DLike, ThreeLike } from '../../../types/index.js';
import type { TagDoorVisualPartFn } from './visuals_and_contents_door_visual_support_contracts.js';

export function appendGrooveStrips(args: {
  App: AppContainer;
  THREE: ThreeLike;
  visualGroup: Object3DLike;
  tagDoorVisualPart: TagDoorVisualPartFn;
  hasGrooves: boolean;
  isSketch: boolean;
  groovePartId?: string | null;
  zSign: number;
  targetW: number;
  targetH: number;
  zOffset: number;
  densityOverride?: number;
}): void {
  const {
    App,
    THREE,
    visualGroup,
    tagDoorVisualPart,
    hasGrooves,
    isSketch,
    groovePartId,
    zSign,
    targetW,
    targetH,
    zOffset,
    densityOverride,
  } = args;
  if (!hasGrooves) return;

  const grooveMat = getCachedDoorVisualMaterial(
    App,
    createDoorVisualCacheKey('door_groove_material', [isSketch]),
    () => new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 })
  );
  if (isSketch) grooveMat.color.setHex(0x000000);

  const stripesCount = resolveGrooveLinesCount(App, targetW, densityOverride, groovePartId || null);
  const gap = targetW / (stripesCount + 1);
  const stripGeo = getCachedDoorVisualGeometry(
    App,
    createDoorVisualCacheKey('door_groove_strip', [
      targetH - DOOR_VISUAL_DIMENSIONS.grooves.heightClearanceM,
    ]),
    () =>
      new THREE.BoxGeometry(
        DOOR_VISUAL_DIMENSIONS.grooves.stripWidthM,
        targetH - DOOR_VISUAL_DIMENSIONS.grooves.heightClearanceM,
        DOOR_VISUAL_DIMENSIONS.grooves.stripDepthM
      )
  );
  for (let i = 1; i <= stripesCount; i++) {
    const strip = new THREE.Mesh(stripGeo, grooveMat);
    strip.userData = strip.userData || {};
    strip.userData.__keepMaterial = true;
    tagDoorVisualPart(strip, 'door_groove_strip');
    strip.position.set(
      -targetW / 2 + i * gap,
      0,
      zOffset + DOOR_VISUAL_DIMENSIONS.grooves.surfaceOffsetM * zSign
    );
    visualGroup.add(strip);
  }
}
