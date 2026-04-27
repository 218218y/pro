import type { RenderInteriorOpsDeps } from './render_interior_ops_contracts.js';

import {
  __isFn,
  asPresetInput,
  asRecord,
  buildBraceShelfIndexSet,
  readModuleKeyString,
  readThreeSurface,
} from './render_interior_preset_ops_shared.js';
import { computePresetModuleInnerFaces } from './render_interior_preset_ops_wall_faces.js';
import { createAddGridShelf } from './render_interior_preset_ops_shelves.js';

export function createBuilderRenderInteriorPresetOps(deps: RenderInteriorOpsDeps) {
  const __app = deps.app;
  const __ops = deps.ops;
  const __wardrobeGroup = deps.wardrobeGroup;
  const __three = deps.three;
  const __renderOpsHandleCatch = deps.renderOpsHandleCatch;
  const assertTHREE = deps.assertTHREE;

  function applyInteriorPresetOps(args: unknown) {
    const App = __app(args);
    __ops(App);
    const input = asPresetInput(args);

    let THREE = input.THREE;
    if (!THREE) {
      try {
        THREE = assertTHREE(App, 'native/builder/render_ops.applyInteriorPresetOps');
      } catch (err) {
        __renderOpsHandleCatch(App, 'applyInteriorPresetOps.assertTHREE', err, undefined, {
          failFast: false,
          throttleMs: 5000,
        });
      }
    }

    const ops = input.presetOps || null;
    if (!ops || typeof ops !== 'object') return false;

    const createBoard = input.createBoard;
    const createRod = input.createRod;
    const addFoldedClothes = input.addFoldedClothes;
    if (!__isFn(createBoard) || !__isFn(createRod)) return false;

    const group = input.wardrobeGroup || __wardrobeGroup(App);
    if (!group) return false;

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

    const threeSurface = readThreeSurface(__three(THREE));
    const moduleFaces = computePresetModuleInnerFaces({
      App,
      group,
      threeSurface,
      woodThick,
      moduleIndex,
      modulesLength,
      innerW,
      internalCenterX,
      renderOpsHandleCatch: __renderOpsHandleCatch,
    });
    const braceInnerWidth = moduleFaces ? Math.max(0, moduleFaces.rightX - moduleFaces.leftX) : innerW;
    const braceCenterX = moduleFaces ? (moduleFaces.leftX + moduleFaces.rightX) / 2 : internalCenterX;
    const braceShelfWidth = braceInnerWidth > 0 ? Math.max(0, braceInnerWidth - 0.0001) : innerW;
    const leftInnerX = moduleFaces ? moduleFaces.leftX : internalCenterX - innerW / 2;
    const rightInnerX = moduleFaces ? moduleFaces.rightX : internalCenterX + innerW / 2;

    const isInternalDrawersEnabled = !!input.isInternalDrawersEnabled;
    const intDrawersSlot = Number(input.intDrawersSlot || 0);
    const addGridShelf = createAddGridShelf({
      App,
      threeSurface,
      group,
      createBoard,
      addFoldedClothes,
      currentShelfMat,
      braceSet,
      effectiveBottomY,
      effectiveTopY,
      localGridStep,
      internalCenterX,
      braceCenterX,
      innerW,
      woodThick,
      internalDepth,
      internalZ,
      regularDepth,
      regularZ,
      regularShelfWidth,
      braceShelfWidth,
      leftInnerX,
      rightInnerX,
      isInternalDrawersEnabled,
      intDrawersSlot,
      renderOpsHandleCatch: __renderOpsHandleCatch,
    });

    if (Array.isArray(ops.shelves)) {
      for (let i = 0; i < ops.shelves.length; i += 1) addGridShelf(ops.shelves[i]);
    }

    if (Array.isArray(ops.rods)) {
      for (let j = 0; j < ops.rods.length; j += 1) {
        const rod = asRecord(ops.rods[j]);
        if (!rod) continue;
        const yRod = effectiveBottomY + Number(rod.yFactor || 0) * localGridStep;
        let limit = null;
        const limitFactor = Number(rod.limitFactor);
        const limitAdd = Number(rod.limitAdd);
        if (Number.isFinite(limitFactor) || Number.isFinite(limitAdd)) {
          limit =
            (Number.isFinite(limitFactor) ? limitFactor : 0) * localGridStep +
            (Number.isFinite(limitAdd) ? limitAdd : 0);
        }
        createRod(yRod, !!rod.enableHangingClothes, !!rod.enableSingleHanger, limit);
      }
    }

    const storageBarrier = asRecord(ops.storageBarrier);
    if (storageBarrier && storageBarrier.barrierH) {
      const barrierH = Number(storageBarrier.barrierH || 0);
      const zOff = storageBarrier.zFrontOffset != null ? Number(storageBarrier.zFrontOffset) : -0.06;
      const partId = moduleKey ? `storage_barrier_${moduleKey}` : 'storage_barrier';
      let material = bodyMat;
      try {
        const cfg = input.cfg;
        const getPartMaterial = input.getPartMaterial;
        const getPartColorValue = input.getPartColorValue;
        if (cfg && cfg.isMultiColorMode && __isFn(getPartColorValue) && getPartColorValue(partId)) {
          if (__isFn(getPartMaterial)) {
            const specificMaterial = getPartMaterial(partId);
            if (specificMaterial) material = specificMaterial;
          }
        }
      } catch {
        // ignore legacy color lookup errors and keep default body material
      }

      createBoard(
        innerW - 0.025,
        barrierH,
        woodThick,
        internalCenterX,
        effectiveBottomY + barrierH / 2,
        D / 2 + zOff,
        material,
        partId
      );
    }

    return true;
  }

  return {
    applyInteriorPresetOps,
  };
}
