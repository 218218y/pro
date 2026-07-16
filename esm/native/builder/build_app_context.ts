import { guardVoid, queueMicrotaskMaybe } from '../runtime/api.js';
import { requireBuilderService, ensureBuilderService } from '../runtime/builder_service_access.js';
import { getBuildReactionsServiceMaybe } from '../runtime/build_reactions_access.js';
import { resetInternalGridMaps } from '../runtime/cache_access.js';
import { captureLocalOpenStateBeforeBuild } from '../runtime/doors_access.js';
import { reportError } from '../runtime/errors.js';
import { getPlatformReportError } from '../runtime/platform_access.js';
import { asRecord } from '../runtime/record.js';
import { getRenderer } from '../runtime/render_access.js';
import { resolveBuildStateOrThrow } from './build_state_resolver.js';
import { resetEdgeHandleDefaultNoneCacheMaps } from './edge_handle_default_none_runtime.js';
import { finalizeBuildBestEffort } from './post_build_finalize.js';
import { sanitizeBuildDimsAndSyncRuntime } from './state_sanitize_pipeline.js';

import type { AppContainer, RendererLike } from '../../../types';
import type { BuildFlowOrchestrationContext } from './build_flow_orchestration.js';
import type {
  BuildRunnerRuntimeContext,
  BuildRunnerShadowMapLike,
  BuildRunnerSoftErrorExtra,
} from './build_runner_runtime.js';

type RendererWithShadowMap = RendererLike & {
  shadowMap?: BuildRunnerShadowMapLike | null;
};

export function createBuildRunnerRuntimeContext(App: AppContainer): BuildRunnerRuntimeContext {
  const reportSoftError = (where: string, error: unknown, extra?: BuildRunnerSoftErrorExtra): void => {
    try {
      const reportPlatformError = getPlatformReportError(App);
      if (reportPlatformError) reportPlatformError(error, { where, fatal: false, ...extra });
    } catch {
      // Diagnostics are observational and cannot change the build result.
    }
  };

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
    reportBuildFailure: (label, error, showToast) => {
      reportError(App, error, { where: label, fatal: true });
      guardVoid(App, { where: label, op: 'showToast', fatal: true, failFast: true }, () => {
        if (typeof showToast === 'function') {
          Reflect.apply(showToast, null, ['אירעה שגיאה בבניית הדגם.', 'error']);
        }
      });
    },
    reportFinalizeFailure: (label, error) => {
      reportError(App, error, { where: label, op: 'finalizeBuild', fatal: true });
    },
    finalizeBestEffort: args => finalizeBuildBestEffort({ App, ...args }),
  });
}
