import type { ActionMetaLike, UnknownRecord } from '../../../../../types';

import {
  constrainProjectRoomArchitectureToWardrobeWidth,
  KNOWN_PROJECT_CONFIG_MAP_KEYS,
  normalizeProjectRoomArchitecture,
  patchProjectRoomArchitecture,
} from '../../../features/project_config/api.js';
import { patchViaActions, readConfigPatchDataKeys } from '../../../services/api.js';

export {
  constrainProjectRoomArchitectureToWardrobeWidth,
  normalizeProjectRoomArchitecture,
  patchProjectRoomArchitecture,
};

export type StructuralMutationSlice = 'config' | 'ui' | 'runtime';
export type StructuralMutationBuildTiming = 'immediate' | 'coalesced' | 'none';

export type StructuralMutationOptions = {
  buildTiming?: StructuralMutationBuildTiming;
  metaOverrides?: ActionMetaLike;
};

export type ApplyStructuralMutationResult = {
  appliedViaActions: boolean;
  requestedBuild: boolean;
};

export type ApplyImmediateStructuralMutationResult = ApplyStructuralMutationResult;

type ApplyStructuralMutationArgs = {
  app: unknown;
  source: string;
  slice: StructuralMutationSlice;
  patch: UnknownRecord;
  options?: StructuralMutationOptions;
  applyDirectMutation: (meta: ActionMetaLike) => void;
};

type ApplyImmediateStructuralMutationArgs = Omit<ApplyStructuralMutationArgs, 'options'> & {
  metaOverrides?: ActionMetaLike;
};

function normalizeStructuralMutationSource(source: string): string {
  const normalized = String(source || '').trim();
  if (!normalized) {
    throw new Error('[WardrobePro] Structural mutation requires a source.');
  }
  return normalized;
}

function readStructuralMutationBuildTiming(
  options?: StructuralMutationOptions | null
): StructuralMutationBuildTiming {
  const timing = options?.buildTiming;
  if (timing == null) return 'immediate';
  if (timing === 'immediate' || timing === 'coalesced' || timing === 'none') return timing;
  throw new Error(`[WardrobePro] Unknown structural mutation build timing: ${String(timing)}`);
}

export function createStructuralMutationMeta(
  source: string,
  options?: StructuralMutationOptions | null
): ActionMetaLike {
  const metaOverrides = options?.metaOverrides;
  const buildTiming = readStructuralMutationBuildTiming(options);
  const meta: ActionMetaLike = metaOverrides ? { ...metaOverrides } : {};
  meta.source = normalizeStructuralMutationSource(source);

  if (buildTiming === 'none') {
    meta.immediate = false;
    meta.noBuild = true;
    delete meta.force;
    delete meta.forceBuild;
    return meta;
  }

  meta.immediate = buildTiming === 'coalesced' ? false : true;
  delete meta.noBuild;
  return meta;
}

export function createImmediateStructuralMutationMeta(
  source: string,
  metaOverrides?: ActionMetaLike
): ActionMetaLike {
  return createStructuralMutationMeta(source, {
    buildTiming: 'immediate',
    metaOverrides,
  });
}

function createSliceStructuralMutationMeta(
  slice: StructuralMutationSlice,
  source: string,
  options?: StructuralMutationOptions | null
): ActionMetaLike {
  const meta = createStructuralMutationMeta(source, options);

  // Runtime slice writes are normally profiled as transient/noBuild by the runtime
  // namespace because most runtime values are UI-only. Structural runtime inputs
  // (currently sketchMode) are different: the builder fingerprint reads them, so
  // the store reaction must be allowed to schedule a rebuild. Use an
  // explicit false sentinel so downstream transient meta merging cannot re-add
  // a no-build profile after this helper already stripped caller-provided noBuild.
  if (slice === 'runtime' && readStructuralMutationBuildTiming(options) !== 'none') meta.noBuild = false;

  return meta;
}

function readConfigPatchKeys(patch: UnknownRecord): string[] {
  return readConfigPatchDataKeys(patch).filter(key => key);
}

function readKnownConfigMapPatchKeys(patch: UnknownRecord): string[] {
  return readConfigPatchKeys(patch).filter(key => KNOWN_PROJECT_CONFIG_MAP_KEYS.has(key));
}

function assertNoMixedConfigMapPatch(patch: UnknownRecord, knownMapKeys: readonly string[]): void {
  if (!knownMapKeys.length) return;
  const patchKeys = readConfigPatchKeys(patch);
  if (knownMapKeys.length === patchKeys.length) return;
  throw new Error(
    `[WardrobePro] Immediate structural config mutation cannot mix map branches (${knownMapKeys.join(
      ', '
    )}) with scalar branches; split them into explicit semantic map and scalar writes.`
  );
}

export function applyImmediateStructuralMutation(
  args: ApplyImmediateStructuralMutationArgs
): ApplyImmediateStructuralMutationResult {
  return applyStructuralMutation({
    app: args.app,
    source: args.source,
    slice: args.slice,
    patch: args.patch,
    options: {
      buildTiming: 'immediate',
      metaOverrides: args.metaOverrides,
    },
    applyDirectMutation: args.applyDirectMutation,
  });
}

export function applyStructuralMutation(args: ApplyStructuralMutationArgs): ApplyStructuralMutationResult {
  const meta = createSliceStructuralMutationMeta(args.slice, args.source, args.options);

  if (args.slice === 'config') {
    const knownMapKeys = readKnownConfigMapPatchKeys(args.patch);
    if (knownMapKeys.length) {
      assertNoMixedConfigMapPatch(args.patch, knownMapKeys);
      args.applyDirectMutation(meta);
      return {
        appliedViaActions: false,
        requestedBuild: false,
      };
    }
  }

  const payload: UnknownRecord = { [args.slice]: args.patch };
  const appliedViaActions = !!patchViaActions(args.app, payload, meta);

  if (!appliedViaActions) {
    args.applyDirectMutation(meta);
  }

  return {
    appliedViaActions,
    // Build scheduling is intentionally delegated to canonical store reactivity.
    // The semantic meta above is the build request contract; this helper
    // must not add a second explicit structural-refresh request.
    requestedBuild: false,
  };
}

export function applyStructuralConfigMutation(
  app: unknown,
  source: string,
  configPatch: UnknownRecord,
  applyDirectMutation: (meta: ActionMetaLike) => void,
  options?: StructuralMutationOptions
): ApplyStructuralMutationResult {
  return applyStructuralMutation({
    app,
    source,
    slice: 'config',
    patch: configPatch,
    options,
    applyDirectMutation,
  });
}

export function applyImmediateStructuralConfigMutation(
  app: unknown,
  source: string,
  configPatch: UnknownRecord,
  applyDirectMutation: (meta: ActionMetaLike) => void,
  metaOverrides?: ActionMetaLike
): ApplyImmediateStructuralMutationResult {
  return applyStructuralConfigMutation(app, source, configPatch, applyDirectMutation, {
    buildTiming: 'immediate',
    metaOverrides,
  });
}

export function applyStructuralUiMutation(
  app: unknown,
  source: string,
  uiPatch: UnknownRecord,
  applyDirectMutation: (meta: ActionMetaLike) => void,
  options?: StructuralMutationOptions
): ApplyStructuralMutationResult {
  return applyStructuralMutation({
    app,
    source,
    slice: 'ui',
    patch: uiPatch,
    options,
    applyDirectMutation,
  });
}

export function applyImmediateStructuralUiMutation(
  app: unknown,
  source: string,
  uiPatch: UnknownRecord,
  applyDirectMutation: (meta: ActionMetaLike) => void,
  metaOverrides?: ActionMetaLike
): ApplyImmediateStructuralMutationResult {
  return applyStructuralUiMutation(app, source, uiPatch, applyDirectMutation, {
    buildTiming: 'immediate',
    metaOverrides,
  });
}

export function applyStructuralRuntimeMutation(
  app: unknown,
  source: string,
  runtimePatch: UnknownRecord,
  applyDirectMutation: (meta: ActionMetaLike) => void,
  options?: StructuralMutationOptions
): ApplyStructuralMutationResult {
  return applyStructuralMutation({
    app,
    source,
    slice: 'runtime',
    patch: runtimePatch,
    options,
    applyDirectMutation,
  });
}

export function applyImmediateStructuralRuntimeMutation(
  app: unknown,
  source: string,
  runtimePatch: UnknownRecord,
  applyDirectMutation: (meta: ActionMetaLike) => void,
  metaOverrides?: ActionMetaLike
): ApplyImmediateStructuralMutationResult {
  return applyStructuralRuntimeMutation(app, source, runtimePatch, applyDirectMutation, {
    buildTiming: 'immediate',
    metaOverrides,
  });
}
