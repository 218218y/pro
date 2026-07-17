import { guardVoid, queueMicrotaskMaybe } from '../runtime/api.js';
import {
  ensureBuilderService,
  getBuilderRenderOps,
  requireBuilderRegistry,
  requireBuilderService,
  runBuilderChestModeFollowThrough,
} from '../runtime/builder_service_access.js';
import { getBuildReactionsServiceMaybe } from '../runtime/build_reactions_access.js';
import { resetInternalGridMaps } from '../runtime/cache_access.js';
import { captureLocalOpenStateBeforeBuild } from '../runtime/doors_access.js';
import { reportError } from '../runtime/errors.js';
import {
  cleanGroupViaPlatform,
  getPlatformReportError,
  markPlatformPerfFlagsDirty,
} from '../runtime/platform_access.js';
import { asRecord } from '../runtime/record.js';
import { getRenderer, getWardrobeGroup, invalidateMirrorTracking } from '../runtime/render_access.js';
import { capturePlanarReflectorWarmCache } from '../runtime/planar_reflector_runtime.js';
import {
  maybeRenderNoMainSketchHost,
  syncNoMainSketchWorkspaceMetrics,
} from './build_no_main_sketch_host.js';
import { resolveBuildStateOrThrow } from './build_state_resolver.js';
import { finalizeStackSplitUpperShift } from './build_stack_split_pipeline.js';
import { makeBoardCreator } from './board_factory.js';
import { buildChestModeIfNeeded } from './chest_mode_pipeline.js';
import { makeHandleTypeResolver } from './doors_state_utils.js';
import {
  bindEdgeHandleDefaultNoneReader,
  resetEdgeHandleDefaultNoneCacheMaps,
} from './edge_handle_default_none_runtime.js';
import { makeHandleCreator } from './handle_factory.js';
import { finalizeBuildBestEffort } from './post_build_finalize.js';
import { prepareBuildScene } from './pre_build_reset.js';
import { resolveBuildFlowPlanLayout } from './build_flow_plan_layout.js';
import { resolveBuildFlowPlanMaterials } from './build_flow_plan_materials.js';
import { sanitizeBuildDimsAndSyncRuntime } from './state_sanitize_pipeline.js';

import type { AppContainer, BuilderCreateBoardArgsLike, RendererLike } from '../../../types';
import type {
  BuildFlowOrchestrationContext,
  BuildFlowSecondaryFailureContext,
} from './build_flow_orchestration.js';
import type {
  BuildRunnerRuntimeContext,
  BuildRunnerShadowMapLike,
  BuildRunnerSoftErrorExtra,
} from './build_runner_runtime.js';

type RendererWithShadowMap = RendererLike & {
  shadowMap?: BuildRunnerShadowMapLike | null;
};

function createBuildSoftErrorReporter(App: AppContainer) {
  return (
    where: string,
    error: unknown,
    extra?: BuildRunnerSoftErrorExtra | BuildFlowSecondaryFailureContext
  ): void => {
    try {
      const reportPlatformError = getPlatformReportError(App);
      if (reportPlatformError) reportPlatformError(error, { where, fatal: false, ...extra });
    } catch {
      // Diagnostics are observational and cannot change the build result.
    }
  };
}

export function createBuildRunnerRuntimeContext(App: AppContainer): BuildRunnerRuntimeContext {
  const reportSoftError = createBuildSoftErrorReporter(App);

  return Object.freeze({
    readShadowMap: () => {
      const renderer = asRecord<RendererWithShadowMap>(getRenderer(App));
      return asRecord<BuildRunnerShadowMapLike>(renderer?.shadowMap);
    },
    reportSoftError,
    runPostBuildReactions: ok => {
      const service = getBuildReactionsServiceMaybe(App);
      const afterBuild = service && typeof service.afterBuild === 'function' ? service.afterBuild : null;
      if (afterBuild) afterBuild.call(service, ok);
    },
    scheduleMicrotask: fn => {
      const enqueue = queueMicrotaskMaybe(App);
      if (typeof enqueue === 'function') {
        try {
          enqueue(fn);
          return;
        } catch (error) {
          reportSoftError('native/builder/build_runner.primaryReplayScheduler', error);
        }
      }

      void Promise.resolve()
        .then(fn)
        .catch(error => {
          reportSoftError('native/builder/build_runner.fallbackReplay', error);
        });
    },
    replayBuild: (bwFn, args) => {
      const builder = requireBuilderService(App, 'builder/build_runner.coalesced');
      bwFn.apply(builder, Array.isArray(args) ? args : []);
    },
  });
}

export function createBuildFlowOrchestrationContext(App: AppContainer): BuildFlowOrchestrationContext {
  const reportSecondaryFailure = createBuildSoftErrorReporter(App);
  const prepareSceneRuntime = Object.freeze({
    capturePlanarReflectorWarmCache: () => capturePlanarReflectorWarmCache(App),
    readWardrobeGroup: () => getWardrobeGroup(App),
    cleanGroupViaPlatform: (group: unknown) => cleanGroupViaPlatform(App, group),
    invalidateMirrorTracking: () => invalidateMirrorTracking(App),
    resetBuilderRegistry: () => {
      const registry = requireBuilderRegistry(App, 'builder/pre_build_reset');
      if (typeof registry.reset === 'function') {
        registry.reset();
        return;
      }
      const error = new Error(
        '[WardrobePro] builder registry reset is missing (expected App.services.builder.registry.reset)'
      );
      try {
        reportError(App, error, 'builder.preBuildReset');
      } catch {
        // The missing required capability remains the authoritative error.
      }
      throw error;
    },
    markPerfFlagsDirty: () => markPlatformPerfFlagsDirty(App, true),
  });

  return Object.freeze({
    resolveState: stateOrOverride => resolveBuildStateOrThrow({ App, stateOrOverride }),
    resetCaches: () => {
      resetInternalGridMaps(App);
      resetEdgeHandleDefaultNoneCacheMaps(App);
    },
    captureOpenState: () => {
      captureLocalOpenStateBeforeBuild(App, {
        includeDrawers: true,
        includeSlidingTrackDoors: true,
      });
    },
    publishBuildUi: ui => {
      const builder = ensureBuilderService(App, 'native/builder/build_wardrobe_flow');
      builder.buildUi = Object.assign({}, ui || {}, {
        handleControl: !!ui.handleControl,
        showHanger: !!ui.showHanger,
        showContents: !!ui.showContents,
      });
    },
    sanitizeDimensions: (ui, cfg) => sanitizeBuildDimsAndSyncRuntime({ App, ui, cfg }),
    readWardrobeChildCount: () => {
      const group = asRecord(getWardrobeGroup(App));
      if (!group) return -1;
      return Array.isArray(group.children) ? group.children.length : 0;
    },
    prepareScene: input => prepareBuildScene({ ...input, runtime: prepareSceneRuntime }),
    buildChestModeIfNeeded: input =>
      buildChestModeIfNeeded({
        ...input,
        followThrough: ({ cfgSnapshot, addOutlines }) => {
          guardVoid(
            App,
            {
              where: 'builder/chest_mode_pipeline',
              op: 'builder.chestModeFollowThrough',
              failFast: true,
            },
            () => {
              runBuilderChestModeFollowThrough(App, {
                applyHandles: true,
                renderViewport: true,
                finalizeRegistry: true,
                cfgSnapshot,
                addOutlines,
                removeDoorsEnabled: false,
              });
            }
          );
        },
      }),
    resolvePlanMaterials: input => resolveBuildFlowPlanMaterials({ App, ...input }),
    computeModuleLayout: input => resolveBuildFlowPlanLayout({ App, ...input }),
    createBoardFactory: input => {
      const reportBoardError = getPlatformReportError(App);
      return makeBoardCreator({
        ...input,
        runtime: {
          createBoard: (args: BuilderCreateBoardArgsLike) => {
            const renderOps = getBuilderRenderOps(App);
            if (!renderOps || typeof renderOps.createBoard !== 'function') {
              throw new Error(
                '[builder/board_factory] builderRenderOps.createBoard missing (Pure ESM expects Render Ops installed)'
              );
            }
            return renderOps.createBoard({ ...args, App });
          },
          reportError: reportBoardError,
        },
      });
    },
    createHandleBindings: ({ THREE, addOutlines, cfg, doorState, stackKey }) => ({
      getHandleType: makeHandleTypeResolver({
        cfg,
        doorState,
        isEdgeHandleDefaultNone: bindEdgeHandleDefaultNoneReader(App, stackKey),
      }),
      createHandleMesh: makeHandleCreator({ App, THREE, addOutlines }),
    }),
    syncNoMainWorkspaceMetrics: input => syncNoMainSketchWorkspaceMetrics({ App, ...input }),
    renderNoMainSketchHost: input => maybeRenderNoMainSketchHost({ App, ...input }),
    finalizeStackSplitUpperShift: input => finalizeStackSplitUpperShift({ App, ...input }),
    reportBuildFailure: (label, error, showToast) => {
      reportError(App, error, { where: label, fatal: true });
      try {
        if (typeof showToast === 'function') {
          Reflect.apply(showToast, null, ['אירעה שגיאה בבניית הדגם.', 'error']);
        }
      } catch (toastError) {
        reportSecondaryFailure(`${label}.showToast`, toastError, {
          operation: 'toast',
          originalError: error,
        });
      }
    },
    reportFinalizeFailure: (label, error) => {
      reportError(App, error, { where: label, op: 'finalizeBuild', fatal: true });
    },
    reportSecondaryFailure,
    finalizeBestEffort: args => finalizeBuildBestEffort({ App, ...args }),
  });
}
