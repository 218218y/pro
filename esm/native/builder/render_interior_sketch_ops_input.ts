import {
  INTERIOR_FITTINGS_DIMENSIONS,
  MATERIAL_DIMENSIONS,
} from '../../shared/wardrobe_dimension_tokens_shared.js';
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
import {
  getRoundedShelfSideForRemovedFrameSide,
  shouldForceBraceShelvesForRemovedFrameSide,
} from './removed_frame_side_brace_shelves.js';
import {
  requireInteriorSketchBooleanFlag,
  requireInteriorSketchConfigSnapshot,
  requireInteriorSketchDoorStyle,
} from './render_interior_sketch_input_contract.js';
import {
  normalizeInteriorSketchRuntimeGeometryArgs,
  readBuilderRuntimeGeometryNumber,
} from './render_interior_sketch_geometry_normalizer.js';

import type {
  InteriorSketchExtrasInput,
  RenderInteriorSketchOpsContext,
} from './render_interior_sketch_ops_types.js';

const REGULAR_SHELF_DEPTH = INTERIOR_FITTINGS_DIMENSIONS.shelves.regularDepthM;
const BRACE_WIDTH_CLEARANCE = INTERIOR_FITTINGS_DIMENSIONS.shelves.braceWidthClearanceM;

function resolveInternalDrawersEnabled(input: ReturnType<typeof asSketchInput>): boolean {
  if (!input) throw new TypeError('[render_interior_sketch] input is required');
  return requireInteriorSketchBooleanFlag(
    input.isInternalDrawersEnabled,
    'isInternalDrawersEnabled',
    'render_interior_sketch'
  );
}

export function resolveInteriorSketchExtrasInput(
  owner: RenderInteriorSketchOpsContext,
  args: unknown
): InteriorSketchExtrasInput | null {
  const App = owner.app(args);
  const renderOps = asValueRecord(owner.ops(App));
  const rawInput = asSketchInput(args);
  if (!rawInput) throw new TypeError('[render_interior_sketch] input is required');
  const input = normalizeInteriorSketchRuntimeGeometryArgs(rawInput);

  const extra = input.sketchExtras;
  if (!extra || typeof extra !== 'object') return null;
  const cfgSnapshot = requireInteriorSketchConfigSnapshot(input.cfgSnapshot, 'render_interior_sketch');
  requireInteriorSketchDoorStyle(input.doorStyle, 'render_interior_sketch');
  requireInteriorSketchBooleanFlag(input.isGroovesEnabled, 'isGroovesEnabled', 'render_interior_sketch');

  const shelves = asRecordArray<SketchShelfExtra>(extra.shelves);
  const boxes = asRecordArray<SketchBoxExtra>(extra.boxes);
  const storageBarriers = asRecordArray<SketchStorageBarrierExtra>(extra.storageBarriers);
  const rods = asRecordArray<SketchRodExtra>(extra.rods);
  const internalDrawersEnabled = resolveInternalDrawersEnabled(input);
  const drawers = internalDrawersEnabled ? asRecordArray<SketchDrawerExtra>(extra.drawers) : [];
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

  const effectiveBottomY = readBuilderRuntimeGeometryNumber(input.effectiveBottomY, 0);
  const effectiveTopY = readBuilderRuntimeGeometryNumber(input.effectiveTopY, 0);
  const spanH = effectiveTopY - effectiveBottomY;
  if (!(spanH > INTERIOR_FITTINGS_DIMENSIONS.shelves.spanMinHeightM)) return null;

  const innerW = readBuilderRuntimeGeometryNumber(input.innerW, 0);
  const woodThick = readBuilderRuntimeGeometryNumber(input.woodThick, MATERIAL_DIMENSIONS.wood.thicknessM);
  const shelfThick = readBuilderRuntimeGeometryNumber(input.shelfThick, woodThick);
  const internalDepth = readBuilderRuntimeGeometryNumber(input.internalDepth, 0);
  const internalCenterX = readBuilderRuntimeGeometryNumber(input.internalCenterX, 0);
  const internalZ = readBuilderRuntimeGeometryNumber(input.internalZ, 0);
  const moduleDepth = readBuilderRuntimeGeometryNumber(input.D, 0);
  const moduleIndex = readBuilderRuntimeGeometryNumber(input.moduleIndex, -1);
  const modulesLength = readBuilderRuntimeGeometryNumber(input.modulesLength, -1);
  const moduleKeyStr =
    input.moduleKey != null ? String(input.moduleKey) : moduleIndex >= 0 ? String(moduleIndex) : '';

  const currentShelfMat = input.currentShelfMat;
  const currentBraceShelfMat = input.currentBraceShelfMat || currentShelfMat;
  const bodyMat = input.bodyMat || currentShelfMat;
  const getPartMaterial = owner.isFn(input.getPartMaterial) ? input.getPartMaterial : undefined;
  const getPartColorValue = owner.isFn(input.getPartColorValue) ? input.getPartColorValue : undefined;
  const createDoorVisual = readSketchDoorVisualFactory(input.createDoorVisual);

  const regularDepth = internalDepth > 0 ? Math.min(internalDepth, REGULAR_SHELF_DEPTH) : REGULAR_SHELF_DEPTH;
  const backZ = internalZ - internalDepth / 2;
  const regularShelfWidth =
    innerW > 0 ? Math.max(0, innerW - INTERIOR_FITTINGS_DIMENSIONS.shelves.regularWidthClearanceM) : innerW;

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
  const braceShelfWidth = braceInnerW > 0 ? Math.max(0, braceInnerW - BRACE_WIDTH_CLEARANCE) : innerW;
  const forceBraceShelves = shouldForceBraceShelvesForRemovedFrameSide({
    cfg: cfgSnapshot,
    moduleIndex,
    modulesLength,
    frameSidePartIdPrefix: input.frameSidePartIdPrefix,
  });
  const roundedShelfSide = getRoundedShelfSideForRemovedFrameSide({
    cfg: cfgSnapshot,
    moduleIndex,
    modulesLength,
    frameSidePartIdPrefix: input.frameSidePartIdPrefix,
  });

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
    internalDrawersEnabled,
    createBoard,
    group,
    effectiveBottomY,
    effectiveTopY,
    spanH,
    innerW,
    woodThick,
    shelfThick,
    internalDepth,
    internalCenterX,
    internalZ,
    moduleDepth,
    moduleIndex,
    modulesLength,
    moduleKeyStr,
    currentShelfMat,
    currentBraceShelfMat,
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
    forceBraceShelves,
    roundedShelfSide,
  };
}
