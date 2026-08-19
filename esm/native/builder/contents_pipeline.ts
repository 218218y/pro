// Rods / hangers / hanging clothes pipeline (Pure ESM)
//
// Goal: keep Builder Core free of content-specific rendering logic.
// This module provides a stable, fail-fast wrapper around Render Ops.

import type {
  AppContainer,
  BuilderContentsSurfaceLike,
  BuilderCreateRodConfigLike,
  BuilderCreateRodWithContentsArgsLike,
  BuilderInteriorRodCreator,
  BuilderOutlineFn,
  RoomArchitecturePlan,
} from '../../../types';

import { asRecord } from '../runtime/record.js';
import { getBuilderRenderOps } from '../runtime/builder_service_access.js';
import { getPlatformReportError } from '../runtime/platform_access.js';

function readRodConfig(value: unknown): BuilderCreateRodConfigLike | null {
  return asRecord<BuilderCreateRodConfigLike>(value);
}

type MakeRodCreatorArgs = {
  App?: AppContainer | null;
  roomArchitecturePlan: RoomArchitecturePlan;
  THREE?: BuilderCreateRodWithContentsArgsLike['THREE'];
  cfg?: unknown;
  config?: unknown;
  moduleIndex?: number;
  effectiveBottomY?: number;
  effectiveTopY?: number;
  gridDivisions?: number;
  localGridStep?: number;
  woodThick?: number;
  shelfThick?: number;
  innerW?: number;
  internalCenterX?: number;
  internalZ?: number;
  internalDepth?: number;
  doorFrontZ?: number;
  legMat?: unknown;
  wardrobeGroup?: unknown;
  addOutlines?: BuilderOutlineFn | null;
  sketchMode?: boolean;
  showHangerEnabled?: boolean;
  addRealisticHanger?: BuilderContentsSurfaceLike['addRealisticHanger'];
  showContentsEnabled?: boolean;
  addHangingClothes?: BuilderContentsSurfaceLike['addHangingClothes'];
  doorStyle?: unknown;
};

function readCreateRodWithContents(
  app: AppContainer
): ((args: BuilderCreateRodWithContentsArgsLike) => unknown) | null {
  const renderOps = getBuilderRenderOps(app);
  return typeof renderOps?.createRodWithContents === 'function' ? renderOps.createRodWithContents : null;
}

function attachCreateRodErrorContext(err: unknown, moduleIndex: number | undefined): void {
  if (!err || typeof err !== 'object') return;
  Reflect.set(err, 'context', {
    source: 'builder/contents_pipeline',
    op: 'createRodWithContents',
    moduleIndex,
  });
}

function createRodArgs(
  app: AppContainer,
  baseArgs: MakeRodCreatorArgs,
  config: BuilderCreateRodConfigLike | null,
  yPos: number,
  enableHangingClothes: boolean,
  enableSingleHanger: boolean,
  manualHeightLimit: number | null
): BuilderCreateRodWithContentsArgsLike {
  return {
    App: app,
    ...(baseArgs.THREE !== undefined ? { THREE: baseArgs.THREE } : {}),
    roomArchitecturePlan: baseArgs.roomArchitecturePlan,
    yPos,
    enableHangingClothes,
    enableSingleHanger,
    manualHeightLimit,
    cfg: baseArgs.cfg,
    config,
    ...(baseArgs.effectiveBottomY !== undefined ? { effectiveBottomY: baseArgs.effectiveBottomY } : {}),
    ...(baseArgs.effectiveTopY !== undefined ? { effectiveTopY: baseArgs.effectiveTopY } : {}),
    ...(baseArgs.gridDivisions !== undefined ? { gridDivisions: baseArgs.gridDivisions } : {}),
    ...(baseArgs.localGridStep !== undefined ? { localGridStep: baseArgs.localGridStep } : {}),
    ...(baseArgs.woodThick !== undefined ? { woodThick: baseArgs.woodThick } : {}),
    ...(baseArgs.shelfThick !== undefined ? { shelfThick: baseArgs.shelfThick } : {}),
    ...(baseArgs.innerW !== undefined ? { innerW: baseArgs.innerW } : {}),
    ...(baseArgs.internalCenterX !== undefined ? { internalCenterX: baseArgs.internalCenterX } : {}),
    ...(baseArgs.internalZ !== undefined ? { internalZ: baseArgs.internalZ } : {}),
    ...(baseArgs.internalDepth !== undefined ? { internalDepth: baseArgs.internalDepth } : {}),
    ...(baseArgs.doorFrontZ !== undefined ? { doorFrontZ: baseArgs.doorFrontZ } : {}),
    ...(baseArgs.legMat !== undefined ? { legMat: baseArgs.legMat } : {}),
    ...(baseArgs.wardrobeGroup !== undefined ? { wardrobeGroup: baseArgs.wardrobeGroup } : {}),
    ...(baseArgs.addOutlines !== undefined ? { addOutlines: baseArgs.addOutlines } : {}),
    sketchMode: baseArgs.sketchMode === true,
    ...(baseArgs.showHangerEnabled !== undefined ? { showHangerEnabled: baseArgs.showHangerEnabled } : {}),
    ...(baseArgs.addRealisticHanger !== undefined ? { addRealisticHanger: baseArgs.addRealisticHanger } : {}),
    ...(baseArgs.showContentsEnabled !== undefined
      ? { showContentsEnabled: baseArgs.showContentsEnabled }
      : {}),
    ...(baseArgs.addHangingClothes !== undefined ? { addHangingClothes: baseArgs.addHangingClothes } : {}),
    ...(baseArgs.doorStyle !== undefined ? { doorStyle: baseArgs.doorStyle } : {}),
  };
}

/**
 * Creates a `createRod(...)` function bound to a specific module context.
 *
 * @param {object} args
 * @returns {(yPos: number, enableHangingClothes?: boolean, enableSingleHanger?: boolean, manualHeightLimit?: number|null) => unknown}
 */
export function makeRodCreator(args: MakeRodCreatorArgs | null | undefined): BuilderInteriorRodCreator {
  if (!args) throw new Error('[builder/contents_pipeline] makeRodCreator: args missing');

  const app = args.App ?? null;
  if (!app) throw new Error('[builder/contents_pipeline] makeRodCreator: App missing');

  const THREE = args.THREE;
  if (!THREE) throw new Error('[builder/contents_pipeline] makeRodCreator: THREE missing');

  const config = readRodConfig(args.config);
  const moduleIndex = args.moduleIndex;
  const reportError = getPlatformReportError(app);

  return function createRod(
    yPos: number,
    enableHangingClothes: boolean = true,
    enableSingleHanger: boolean = true,
    manualHeightLimit: number | null = null
  ) {
    const createRodWithContents = readCreateRodWithContents(app);

    if (!createRodWithContents) {
      throw new Error(
        '[builder/contents_pipeline] builderRenderOps.createRodWithContents missing (Pure ESM expects Render Ops installed)'
      );
    }

    try {
      return createRodWithContents(
        createRodArgs(app, args, config, yPos, enableHangingClothes, enableSingleHanger, manualHeightLimit)
      );
    } catch (err: unknown) {
      if (reportError) {
        reportError(err, {
          source: 'builder/contents_pipeline',
          op: 'createRodWithContents',
          moduleIndex,
        });
      }
      // Preserve the original stack while attaching context.
      attachCreateRodErrorContext(err, moduleIndex);
      throw err;
    }
  };
}
