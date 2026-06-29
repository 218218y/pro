import {
  INTERIOR_FITTINGS_DIMENSIONS,
  MATERIAL_DIMENSIONS,
  SKETCH_BOX_DIMENSIONS,
} from '../../shared/wardrobe_dimension_tokens_shared.js';
import type {
  PreviewGroupLike,
  PreviewMaterialLike,
  PreviewMeshLike,
  PreviewStorageBarrierEntry,
} from './render_preview_ops_contracts.js';
import type { RenderPreviewInteriorHoverShared } from './render_preview_interior_hover_shared.js';
import { ensureInteriorLayoutHoverPreview } from './render_preview_interior_hover_cache.js';
import {
  readPreviewNumber,
  readPreviewPositiveNumber,
  readPreviewPositiveNumberOr,
} from './render_preview_number_contracts.js';

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

  const x = readPreviewNumber(input.x);
  const internalZ = readPreviewNumber(input.internalZ);
  const internalDepth = readPreviewPositiveNumber(input.internalDepth);
  const innerW = readPreviewPositiveNumber(input.innerW);
  const woodThick = readPreviewPositiveNumberOr(input.woodThick, MATERIAL_DIMENSIONS.wood.thicknessM);
  const backZ = internalZ != null && internalDepth != null ? internalZ - internalDepth / 2 : 0;
  const shelvesDims = INTERIOR_FITTINGS_DIMENSIONS.shelves;
  const storageDims = INTERIOR_FITTINGS_DIMENSIONS.storage;
  const previewDims = SKETCH_BOX_DIMENSIONS.preview;
  const regularDepth =
    internalDepth != null ? Math.min(internalDepth, shelvesDims.regularDepthM) : shelvesDims.regularDepthM;
  const shelfVariant = typeof input.shelfVariant === 'string' ? String(input.shelfVariant) : '';
  const isBlocked =
    input.op === 'blocked' || input.isBlocked === true || typeof input.blockedReason === 'string';
  const isRemove = input.op === 'remove' || input.isRemove === true || isBlocked;

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

  if (x == null || internalZ == null || innerW == null || internalDepth == null) {
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
  const shelfW = Math.max(
    previewDims.shelfHoverMinWidthM,
    innerW -
      (shelfVariant === 'brace' ? previewDims.shelfBraceClearanceM : previewDims.shelfRegularClearanceM)
  );
  const shelfH =
    shelfVariant === 'glass'
      ? MATERIAL_DIMENSIONS.glassShelf.thicknessM
      : shelfVariant === 'double'
        ? Math.max(woodThick, woodThick * 2)
        : woodThick;

  for (let i = 0; i < shelfList.length; i++) {
    const mesh = shared.asPreviewMesh(shelfList[i]);
    const y0 = readPreviewNumber(shelfYs[i]);
    if (!mesh || y0 == null) {
      setVisible(mesh, false);
      continue;
    }
    setVisible(mesh, true);
    applyStyle(mesh, shelfMat, shelfLine);
    if (mesh.position && typeof mesh.position.set === 'function') mesh.position.set(x, y0, shelfZ);
    if (mesh.scale && typeof mesh.scale.set === 'function') {
      mesh.scale.set(shelfW, Math.max(previewDims.minScaleM, shelfH), shelfDepth);
    }
  }

  for (let i = 0; i < rodList.length; i++) {
    const mesh = shared.asPreviewMesh(rodList[i]);
    const y0 = readPreviewNumber(rodYs[i]);
    if (!mesh || y0 == null) {
      setVisible(mesh, false);
      continue;
    }
    setVisible(mesh, true);
    applyStyle(mesh, rodMat, rodLine);
    if (mesh.position && typeof mesh.position.set === 'function') mesh.position.set(x, y0, internalZ);
    if (mesh.scale && typeof mesh.scale.set === 'function') {
      mesh.scale.set(
        Math.max(previewDims.rodMinLengthM, innerW - previewDims.rodWidthClearanceM),
        previewDims.rodPreviewHeightM,
        previewDims.rodPreviewDepthM
      );
    }
  }

  if (storage && storageRec) {
    const y0 = readPreviewNumber(storageRec.y);
    const h0 = readPreviewPositiveNumber(storageRec.h);
    const z0 = readPreviewNumber(storageRec.z);
    if (y0 != null && h0 != null && z0 != null) {
      setVisible(storage, true);
      applyStyle(storage, storageMat, storageLine);
      if (storage.position && typeof storage.position.set === 'function') storage.position.set(x, y0, z0);
      if (storage.scale && typeof storage.scale.set === 'function') {
        storage.scale.set(
          Math.max(storageDims.barrierWidthMinM, innerW - storageDims.barrierWidthClearanceM),
          Math.max(previewDims.minScaleM, h0),
          Math.max(storageDims.previewThicknessMinM, woodThick)
        );
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
