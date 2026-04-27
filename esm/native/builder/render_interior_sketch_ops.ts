import { renderInteriorSketchBoxes } from './render_interior_sketch_boxes.js';
import { applySketchExternalDrawers, applySketchInternalDrawers } from './render_interior_sketch_drawers.js';
import {
  createMeasureWardrobeLocalBox,
  resolveSketchModuleDoorFaceSpan,
  resolveSketchModuleInnerFaces,
} from './render_interior_sketch_module_geometry.js';
import { renderSketchFreeBoxDimensionOverlays } from './render_interior_sketch_layout.js';
import {
  applySketchRods,
  applySketchShelves,
  applySketchStorageBarriers,
  createInteriorSketchPlacementSupport,
  createSketchBoxLocator,
} from './render_interior_sketch_support.js';

import type { InteriorTHREESurface } from './render_interior_ops_contracts.js';

import type {
  RenderInteriorSketchOpsDeps,
  SketchBoxExtra,
  SketchDrawerExtra,
  SketchExternalDrawerExtra,
  SketchRodExtra,
  SketchShelfExtra,
  SketchStorageBarrierExtra,
} from './render_interior_sketch_shared.js';

import {
  asDimensionLineFn,
  asRecordArray,
  asSketchInput,
  asValueRecord,
} from './render_interior_sketch_shared.js';
import { readSketchDoorVisualFactory } from './render_interior_sketch_visuals.js';

export function createBuilderRenderInteriorSketchOps(deps: RenderInteriorSketchOpsDeps) {
  const __app = deps.app;
  const __ops = deps.ops;
  const __wardrobeGroup = deps.wardrobeGroup;
  const __doors = deps.doors;
  const __markSplitHoverPickablesDirty =
    typeof deps.markSplitHoverPickablesDirty === 'function' ? deps.markSplitHoverPickablesDirty : null;
  const __isFn = deps.isFn;
  const __asObject = deps.asObject;
  const __matCache = deps.matCache;
  const __renderOpsHandleCatch = deps.renderOpsHandleCatch;
  const assertTHREE = deps.assertTHREE;
  const applyInternalDrawersOps = deps.applyInternalDrawersOps;

  const measureWardrobeLocalBox = createMeasureWardrobeLocalBox({
    wardrobeGroup: __wardrobeGroup,
    asObject: __asObject,
    assertTHREE,
  });

  function applyInteriorSketchExtras(args: unknown) {
    const App = __app(args);
    const renderOps = asValueRecord(__ops(App));
    const input = asSketchInput(args);

    const extra = input.sketchExtras || input.config?.sketchExtras;
    if (!extra || typeof extra !== 'object') return true;

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
      return true;
    }

    const createBoard = input.createBoard;
    if (!__isFn(createBoard)) return true;

    const group = input.wardrobeGroup || __wardrobeGroup(App);
    if (!group) return true;

    const effectiveBottomY = Number(input.effectiveBottomY || 0);
    const effectiveTopY = Number(input.effectiveTopY || 0);
    const spanH = effectiveTopY - effectiveBottomY;
    if (!(spanH > 0.05)) return true;

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
    const getPartMaterial = input.getPartMaterial;
    const getPartColorValue = input.getPartColorValue;
    const createDoorVisual = readSketchDoorVisualFactory(input.createDoorVisual);

    const REG_SHELF_DEPTH = 0.45;
    const regularDepth = internalDepth > 0 ? Math.min(internalDepth, REG_SHELF_DEPTH) : REG_SHELF_DEPTH;
    const backZ = internalZ - internalDepth / 2;
    const REG_SHELF_WIDTH = innerW > 0 ? Math.max(0, innerW - 0.014) : innerW;

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
    const BRACE_SIDE_GAP = 0.001;
    const braceShelfWidth = braceInnerW > 0 ? Math.max(0, braceInnerW - 2 * BRACE_SIDE_GAP) : innerW;

    let THREE = __asObject<InteriorTHREESurface>(input.THREE);
    const addDimensionLine = asDimensionLineFn(renderOps?.addDimensionLine);
    const showDimensions = !!asValueRecord(input.cfg)?.showDimensions;
    if (!THREE) {
      try {
        THREE = __asObject<InteriorTHREESurface>(
          assertTHREE(App, 'native/builder/render_ops.applyInteriorSketchExtras')
        );
      } catch {
        THREE = null;
      }
    }
    const freeBoxDimensionOverlayContext =
      showDimensions && THREE && addDimensionLine ? { THREE, addDimensionLine } : null;
    const renderFreeBoxDimensionsEnabled = !!freeBoxDimensionOverlayContext;
    const freeBoxDimensionEntries = renderFreeBoxDimensionsEnabled ? [] : null;

    const placementSupport = createInteriorSketchPlacementSupport({
      App,
      group,
      effectiveBottomY,
      effectiveTopY,
      woodThick,
      innerW,
      internalDepth,
      internalCenterX,
      matCache: __matCache,
      THREE,
      asObject: __asObject,
      renderOpsHandleCatch: __renderOpsHandleCatch,
      faces,
    });

    const boxAbs = renderInteriorSketchBoxes({
      App,
      input,
      boxes,
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
      moduleIndex,
      moduleKeyStr,
      currentShelfMat,
      bodyMat,
      getPartMaterial,
      getPartColorValue,
      createDoorVisual,
      THREE,
      addDimensionLine,
      renderFreeBoxDimensionsEnabled,
      freeBoxDimensionEntries,
      measureWardrobeLocalBox,
      clampY: placementSupport.clampY,
      glassMat: placementSupport.glassMat,
      addBraceDarkSeams: placementSupport.addBraceDarkSeams,
      addShelfPins: placementSupport.addShelfPins,
      isFn: __isFn,
      asObject: __asObject,
      ops: renderOps,
      doorsArray: __doors(App),
      markSplitHoverPickablesDirty: __markSplitHoverPickablesDirty ?? undefined,
      renderOpsHandleCatch: __renderOpsHandleCatch,
      applyInternalDrawersOps,
    });

    applySketchStorageBarriers({
      storageBarriers,
      effectiveBottomY,
      effectiveTopY,
      spanH,
      woodThick,
      innerW,
      internalCenterX,
      internalDepth,
      internalZ,
      moduleKeyStr,
      bodyMat,
      getPartMaterial,
      isFn: __isFn,
      createBoard,
    });

    if (freeBoxDimensionOverlayContext && freeBoxDimensionEntries?.length) {
      renderSketchFreeBoxDimensionOverlays({
        THREE: freeBoxDimensionOverlayContext.THREE,
        addDimensionLine: freeBoxDimensionOverlayContext.addDimensionLine,
        entries: freeBoxDimensionEntries,
      });
    }

    const findBoxAtY = createSketchBoxLocator(boxAbs);

    applySketchShelves({
      shelves,
      yFromNorm: placementSupport.yFromNorm,
      findBoxAtY,
      braceCenterX,
      braceShelfWidth,
      regularShelfWidth: REG_SHELF_WIDTH,
      internalCenterX,
      internalDepth,
      internalZ,
      regularDepth,
      backZ,
      woodThick,
      currentShelfMat,
      glassMat: placementSupport.glassMat,
      createBoard,
      THREE,
      addBraceDarkSeams: placementSupport.addBraceDarkSeams,
      addShelfPins: placementSupport.addShelfPins,
    });

    applySketchRods({
      rods,
      yFromNorm: placementSupport.yFromNorm,
      createRod: input.createRod,
      isFn: __isFn,
      THREE,
      App,
      assertTHREE,
      asObject: __asObject,
      innerW,
      internalCenterX,
      internalZ,
      group,
    });

    applySketchExternalDrawers({
      App,
      input,
      extDrawers,
      THREE,
      group,
      effectiveBottomY,
      effectiveTopY,
      spanH,
      innerW,
      moduleDepth,
      internalDepth,
      internalCenterX,
      moduleIndex,
      moduleKeyStr,
      woodThick,
      bodyMat,
      getPartMaterial,
      moduleDoorFaceSpan,
      isFn: __isFn,
      renderOpsHandleCatch: __renderOpsHandleCatch,
    });

    applySketchInternalDrawers({
      App,
      input,
      drawers,
      THREE,
      group,
      effectiveBottomY,
      effectiveTopY,
      spanH,
      woodThick,
      innerW,
      internalDepth,
      internalCenterX,
      internalZ,
      moduleIndex,
      moduleKeyStr,
      bodyMat,
      applyInternalDrawersOps,
      renderOpsHandleCatch: __renderOpsHandleCatch,
    });

    return true;
  }

  return {
    applyInteriorSketchExtras,
  };
}
