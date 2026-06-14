import type { ActionMetaLike, UnknownRecord } from '../../../../../types';

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

export function applyImmediateStructuralMutation(
  args: ApplyImmediateStructuralMutationArgs
): ApplyImmediateStructuralMutationResult {
  const meta = createImmediateStructuralMutationMeta(args.source, args.metaOverrides);
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
