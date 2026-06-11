import type {
  PreviewGroupLike,
  PreviewMaterialLike,
  PreviewTHREESurface,
} from './render_preview_ops_contracts.js';
import type { RenderPreviewInteriorHoverShared } from './render_preview_interior_hover_shared.js';
import { resolveInteriorHoverPreviewTHREE } from './render_preview_interior_hover_shared.js';

export function ensureInteriorLayoutHoverPreview(
  shared: RenderPreviewInteriorHoverShared,
  args: unknown
): PreviewGroupLike | null {
  const input = shared.readArgs(args);
  const App = shared.app(input);
  shared.ops(App);
  const THREE = resolveInteriorHoverPreviewTHREE(shared, App, input);
  if (!THREE) return null;

  try {
    const root = shared.wardrobeGroup(App);
    if (!root) return null;

    let existing = shared.cacheValue(App, 'interiorLayoutHoverPreview');
    if (existing) {
      const cached = shared.asPreviewGroup(existing);
      if (cached && cached.isGroup) {
        const ud = shared.readUserData(cached.userData);
        const shelfList = shared.readMeshList(ud.__shelfList);
        const rodList = shared.readMeshList(ud.__rodList);
        const storage = shared.asPreviewMesh(ud.__storage);
        const isAttached = (m: unknown): boolean => {
          const resolved = shared.asPreviewMesh(m) || shared.asPreviewGroup(m);
          return !!(resolved && resolved.parent === cached && resolved.geometry);
        };
        const hasCoreChildren =
          shelfList.length >= 1 &&
          rodList.length >= 1 &&
          isAttached(shelfList[0]) &&
          isAttached(rodList[0]) &&
          isAttached(storage);
        if (hasCoreChildren) {
          const rootGroup = shared.asPreviewGroup(root);
          if (!cached.parent && rootGroup && shared.isFn(rootGroup.add)) rootGroup.add(cached);
          return cached;
        }
        try {
          const parent = shared.asPreviewGroup(cached.parent);
          if (parent && shared.isFn(parent.remove)) parent.remove(cached);
        } catch {
          // ignore invalid stale parent pointers
        }
        shared.writeCacheValue(App, 'interiorLayoutHoverPreview', null);
        existing = null;
        void existing;
      }
    }

    const created = createInteriorLayoutHoverPreviewGroup(shared, THREE);
    shared.writeCacheValue(App, 'interiorLayoutHoverPreview', created);
    root.add(created);
    return created;
  } catch (e) {
    shared.renderOpsHandleCatch(App, 'ensureInteriorLayoutHoverPreview', e, undefined, {
      failFast: false,
      throttleMs: 5000,
    });
    return null;
  }
}

function createInteriorLayoutHoverPreviewGroup(
  shared: Pick<RenderPreviewInteriorHoverShared, 'markIgnoreRaycast' | 'markKeepMaterial'>,
  THREE: PreviewTHREESurface
): PreviewGroupLike {
  const unitGeo = new THREE.BoxGeometry(1, 1, 1);
  const unitEdgesGeo = new THREE.EdgesGeometry(unitGeo);

  const mkMat = (color: number, opacity: number) => {
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      depthWrite: false,
      depthTest: true,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    shared.markKeepMaterial(material);
    return material;
  };

  const mkLineMat = (color: number, opacity: number) => {
    const material = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity,
      depthWrite: false,
      depthTest: true,
    });
    shared.markKeepMaterial(material);
    return material;
  };

  const matShelf = mkMat(0x7fd3ff, 0.22);
  const matGlass = mkMat(0xe6f7ff, 0.32);
  const matBrace = mkMat(0x34d399, 0.22);
  const matRod = mkMat(0xc0c0c0, 0.28);
  const matStorage = mkMat(0xfbbf24, 0.22);
  const matRemove = mkMat(0xff4d4f, 0.24);

  const lineShelf = mkLineMat(0x7fd3ff, 0.75);
  const lineGlass = mkLineMat(0x7fd3ff, 0.92);
  const lineBrace = mkLineMat(0x34d399, 0.75);
  const lineRod = mkLineMat(0xc0c0c0, 0.92);
  const lineStorage = mkLineMat(0xfbbf24, 0.75);
  const lineRemove = mkLineMat(0xff4d4f, 0.92);

  const mk = (mat: PreviewMaterialLike, lineMat: PreviewMaterialLike) => {
    const mesh = new THREE.Mesh(unitGeo, mat);
    mesh.visible = false;
    mesh.renderOrder = 9999;
    shared.markIgnoreRaycast(mesh);
    mesh.raycast = function () {};
    mesh.castShadow = false;
    mesh.receiveShadow = false;

    const outline = new THREE.LineSegments(unitEdgesGeo, lineMat);
    outline.visible = false;
    outline.renderOrder = 10000;
    shared.markIgnoreRaycast(outline);
    outline.raycast = function () {};
    mesh.add(outline);
    mesh.userData = mesh.userData || {};
    mesh.userData.__outline = outline;
    return mesh;
  };

  const group = new THREE.Group();
  group.visible = false;
  group.renderOrder = 9999;
  group.userData = group.userData || {};
  shared.markIgnoreRaycast(group);
  group.userData.__keepMaterialSubtree = true;

  const shelfList = [];
  for (let i = 0; i < 8; i++) {
    const shelf = mk(matShelf, lineShelf);
    shelfList.push(shelf);
    group.add(shelf);
  }

  const rodList = [];
  for (let i = 0; i < 4; i++) {
    const rod = mk(matRod, lineRod);
    rodList.push(rod);
    group.add(rod);
  }

  const storage = mk(matStorage, lineStorage);
  group.add(storage);

  group.userData.__shelfList = shelfList;
  group.userData.__rodList = rodList;
  group.userData.__storage = storage;
  group.userData.__matShelf = matShelf;
  group.userData.__matGlass = matGlass;
  group.userData.__matBrace = matBrace;
  group.userData.__matRod = matRod;
  group.userData.__matStorage = matStorage;
  group.userData.__matRemove = matRemove;
  group.userData.__lineShelf = lineShelf;
  group.userData.__lineGlass = lineGlass;
  group.userData.__lineBrace = lineBrace;
  group.userData.__lineRod = lineRod;
  group.userData.__lineStorage = lineStorage;
  group.userData.__lineRemove = lineRemove;

  return group;
}
