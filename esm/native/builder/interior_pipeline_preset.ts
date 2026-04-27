import { computeInteriorPresetOps } from './pure_api.js';
import { requireBuilderRenderOps } from '../runtime/builder_service_access.js';
import type { InteriorPresetOpsLike } from '../../../types';
import {
  asObject,
  maybeApplySketchExtras,
  readBraceShelves,
  readNumber,
  reportInteriorLayoutError,
  requireApp,
  type BuilderRenderOpsLocal,
  type InteriorLayoutConfig,
  type InteriorLayoutParams,
} from './interior_pipeline_shared.js';

function requirePresetRenderOps(input: InteriorLayoutParams): BuilderRenderOpsLocal {
  const renderOps = asObject<BuilderRenderOpsLocal>(
    requireBuilderRenderOps(
      requireApp(input.App, 'builder/interior_pipeline.preset'),
      'builder/interior_pipeline.preset'
    )
  );
  if (!renderOps || typeof renderOps.applyInteriorPresetOps !== 'function') {
    throw new Error('[WardrobePro] interior preset ops missing: applyInteriorPresetOps');
  }
  return renderOps;
}

function computePresetOps(
  input: InteriorLayoutParams,
  config: InteriorLayoutConfig
): {
  layoutType: unknown;
  presetOps: InteriorPresetOpsLike;
} {
  const layoutType = config.layout;
  try {
    const presetOps = computeInteriorPresetOps(layoutType);
    if (!presetOps || !(Array.isArray(presetOps.shelves) || Array.isArray(presetOps.rods))) {
      throw new Error('[WardrobePro] unknown interior layout preset: ' + String(layoutType));
    }
    return { layoutType, presetOps };
  } catch (error) {
    reportInteriorLayoutError(input.App, error, {
      where: 'native/builder/interior_pipeline.computeInteriorPresetOps',
      layoutType,
    });
    throw error;
  }
}

function applyPresetInternalDrawerLayout(
  presetOps: InteriorPresetOpsLike,
  input: InteriorLayoutParams,
  gridDivisions: number,
  effectiveBottomY: number,
  effectiveTopY: number,
  localGridStep: number
): void {
  const checkAndCreateInternalDrawer = input.checkAndCreateInternalDrawer;
  if (typeof checkAndCreateInternalDrawer !== 'function') return;

  const presetShelfSet: Record<number, true> = Object.create(null);
  if (Array.isArray(presetOps.shelves)) {
    for (let i = 0; i < presetOps.shelves.length; i += 1) {
      const shelfIdx = parseInt(String(presetOps.shelves[i]), 10);
      if (Number.isFinite(shelfIdx)) presetShelfSet[shelfIdx] = true;
    }
  }

  for (let slot = 1; slot <= gridDivisions; slot += 1) {
    let slotTopY = effectiveTopY;
    for (let nextShelfIdx = slot; nextShelfIdx < gridDivisions; nextShelfIdx += 1) {
      if (presetShelfSet[nextShelfIdx]) {
        slotTopY = effectiveBottomY + nextShelfIdx * localGridStep;
        break;
      }
    }
    const slotBottomY = effectiveBottomY + (slot - 1) * localGridStep;
    checkAndCreateInternalDrawer(slot, {
      slotBottomY,
      slotTopY,
      slotAvailableHeight: slotTopY - slotBottomY,
    });
  }
}

export function applyPresetInteriorLayout(
  input: InteriorLayoutParams,
  config: InteriorLayoutConfig
): boolean {
  const renderOps = requirePresetRenderOps(input);
  const { layoutType, presetOps } = computePresetOps(input, config);

  const gridDivisions = readNumber(input.gridDivisions, 6);
  const effectiveBottomY = readNumber(input.effectiveBottomY, 0);
  const effectiveTopY = readNumber(input.effectiveTopY, 0);
  const localGridStep = readNumber(input.localGridStep, 0);

  applyPresetInternalDrawerLayout(
    presetOps,
    input,
    gridDivisions,
    effectiveBottomY,
    effectiveTopY,
    localGridStep
  );

  let renderedPreset = false;
  try {
    renderedPreset =
      renderOps.applyInteriorPresetOps?.({
        presetOps,
        cfg: input.cfg,
        moduleKey: input.moduleKey,
        getPartMaterial: input.getPartMaterial,
        getPartColorValue: input.getPartColorValue,
        braceShelves: readBraceShelves(config),
        effectiveBottomY,
        effectiveTopY,
        localGridStep,
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
        intDrawersSlot: config.intDrawersSlot,
        wardrobeGroup: input.wardrobeGroup,
        createBoard: input.createBoard,
        createRod: input.createRod,
        addFoldedClothes: input.addFoldedClothes,
      }) === true;
  } catch (error) {
    reportInteriorLayoutError(input.App, error, {
      where: 'native/builder/interior_pipeline.applyInteriorPresetOps',
      layoutType,
    });
    throw error;
  }

  if (!renderedPreset) {
    throw new Error('[WardrobePro] interior preset ops apply failed for preset: ' + String(layoutType));
  }

  maybeApplySketchExtras(
    input.App,
    input,
    config,
    'native/builder/interior_pipeline.applyInteriorSketchExtras(preset)'
  );

  return true;
}
