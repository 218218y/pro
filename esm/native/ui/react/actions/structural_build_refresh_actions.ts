import type { ActionMetaLike, UnknownRecord } from '../../../../../types';

import { patchViaActions } from '../../../services/api.js';

export type StructuralMutationSlice = 'config' | 'ui';

export type ApplyImmediateStructuralMutationResult = {
  appliedViaActions: boolean;
  requestedBuild: boolean;
};

type ApplyImmediateStructuralMutationArgs = {
  app: unknown;
  source: string;
  slice: StructuralMutationSlice;
  patch: UnknownRecord;
  applyDirectMutation: (meta: ActionMetaLike) => void;
};

function normalizeImmediateStructuralMutationSource(source: string): string {
  const normalized = String(source || '').trim();
  if (!normalized) {
    throw new Error('[WardrobePro] Immediate structural mutation requires a source.');
  }
  return normalized;
}

export function createImmediateStructuralMutationMeta(source: string): ActionMetaLike {
  return { source: normalizeImmediateStructuralMutationSource(source), immediate: true };
}

export function applyImmediateStructuralMutation(
  args: ApplyImmediateStructuralMutationArgs
): ApplyImmediateStructuralMutationResult {
  const meta = createImmediateStructuralMutationMeta(args.source);
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
  applyDirectMutation: (meta: ActionMetaLike) => void
): ApplyImmediateStructuralMutationResult {
  return applyImmediateStructuralMutation({
    app,
    source,
    slice: 'config',
    patch: configPatch,
    applyDirectMutation,
  });
}

export function applyImmediateStructuralUiMutation(
  app: unknown,
  source: string,
  uiPatch: UnknownRecord,
  applyDirectMutation: (meta: ActionMetaLike) => void
): ApplyImmediateStructuralMutationResult {
  return applyImmediateStructuralMutation({
    app,
    source,
    slice: 'ui',
    patch: uiPatch,
    applyDirectMutation,
  });
}
