import { readPreviewNumber, readPreviewPositiveNumber } from './render_preview_number_contracts.js';
import type { PreviewMeshLike } from './render_preview_ops_contracts.js';
import type { SketchPlacementPreviewContext } from './render_preview_sketch_pipeline_shared.js';

function readCellLayoutMeshes(ctx: SketchPlacementPreviewContext): PreviewMeshLike[] {
  return ctx.shared.readPreviewObjectList(ctx.ud.__cellLayoutMeshes);
}

function hideMesh(ctx: SketchPlacementPreviewContext, mesh: PreviewMeshLike | null): void {
  if (!mesh) return;
  ctx.setVisible(mesh, false);
}

export function hideCellLayoutSketchPlacementPreviewMeshes(ctx: SketchPlacementPreviewContext): void {
  for (const mesh of readCellLayoutMeshes(ctx)) hideMesh(ctx, mesh);
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

export function applyCellLayoutSketchPlacementPreview(ctx: SketchPlacementPreviewContext): boolean {
  if (ctx.kind !== 'cell_layout') return false;

  const rawBoxes = Array.isArray(ctx.input.cellLayoutBoxes) ? ctx.input.cellLayoutBoxes : [];
  if (rawBoxes.length < 2) {
    ctx.g.visible = false;
    ctx.hideAll();
    hideCellLayoutSketchPlacementPreviewMeshes(ctx);
    return true;
  }

  const meshes = ensureCellLayoutMeshes(ctx, rawBoxes.length);
  if (meshes.length < rawBoxes.length) {
    ctx.g.visible = false;
    ctx.hideAll();
    hideCellLayoutSketchPlacementPreviewMeshes(ctx);
    return true;
  }

  ctx.g.visible = true;
  ctx.hideAll();
  const boundaryLine = ctx.ud.__lineCellLayoutBoundaryOverlay || ctx.ud.__lineBoxOverlay || ctx.ud.__lineBox;
  const selectedMaterial = ctx.isRemove
    ? ctx.ud.__matRemoveOverlay || ctx.ud.__matRemove
    : ctx.ud.__matBoxOverlay || ctx.ud.__matBox;
  const peerMaterial = ctx.ud.__matCellLayoutPeerOverlay || ctx.ud.__matShelf || ctx.ud.__matBox;

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
  }

  return true;
}
