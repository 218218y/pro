import { DRAWER_DIMENSIONS, SKETCH_BOX_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import { getDrawersArray } from '../runtime/render_access.js';
import { resolveBuilderMirrorMaterial } from '../runtime/builder_service_access.js';

import type { InteriorValueRecord } from './render_interior_ops_contracts.js';
import type {
  RenderSketchBoxExternalDrawersArgs,
  SketchBoxExternalDrawersContext,
} from './render_interior_sketch_boxes_fronts_drawers_types.js';

import { asRecordArray } from './render_interior_sketch_shared.js';

export function createSketchBoxExternalDrawersContext(
  args: RenderSketchBoxExternalDrawersArgs
): SketchBoxExternalDrawersContext | null {
  const { frontsArgs } = args;
  const { shell, resolveBoxDrawerSpan } = frontsArgs;
  const { App, input, group, woodThick, moduleIndex, moduleKeyStr, createDoorVisual, THREE, isFn } =
    frontsArgs.args;
  const { box, geometry: boxGeo, innerBottomY, innerTopY } = shell;

  const boxExtDrawers = asRecordArray<InteriorValueRecord>(box.extDrawers);
  if (!(boxExtDrawers.length && THREE)) return null;

  const drawerDims = DRAWER_DIMENSIONS.sketch;
  const outerD = Math.max(drawerDims.externalPreviewMinDepthM, boxGeo.outerD);
  const visualT = SKETCH_BOX_DIMENSIONS.preview.drawerPreviewThicknessM;
  const frontZ = boxGeo.centerZ + boxGeo.outerD / 2;
  const drawersArray = getDrawersArray(App);
  const createInternalDrawerBox = input.createInternalDrawerBox;

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

  const clampDrawerCenterY = (centerY: number, stackH: number): number => {
    const lo = innerBottomY + stackH / 2;
    const hi = innerTopY - woodThick - stackH / 2;
    if (!(hi > lo)) return Math.max(innerBottomY + woodThick, Math.min(innerTopY - woodThick, centerY));
    return Math.max(lo, Math.min(hi, centerY));
  };

  return {
    ...args,
    shell,
    resolveBoxDrawerSpan,
    App,
    input,
    group,
    woodThick,
    moduleIndex,
    moduleKeyStr,
    createDoorVisual,
    THREE,
    isFn,
    boxExtDrawers,
    createInternalDrawerBox,
    outerD,
    visualT,
    frontZ,
    drawersArray,
    resolveCachedMirrorMaterial,
    clampDrawerCenterY,
  };
}
