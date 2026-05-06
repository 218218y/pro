import { MATERIAL_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import type {
  PreviewGroupLike,
  PreviewMaterialLike,
  PreviewMeshLike,
  PreviewStorageBarrierEntry,
} from './render_preview_ops_contracts.js';
import type { RenderPreviewInteriorHoverShared } from './render_preview_interior_hover_shared.js';
import { ensureInteriorLayoutHoverPreview } from './render_preview_interior_hover_cache.js';

export function hideInteriorLayoutHoverPreview(
  shared: RenderPreviewInteriorHoverShared,
  args: unknown
): undefined {
  const input = shared.readArgs(args);
  const App = shared.app(input);
  shared.ops(App);
  try {
    const group = shared.asPreviewGroup(shared.cacheValue(App, 'interiorLayoutHoverPreview'));
    if (!group) return undefined;

    group.visible = false;
    const ud = shared.readUserData(group.userData);
    const previewMeshes = [
      ...shared.readMeshList(ud.__shelfList),
      ...shared.readMeshList(ud.__rodList),
      ...(ud.__storage ? [ud.__storage] : []),
    ];

    for (let i = 0; i < previewMeshes.length; i++) {
      const mesh = shared.asPreviewMesh(previewMeshes[i]);
      if (!mesh) continue;
      mesh.visible = false;
      try {
        shared.setOutlineVisible(mesh, false);
      } catch {
        // ignore outline cleanup failures on stale preview nodes
      }
    }
  } catch {
    // ignore cache read failures on best-effort hide
  }

  return undefined;
}

export function setInteriorLayoutHoverPreview(
  shared: RenderPreviewInteriorHoverShared,
  args: unknown
): PreviewGroupLike | null {
  const input = shared.readArgs(args);
  const App = shared.app(input);
  shared.ops(App);

  const THREE = input.THREE || shared.getThreeMaybe(App) || null;
  void THREE;

  const group = shared.asPreviewGroup(ensureInteriorLayoutHoverPreview(shared, { App, THREE }));
  if (!group) return null;

  try {
    const anchorObj = shared.asPreviewMesh(input.anchor) || shared.asPreviewGroup(input.anchor);
    const anchorParent = shared.asPreviewGroup(input.anchorParent);
    const desiredParent = anchorParent || (anchorObj && shared.asPreviewGroup(anchorObj.parent)) || null;
    const root = shared.wardrobeGroup(App);
    if (desiredParent && typeof desiredParent.add === 'function') {
      if (group.parent !== desiredParent) desiredParent.add(group);
    } else if (root && group.parent !== root && typeof root.add === 'function') {
      root.add(group);
    }
  } catch {
    // ignore preview parent repair failures
  }

  const ud = shared.readUserData(group.userData);
  const shelfList = shared.readMeshList(ud.__shelfList);
  const rodList = shared.readMeshList(ud.__rodList);
  const storage = shared.asPreviewMesh(ud.__storage);

  const x = Number(input.x);
  const internalZ = Number(input.internalZ);
  const internalDepth = Number(input.internalDepth);
  const innerW = Number(input.innerW);
  const woodThick = Number(input.woodThick || MATERIAL_DIMENSIONS.wood.thicknessM);
  const backZ = internalZ - internalDepth / 2;
  const regularDepth = internalDepth > 0 ? Math.min(internalDepth, 0.45) : 0.45;
  const shelfVariant = typeof input.shelfVariant === 'string' ? String(input.shelfVariant) : '';
  const isRemove = input.op === 'remove' || input.isRemove === true;

  const setVisible = (mesh: PreviewMeshLike | null, on: boolean) => {
    if (!mesh) return;
    mesh.visible = !!on;
    try {
      shared.setOutlineVisible(mesh, !!on);
    } catch {
      // ignore outline visibility sync failures
    }
  };

  const applyStyle = (
    mesh: PreviewMeshLike | null,
    mat: PreviewMaterialLike | null,
    lineMat: PreviewMaterialLike | null
  ) => {
    if (!mesh) return;
    if (mat) mesh.material = mat;
    try {
      const outline = shared.readOutline(mesh);
      if (outline && lineMat) outline.material = lineMat;
    } catch {
      // ignore stale outline references
    }
  };

  const hideAll = () => {
    for (let i = 0; i < shelfList.length; i++) setVisible(shared.asPreviewMesh(shelfList[i]), false);
    for (let i = 0; i < rodList.length; i++) setVisible(shared.asPreviewMesh(rodList[i]), false);
    setVisible(storage, false);
  };

  if (!Number.isFinite(x) || !Number.isFinite(internalZ) || !(innerW > 0) || !(internalDepth > 0)) {
    group.visible = false;
    hideAll();
    return group;
  }

  const shelfYs = Array.isArray(input.shelfYs) ? input.shelfYs : [];
  const rodYs = Array.isArray(input.rodYs) ? input.rodYs : [];
  const storageRec = readPreviewStorageBarrierEntry(input.storageBarrier);

  group.visible = true;
  hideAll();

  let shelfMat = ud.__matShelf || null;
  let shelfLine = ud.__lineShelf || null;
  if (shelfVariant === 'glass') {
    shelfMat = ud.__matGlass || shelfMat;
    shelfLine = ud.__lineGlass || shelfLine;
  } else if (shelfVariant === 'brace') {
    shelfMat = ud.__matBrace || shelfMat;
    shelfLine = ud.__lineBrace || shelfLine;
  }
  if (isRemove) {
    shelfMat = ud.__matRemove || shelfMat;
    shelfLine = ud.__lineRemove || shelfLine;
  }

  const rodMat: PreviewMaterialLike | null = (isRemove ? ud.__matRemove || ud.__matRod : ud.__matRod) ?? null;
  const rodLine: PreviewMaterialLike | null =
    (isRemove ? ud.__lineRemove || ud.__lineRod : ud.__lineRod) ?? null;
  const storageMat: PreviewMaterialLike | null =
    (isRemove ? ud.__matRemove || ud.__matStorage : ud.__matStorage) ?? null;
  const storageLine: PreviewMaterialLike | null =
    (isRemove ? ud.__lineRemove || ud.__lineStorage : ud.__lineStorage) ?? null;

  const shelfDepth = shelfVariant === 'brace' ? internalDepth : regularDepth;
  const shelfZ = backZ + shelfDepth / 2;
  const shelfW = Math.max(0.05, innerW - (shelfVariant === 'brace' ? 0.002 : 0.014));
  const shelfH =
    shelfVariant === 'glass'
      ? MATERIAL_DIMENSIONS.glassShelf.thicknessM
      : shelfVariant === 'double'
        ? Math.max(woodThick, woodThick * 2)
        : woodThick;

  for (let i = 0; i < shelfList.length; i++) {
    const mesh = shared.asPreviewMesh(shelfList[i]);
    const y0 = Number(shelfYs[i]);
    if (!mesh || !Number.isFinite(y0)) {
      setVisible(mesh, false);
      continue;
    }
    setVisible(mesh, true);
    applyStyle(mesh, shelfMat, shelfLine);
    if (mesh.position && typeof mesh.position.set === 'function') mesh.position.set(x, y0, shelfZ);
    if (mesh.scale && typeof mesh.scale.set === 'function') {
      mesh.scale.set(shelfW, Math.max(0.0001, shelfH), shelfDepth);
    }
  }

  for (let i = 0; i < rodList.length; i++) {
    const mesh = shared.asPreviewMesh(rodList[i]);
    const y0 = Number(rodYs[i]);
    if (!mesh || !Number.isFinite(y0)) {
      setVisible(mesh, false);
      continue;
    }
    setVisible(mesh, true);
    applyStyle(mesh, rodMat, rodLine);
    if (mesh.position && typeof mesh.position.set === 'function') mesh.position.set(x, y0, internalZ);
    if (mesh.scale && typeof mesh.scale.set === 'function') {
      mesh.scale.set(Math.max(0.05, innerW - 0.06), 0.03, 0.03);
    }
  }

  if (storage && storageRec) {
    const y0 = Number(storageRec.y);
    const h0 = Number(storageRec.h);
    const z0 = Number(storageRec.z);
    if (Number.isFinite(y0) && Number.isFinite(h0) && h0 > 0 && Number.isFinite(z0)) {
      setVisible(storage, true);
      applyStyle(storage, storageMat, storageLine);
      if (storage.position && typeof storage.position.set === 'function') storage.position.set(x, y0, z0);
      if (storage.scale && typeof storage.scale.set === 'function') {
        storage.scale.set(Math.max(0.05, innerW - 0.025), Math.max(0.0001, h0), Math.max(0.0001, woodThick));
      }
    }
  }

  return group;
}

function readPreviewStorageBarrierEntry(value: unknown): PreviewStorageBarrierEntry | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return {
    y: Reflect.get(value, 'y'),
    h: Reflect.get(value, 'h'),
    z: Reflect.get(value, 'z'),
  };
}
