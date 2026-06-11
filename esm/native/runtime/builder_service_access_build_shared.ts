import type { UnknownRecord } from '../../../types';
import { asRecord } from './record.js';
import type { BuildRequestMeta } from './builder_service_access_shared.js';

export type ApplyBuilderHandlesOpts = {
  triggerRender?: boolean;
};

export type RefreshBuilderHandlesOpts = {
  purgeRemovedDoors?: boolean;
  triggerRender?: boolean;
  updateShadows?: boolean;
};

export type RefreshBuilderAfterDoorOpsOpts = RefreshBuilderHandlesOpts & {
  source?: string;
  immediate?: boolean;
  force?: boolean;
};

export type BuilderHandleRefreshResult = {
  requestedBuild: boolean;
  appliedHandles: boolean;
  purgedRemovedDoors: boolean;
  triggeredRender: boolean;
  ensuredRenderLoop: boolean;
};

export type RequestBuilderStructuralRefreshOpts = {
  source: string;
  reason?: string;
  immediate?: boolean;
  force?: boolean;
  triggerRender?: boolean;
  updateShadows?: boolean;
};

export type BuilderStructuralRefreshResult = {
  requestedBuild: boolean;
  triggeredRender: boolean;
  ensuredRenderLoop: boolean;
};

export type BuilderRenderFollowThroughOpts = {
  updateShadows?: boolean;
  fallbackTrigger?: ((updateShadows?: boolean) => void) | null;
};

export type BuilderRenderFollowThroughResult = {
  triggeredRender: boolean;
  ensuredRenderLoop: boolean;
};

export type BuilderPostBuildFollowThroughOpts = {
  finalizeRegistry?: boolean;
  clearBuildUi?: boolean;
  applyHandles?: boolean;
  rebuildDrawerMeta?: (() => void) | null;
  pruneCachesSafe?: ((scene: unknown) => void) | null;
  triggerRender?: ((updateShadows?: boolean) => void) | null;
  triggerPlatformRender?: boolean;
  updateShadows?: boolean;
};

export type BuilderPostBuildFollowThroughResult = {
  finalizedRegistry: boolean;
  rebuiltDrawerMeta: boolean;
  appliedHandles: boolean;
  prunedCaches: boolean;
  clearedBuildUi: boolean;
  triggeredRender: boolean;
  ensuredRenderLoop: boolean;
};

export type BuilderViewportRefreshResult = {
  renderedViewport: boolean;
  updatedControls: boolean;
};

export type BuilderChestModeFollowThroughOpts = {
  finalizeRegistry?: boolean;
  applyHandles?: boolean;
  renderViewport?: boolean;
};

export type BuilderChestModeFollowThroughResult = BuilderPostBuildFollowThroughResult &
  BuilderViewportRefreshResult;

export const EMPTY_BUILDER_RENDER_FOLLOW_THROUGH_RESULT: BuilderRenderFollowThroughResult = {
  triggeredRender: false,
  ensuredRenderLoop: false,
};

export type BuilderBuildProfileOpts = {
  source?: string;
  reason?: string;
  immediate?: boolean;
  force?: boolean;
};

const BUILDER_FOLLOW_THROUGH_META_KEYS = new Set(['purgeRemovedDoors', 'triggerRender', 'updateShadows']);

export function readBuilderBuildProfileValue(value: unknown): string | undefined {
  return typeof value === 'string' && value ? value : undefined;
}

export function readBuilderBuildProfileFlag(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

export function resolveBuilderBuildProfileMeta(
  meta?: UnknownRecord | null,
  defaults?: BuilderBuildProfileOpts | null
): BuildRequestMeta {
  const metaRec = asRecord<UnknownRecord>(meta) || {};
  const next: BuildRequestMeta = {};
  const source =
    readBuilderBuildProfileValue(metaRec.source) || readBuilderBuildProfileValue(defaults?.source);
  const reason =
    readBuilderBuildProfileValue(metaRec.reason) || readBuilderBuildProfileValue(defaults?.reason) || source;
  const immediate =
    readBuilderBuildProfileFlag(metaRec.immediate) ??
    readBuilderBuildProfileFlag(defaults?.immediate) ??
    true;
  const force =
    readBuilderBuildProfileFlag(metaRec.force) ??
    readBuilderBuildProfileFlag(metaRec.forceBuild) ??
    readBuilderBuildProfileFlag(defaults?.force) ??
    true;

  if (source) next.source = source;
  if (reason) next.reason = reason;
  next.immediate = immediate;
  next.force = force;

  for (const [key, value] of Object.entries(metaRec)) {
    if (key === 'forceBuild') continue;
    if (Object.prototype.hasOwnProperty.call(next, key)) continue;
    next[key] = value;
  }

  return next;
}

export function stripBuilderFollowThroughMeta(meta?: UnknownRecord | null): UnknownRecord | undefined {
  const metaRec = asRecord<UnknownRecord>(meta);
  if (!metaRec) return undefined;
  let next: UnknownRecord | undefined;
  for (const key of Object.keys(metaRec)) {
    if (BUILDER_FOLLOW_THROUGH_META_KEYS.has(key)) {
      if (!next) next = { ...metaRec };
      delete next[key];
    }
  }
  return next ?? metaRec ?? undefined;
}

export function shouldFinalizeBuilderRegistry(
  opts?: BuilderPostBuildFollowThroughOpts | BuilderChestModeFollowThroughOpts | null
): boolean {
  return opts?.finalizeRegistry !== false;
}

export function shouldClearBuilderBuildUi(opts?: BuilderPostBuildFollowThroughOpts | null): boolean {
  return opts?.clearBuildUi !== false;
}

export function shouldApplyBuilderHandles(
  opts?: BuilderPostBuildFollowThroughOpts | BuilderChestModeFollowThroughOpts | null
): boolean {
  return opts?.applyHandles !== false;
}

export function shouldTriggerPlatformRender(opts?: BuilderPostBuildFollowThroughOpts | null): boolean {
  return opts?.triggerPlatformRender !== false;
}

export function readPostBuildUpdateShadows(opts?: BuilderPostBuildFollowThroughOpts | null): boolean {
  return opts?.updateShadows !== false;
}

export function shouldPurgeRemovedDoors(opts?: RefreshBuilderHandlesOpts | null): boolean {
  return !!opts?.purgeRemovedDoors;
}

export function shouldTriggerHandlesRefreshRender(opts?: RefreshBuilderHandlesOpts | null): boolean {
  return opts?.triggerRender !== false;
}

export function shouldRunBuilderFollowThroughRender(...flags: unknown[]): boolean {
  for (const flag of flags) {
    if (flag) return true;
  }
  return false;
}

export function readUpdateShadows(opts?: RefreshBuilderHandlesOpts | null): boolean {
  return !!opts?.updateShadows;
}

export function shouldTriggerStructuralRefreshRender(
  opts?: RequestBuilderStructuralRefreshOpts | null
): boolean {
  return opts?.triggerRender !== false;
}
