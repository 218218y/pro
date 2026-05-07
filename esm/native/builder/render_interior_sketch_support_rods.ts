import { INTERIOR_FITTINGS_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import type { InteriorTHREESurface } from './render_interior_ops_contracts.js';
import type { ApplySketchRodsArgs } from './render_interior_sketch_support_contracts.js';

import { asMaterial } from './render_interior_sketch_shared.js';

function resolveSketchRodTHREE(
  args: Pick<ApplySketchRodsArgs, 'THREE' | 'App' | 'assertTHREE' | 'asObject'>
) {
  const { THREE, App, assertTHREE, asObject } = args;
  if (THREE) return THREE;
  try {
    return asObject<InteriorTHREESurface>(
      assertTHREE(App, 'native/builder/render_interior_sketch_support.applySketchRods.fallback')
    );
  } catch {
    return null;
  }
}

export function applySketchRods(args: ApplySketchRodsArgs): void {
  const {
    rods,
    yFromNorm,
    createRod,
    isFn,
    THREE,
    App,
    assertTHREE,
    asObject,
    innerW,
    internalCenterX,
    internalZ,
    group,
  } = args;

  if (!rods.length) return;
  try {
    for (let i = 0; i < rods.length; i++) {
      const rod = rods[i] || null;
      if (!rod) continue;
      const y = yFromNorm(rod.yNorm);
      if (y == null) continue;

      if (isFn(createRod)) {
        try {
          createRod(y, false, true, null);
        } catch {
          // fallback below
        }
        continue;
      }

      const resolvedTHREE = resolveSketchRodTHREE({ THREE, App, assertTHREE, asObject });
      if (!resolvedTHREE) continue;

      const SKETCH_ROD_DIMENSIONS = INTERIOR_FITTINGS_DIMENSIONS.rods;
      const len = Math.max(
        SKETCH_ROD_DIMENSIONS.depthHintMinM,
        innerW - SKETCH_ROD_DIMENSIONS.contentsWidthClearanceM
      );
      const geo = new resolvedTHREE.CylinderGeometry(
        SKETCH_ROD_DIMENSIONS.radiusM,
        SKETCH_ROD_DIMENSIONS.radiusM,
        len,
        SKETCH_ROD_DIMENSIONS.radialSegments
      );
      const mat = new resolvedTHREE.MeshStandardMaterial({
        color: 0x8a8a8a,
        roughness: 0.35,
        metalness: 0.8,
      });
      const matRec = asMaterial(mat);
      if (matRec) matRec.__keepMaterial = true;
      const mesh = new resolvedTHREE.Mesh(geo, mat);
      if (mesh.rotation) mesh.rotation.z = Math.PI / 2;
      mesh.position?.set?.(internalCenterX, y, internalZ);
      mesh.userData = mesh.userData || {};
      mesh.userData.partId = 'all_rods';
      mesh.userData.__wpType = 'sketchRod';
      group.add?.(mesh);
    }
  } catch {
    // ignore
  }
}
