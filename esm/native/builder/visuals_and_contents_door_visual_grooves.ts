import { doorArchY } from '../../shared/door_arch_geometry.js';
import { DOOR_GROOVE_RENDER_POLICY } from '../../shared/dimensions/door_visual_policy.js';
import { normalizeGrooveLinesCount, resolveGrooveLinesCount } from './groove_lines_count.js';
import { readGrooveLayoutList, resolveGroovePlacementListInRect } from './door_visual_lookup_state.js';
import {
  createDoorVisualCacheKey,
  getCachedDoorVisualGeometry,
  getCachedDoorVisualMaterial,
} from './visuals_and_contents_door_visual_cache.js';

import type { AppContainer, GrooveLayoutList, Object3DLike, ThreeLike } from '../../../types/index.js';
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
  linesCountOverride?: unknown;
  grooveLayout?: GrooveLayoutList | null;
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
    linesCountOverride,
    grooveLayout,
  } = args;
  visualGroup.userData = visualGroup.userData || {};
  visualGroup.userData.__wpGrooveSurface = true;
  visualGroup.userData.__wpGrooveSurfacePartId = groovePartId || null;
  visualGroup.userData.__wpGrooveSurfaceRect = {
    minX: -targetW / 2,
    maxX: targetW / 2,
    minY: -targetH / 2,
    maxY: targetH / 2,
  };
  visualGroup.userData.__wpGrooveSurfaceZ = zOffset;
  visualGroup.userData.__wpGrooveSurfaceZSign = zSign;
  if (!hasGrooves) return;

  const grooveMat = getCachedDoorVisualMaterial(
    App,
    createDoorVisualCacheKey('door_groove_material', [isSketch]),
    () => new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 })
  );
  if (isSketch) grooveMat.color.setHex(0x000000);

  const normalizedLayouts = readGrooveLayoutList(grooveLayout);
  const placements = resolveGroovePlacementListInRect({
    rect: { minX: -targetW / 2, maxX: targetW / 2, minY: -targetH / 2, maxY: targetH / 2 },
    layouts: normalizedLayouts,
  });
  const explicitLinesCount = normalizeGrooveLinesCount(linesCountOverride);
  for (const [placementIndex, placement] of placements.entries()) {
    const arch = normalizedLayouts[placementIndex]?.arch;
    const isHorizontal = !arch && placement.orientation === 'horizontal';
    const distributionSpan = isHorizontal ? placement.heightM : placement.widthM;
    const stripSpan = Math.max(
      DOOR_GROOVE_RENDER_POLICY.stripWidthM,
      (isHorizontal ? placement.widthM : placement.heightM) - DOOR_GROOVE_RENDER_POLICY.heightClearanceM
    );
    const placementLinesCount = normalizeGrooveLinesCount(normalizedLayouts[placementIndex]?.linesCount);
    const stripesCount =
      placementLinesCount ??
      explicitLinesCount ??
      resolveGrooveLinesCount(App, distributionSpan, densityOverride, groovePartId || null);
    const gap = distributionSpan / (stripesCount + 1);
    const geometryWidth = isHorizontal ? stripSpan : DOOR_GROOVE_RENDER_POLICY.stripWidthM;
    const geometryHeight = isHorizontal ? DOOR_GROOVE_RENDER_POLICY.stripWidthM : stripSpan;
    const archRect = {
      minX: placement.centerX - placement.widthM / 2,
      maxX: placement.centerX + placement.widthM / 2,
      minY: placement.centerY - placement.heightM / 2,
      maxY: placement.centerY + placement.heightM / 2,
    };
    for (let i = 1; i <= stripesCount; i++) {
      const crossOffset = -distributionSpan / 2 + i * gap;
      const top = arch ? doorArchY(archRect, arch, placement.centerX + crossOffset) : archRect.maxY;
      const height = arch
        ? Math.max(
            DOOR_GROOVE_RENDER_POLICY.stripWidthM,
            top - archRect.minY - DOOR_GROOVE_RENDER_POLICY.heightClearanceM
          )
        : geometryHeight;
      const stripGeo = getCachedDoorVisualGeometry(
        App,
        createDoorVisualCacheKey('door_groove_strip', [geometryWidth, height]),
        () => new THREE.BoxGeometry(geometryWidth, height, DOOR_GROOVE_RENDER_POLICY.stripDepthM)
      );
      const strip = new THREE.Mesh(stripGeo, grooveMat);
      strip.userData = strip.userData || {};
      strip.userData.__keepMaterial = true;
      tagDoorVisualPart(strip, 'door_groove_strip');
      strip.position.set(
        placement.centerX + (isHorizontal ? 0 : crossOffset),
        arch ? (archRect.minY + top) / 2 : placement.centerY + (isHorizontal ? crossOffset : 0),
        zOffset + DOOR_GROOVE_RENDER_POLICY.surfaceOffsetM * zSign
      );
      visualGroup.add(strip);
    }
  }
}
