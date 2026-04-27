import { computeInteriorCustomOps } from './pure_api.js';
import { requireBuilderRenderOps } from '../runtime/builder_service_access.js';
import type { InteriorCustomOpsLike } from '../../../types';
import {
  asObject,
  maybeApplySketchExtras,
  readBraceShelves,
  readNumber,
  reportInteriorLayoutError,
  requireApp,
  resolveActiveDrawerSlots,
  type BuilderRenderOpsLocal,
  type InteriorLayoutConfig,
  type InteriorLayoutParams,
} from './interior_pipeline_shared.js';

function requireCustomRenderOps(input: InteriorLayoutParams): BuilderRenderOpsLocal {
  const renderOps = asObject<BuilderRenderOpsLocal>(
    requireBuilderRenderOps(
      requireApp(input.App, 'builder/interior_pipeline.custom'),
      'builder/interior_pipeline.custom'
    )
  );
  if (!renderOps || typeof renderOps.applyInteriorCustomOps !== 'function') {
    throw new Error('[WardrobePro] custom interior ops missing: applyInteriorCustomOps');
  }
  return renderOps;
}

function computeCustomOps(input: InteriorLayoutParams, config: InteriorLayoutConfig): InteriorCustomOpsLike {
  const gridDivisions = readNumber(input.gridDivisions, 6);
  try {
    const ops = computeInteriorCustomOps(config.customData, gridDivisions);
    if (!ops) {
      throw new Error('[WardrobePro] custom interior ops are empty/invalid');
    }
    return ops;
  } catch (error) {
    reportInteriorLayoutError(input.App, error, {
      where: 'native/builder/interior_pipeline.computeInteriorCustomOps',
    });
    throw error;
  }
}

export function applyCustomInteriorLayout(
  input: InteriorLayoutParams,
  config: InteriorLayoutConfig
): boolean {
  const renderOps = requireCustomRenderOps(input);
  const customOps = computeCustomOps(input, config);

  const gridDivisions = readNumber(input.gridDivisions, 6);
  const activeSlots = resolveActiveDrawerSlots(config);

  let renderedCustom = false;
  try {
    renderedCustom =
      renderOps.applyInteriorCustomOps?.({
        THREE: input.THREE,
        cfg: input.cfg,
        moduleKey: input.moduleKey,
        getPartMaterial: input.getPartMaterial,
        getPartColorValue: input.getPartColorValue,
        wardrobeGroup: input.wardrobeGroup,
        customOps,
        gridDivisions,
        braceShelves: readBraceShelves(config),
        createBoard: input.createBoard,
        createRod: input.createRod,
        addFoldedClothes: input.addFoldedClothes,
        checkAndCreateInternalDrawer: input.checkAndCreateInternalDrawer,
        effectiveBottomY: readNumber(input.effectiveBottomY, 0),
        effectiveTopY: readNumber(input.effectiveTopY, 0),
        localGridStep: readNumber(input.localGridStep, 0),
        innerW: readNumber(input.innerW, 0),
        woodThick: readNumber(input.woodThick, 0),
        internalDepth: readNumber(input.internalDepth, 0),
        internalCenterX: readNumber(input.internalCenterX, 0),
        internalZ: readNumber(input.internalZ, 0),
        D: readNumber(input.D, 0),
        moduleIndex: readNumber(input.moduleIndex, -1),
        modulesLength: readNumber(input.modulesLength, -1),
        currentShelfMat: input.currentShelfMat,
        bodyMat: input.bodyMat,
        isInternalDrawersEnabled: input.isInternalDrawersEnabled === true,
        intDrawersList: activeSlots,
      }) === true;
  } catch (error) {
    reportInteriorLayoutError(input.App, error, {
      where: 'native/builder/interior_pipeline.applyInteriorCustomOps',
      fatal: true,
    });
    throw error;
  }

  if (!renderedCustom) {
    throw new Error('[WardrobePro] custom interior ops apply failed');
  }

  maybeApplySketchExtras(
    input.App,
    input,
    config,
    'native/builder/interior_pipeline.applyInteriorSketchExtras(custom)'
  );

  return true;
}
