import {
  INTERIOR_FITTINGS_DIMENSIONS,
  MATERIAL_DIMENSIONS,
} from '../../shared/wardrobe_dimension_tokens_shared.js';
import type { RenderInteriorOpsDeps } from './render_interior_ops_contracts.js';

import {
  __isFn,
  asCustomInput,
  buildBraceShelfIndexSet,
  buildRodMap,
  buildShelfIndexSet,
  buildShelfVariantByIndex,
  readCustomRenderInteger,
  readCustomRenderNumber,
  readCustomThreeSurface,
  readGridDivisions,
  readModuleKeyString,
} from './render_interior_custom_ops_shared.js';
import { computeCustomModuleInnerFaces } from './render_interior_custom_ops_wall_faces.js';
import {
  forceShelfIndexesToBrace,
  getRoundedShelfSideForRemovedFrameSide,
  shouldForceBraceShelvesForRemovedFrameSide,
} from './removed_frame_side_brace_shelves.js';
import {
  addCustomBaseShelfContents,
  createAddCustomGridShelf,
} from './render_interior_custom_ops_shelves.js';
import {
  applyCustomInteriorGridLayout,
  applyCustomStorageBarrier,
} from './render_interior_custom_ops_layout.js';

export function createBuilderRenderInteriorCustomOps(deps: RenderInteriorOpsDeps) {
  const __app = deps.app;
  const __ops = deps.ops;
  const __wardrobeGroup = deps.wardrobeGroup;
  const __three = deps.three;
  const __matCache = deps.matCache;
  const __renderOpsHandleCatch = deps.renderOpsHandleCatch;
  const assertTHREE = deps.assertTHREE;

  function applyInteriorCustomOps(args: unknown) {
    const App = __app(args);
    __ops(App);
    const input = asCustomInput(args);

    let THREE = input.THREE;
    if (!THREE) {
      try {
        THREE = assertTHREE(App, 'native/builder/render_ops.applyInteriorCustomOps');
      } catch (err) {
        __renderOpsHandleCatch(App, 'applyInteriorCustomOps.assertTHREE', err, undefined, {
          failFast: false,
          throttleMs: 5000,
        });
      }
    }

    const ops = input.customOps || input.ops || null;
    if (!ops || typeof ops !== 'object') return false;

    const createBoard = input.createBoard;
    const createRod = input.createRod;
    if (!__isFn(createBoard) || !__isFn(createRod)) return false;

    const group = input.wardrobeGroup || __wardrobeGroup(App);
    if (!group) return false;

    const gridDivisions = readGridDivisions(
      input.gridDivisions,
      INTERIOR_FITTINGS_DIMENSIONS.storage.gridDivisionsDefault
    );
    const effectiveBottomY = readCustomRenderNumber(input.effectiveBottomY, 0);
    const effectiveTopY = readCustomRenderNumber(input.effectiveTopY, 0);
    const localGridStep = readCustomRenderNumber(input.localGridStep, 0);
    const innerW = readCustomRenderNumber(input.innerW, 0);
    const woodThick = readCustomRenderNumber(input.woodThick, MATERIAL_DIMENSIONS.wood.thicknessM);
    const shelfThick = readCustomRenderNumber(input.shelfThick, woodThick);
    const internalDepth = readCustomRenderNumber(input.internalDepth, 0);
    const internalCenterX = readCustomRenderNumber(input.internalCenterX, 0);
    const internalZ = readCustomRenderNumber(input.internalZ, 0);
    const D = readCustomRenderNumber(input.D, 0);
    const moduleIndex = readCustomRenderInteger(input.moduleIndex, -1);
    const modulesLength = readCustomRenderInteger(input.modulesLength, -1);
    const moduleKey = readModuleKeyString(input, moduleIndex);
    const currentShelfMat = input.currentShelfMat;
    const currentBraceShelfMat = input.currentBraceShelfMat || currentShelfMat;
    const bodyMat = input.bodyMat;
    const braceSet = buildBraceShelfIndexSet(input);
    const shelfSet = buildShelfIndexSet(ops);
    const shelfVariantByIndex = buildShelfVariantByIndex(ops);
    if (
      shouldForceBraceShelvesForRemovedFrameSide({
        cfg: input.cfg,
        moduleIndex,
        modulesLength,
        frameSidePartIdPrefix: input.frameSidePartIdPrefix,
      })
    ) {
      forceShelfIndexesToBrace({ braceSet, shelfSet, shelfVariantByIndex, gridDivisions });
    }
    const roundedShelfSide = getRoundedShelfSideForRemovedFrameSide({
      cfg: input.cfg,
      moduleIndex,
      modulesLength,
      frameSidePartIdPrefix: input.frameSidePartIdPrefix,
    });

    const regularShelfDepthCap = INTERIOR_FITTINGS_DIMENSIONS.shelves.regularDepthM;
    const regularDepth =
      internalDepth > 0 ? Math.min(internalDepth, regularShelfDepthCap) : regularShelfDepthCap;
    const backZ = internalZ - internalDepth / 2;
    const regularZ = backZ + regularDepth / 2;
    const regularShelfWidth =
      innerW > 0 ? Math.max(0, innerW - INTERIOR_FITTINGS_DIMENSIONS.shelves.regularWidthClearanceM) : innerW;

    const threeSurface = readCustomThreeSurface(__three(THREE));
    const moduleFaces = computeCustomModuleInnerFaces({
      App,
      group,
      woodThick,
      moduleIndex,
      modulesLength,
      renderOpsHandleCatch: __renderOpsHandleCatch,
    });
    const braceInnerWidth = moduleFaces ? Math.max(0, moduleFaces.rightX - moduleFaces.leftX) : innerW;
    const braceCenterX = moduleFaces ? (moduleFaces.leftX + moduleFaces.rightX) / 2 : internalCenterX;
    const braceShelfWidth =
      braceInnerWidth > 0
        ? Math.max(0, braceInnerWidth - INTERIOR_FITTINGS_DIMENSIONS.shelves.braceWidthClearanceM)
        : innerW;
    const leftInnerX = moduleFaces ? moduleFaces.leftX : internalCenterX - innerW / 2;
    const rightInnerX = moduleFaces ? moduleFaces.rightX : internalCenterX + innerW / 2;
    const isInternalDrawersEnabled = false;
    const activeSlots: unknown[] = [];

    const addGridShelf = createAddCustomGridShelf({
      threeSurface,
      matCache: __matCache(App),
      group,
      createBoard,
      addFoldedClothes: input.addFoldedClothes,
      contentsPolicy: {
        showContentsEnabled: input.showContentsEnabled === true,
        sketchMode: input.sketchMode === true,
        addOutlines: __isFn(input.addOutlines) ? input.addOutlines : null,
        cfgSnapshot: input.cfg,
      },
      currentShelfMat,
      currentBraceShelfMat,
      moduleKey,
      getPartMaterial: input.getPartMaterial,
      getPartColorValue: input.getPartColorValue,
      braceSet,
      braceMetrics: {
        regularDepth,
        regularZ,
        regularShelfWidth,
        braceShelfWidth,
        braceCenterX,
        leftInnerX,
        rightInnerX,
      },
      effectiveBottomY,
      effectiveTopY,
      localGridStep,
      gridDivisions,
      shelfSet,
      shelfVariantByIndex,
      internalCenterX,
      innerW,
      woodThick,
      shelfThick,
      internalDepth,
      internalZ,
      isInternalDrawersEnabled,
      activeSlots,
      roundedShelfSide,
    });

    addCustomBaseShelfContents({
      group,
      addFoldedClothes: input.addFoldedClothes,
      contentsPolicy: {
        showContentsEnabled: input.showContentsEnabled === true,
        sketchMode: input.sketchMode === true,
        addOutlines: __isFn(input.addOutlines) ? input.addOutlines : null,
        cfgSnapshot: input.cfg,
      },
      braceSet,
      shelfSet,
      shelfVariantByIndex,
      braceMetrics: {
        regularDepth,
        regularZ,
        regularShelfWidth,
        braceShelfWidth,
        braceCenterX,
        leftInnerX,
        rightInnerX,
      },
      effectiveBottomY,
      localGridStep,
      internalCenterX,
      innerW,
      woodThick,
      shelfThick,
      internalDepth,
      internalZ,
      isInternalDrawersEnabled,
      activeSlots,
    });

    applyCustomInteriorGridLayout({
      gridDivisions,
      effectiveBottomY,
      effectiveTopY,
      localGridStep,
      shelfSet,
      shelfVariantByIndex,
      addGridShelf,
      createRod,
      rodMap: buildRodMap(ops),
    });

    applyCustomStorageBarrier({
      input,
      ops,
      createBoard,
      bodyMat,
      moduleKey,
      innerW,
      woodThick,
      internalCenterX,
      effectiveBottomY,
      D,
    });

    return true;
  }

  return {
    applyInteriorCustomOps,
  };
}
