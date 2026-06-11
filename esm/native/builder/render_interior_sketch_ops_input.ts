import {
  resolveSketchModuleDoorFaceSpan,
  resolveSketchModuleInnerFaces,
} from './render_interior_sketch_module_geometry.js';
import {
  asRecordArray,
  asSketchInput,
  asValueRecord,
  type SketchBoxExtra,
  type SketchDrawerExtra,
  type SketchExternalDrawerExtra,
  type SketchRodExtra,
  type SketchShelfExtra,
  type SketchStorageBarrierExtra,
} from './render_interior_sketch_shared.js';
import { readSketchDoorVisualFactory } from './render_interior_sketch_visuals.js';

import type {
  InteriorSketchExtrasInput,
  RenderInteriorSketchOpsContext,
} from './render_interior_sketch_ops_types.js';

const REGULAR_SHELF_DEPTH = 0.45;
const BRACE_SIDE_GAP = 0.001;

export function resolveInteriorSketchExtrasInput(
  owner: RenderInteriorSketchOpsContext,
  args: unknown
): InteriorSketchExtrasInput | null {
  const App = owner.app(args);
  const renderOps = asValueRecord(owner.ops(App));
  const input = asSketchInput(args);

  const extra = input.sketchExtras || input.config?.sketchExtras;
  if (!extra || typeof extra !== 'object') return null;

  const shelves = asRecordArray<SketchShelfExtra>(extra.shelves);
  const boxes = asRecordArray<SketchBoxExtra>(extra.boxes);
  const storageBarriers = asRecordArray<SketchStorageBarrierExtra>(extra.storageBarriers);
  const rods = asRecordArray<SketchRodExtra>(extra.rods);
  const drawers = asRecordArray<SketchDrawerExtra>(extra.drawers);
  const extDrawers = asRecordArray<SketchExternalDrawerExtra>(extra.extDrawers);
  if (
    !shelves.length &&
    !boxes.length &&
    !storageBarriers.length &&
    !rods.length &&
    !drawers.length &&
    !extDrawers.length
  ) {
    return null;
  }

  const createBoard = input.createBoard;
  if (!owner.isFn(createBoard)) return null;

  const group = input.wardrobeGroup || owner.wardrobeGroup(App);
  if (!group) return null;

  const effectiveBottomY = Number(input.effectiveBottomY || 0);
  const effectiveTopY = Number(input.effectiveTopY || 0);
  const spanH = effectiveTopY - effectiveBottomY;
  if (!(spanH > 0.05)) return null;

  const innerW = Number(input.innerW || 0);
  const woodThick = Number(input.woodThick || 0.018);
  const internalDepth = Number(input.internalDepth || 0);
  const internalCenterX = Number(input.internalCenterX || 0);
  const internalZ = Number(input.internalZ || 0);
  const moduleDepth = Number(input.D || 0);
  const moduleIndex = typeof input.moduleIndex === 'number' ? Number(input.moduleIndex) : -1;
  const modulesLength = typeof input.modulesLength === 'number' ? Number(input.modulesLength) : -1;
  const moduleKeyStr =
    input.moduleKey != null ? String(input.moduleKey) : moduleIndex >= 0 ? String(moduleIndex) : '';

  const currentShelfMat = input.currentShelfMat;
  const bodyMat = input.bodyMat || currentShelfMat;
  const getPartMaterial = owner.isFn(input.getPartMaterial) ? input.getPartMaterial : undefined;
  const getPartColorValue = owner.isFn(input.getPartColorValue) ? input.getPartColorValue : undefined;
  const createDoorVisual = readSketchDoorVisualFactory(input.createDoorVisual);

  const regularDepth = internalDepth > 0 ? Math.min(internalDepth, REGULAR_SHELF_DEPTH) : REGULAR_SHELF_DEPTH;
  const backZ = internalZ - internalDepth / 2;
  const regularShelfWidth = innerW > 0 ? Math.max(0, innerW - 0.014) : innerW;

  const faces = resolveSketchModuleInnerFaces({
    group,
    input,
    moduleIndex,
    moduleKeyStr,
    modulesLength,
    innerW,
    internalCenterX,
    woodThick,
  });
  const moduleDoorFaceSpan = resolveSketchModuleDoorFaceSpan({
    group,
    input,
    moduleIndex,
    moduleKeyStr,
    modulesLength,
    innerW,
    internalCenterX,
    woodThick,
  });
  const braceInnerW = faces ? Math.max(0, faces.rightX - faces.leftX) : innerW;
  const braceCenterX = faces ? (faces.leftX + faces.rightX) / 2 : internalCenterX;
  const braceShelfWidth = braceInnerW > 0 ? Math.max(0, braceInnerW - 2 * BRACE_SIDE_GAP) : innerW;

  return {
    App,
    renderOps,
    input,
    shelves,
    boxes,
    storageBarriers,
    rods,
    drawers,
    extDrawers,
    createBoard,
    group,
    effectiveBottomY,
    effectiveTopY,
    spanH,
    innerW,
    woodThick,
    internalDepth,
    internalCenterX,
    internalZ,
    moduleDepth,
    moduleIndex,
    modulesLength,
    moduleKeyStr,
    currentShelfMat,
    bodyMat,
    getPartMaterial,
    getPartColorValue,
    createDoorVisual,
    faces,
    moduleDoorFaceSpan,
    braceCenterX,
    braceShelfWidth,
    regularShelfWidth,
    regularDepth,
    backZ,
  };
}
