import type { PreviewMaterialLike, PreviewTHREESurface } from './render_preview_ops_contracts.js';
import type { RenderPreviewSketchShared } from './render_preview_sketch_shared.js';
import type { SketchPlacementPreviewMaterialSet } from './render_preview_sketch_ops_types.js';

function createSketchMeshMaterial(
  THREE: PreviewTHREESurface,
  shared: RenderPreviewSketchShared,
  color: number,
  opacity: number,
  depthTest = true
): PreviewMaterialLike {
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    depthTest,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  shared.markKeepMaterial(material);
  return material;
}

function createSketchLineMaterial(
  THREE: PreviewTHREESurface,
  shared: RenderPreviewSketchShared,
  color: number,
  opacity: number,
  depthTest = true
): PreviewMaterialLike {
  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    depthTest,
  });
  shared.markKeepMaterial(material);
  return material;
}

export function createSketchPlacementPreviewMaterials(
  THREE: PreviewTHREESurface,
  shared: RenderPreviewSketchShared
): SketchPlacementPreviewMaterialSet {
  return {
    matShelf: createSketchMeshMaterial(THREE, shared, 0x7fd3ff, 0.22),
    matGlass: createSketchMeshMaterial(THREE, shared, 0xe6f7ff, 0.32),
    matBox: createSketchMeshMaterial(THREE, shared, 0xfbbf24, 0.22),
    matBrace: createSketchMeshMaterial(THREE, shared, 0x34d399, 0.22),
    matRemove: createSketchMeshMaterial(THREE, shared, 0xff4d4f, 0.24),
    matRod: createSketchMeshMaterial(THREE, shared, 0x6fe7ff, 0.38),
    matBoxOverlay: createSketchMeshMaterial(THREE, shared, 0xfbbf24, 0.3, false),
    matRemoveOverlay: createSketchMeshMaterial(THREE, shared, 0xff4d4f, 0.32, false),
    lineShelf: createSketchLineMaterial(THREE, shared, 0x7fd3ff, 0.75),
    lineGlass: createSketchLineMaterial(THREE, shared, 0x7fd3ff, 0.92),
    lineBox: createSketchLineMaterial(THREE, shared, 0xfbbf24, 0.75),
    lineBrace: createSketchLineMaterial(THREE, shared, 0x34d399, 0.75),
    lineRemove: createSketchLineMaterial(THREE, shared, 0xff4d4f, 0.92),
    lineRod: createSketchLineMaterial(THREE, shared, 0xe9fdff, 1),
    lineBoxOverlay: createSketchLineMaterial(THREE, shared, 0xfbbf24, 0.98, false),
    lineRemoveOverlay: createSketchLineMaterial(THREE, shared, 0xff4d4f, 1, false),
  };
}
