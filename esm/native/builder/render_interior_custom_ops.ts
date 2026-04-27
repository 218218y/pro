import type { RenderInteriorOpsDeps } from './render_interior_ops_contracts.js';

import {
  __isFn,
  asCustomInput,
  buildBraceShelfIndexSet,
  buildRodMap,
  buildShelfIndexSet,
  buildShelfVariantByIndex,
  readCustomThreeSurface,
  readGridDivisions,
  readModuleKeyString,
} from './render_interior_custom_ops_shared.js';
import { computeCustomModuleInnerFaces } from './render_interior_custom_ops_wall_faces.js';
import { createAddCustomGridShelf } from './render_interior_custom_ops_shelves.js';
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

    const gridDivisions = readGridDivisions(input.gridDivisions, 6);
    const effectiveBottomY = Number(input.effectiveBottomY || 0);
    const effectiveTopY = Number(input.effectiveTopY || 0);
    const localGridStep = Number(input.localGridStep || 0);
    const innerW = Number(input.innerW || 0);
    const woodThick = Number(input.woodThick || 0.018);
    const internalDepth = Number(input.internalDepth || 0);
    const internalCenterX = Number(input.internalCenterX || 0);
    const internalZ = Number(input.internalZ || 0);
    const D = Number(input.D || 0);
    const moduleIndex = typeof input.moduleIndex === 'number' ? Number(input.moduleIndex) : -1;
    const modulesLength = typeof input.modulesLength === 'number' ? Number(input.modulesLength) : -1;
    const moduleKey = readModuleKeyString(input, moduleIndex);
    const currentShelfMat = input.currentShelfMat;
    const bodyMat = input.bodyMat;
    const braceSet = buildBraceShelfIndexSet(input);

    const regularShelfDepthCap = 0.45;
    const regularDepth =
      internalDepth > 0 ? Math.min(internalDepth, regularShelfDepthCap) : regularShelfDepthCap;
    const backZ = internalZ - internalDepth / 2;
    const regularZ = backZ + regularDepth / 2;
    const regularShelfWidth = innerW > 0 ? Math.max(0, innerW - 0.014) : innerW;

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
    const braceShelfWidth = braceInnerWidth > 0 ? Math.max(0, braceInnerWidth - 0.002) : innerW;
    const leftInnerX = moduleFaces ? moduleFaces.leftX : internalCenterX - innerW / 2;
    const rightInnerX = moduleFaces ? moduleFaces.rightX : internalCenterX + innerW / 2;
    const isInternalDrawersEnabled = !!input.isInternalDrawersEnabled;
    const activeSlots = Array.isArray(input.intDrawersList) ? input.intDrawersList : [];

    const addGridShelf = createAddCustomGridShelf({
      threeSurface,
      matCache: __matCache(App),
      group,
      createBoard,
      addFoldedClothes: input.addFoldedClothes,
      currentShelfMat,
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
      localGridStep,
      internalCenterX,
      innerW,
      woodThick,
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
      shelfSet: buildShelfIndexSet(ops),
      shelfVariantByIndex: buildShelfVariantByIndex(ops),
      addGridShelf,
      checkAndCreateInternalDrawer: input.checkAndCreateInternalDrawer,
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
