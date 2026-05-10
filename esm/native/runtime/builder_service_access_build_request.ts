import type { UiSnapshotLike, UnknownRecord } from '../../../types';

import { asRecord } from './record.js';
import { reportError } from './errors.js';
import type { BuilderCallable } from './builder_service_access_shared.js';
import { getBuilderService } from './builder_service_access_shared.js';
import { resolveBuilderBuildProfileMeta } from './builder_service_access_build_shared.js';
import type {
  BuilderBuildProfileOpts,
  BuilderHandleRefreshResult,
  BuilderStructuralRefreshResult,
  RefreshBuilderAfterDoorOpsOpts,
  RequestBuilderStructuralRefreshOpts,
} from './builder_service_access_build_shared.js';
import {
  readBuilderRequestBuildFn,
  refreshBuilderAfterDoorOpsRuntime,
  requestBuilderBuildRuntime,
  requestBuilderStructuralRefreshRuntime,
} from './builder_service_access_build_request_runtime.js';

function requestBuilderBuildInternal(
  App: unknown,
  uiOverride: UiSnapshotLike | null,
  meta?: UnknownRecord
): boolean {
  return requestBuilderBuildRuntime(App, uiOverride, meta);
}

export function requestBuilderImmediateBuild(App: unknown, meta?: UnknownRecord | null): boolean {
  return requestBuilderBuild(App, resolveBuilderBuildProfileMeta(meta, { immediate: true, force: false }));
}

export function requestBuilderForcedBuild(App: unknown, meta?: UnknownRecord | null): boolean {
  return requestBuilderBuild(App, resolveBuilderBuildProfileMeta(meta, { immediate: true, force: true }));
}

export function requestBuilderDebouncedBuild(App: unknown, meta?: UnknownRecord | null): boolean {
  return requestBuilderBuild(App, resolveBuilderBuildProfileMeta(meta, { immediate: false, force: false }));
}

export function requestBuilderBuildFromActionMeta(
  App: unknown,
  meta?: UnknownRecord | null,
  defaults?: BuilderBuildProfileOpts | null
): boolean {
  return requestBuilderBuild(App, resolveBuilderBuildProfileMeta(meta, defaults));
}

export function requestBuilderBuildWithUiFromActionMeta(
  App: unknown,
  uiOverride: unknown,
  meta?: UnknownRecord | null,
  defaults?: BuilderBuildProfileOpts | null
): boolean {
  return requestBuilderBuildWithUi(App, uiOverride, resolveBuilderBuildProfileMeta(meta, defaults));
}

export function getBuilderBuildWardrobe(App: unknown): BuilderCallable | null {
  const builder = getBuilderService(App);
  const fn = builder && typeof builder.buildWardrobe === 'function' ? builder.buildWardrobe : null;
  return fn ? (state?: unknown) => Reflect.apply(fn, builder, [state]) : null;
}

export function hasBuilderBuildWardrobe(App: unknown): boolean {
  return !!getBuilderBuildWardrobe(App);
}

export function runBuilderBuildWardrobe(App: unknown, state?: unknown): boolean {
  try {
    const buildWardrobe = getBuilderBuildWardrobe(App);
    if (!buildWardrobe) return false;
    buildWardrobe(state);
    return true;
  } catch (error) {
    reportError(App, error, {
      where: 'native/runtime/builder_service_access',
      op: 'builder.buildWardrobe.ownerRejected',
      fatal: false,
    });
    return false;
  }
}

export function hasBuilderRequestBuild(App: unknown): boolean {
  try {
    return !!readBuilderRequestBuildFn(App);
  } catch {
    return false;
  }
}

export function requestBuilderBuild(App: unknown, meta?: UnknownRecord): boolean {
  return requestBuilderBuildInternal(App, null, meta);
}

export function refreshBuilderAfterDoorOps(
  App: unknown,
  opts?: RefreshBuilderAfterDoorOpsOpts
): BuilderHandleRefreshResult {
  return refreshBuilderAfterDoorOpsRuntime(App, {
    ...opts,
    source: opts?.source || 'builder:doorOps',
    immediate: opts?.immediate !== false,
    force: !!opts?.force,
  });
}

export function requestBuilderStructuralRefresh(
  App: unknown,
  opts: RequestBuilderStructuralRefreshOpts
): BuilderStructuralRefreshResult {
  const meta = resolveBuilderBuildProfileMeta(opts, {
    source: opts?.source || 'builder:structuralRefresh',
    reason: opts?.reason,
    immediate: opts?.immediate !== false,
    force: opts?.force !== false,
  });
  return requestBuilderStructuralRefreshRuntime(App, opts, meta);
}

export function requestBuilderBuildWithUi(App: unknown, uiOverride: unknown, meta?: UnknownRecord): boolean {
  return requestBuilderBuildInternal(App, asRecord<UiSnapshotLike>(uiOverride), meta);
}
