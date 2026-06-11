import type { ActionMetaLike, AppContainer, ModulesRecomputeFromUiOptionsLike } from '../../../types';

import { requestBuilderForcedBuild } from './builder_service_access.js';
import { getModulesActionFn } from './actions_access_domains.js';

export type StructuralModulesRecomputeFn = (
  uiOverride: unknown,
  meta?: ActionMetaLike,
  opts?: ModulesRecomputeFromUiOptionsLike
) => unknown;

export type StructuralModulesRecomputeMetaDefaults = {
  source?: string;
  immediate?: boolean;
  force?: boolean;
};

export type StructuralModulesRecomputeFallbackBuildOpts = {
  source?: string;
  reason?: string;
};

export type StructuralModulesRecomputeOpts = ModulesRecomputeFromUiOptionsLike & {
  structureChanged: boolean;
  preserveTemplate: boolean;
  anchorSide: 'left' | 'right';
};

type StructuralModulesRecomputeResultLike = {
  ok?: unknown;
};

function readStructuralMetaBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function readStructuralMetaString(value: unknown): string | undefined {
  return typeof value === 'string' && value ? value : undefined;
}

export function createStructuralModulesRecomputeOpts(
  overrides?: ModulesRecomputeFromUiOptionsLike | null
): StructuralModulesRecomputeOpts {
  const next: StructuralModulesRecomputeOpts = {
    structureChanged: true,
    preserveTemplate: true,
    anchorSide: 'left',
  };

  if (!overrides) return next;
  if (typeof overrides.structureChanged === 'boolean') next.structureChanged = overrides.structureChanged;
  if (typeof overrides.preserveTemplate === 'boolean') next.preserveTemplate = overrides.preserveTemplate;
  if (overrides.anchorSide === 'right' || overrides.anchorSide === 'left')
    next.anchorSide = overrides.anchorSide;
  if (typeof overrides.forceRebuild === 'boolean') next.forceRebuild = overrides.forceRebuild;
  if (typeof overrides.skipBuild === 'boolean') next.skipBuild = overrides.skipBuild;
  for (const [key, value] of Object.entries(overrides)) {
    if (key === 'structureChanged' || key === 'preserveTemplate' || key === 'anchorSide') continue;
    if (key === 'forceRebuild' || key === 'skipBuild') continue;
    next[key] = value;
  }
  return next;
}

export function createStructuralModulesRecomputeMeta(
  meta?: ActionMetaLike | null,
  defaults?: StructuralModulesRecomputeMetaDefaults | null
): ActionMetaLike {
  const metaRec: ActionMetaLike = meta ? { ...meta } : {};
  const source = readStructuralMetaString(metaRec.source) || readStructuralMetaString(defaults?.source);
  if (source) metaRec.source = source;

  const immediate =
    readStructuralMetaBoolean(metaRec.immediate) ?? readStructuralMetaBoolean(defaults?.immediate);
  if (typeof immediate === 'boolean') metaRec.immediate = immediate;

  const existingForce =
    readStructuralMetaBoolean(metaRec.force) ?? readStructuralMetaBoolean(metaRec.forceBuild);
  const defaultForce = readStructuralMetaBoolean(defaults?.force);
  if (typeof existingForce !== 'boolean' && typeof defaultForce === 'boolean') metaRec.force = defaultForce;

  return metaRec;
}

export function getAppStructuralModulesRecompute(App: unknown): StructuralModulesRecomputeFn | null {
  return getModulesActionFn<StructuralModulesRecomputeFn>(App, 'recomputeFromUi');
}

export function readStructuralModulesRecomputeResult(
  value: unknown
): StructuralModulesRecomputeResultLike | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as StructuralModulesRecomputeResultLike)
    : null;
}

function createStructuralModulesFallbackBuildMeta(
  meta?: ActionMetaLike | null,
  defaults?: StructuralModulesRecomputeMetaDefaults | null,
  fallback?: StructuralModulesRecomputeFallbackBuildOpts | null
): ActionMetaLike {
  const recomputeMeta = createStructuralModulesRecomputeMeta(meta, defaults);
  const defaultSource = readStructuralMetaString(recomputeMeta.source) || 'actions:modules:recomputeFromUi';
  const explicitSource = readStructuralMetaString(fallback?.source);
  const source = explicitSource || `${defaultSource}:fallbackBuild`;
  const reason =
    readStructuralMetaString(fallback?.reason) ||
    readStructuralMetaString((meta as ActionMetaLike | null | undefined)?.reason) ||
    defaultSource;
  return { source, reason };
}

function maybeRequestStructuralModulesFallbackBuild(
  App: AppContainer,
  meta?: ActionMetaLike | null,
  defaults?: StructuralModulesRecomputeMetaDefaults | null,
  fallback?: StructuralModulesRecomputeFallbackBuildOpts | null
): boolean {
  if (!fallback) return false;
  return requestBuilderForcedBuild(App, createStructuralModulesFallbackBuildMeta(meta, defaults, fallback));
}

export function didStructuralModulesRecomputeFail(result: unknown): boolean {
  if (result === false) return true;
  const rec = readStructuralModulesRecomputeResult(result);
  return !!rec && rec.ok === false;
}

export function runStructuralModulesRecompute(
  recomputeFromUi: StructuralModulesRecomputeFn | null | undefined,
  uiOverride: unknown,
  meta?: ActionMetaLike | null,
  defaults?: StructuralModulesRecomputeMetaDefaults | null,
  opts?: ModulesRecomputeFromUiOptionsLike | null
): unknown {
  if (typeof recomputeFromUi !== 'function') return undefined;
  return recomputeFromUi(
    uiOverride == null ? null : uiOverride,
    createStructuralModulesRecomputeMeta(meta, defaults),
    createStructuralModulesRecomputeOpts(opts)
  );
}

export function runAppStructuralModulesRecompute(
  App: AppContainer,
  uiOverride: unknown,
  meta?: ActionMetaLike | null,
  defaults?: StructuralModulesRecomputeMetaDefaults | null,
  opts?: ModulesRecomputeFromUiOptionsLike | null,
  fallbackBuild?: StructuralModulesRecomputeFallbackBuildOpts | null
): unknown {
  const recomputeFromUi = getAppStructuralModulesRecompute(App);
  if (typeof recomputeFromUi !== 'function') {
    maybeRequestStructuralModulesFallbackBuild(App, meta, defaults, fallbackBuild);
    return undefined;
  }
  const result = runStructuralModulesRecompute(recomputeFromUi, uiOverride, meta, defaults, opts);
  if (didStructuralModulesRecomputeFail(result)) {
    maybeRequestStructuralModulesFallbackBuild(App, meta, defaults, fallbackBuild);
  }
  return result;
}
