import type {
  ActionMetaLike,
  AppContainer,
  ModulesActionsLike,
  ModulesConfigurationLike,
  ModulesRecomputeFromUiOptionsLike,
  UnknownRecord,
} from '../../../types';

import { requestBuilderBuildWithUiFromActionMeta } from '../runtime/builder_service_access.js';
import { setCfgModulesConfiguration } from '../runtime/cfg_access.js';
import type { DomainCornerReportNonFatal } from './domain_api_modules_corner_shared.js';

export type ModulesRecomputeBuildReason = 'noChange' | 'noModuleChange' | 'noMain';

const MODULES_RECOMPUTE_BUILD_SOURCE_BY_REASON: Record<ModulesRecomputeBuildReason, string> = {
  noChange: 'modules:recompute:noChange',
  noModuleChange: 'modules:recompute:noModuleChange',
  noMain: 'modules:recompute:noMain',
};

export type ModulesRecomputeWriteReason = 'derived' | 'noMainCleanup';

const MODULES_RECOMPUTE_WRITE_SOURCE_BY_REASON: Record<ModulesRecomputeWriteReason, string> = {
  derived: 'derived:modules',
  noMainCleanup: 'derived:modules:noMainCleanup',
};

const MODULES_RECOMPUTE_REPORT_OP_BY_REASON: Record<ModulesRecomputeWriteReason, string> = {
  derived: 'actions.modules.recomputeFromUi.cfgSetScalarFallback',
  noMainCleanup: 'actions.modules.recomputeFromUi.noMainCleanup',
};

export type ModulesRecomputeWriteResult =
  | {
      ok: true;
      via: 'setAll' | 'cfgFallback';
      writeMeta: ActionMetaLike;
    }
  | {
      ok: false;
      reason: 'writeFailed';
      writeMeta: ActionMetaLike;
    };

export type ModulesRecomputeBuildRequestPolicy = {
  forceRebuild?: boolean;
  skipBuild?: boolean;
};

type ModulesRecomputeMetaLike = ActionMetaLike | null | undefined;
type ModulesRecomputeOptionsLike =
  | ModulesRecomputeFromUiOptionsLike
  | ModulesRecomputeBuildRequestPolicy
  | null
  | undefined;

type ModulesRecomputeSingleArgumentLike =
  | ActionMetaLike
  | ModulesRecomputeFromUiOptionsLike
  | ModulesRecomputeBuildRequestPolicy
  | null
  | undefined;

function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object';
}

function readModulesRecomputeBuildBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function readModulesRecomputeRecordBoolean(value: unknown, key: string): boolean | undefined {
  if (!isRecord(value)) return undefined;
  return readModulesRecomputeBuildBoolean(value[key]);
}

function readModulesRecomputeBuildForce(
  meta?: ModulesRecomputeMetaLike,
  options?: ModulesRecomputeOptionsLike
): boolean {
  return (
    readModulesRecomputeRecordBoolean(options, 'forceRebuild') === true ||
    readModulesRecomputeRecordBoolean(meta, 'force') === true ||
    readModulesRecomputeRecordBoolean(meta, 'forceBuild') === true ||
    readModulesRecomputeRecordBoolean(options, 'force') === true ||
    readModulesRecomputeRecordBoolean(options, 'forceBuild') === true
  );
}

function hasExplicitSkipBuild(options?: ModulesRecomputeSingleArgumentLike): boolean {
  return readModulesRecomputeRecordBoolean(options, 'skipBuild') === true;
}

function hasExplicitNoBuild(meta?: ModulesRecomputeSingleArgumentLike): boolean {
  return readModulesRecomputeRecordBoolean(meta, 'noBuild') === true;
}

function resolveModulesRecomputePolicyArgs(args: {
  hasSeparateMeta: boolean;
  primary?: ModulesRecomputeFromUiOptionsLike | ActionMetaLike | null;
  secondary?: ModulesRecomputeFromUiOptionsLike | ModulesRecomputeBuildRequestPolicy | null;
}): {
  hasSeparateMeta: boolean;
  meta: ModulesRecomputeMetaLike;
  options: ModulesRecomputeOptionsLike;
} {
  return {
    hasSeparateMeta: args.hasSeparateMeta,
    meta: args.hasSeparateMeta ? args.primary : null,
    options: args.hasSeparateMeta ? args.secondary : args.primary,
  };
}

export function createModulesRecomputeBuildRequestPolicy(
  options?: ModulesRecomputeFromUiOptionsLike | ActionMetaLike | null,
  maybeOptions?: ModulesRecomputeFromUiOptionsLike | null
): ModulesRecomputeBuildRequestPolicy {
  const resolved = resolveModulesRecomputePolicyArgs({
    hasSeparateMeta: arguments.length > 1,
    primary: options,
    secondary: maybeOptions,
  });
  const next: ModulesRecomputeBuildRequestPolicy = {};
  if (hasExplicitSkipBuild(resolved.options)) next.skipBuild = true;
  else if (hasExplicitNoBuild(resolved.hasSeparateMeta ? resolved.meta : resolved.options)) {
    if (!readModulesRecomputeBuildForce(resolved.meta, resolved.options)) next.skipBuild = true;
  }
  if (readModulesRecomputeBuildForce(resolved.meta, resolved.options)) next.forceRebuild = true;
  return next;
}

export function shouldSkipModulesRecomputeBuild(
  metaOrOptions?: ModulesRecomputeSingleArgumentLike,
  maybeOptions?: ModulesRecomputeFromUiOptionsLike | ModulesRecomputeBuildRequestPolicy | null
): boolean {
  const hasSeparateMeta = arguments.length > 1;
  const meta = hasSeparateMeta ? metaOrOptions : null;
  const options = hasSeparateMeta ? maybeOptions : metaOrOptions;
  if (hasExplicitSkipBuild(options)) return true;
  if (readModulesRecomputeBuildForce(meta, options)) return false;
  return hasExplicitNoBuild(hasSeparateMeta ? meta : options);
}

export function createModulesRecomputeBuildMeta(
  meta: ActionMetaLike | null | undefined,
  options?: ModulesRecomputeFromUiOptionsLike | ModulesRecomputeBuildRequestPolicy | null
): ActionMetaLike {
  const next: ActionMetaLike = meta ? { ...meta } : {};
  if (readModulesRecomputeRecordBoolean(options, 'forceRebuild') === true) next.force = true;
  return next;
}

function readMetaSource(meta: ActionMetaLike | null | undefined, fallbackSource: string): string {
  return typeof meta?.source === 'string' && meta.source ? meta.source : fallbackSource;
}

export function getModulesRecomputeBuildSource(reason: ModulesRecomputeBuildReason): string {
  return MODULES_RECOMPUTE_BUILD_SOURCE_BY_REASON[reason];
}

export function createModulesRecomputeWriteMeta(
  meta: ActionMetaLike | null | undefined,
  fallbackSource: string,
  extras?: ActionMetaLike | null
): ActionMetaLike {
  return {
    ...(meta || {}),
    source: readMetaSource(meta, fallbackSource),
    immediate: true,
    ...(extras || {}),
  };
}

export function getModulesRecomputeWriteSource(reason: ModulesRecomputeWriteReason): string {
  return MODULES_RECOMPUTE_WRITE_SOURCE_BY_REASON[reason];
}

export function createDerivedModulesWriteMeta(meta: ActionMetaLike | null | undefined): ActionMetaLike {
  return createModulesRecomputeWriteMeta(meta, getModulesRecomputeWriteSource('derived'));
}

export function createNoMainModulesCleanupMeta(meta: ActionMetaLike | null | undefined): ActionMetaLike {
  return createModulesRecomputeWriteMeta(meta, getModulesRecomputeWriteSource('noMainCleanup'), {
    noBuild: true,
  });
}

function readModulesRecomputeWriteMeta(
  meta: ActionMetaLike | null | undefined,
  reason: ModulesRecomputeWriteReason
): ActionMetaLike {
  return reason === 'noMainCleanup'
    ? createNoMainModulesCleanupMeta(meta)
    : createDerivedModulesWriteMeta(meta);
}

function readModulesRecomputeReportOp(reason: ModulesRecomputeWriteReason): string {
  return MODULES_RECOMPUTE_REPORT_OP_BY_REASON[reason];
}

export function applyModulesRecomputeWrite(args: {
  App: AppContainer;
  modulesActions?: ModulesActionsLike | null;
  nextModules: ModulesConfigurationLike;
  meta?: ActionMetaLike | null;
  reason: ModulesRecomputeWriteReason;
  reportNonFatal: DomainCornerReportNonFatal;
}): ModulesRecomputeWriteResult {
  const { App, modulesActions, nextModules, meta, reason, reportNonFatal } = args;
  const writeMeta = readModulesRecomputeWriteMeta(meta, reason);
  try {
    if (typeof modulesActions?.setAll === 'function') {
      modulesActions.setAll(nextModules, writeMeta);
      return { ok: true, via: 'setAll', writeMeta };
    }

    setCfgModulesConfiguration(App, nextModules, writeMeta);
    return { ok: true, via: 'cfgFallback', writeMeta };
  } catch (error) {
    reportNonFatal(App, readModulesRecomputeReportOp(reason), error, { throttleMs: 6000 });
    return { ok: false, reason: 'writeFailed', writeMeta };
  }
}

export function requestModulesRecomputeBuild(
  App: AppContainer,
  uiOverride: unknown,
  meta: ActionMetaLike | null | undefined,
  reason: ModulesRecomputeBuildReason,
  options?: ModulesRecomputeFromUiOptionsLike | ModulesRecomputeBuildRequestPolicy | null
): boolean {
  if (shouldSkipModulesRecomputeBuild(meta, options)) return false;
  const source = getModulesRecomputeBuildSource(reason);
  const buildMeta = createModulesRecomputeBuildMeta(meta, options);
  return requestBuilderBuildWithUiFromActionMeta(App, uiOverride, buildMeta, {
    source,
    immediate: true,
    force: readModulesRecomputeRecordBoolean(options, 'forceRebuild') === true,
  });
}
