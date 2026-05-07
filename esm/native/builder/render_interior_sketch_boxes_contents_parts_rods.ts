import {
  INTERIOR_FITTINGS_DIMENSIONS,
  SKETCH_BOX_DIMENSIONS,
} from '../../shared/wardrobe_dimension_tokens_shared.js';
import type { RenderSketchBoxStaticContentsArgs } from './render_interior_sketch_boxes_contents_parts_types.js';
import type { SketchRodExtra } from './render_interior_sketch_shared.js';

import { asMaterial, asRecordArray } from './render_interior_sketch_shared.js';
import { resolveSketchBoxSegmentForContent } from './render_interior_sketch_layout.js';

export function renderSketchBoxContentRods(args: RenderSketchBoxStaticContentsArgs): void {
  const { shell, boxDividers, yFromBoxNorm } = args;
  const { group, woodThick, THREE } = args.args;
  const { box, boxPid, geometry } = shell;

  const boxRods = asRecordArray<SketchRodExtra>(box.rods);
  if (!boxRods.length || !THREE) return;

  const rodMat = new THREE.MeshStandardMaterial({ color: 0x8a8a8a, roughness: 0.35, metalness: 0.8 });
  try {
    const rodMaterial = asMaterial(rodMat);
    if (rodMaterial) rodMaterial.__keepMaterial = true;
  } catch {
    // ignore
  }
  for (let ri = 0; ri < boxRods.length; ri++) {
    const rod = boxRods[ri] || null;
    if (!rod) continue;
    const rodY = yFromBoxNorm(rod.yNorm, INTERIOR_FITTINGS_DIMENSIONS.rods.radiusM);
    if (rodY == null) continue;
    const rodSegment = resolveSketchBoxSegmentForContent({
      dividers: boxDividers,
      boxCenterX: geometry.centerX,
      innerW: geometry.innerW,
      woodThick,
      xNorm: rod.xNorm,
    });
    const previewDims = SKETCH_BOX_DIMENSIONS.preview;
    const rodLen = Math.max(
      previewDims.rodMinLengthM,
      (rodSegment ? rodSegment.width : geometry.innerW) - previewDims.rodWidthClearanceM
    );
    const rodCenterX = rodSegment ? rodSegment.centerX : geometry.centerX;
    const rodPid = `${boxPid}_rod_${String(rod.id ?? ri)}`;
    const rodMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(
        INTERIOR_FITTINGS_DIMENSIONS.rods.radiusM,
        INTERIOR_FITTINGS_DIMENSIONS.rods.radiusM,
        rodLen,
        INTERIOR_FITTINGS_DIMENSIONS.rods.radialSegments
      ),
      rodMat
    );
    if (rodMesh.rotation) rodMesh.rotation.z = Math.PI / 2;
    rodMesh.position?.set?.(rodCenterX, rodY, geometry.innerBackZ + geometry.innerD / 2);
    rodMesh.userData = rodMesh.userData || {};
    rodMesh.userData.partId = rodPid;
    rodMesh.userData.__wpType = 'sketchRod';
    group.add?.(rodMesh);
  }
}
