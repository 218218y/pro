import { reportError } from './errors.js';
import { getBuilderHandlesService } from './builder_service_access_slots.js';
import type {
  ApplyBuilderHandlesOpts,
  BuilderHandleRefreshResult,
  RefreshBuilderHandlesOpts,
} from './builder_service_access_build_shared.js';
import {
  readUpdateShadows,
  shouldPurgeRemovedDoors,
  shouldRunBuilderFollowThroughRender,
  shouldTriggerHandlesRefreshRender,
} from './builder_service_access_build_shared.js';
import { runBuilderRenderFollowThroughWhen } from './builder_service_access_build_render.js';

export function applyBuilderHandles(App: unknown, opts: ApplyBuilderHandlesOpts): boolean {
  try {
    const handles = getBuilderHandlesService(App);
    const fn = handles && typeof handles.applyHandles === 'function' ? handles.applyHandles : null;
    if (!fn) return false;
    fn.call(handles, opts);
    return true;
  } catch (error) {
    reportError(App, error, {
      where: 'native/runtime/builder_service_access',
      op: 'builder.handles.applyHandles.ownerRejected',
      fatal: false,
    });
    return false;
  }
}

export function purgeBuilderHandlesForRemovedDoors(
  App: unknown,
  forceEnabled: boolean,
  cfgSnapshot: ApplyBuilderHandlesOpts['cfgSnapshot']
): boolean {
  try {
    const handles = getBuilderHandlesService(App);
    const fn =
      handles && typeof handles.purgeHandlesForRemovedDoors === 'function'
        ? handles.purgeHandlesForRemovedDoors
        : null;
    if (!fn) return false;
    fn.call(handles, !!forceEnabled, cfgSnapshot);
    return true;
  } catch (error) {
    reportError(App, error, {
      where: 'native/runtime/builder_service_access',
      op: 'builder.handles.purgeRemovedDoors.ownerRejected',
      fatal: false,
    });
    return false;
  }
}

export function refreshBuilderHandles(
  App: unknown,
  opts: RefreshBuilderHandlesOpts
): BuilderHandleRefreshResult {
  if (typeof opts?.addOutlines !== 'function') {
    throw new TypeError('[builder_service_access] snapshot outline binding is required for handle refresh');
  }
  const appliedHandles = applyBuilderHandles(App, {
    triggerRender: false,
    cfgSnapshot: opts.cfgSnapshot,
    addOutlines: opts.addOutlines,
  });
  const purgedRemovedDoors = shouldPurgeRemovedDoors(opts)
    ? purgeBuilderHandlesForRemovedDoors(App, true, opts.cfgSnapshot)
    : false;

  const renderResult = runBuilderRenderFollowThroughWhen(
    App,
    shouldTriggerHandlesRefreshRender(opts) &&
      shouldRunBuilderFollowThroughRender(appliedHandles, purgedRemovedDoors),
    { updateShadows: readUpdateShadows(opts) }
  );

  return {
    requestedBuild: false,
    appliedHandles,
    purgedRemovedDoors,
    triggeredRender: renderResult.triggeredRender,
    ensuredRenderLoop: renderResult.ensuredRenderLoop,
  };
}
