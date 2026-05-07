import { INTERIOR_FITTINGS_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import type {
  InteriorGroupLike,
  InteriorMaterialLike,
  InteriorTHREESurface,
} from './render_interior_ops_contracts.js';
import type { SketchPlacementSupport } from './render_interior_sketch_support_contracts.js';

import { asMaterial } from './render_interior_sketch_shared.js';

export function createShelfPinAdder(args: {
  group: InteriorGroupLike;
  THREE: InteriorTHREESurface | null;
  pinGeo: unknown;
  pinMat: InteriorMaterialLike | null;
  pinRadius: number;
  pinLen: number;
  pinEdgeOffsetDefault: number;
}): SketchPlacementSupport['addShelfPins'] {
  const { group, THREE, pinGeo, pinMat, pinRadius, pinLen, pinEdgeOffsetDefault } = args;

  return (shelfX, shelfY, shelfZ, shelfW, shelfH, shelfDepth, enabled) => {
    if (!enabled) return;
    if (!THREE || !pinGeo || !pinMat) return;
    if (!(shelfW > 0) || !(shelfDepth > 0)) return;

    const pinDims = INTERIOR_FITTINGS_DIMENSIONS.pins;
    const shelfBottom = shelfY - shelfH / 2;
    const yPin = shelfBottom - pinRadius + pinDims.bottomYOffsetM;
    const backEdge = shelfZ - shelfDepth / 2;
    const frontEdge = shelfZ + shelfDepth / 2;
    const maxOff = shelfDepth / 2 - pinDims.maxDepthSideClearanceM;
    const edgeOff = Math.max(pinDims.minEdgeOffsetM, Math.min(pinEdgeOffsetDefault, maxOff));
    const zBack = backEdge + edgeOff;
    const zFront = frontEdge - edgeOff;
    const leftEdgeX = shelfX - shelfW / 2;
    const rightEdgeX = shelfX + shelfW / 2;

    const mkPin = (x: number, z: number) => {
      const mesh = new THREE.Mesh(pinGeo, pinMat);
      if (mesh.rotation) mesh.rotation.z = Math.PI / 2;
      mesh.position?.set?.(x, yPin, z);
      mesh.userData = mesh.userData || {};
      mesh.userData.partId = 'all_shelves';
      mesh.userData.__kind = 'shelf_pin';
      try {
        const pinMaterial = asMaterial(mesh.material);
        if (pinMaterial) pinMaterial.__keepMaterial = true;
      } catch {
        // ignore
      }
      group.add?.(mesh);
    };

    mkPin(leftEdgeX + pinLen / 2, zBack);
    mkPin(leftEdgeX + pinLen / 2, zFront);
    mkPin(rightEdgeX - pinLen / 2, zBack);
    mkPin(rightEdgeX - pinLen / 2, zFront);
  };
}
