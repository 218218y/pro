import type { ActionMetaLike, UnknownRecord } from '../../../../../types';

import { patchViaActions, requestBuilderStructuralRefresh } from '../../../services/api.js';

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

export function createImmediateStructuralMutationMeta(source: string): ActionMetaLike {
  return { source, immediate: true, noBuild: true };
}

function requestStructuralRefreshAfterMutation(app: unknown, source: string): boolean {
  const result = requestBuilderStructuralRefresh(app, {
    source,
    immediate: false,
    force: false,
    triggerRender: false,
  });
  return !!result.requestedBuild;
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
    requestedBuild: requestStructuralRefreshAfterMutation(args.app, args.source),
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
