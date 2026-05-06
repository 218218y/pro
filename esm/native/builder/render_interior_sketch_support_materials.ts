import { INTERIOR_FITTINGS_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import type { AppContainer } from '../../../types';

import type {
  InteriorMaterialLike,
  InteriorTHREESurface,
  InteriorValueRecord,
} from './render_interior_ops_contracts.js';

import { asMaterial } from './render_interior_sketch_shared.js';

export type SketchPlacementMaterialResources = {
  glassMat: InteriorMaterialLike | null;
  pinGeo: unknown;
  pinMat: InteriorMaterialLike | null;
  pinRadius: number;
  pinLen: number;
  pinEdgeOffsetDefault: number;
};

export function createSketchPlacementMaterialResources(args: {
  App: AppContainer;
  THREE: InteriorTHREESurface | null;
  matCache: (App: AppContainer) => InteriorValueRecord;
}): SketchPlacementMaterialResources {
  const { App, THREE, matCache } = args;
  let glassMat: InteriorMaterialLike | null = null;
  const pinRadius = INTERIOR_FITTINGS_DIMENSIONS.pins.radiusM;
  const pinLen = INTERIOR_FITTINGS_DIMENSIONS.pins.lengthM;
  const pinEdgeOffsetDefault = INTERIOR_FITTINGS_DIMENSIONS.pins.edgeOffsetDefaultM;
  let pinGeo: unknown = null;
  let pinMat: InteriorMaterialLike | null = null;

  try {
    if (THREE) {
      const cache = matCache(App);
      if (!cache.__sketchGlassShelfMat) {
        const sketchGlassShelfMat = new THREE.MeshStandardMaterial({
          color: 0xf2fbff,
          transparent: true,
          opacity: 0.25,
          roughness: 0.15,
          metalness: 0,
        });
        const glassShelfMaterial = asMaterial(sketchGlassShelfMat);
        if (glassShelfMaterial) {
          glassShelfMaterial.depthWrite = false;
          glassShelfMaterial.side = THREE.DoubleSide;
          glassShelfMaterial.premultipliedAlpha = true;
        }
        cache.__sketchGlassShelfMat = sketchGlassShelfMat;
      }
      glassMat = asMaterial(cache.__sketchGlassShelfMat);

      if (!cache.__sketchShelfPinGeo) {
        cache.__sketchShelfPinGeo = new THREE.CylinderGeometry(pinRadius, pinRadius, pinLen, 12);
      }
      if (!cache.__sketchShelfPinMat) {
        cache.__sketchShelfPinMat = new THREE.MeshStandardMaterial({
          color: 0xaaaaaa,
          roughness: 0.35,
          metalness: 0.8,
        });
        try {
          const sketchShelfPinMat = asMaterial(cache.__sketchShelfPinMat);
          if (sketchShelfPinMat) sketchShelfPinMat.__keepMaterial = true;
        } catch {
          // ignore
        }
      }
      pinGeo = cache.__sketchShelfPinGeo;
      pinMat = asMaterial(cache.__sketchShelfPinMat);
    }
  } catch {
    glassMat = null;
  }

  return {
    glassMat,
    pinGeo,
    pinMat,
    pinRadius,
    pinLen,
    pinEdgeOffsetDefault,
  };
}
