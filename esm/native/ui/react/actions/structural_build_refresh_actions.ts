import type { ActionMetaLike, UnknownRecord } from '../../../../../types';

import { KNOWN_PROJECT_CONFIG_MAP_KEYS } from '../../../features/project_config/api.js';
import { patchViaActions } from '../../../services/api.js';

export type StructuralMutationSlice = 'config' | 'ui' | 'runtime';

export type ApplyImmediateStructuralMutationResult = {
  appliedViaActions: boolean;
  requestedBuild: boolean;
};

type ApplyImmediateStructuralMutationArgs = {
  app: unknown;
  source: string;
  slice: StructuralMutationSlice;
  patch: UnknownRecord;
  metaOverrides?: ActionMetaLike;
  applyDirectMutation: (meta: ActionMetaLike) => void;
};

const CONFIG_PATCH_REPLACE_KEY = `${'__'}replace`;

function normalizeImmediateStructuralMutationSource(source: string): string {
  const normalized = String(source || '').trim();
  if (!normalized) {
    throw new Error('[WardrobePro] Immediate structural mutation requires a source.');
  }
  return normalized;
}

export function createImmediateStructuralMutationMeta(
  source: string,
  metaOverrides?: ActionMetaLike
): ActionMetaLike {
  const meta: ActionMetaLike = metaOverrides ? { ...metaOverrides } : {};
  meta.source = normalizeImmediateStructuralMutationSource(source);
  meta.immediate = true;
  delete meta.noBuild;
  return meta;
}

function createSliceImmediateStructuralMutationMeta(
  slice: StructuralMutationSlice,
  source: string,
  metaOverrides?: ActionMetaLike
): ActionMetaLike {
  const meta = createImmediateStructuralMutationMeta(source, metaOverrides);

  // Runtime slice writes are normally profiled as transient/noBuild by the runtime
  // namespace because most runtime values are UI-only. Structural runtime inputs
  // (currently sketchMode) are different: the builder fingerprint reads them, so
  // the immediate store reaction must be allowed to schedule a rebuild. Use an
  // explicit false sentinel so downstream transient meta merging cannot re-add
  // a no-build profile after this helper already stripped caller-provided noBuild.
  if (slice === 'runtime') meta.noBuild = false;

  return meta;
}

function readConfigPatchKeys(patch: UnknownRecord): string[] {
  return Object.keys(patch).filter(key => key && key !== CONFIG_PATCH_REPLACE_KEY);
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
  const meta = createSliceImmediateStructuralMutationMeta(args.slice, args.source, args.metaOverrides);

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
    // The immediate semantic meta above is the build request contract; this helper
    // must not add a second explicit structural-refresh request.
    requestedBuild: false,
  };
}

export function applyImmediateStructuralConfigMutation(
  app: unknown,
  source: string,
  configPatch: UnknownRecord,
  applyDirectMutation: (meta: ActionMetaLike) => void,
  metaOverrides?: ActionMetaLike
): ApplyImmediateStructuralMutationResult {
  return applyImmediateStructuralMutation({
    app,
    source,
    slice: 'config',
    patch: configPatch,
    metaOverrides,
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
  return applyImmediateStructuralMutation({
    app,
    source,
    slice: 'ui',
    patch: uiPatch,
    metaOverrides,
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
  return applyImmediateStructuralMutation({
    app,
    source,
    slice: 'runtime',
    patch: runtimePatch,
    metaOverrides,
    applyDirectMutation,
  });
}
