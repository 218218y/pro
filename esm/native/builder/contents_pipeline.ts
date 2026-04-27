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
} from '../../../types';

import { asRecord } from '../runtime/record.js';
import { getBuilderRenderOps } from '../runtime/builder_service_access.js';
import { getPlatformReportError } from '../runtime/platform_access.js';

function readRodConfig(value: unknown): BuilderCreateRodConfigLike | null {
  return asRecord<BuilderCreateRodConfigLike>(value);
}

type MakeRodCreatorArgs = {
  App?: AppContainer | null;
  THREE?: BuilderCreateRodWithContentsArgsLike['THREE'];
  cfg?: unknown;
  config?: unknown;
  moduleIndex?: number;
  effectiveBottomY?: number;
  localGridStep?: number;
  isInternalDrawersEnabled?: boolean;
  innerW?: number;
  internalCenterX?: number;
  internalZ?: number;
  internalDepth?: number;
  doorFrontZ?: number;
  legMat?: unknown;
  wardrobeGroup?: unknown;
  addOutlines?: BuilderOutlineFn | null;
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
    THREE: baseArgs.THREE,
    yPos,
    enableHangingClothes,
    enableSingleHanger,
    manualHeightLimit,
    cfg: baseArgs.cfg,
    config,
    effectiveBottomY: baseArgs.effectiveBottomY,
    localGridStep: baseArgs.localGridStep,
    isInternalDrawersEnabled: baseArgs.isInternalDrawersEnabled,
    intDrawersList: config?.intDrawersList,
    intDrawersSlot: config?.intDrawersSlot,
    innerW: baseArgs.innerW,
    internalCenterX: baseArgs.internalCenterX,
    internalZ: baseArgs.internalZ,
    internalDepth: baseArgs.internalDepth,
    doorFrontZ: baseArgs.doorFrontZ,
    legMat: baseArgs.legMat,
    wardrobeGroup: baseArgs.wardrobeGroup,
    addOutlines: baseArgs.addOutlines,
    showHangerEnabled: baseArgs.showHangerEnabled,
    addRealisticHanger: baseArgs.addRealisticHanger,
    showContentsEnabled: baseArgs.showContentsEnabled,
    addHangingClothes: baseArgs.addHangingClothes,
    doorStyle: baseArgs.doorStyle,
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
