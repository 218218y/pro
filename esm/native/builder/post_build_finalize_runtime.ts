import { asRecord } from '../runtime/record.js';
import { runBuilderPostBuildFollowThrough } from '../runtime/builder_service_access_build_followthrough.js';

import type { AppContainer, BuildContextLike, BuildCtxFnsLike } from '../../../types/index.js';

export type FinalizeBestEffortArgs = {
  App: unknown;
  pruneCachesSafe?: ((scene: unknown) => void) | null;
  rebuildDrawerMeta?: (() => void) | null;
};

export type FinalizeBestEffortArgsLike = FinalizeBestEffortArgs & Record<string, unknown>;

function readApp(value: unknown): AppContainer | null {
  return asRecord<AppContainer>(value);
}

function readFinalizeArgs(value: unknown): FinalizeBestEffortArgsLike | null {
  return asRecord<FinalizeBestEffortArgsLike>(value);
}

function readPruneCachesSafeArg(value: unknown): ((scene: unknown) => void) | null {
  const argsRec = readFinalizeArgs(value);
  const candidate = argsRec?.pruneCachesSafe;
  return typeof candidate === 'function' ? candidate : null;
}

function readRebuildDrawerMetaArg(value: unknown): (() => void) | null {
  const argsRec = readFinalizeArgs(value);
  const candidate = argsRec?.rebuildDrawerMeta;
  return typeof candidate === 'function' ? candidate : null;
}

function readBuildCtxPruneCachesSafe(
  fns: BuildCtxFnsLike | null | undefined
): ((scene: unknown) => void) | null {
  const candidate = fns?.pruneCachesSafe;
  return typeof candidate === 'function' ? candidate : null;
}

function readBuildCtxRebuildDrawerMeta(fns: BuildCtxFnsLike | null | undefined): (() => void) | null {
  const candidate = fns?.rebuildDrawerMeta;
  return typeof candidate === 'function' ? candidate : null;
}

export function resolveFinalizeBuildBestEffortArgs(args: FinalizeBestEffortArgs): {
  App: AppContainer | null;
  pruneCachesSafe: ((scene: unknown) => void) | null;
  rebuildDrawerMeta: (() => void) | null;
} {
  return {
    App: readApp(args?.App),
    pruneCachesSafe: readPruneCachesSafeArg(args),
    rebuildDrawerMeta: readRebuildDrawerMetaArg(args),
  };
}

export function resolveFinalizeBuildContextArgs(ctx: BuildContextLike): FinalizeBestEffortArgs {
  return {
    App: ctx.App,
    pruneCachesSafe: readBuildCtxPruneCachesSafe(ctx.fns),
    rebuildDrawerMeta: readBuildCtxRebuildDrawerMeta(ctx.fns),
  };
}

export function runFinalizeBuildBestEffort(args: FinalizeBestEffortArgs): { App: AppContainer | null } {
  const resolved = resolveFinalizeBuildBestEffortArgs(args);
  runBuilderPostBuildFollowThrough(resolved.App, {
    finalizeRegistry: true,
    rebuildDrawerMeta: resolved.rebuildDrawerMeta,
    pruneCachesSafe: resolved.pruneCachesSafe,
    clearBuildUi: true,
    triggerPlatformRender: true,
    updateShadows: true,
    applyHandles: true,
  });
  return { App: resolved.App };
}
