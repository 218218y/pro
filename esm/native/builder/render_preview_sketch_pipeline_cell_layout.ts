import { readPreviewNumber, readPreviewPositiveNumber } from './render_preview_number_contracts.js';
import type {
  PreviewGroupLike,
  PreviewMeshLike,
  PreviewObject3DLike,
} from './render_preview_ops_contracts.js';
import type { RenderPreviewSketchShared } from './render_preview_sketch_shared.js';
import type { SketchPlacementPreviewContext } from './render_preview_sketch_pipeline_shared.js';

type VisibilitySnapshotEntry = {
  object: PreviewObject3DLike;
  visible: boolean;
};

type CellLayoutIsolationSnapshot = {
  root: PreviewGroupLike;
  entries: VisibilitySnapshotEntry[];
};

const CELL_LAYOUT_DOOR_DIVIDER_VISUAL = Object.freeze({
  widthM: 0.008,
  depthM: 0.004,
  frontOffsetM: 0.0015,
});

function readCellLayoutMeshes(ctx: SketchPlacementPreviewContext): PreviewMeshLike[] {
  return ctx.shared.readPreviewObjectList(ctx.ud.__cellLayoutMeshes);
}

function readCellLayoutDoorDividerMeshes(ctx: SketchPlacementPreviewContext): PreviewMeshLike[] {
  return ctx.shared.readPreviewObjectList(ctx.ud.__cellLayoutDoorDividerMeshes);
}

function hideMesh(ctx: SketchPlacementPreviewContext, mesh: PreviewMeshLike | null): void {
  if (!mesh) return;
  ctx.setVisible(mesh, false);
}

export function hideCellLayoutSketchPlacementPreviewMeshes(ctx: SketchPlacementPreviewContext): void {
  for (const mesh of readCellLayoutMeshes(ctx)) hideMesh(ctx, mesh);
  for (const mesh of readCellLayoutDoorDividerMeshes(ctx)) hideMesh(ctx, mesh);
}

function readIsolationSnapshot(
  group: PreviewGroupLike,
  shared: RenderPreviewSketchShared
): CellLayoutIsolationSnapshot | null {
  const ud = shared.readUserData(group.userData);
  const snapshot = ud.__cellLayoutIsolation as CellLayoutIsolationSnapshot | undefined;
  if (!snapshot || !snapshot.root || !Array.isArray(snapshot.entries)) return null;
  return snapshot;
}

export function restoreCellLayoutWardrobeVisibility(
  group: PreviewGroupLike,
  shared: RenderPreviewSketchShared
): void {
  const ud = shared.readUserData(group.userData);
  const snapshot = readIsolationSnapshot(group, shared);
  if (snapshot) {
    for (const entry of snapshot.entries) {
      if (!entry?.object || typeof entry.object !== 'object') continue;
      entry.object.visible = entry.visible;
    }
  }
  try {
    delete ud.__cellLayoutIsolation;
  } catch {
    ud.__cellLayoutIsolation = undefined;
  }
}

function readGroupChildren(group: PreviewGroupLike): PreviewObject3DLike[] {
  const children = group.children;
  if (!Array.isArray(children)) return [];
  return children.filter(
    (child): child is PreviewObject3DLike => !!child && typeof child === 'object' && !Array.isArray(child)
  );
}

function resolveCellLayoutIsolationRoot(ctx: SketchPlacementPreviewContext): PreviewGroupLike | null {
  const attachedParent = ctx.asPreviewGroup(ctx.g.parent);
  if (attachedParent && readGroupChildren(attachedParent).includes(ctx.g)) return attachedParent;

  const anchorParent = ctx.asPreviewGroup(ctx.input.anchorParent);
  if (anchorParent && readGroupChildren(anchorParent).includes(ctx.g)) return anchorParent;

  return ctx.asPreviewGroup(ctx.wardrobeGroup(ctx.App));
}

function isolateWardrobeForCellLayout(ctx: SketchPlacementPreviewContext): void {
  if (ctx.input.isolateWardrobe !== true) {
    restoreCellLayoutWardrobeVisibility(ctx.g, ctx.shared);
    return;
  }

  // RenderOps exposes wardrobeGroup through an add-only adapter. The preview group,
  // however, has already been attached to the real THREE.Group before this stage.
  // Resolve that concrete parent first so isolation can actually enumerate and hide
  // the wardrobe's children (doors, handles, outlines, hover markers, etc.).
  const root = resolveCellLayoutIsolationRoot(ctx);
  if (!root) return;

  let snapshot = readIsolationSnapshot(ctx.g, ctx.shared);
  if (snapshot && snapshot.root !== root) {
    restoreCellLayoutWardrobeVisibility(ctx.g, ctx.shared);
    snapshot = null;
  }
  if (!snapshot) snapshot = { root, entries: [] };

  for (const child of readGroupChildren(root)) {
    if (child === ctx.g) continue;
    if (!snapshot.entries.some(entry => entry.object === child)) {
      snapshot.entries.push({ object: child, visible: child.visible !== false });
    }
    child.visible = false;
  }

  ctx.ud.__cellLayoutIsolation = snapshot;
}

function createCellLayoutMesh(ctx: SketchPlacementPreviewContext): PreviewMeshLike | null {
  const source = ctx.shelfA;
  const sourceOutline = ctx.readOutline(source);
  if (!source?.geometry || !sourceOutline?.geometry) return null;

  const material = ctx.ud.__matCellLayoutPeerOverlay || ctx.ud.__matBoxOverlay || ctx.ud.__matBox;
  const lineMaterial = ctx.ud.__lineCellLayoutBoundaryOverlay || ctx.ud.__lineBoxOverlay || ctx.ud.__lineBox;
  if (!material || !lineMaterial) return null;

  const mesh = new ctx.THREE.Mesh(source.geometry, material);
  mesh.visible = false;
  mesh.renderOrder = 10020;
  ctx.shared.markIgnoreRaycast(mesh);
  mesh.raycast = function () {};
  mesh.castShadow = false;
  mesh.receiveShadow = false;

  const outline = new ctx.THREE.LineSegments(sourceOutline.geometry, lineMaterial);
  outline.visible = false;
  outline.renderOrder = 10021;
  ctx.shared.markIgnoreRaycast(outline);
  outline.raycast = function () {};
  mesh.add(outline);
  mesh.userData = mesh.userData || {};
  mesh.userData.__outline = outline;
  ctx.g.add(mesh);
  return mesh;
}

function createCellLayoutDoorDividerMesh(ctx: SketchPlacementPreviewContext): PreviewMeshLike | null {
  const source = ctx.shelfA;
  const material = ctx.ud.__matCellLayoutDoorDividerOverlay;
  if (!source?.geometry || !material) return null;

  const mesh = new ctx.THREE.Mesh(source.geometry, material);
  mesh.visible = false;
  mesh.renderOrder = 10028;
  ctx.shared.markIgnoreRaycast(mesh);
  mesh.raycast = function () {};
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  ctx.g.add(mesh);
  return mesh;
}

function ensureCellLayoutMeshes(ctx: SketchPlacementPreviewContext, count: number): PreviewMeshLike[] {
  const meshes = readCellLayoutMeshes(ctx);
  while (meshes.length < count) {
    const mesh = createCellLayoutMesh(ctx);
    if (!mesh) break;
    meshes.push(mesh);
  }
  ctx.ud.__cellLayoutMeshes = meshes;
  return meshes;
}

function ensureCellLayoutDoorDividerMeshes(
  ctx: SketchPlacementPreviewContext,
  count: number
): PreviewMeshLike[] {
  const meshes = readCellLayoutDoorDividerMeshes(ctx);
  while (meshes.length < count) {
    const mesh = createCellLayoutDoorDividerMesh(ctx);
    if (!mesh) break;
    meshes.push(mesh);
  }
  ctx.ud.__cellLayoutDoorDividerMeshes = meshes;
  return meshes;
}

function countRequiredDoorDividers(ctx: SketchPlacementPreviewContext, rawBoxes: unknown[]): number {
  let total = 0;
  for (const rawBox of rawBoxes) {
    const rec = ctx.readValueRecord(rawBox);
    const doorCount = rec ? readPreviewPositiveNumber(rec.doorCount) : null;
    if (doorCount == null || !Number.isInteger(doorCount)) continue;
    total += Math.max(0, doorCount - 1);
  }
  return total;
}

export function applyCellLayoutSketchPlacementPreview(ctx: SketchPlacementPreviewContext): boolean {
  if (ctx.kind !== 'cell_layout') return false;

  const rawBoxes = Array.isArray(ctx.input.cellLayoutBoxes) ? ctx.input.cellLayoutBoxes : [];
  if (rawBoxes.length < 2) {
    restoreCellLayoutWardrobeVisibility(ctx.g, ctx.shared);
    ctx.g.visible = false;
    ctx.hideAll();
    hideCellLayoutSketchPlacementPreviewMeshes(ctx);
    return true;
  }

  const meshes = ensureCellLayoutMeshes(ctx, rawBoxes.length);
  const requiredDoorDividers = countRequiredDoorDividers(ctx, rawBoxes);
  const doorDividerMeshes = ensureCellLayoutDoorDividerMeshes(ctx, requiredDoorDividers);
  if (meshes.length < rawBoxes.length || doorDividerMeshes.length < requiredDoorDividers) {
    restoreCellLayoutWardrobeVisibility(ctx.g, ctx.shared);
    ctx.g.visible = false;
    ctx.hideAll();
    hideCellLayoutSketchPlacementPreviewMeshes(ctx);
    return true;
  }

  isolateWardrobeForCellLayout(ctx);
  ctx.g.visible = true;
  ctx.hideAll();
  for (const divider of doorDividerMeshes) hideMesh(ctx, divider);

  const boundaryLine = ctx.ud.__lineCellLayoutBoundaryOverlay || ctx.ud.__lineBoxOverlay || ctx.ud.__lineBox;
  const selectedMaterial = ctx.isRemove
    ? ctx.ud.__matRemoveOverlay || ctx.ud.__matRemove
    : ctx.ud.__matCellLayoutSelectedOverlay || ctx.ud.__matBoxOverlay || ctx.ud.__matBox;
  const peerMaterial = ctx.ud.__matCellLayoutPeerOverlay || ctx.ud.__matShelf || ctx.ud.__matBox;
  const doorDividerMaterial = ctx.ud.__matCellLayoutDoorDividerOverlay;
  let nextDoorDividerIndex = 0;

  for (let i = 0; i < meshes.length; i += 1) {
    const mesh = meshes[i] ?? null;
    if (!mesh) continue;
    const rec = i < rawBoxes.length ? ctx.readValueRecord(rawBoxes[i]) : null;
    if (!rec) {
      hideMesh(ctx, mesh);
      continue;
    }
    const x = readPreviewNumber(rec.x);
    const y = readPreviewNumber(rec.y);
    const z = readPreviewNumber(rec.z);
    const w = readPreviewPositiveNumber(rec.w);
    const boxH = readPreviewPositiveNumber(rec.boxH);
    const d = readPreviewPositiveNumber(rec.d);
    const doorCountValue = readPreviewPositiveNumber(rec.doorCount);
    const doorCount = doorCountValue != null && Number.isInteger(doorCountValue) ? doorCountValue : 1;
    if (x == null || y == null || z == null || w == null || boxH == null || d == null) {
      hideMesh(ctx, mesh);
      continue;
    }

    const selected = rec.selected === true;
    ctx.setVisible(mesh, true);
    ctx.resetMeshOrientation(mesh);
    ctx.applyPreviewStyle(
      mesh,
      selected ? selectedMaterial : peerMaterial,
      boundaryLine,
      selected ? 10024 : 10020,
      selected ? 10025 : 10021
    );
    mesh.position?.set?.(x, y, z);
    mesh.scale?.set?.(w, boxH, d);

    for (let dividerIndex = 1; dividerIndex < doorCount; dividerIndex += 1) {
      const divider = doorDividerMeshes[nextDoorDividerIndex++] ?? null;
      if (!divider) continue;
      const dividerX = x - w / 2 + (w * dividerIndex) / doorCount;
      const dividerZ =
        z + d / 2 + CELL_LAYOUT_DOOR_DIVIDER_VISUAL.frontOffsetM + CELL_LAYOUT_DOOR_DIVIDER_VISUAL.depthM / 2;
      ctx.setVisible(divider, true);
      ctx.resetMeshOrientation(divider);
      ctx.applyPreviewStyle(divider, doorDividerMaterial, null, selected ? 10030 : 10028);
      divider.position?.set?.(dividerX, y, dividerZ);
      divider.scale?.set?.(
        CELL_LAYOUT_DOOR_DIVIDER_VISUAL.widthM,
        boxH,
        CELL_LAYOUT_DOOR_DIVIDER_VISUAL.depthM
      );
    }
  }

  for (let i = nextDoorDividerIndex; i < doorDividerMeshes.length; i += 1) {
    hideMesh(ctx, doorDividerMeshes[i] ?? null);
  }

  return true;
}
