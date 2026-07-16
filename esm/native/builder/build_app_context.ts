import { queueMicrotaskMaybe } from '../runtime/api.js';
import { requireBuilderService, ensureBuilderService } from '../runtime/builder_service_access.js';
import { getBuildReactionsServiceMaybe } from '../runtime/build_reactions_access.js';
import { resetInternalGridMaps } from '../runtime/cache_access.js';
import { captureLocalOpenStateBeforeBuild } from '../runtime/doors_access.js';
import { reportError } from '../runtime/errors.js';
import { getPlatformReportError } from '../runtime/platform_access.js';
import { asRecord } from '../runtime/record.js';
import { getRenderer, getWardrobeGroup } from '../runtime/render_access.js';
import {
  maybeRenderNoMainSketchHost,
  syncNoMainSketchWorkspaceMetrics,
} from './build_no_main_sketch_host.js';
import { resolveBuildStateOrThrow } from './build_state_resolver.js';
import { finalizeStackSplitUpperShift } from './build_stack_split_pipeline.js';
import { makeHandleTypeResolver } from './doors_state_utils.js';
import {
  bindEdgeHandleDefaultNoneReader,
  resetEdgeHandleDefaultNoneCacheMaps,
} from './edge_handle_default_none_runtime.js';
import { makeHandleCreator } from './handle_factory.js';
import { finalizeBuildBestEffort } from './post_build_finalize.js';
import { sanitizeBuildDimsAndSyncRuntime } from './state_sanitize_pipeline.js';

import type { AppContainer, RendererLike } from '../../../types';
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
      if (typeof enqueue === 'function') enqueue(fn);
      else void Promise.resolve().then(fn);
    },
    replayBuild: (bwFn, args) => {
      const builder = requireBuilderService(App, 'builder/build_runner.coalesced');
      bwFn.apply(builder, Array.isArray(args) ? args : []);
    },
  });
}

export function createBuildFlowOrchestrationContext(App: AppContainer): BuildFlowOrchestrationContext {
  const reportSecondaryFailure = createBuildSoftErrorReporter(App);

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
