import type {
  PreviewGroupLike,
  PreviewMaterialLike,
  PreviewMeshLike,
  PreviewTHREESurface,
} from './render_preview_ops_contracts.js';
import type { RenderPreviewSketchShared } from './render_preview_sketch_shared.js';
import type {
  SketchPlacementPreviewMaterialSet,
  SketchPlacementPreviewMeshSlots,
} from './render_preview_sketch_ops_types.js';

function createSketchPlacementPreviewMesh(args: {
  THREE: PreviewTHREESurface;
  shared: RenderPreviewSketchShared;
  unitGeo: unknown;
  unitEdgesGeo: unknown;
  material: PreviewMaterialLike;
  lineMaterial: PreviewMaterialLike;
}): PreviewMeshLike {
  const { THREE, shared, unitGeo, unitEdgesGeo, material, lineMaterial } = args;
  const mesh = new THREE.Mesh(unitGeo, material);
  mesh.visible = false;
  mesh.renderOrder = 9999;
  shared.markIgnoreRaycast(mesh);
  mesh.raycast = function () {};
  mesh.castShadow = false;
  mesh.receiveShadow = false;

  const outline = new THREE.LineSegments(unitEdgesGeo, lineMaterial);
  outline.visible = false;
  outline.renderOrder = 10000;
  shared.markIgnoreRaycast(outline);
  outline.raycast = function () {};
  mesh.add(outline);
  if (mesh.userData) mesh.userData.__outline = outline;
  return mesh;
}

export function readSketchPlacementPreviewMeshSlots(
  group: PreviewGroupLike,
  shared: RenderPreviewSketchShared
): SketchPlacementPreviewMeshSlots {
  const userData = shared.readUserData(group.userData);
  return {
    shelfA: shared.asPreviewMesh(userData.__shelfA),
    boxTop: shared.asPreviewMesh(userData.__boxTop),
    boxBottom: shared.asPreviewMesh(userData.__boxBottom),
    boxLeft: shared.asPreviewMesh(userData.__boxLeft),
    boxRight: shared.asPreviewMesh(userData.__boxRight),
    boxBack: shared.asPreviewMesh(userData.__boxBack),
  };
}

export function createSketchPlacementPreviewGroup(args: {
  THREE: PreviewTHREESurface;
  shared: RenderPreviewSketchShared;
  materials: SketchPlacementPreviewMaterialSet;
}): PreviewGroupLike {
  const { THREE, shared, materials } = args;
  const unitGeo = new THREE.BoxGeometry(1, 1, 1);
  const unitEdgesGeo = new THREE.EdgesGeometry(unitGeo);

  const createMesh = (material: PreviewMaterialLike, lineMaterial: PreviewMaterialLike) =>
    createSketchPlacementPreviewMesh({
      THREE,
      shared,
      unitGeo,
      unitEdgesGeo,
      material,
      lineMaterial,
    });

  const group = new THREE.Group();
  group.visible = false;
  group.renderOrder = 9999;
  const userData = shared.ensureGroupUserData(group);
  shared.markIgnoreRaycast(group);
  if (group.userData) group.userData.__keepMaterialSubtree = true;

  const shelfA = createMesh(materials.matShelf, materials.lineShelf);
  const boxTop = createMesh(materials.matBox, materials.lineBox);
  const boxBottom = createMesh(materials.matBox, materials.lineBox);
  const boxLeft = createMesh(materials.matBox, materials.lineBox);
  const boxRight = createMesh(materials.matBox, materials.lineBox);
  const boxBack = createMesh(materials.matBox, materials.lineBox);

  group.add(shelfA, boxTop, boxBottom, boxLeft, boxRight, boxBack);

  userData.__shelfA = shelfA;
  userData.__boxTop = boxTop;
  userData.__boxBottom = boxBottom;
  userData.__boxLeft = boxLeft;
  userData.__boxRight = boxRight;
  userData.__boxBack = boxBack;
  userData.__matShelf = materials.matShelf;
  userData.__matGlass = materials.matGlass;
  userData.__matBox = materials.matBox;
  userData.__matBrace = materials.matBrace;
  userData.__matRemove = materials.matRemove;
  userData.__matRod = materials.matRod;
  userData.__matBoxOverlay = materials.matBoxOverlay;
  userData.__matRemoveOverlay = materials.matRemoveOverlay;
  userData.__lineShelf = materials.lineShelf;
  userData.__lineGlass = materials.lineGlass;
  userData.__lineBox = materials.lineBox;
  userData.__lineBrace = materials.lineBrace;
  userData.__lineRemove = materials.lineRemove;
  userData.__lineRod = materials.lineRod;
  userData.__lineBoxOverlay = materials.lineBoxOverlay;
  userData.__lineRemoveOverlay = materials.lineRemoveOverlay;

  return group;
}
