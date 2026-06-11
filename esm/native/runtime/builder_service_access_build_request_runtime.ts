import type { UiSnapshotLike, UnknownRecord } from '../../../types';

import { asRecord } from './record.js';
import {
  cloneBuilderRequestMeta,
  didBuilderRequestAccept,
  getBuilderService,
} from './builder_service_access_shared.js';
import type { RequestBuildCallable } from './builder_service_access_shared.js';
import { refreshBuilderHandles } from './builder_service_access_build_handles.js';
import { getBuilderScheduler } from './builder_service_access_slots.js';
import {
  shouldRunBuilderFollowThroughRender,
  shouldTriggerStructuralRefreshRender,
  stripBuilderFollowThroughMeta,
} from './builder_service_access_build_shared.js';
import type {
  BuilderHandleRefreshResult,
  BuilderStructuralRefreshResult,
  RefreshBuilderAfterDoorOpsOpts,
  RequestBuilderStructuralRefreshOpts,
} from './builder_service_access_build_shared.js';
import { runBuilderRenderFollowThroughRuntime } from './builder_service_access_build_render_runtime.js';

export type BuilderBuildFollowThroughDecision = {
  requestedBuild: boolean;
  deferRenderFollowThrough: boolean;
};

function readBuilderRequestBuildCallable(App: unknown): {
  builder: ReturnType<typeof getBuilderService>;
  fn: RequestBuildCallable | null;
} {
  const builder = getBuilderService(App);
  const fn = builder && typeof builder.requestBuild === 'function' ? builder.requestBuild : null;
  return { builder, fn };
}

function createDoorOpsRefreshOpts(
  opts: RefreshBuilderAfterDoorOpsOpts | undefined,
  deferRenderFollowThrough: boolean
): RefreshBuilderAfterDoorOpsOpts | undefined {
  if (!deferRenderFollowThrough) return opts;
  return { ...(opts || {}), triggerRender: false };
}

export function readBuilderRequestBuildFn(App: unknown): RequestBuildCallable | null {
  return readBuilderRequestBuildCallable(App).fn;
}

export function requestBuilderBuildRuntime(
  App: unknown,
  uiOverride: UiSnapshotLike | null,
  meta?: UnknownRecord
): boolean {
  try {
    const { builder, fn } = readBuilderRequestBuildCallable(App);
    if (!fn) return false;
    const result = Reflect.apply(fn, builder, [uiOverride, cloneBuilderRequestMeta(meta)]);
    return didBuilderRequestAccept(result);
  } catch {
    return false;
  }
}

export function hasCanonicalSchedulerRenderOwnership(App: unknown): boolean {
  const scheduler = asRecord<UnknownRecord>(getBuilderScheduler(App));
  return scheduler?.__esm_v1 === true;
}

export function shouldDeferRenderFollowThroughToAcceptedImmediateBuild(
  App: unknown,
  requestedBuild: boolean,
  immediate: boolean | undefined
): boolean {
  if (!requestedBuild) return false;
  if (immediate === false) return false;
  return hasCanonicalSchedulerRenderOwnership(App);
}

export function resolveBuilderBuildFollowThroughDecision(
  App: unknown,
  meta: UnknownRecord | null | undefined,
  immediate: boolean | undefined
): BuilderBuildFollowThroughDecision {
  const requestedBuild = requestBuilderBuildRuntime(App, null, stripBuilderFollowThroughMeta(meta));
  return {
    requestedBuild,
    deferRenderFollowThrough: shouldDeferRenderFollowThroughToAcceptedImmediateBuild(
      App,
      requestedBuild,
      immediate
    ),
  };
}

export function refreshBuilderAfterDoorOpsRuntime(
  App: unknown,
  opts?: RefreshBuilderAfterDoorOpsOpts
): BuilderHandleRefreshResult & { requestedBuild: boolean } {
  const decision = resolveBuilderBuildFollowThroughDecision(App, opts, opts?.immediate);
  const refresh = refreshBuilderHandles(
    App,
    createDoorOpsRefreshOpts(opts, decision.deferRenderFollowThrough)
  );
  return { ...refresh, requestedBuild: decision.requestedBuild };
}

export function shouldRunStructuralRefreshFollowThrough(
  opts: RequestBuilderStructuralRefreshOpts,
  decision: BuilderBuildFollowThroughDecision
): boolean {
  return (
    !decision.deferRenderFollowThrough &&
    shouldTriggerStructuralRefreshRender(opts) &&
    shouldRunBuilderFollowThroughRender(decision.requestedBuild)
  );
}

export function requestBuilderStructuralRefreshRuntime(
  App: unknown,
  opts: RequestBuilderStructuralRefreshOpts,
  meta: UnknownRecord
): BuilderStructuralRefreshResult {
  const decision = resolveBuilderBuildFollowThroughDecision(App, meta, opts?.immediate);
  const renderResult = shouldRunStructuralRefreshFollowThrough(opts, decision)
    ? runBuilderRenderFollowThroughRuntime(App, { updateShadows: !!opts?.updateShadows })
    : { triggeredRender: false, ensuredRenderLoop: false };

  return {
    requestedBuild: decision.requestedBuild,
    triggeredRender: renderResult.triggeredRender,
    ensuredRenderLoop: renderResult.ensuredRenderLoop,
  };
}
