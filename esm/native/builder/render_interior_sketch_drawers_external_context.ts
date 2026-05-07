import { DRAWER_DIMENSIONS, SKETCH_BOX_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import { getDrawersArray } from '../runtime/render_access.js';
import { resolveBuilderMirrorMaterial } from '../runtime/builder_service_access.js';

import type { InteriorValueRecord } from './render_interior_ops_contracts.js';
import type { ApplySketchExternalDrawersArgs } from './render_interior_sketch_drawers_shared.js';
import type { SketchExternalDrawerRenderContext } from './render_interior_sketch_drawers_external_types.js';

import {
  readObject,
  resolveSketchExternalDrawerDoorFaceTopY,
  toFiniteNumber,
} from './render_interior_sketch_shared.js';
import {
  resolveSketchDoorStyle,
  resolveSketchDoorStyleMap,
} from './render_interior_sketch_drawers_shared.js';

export function createSketchExternalDrawerRenderContext(
  args: ApplySketchExternalDrawersArgs
): SketchExternalDrawerRenderContext | null {
  const {
    App,
    input,
    extDrawers,
    THREE,
    innerW,
    moduleDepth,
    internalDepth,
    effectiveTopY,
    woodThick,
    isFn,
  } = args;

  if (!extDrawers.length || !THREE) return null;

  const drawerDims = DRAWER_DIMENSIONS.sketch;
  const outerW = Math.max(drawerDims.externalPreviewMinWidthM, innerW);
  const outerD = Math.max(
    drawerDims.externalPreviewMinDepthM,
    moduleDepth > 0 ? moduleDepth : internalDepth + drawerDims.externalPreviewDepthClearanceM
  );
  const visualT = SKETCH_BOX_DIMENSIONS.preview.drawerPreviewThicknessM;
  const frontZ =
    toFiniteNumber(readObject<InteriorValueRecord>(input)?.externalFrontZ) ?? Math.max(0, outerD / 2);
  const outlineFn = isFn(input.addOutlines) ? input.addOutlines : null;
  const doorStyle = resolveSketchDoorStyle(App, input);
  const doorStyleMap = resolveSketchDoorStyleMap(App, input);
  const drawersArray = getDrawersArray(App);
  const doorFaceTopY = resolveSketchExternalDrawerDoorFaceTopY(effectiveTopY, woodThick);

  let didResolveMirrorMaterial = false;
  let cachedMirrorMaterial: unknown = null;
  const resolveCachedMirrorMaterial = () => {
    if (didResolveMirrorMaterial) return cachedMirrorMaterial;
    didResolveMirrorMaterial = true;
    try {
      cachedMirrorMaterial = resolveBuilderMirrorMaterial(
        App,
        THREE as never,
        () => new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1.0, roughness: 0.01 })
      );
    } catch {
      cachedMirrorMaterial = null;
    }
    return cachedMirrorMaterial;
  };

  const resolvePartMaterial = (partId: string): unknown => {
    try {
      if (isFn(args.getPartMaterial)) {
        const resolved = args.getPartMaterial(partId);
        if (resolved) return resolved;
      }
    } catch {
      // Keep sketch preview resilient: material lookup failures fall back to body material.
    }
    return args.bodyMat;
  };

  return {
    ...args,
    THREE,
    outerW,
    outerD,
    visualT,
    frontZ,
    outlineFn,
    doorStyle,
    doorStyleMap,
    drawersArray,
    doorFaceTopY,
    resolveCachedMirrorMaterial,
    resolvePartMaterial,
  };
}
