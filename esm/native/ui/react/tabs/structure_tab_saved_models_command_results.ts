import type {
  ModelsCommandReason,
  ModelsCommandResult,
  ModelsLockResult,
  ModelsSaveResult,
  ModelsServiceLike,
  SavedModelId,
  SavedModelLike,
} from '../../../../../types';

import { normalizeModelsCommandReason } from '../../../services/api.js';
import type { SavedModelsListType, SavedModelsMoveDir } from './structure_tab_saved_models_shared.js';
import { getModelName, isLockedModel } from './structure_tab_saved_models_shared.js';

export type SavedModelsActionKind =
  | 'apply'
  | 'save'
  | 'overwrite'
  | 'toggle-lock'
  | 'delete'
  | 'move'
  | 'reorder'
  | 'transfer';

export type SavedModelsActionFailureReason =
  | ModelsCommandReason
  | 'cancelled'
  | 'duplicate-locked'
  | 'missing-id'
  | 'missing-selection'
  | 'busy';

export type SavedModelsActionBase = {
  kind: SavedModelsActionKind;
  id?: SavedModelId;
  name?: string;
  locked?: boolean;
  dir?: SavedModelsMoveDir;
  listType?: SavedModelsListType;
};

export type SavedModelsActionSuccessResult = SavedModelsActionBase & {
  ok: true;
};

export type SavedModelsActionFailureResult = SavedModelsActionBase & {
  ok: false;
  reason: SavedModelsActionFailureReason;
  message?: string;
};

export type SavedModelsActionResult = SavedModelsActionSuccessResult | SavedModelsActionFailureResult;

type IdentifiableSavedModelsActionKind = Exclude<
  SavedModelsActionKind,
  'save' | 'move' | 'reorder' | 'transfer'
>;

type SavedModelsIdentifiedResult<
  K extends IdentifiableSavedModelsActionKind = IdentifiableSavedModelsActionKind,
> = (SavedModelsActionSuccessResult | SavedModelsActionFailureResult) & {
  kind: K;
  model?: SavedModelLike | null;
};

export function trimId(value: unknown): SavedModelId {
  return String(value || '').trim();
}

export function trimName(value: unknown): string {
  return String(value || '').trim();
}

export function buildActionSuccess<K extends SavedModelsActionKind>(
  kind: K,
  extras: Omit<SavedModelsActionBase, 'kind'> = {}
): SavedModelsActionSuccessResult & { kind: K } {
  return { ok: true, kind, ...extras };
}

export function buildActionFailure<K extends SavedModelsActionKind>(
  kind: K,
  reason: SavedModelsActionFailureReason,
  extras: Omit<SavedModelsActionBase, 'kind'> = {},
  message?: string
): SavedModelsActionFailureResult & { kind: K } {
  return {
    ok: false,
    kind,
    reason,
    ...(message ? { message } : {}),
    ...extras,
  };
}

export function buildCommandActionResult<K extends SavedModelsActionKind>(
  kind: K,
  result: ModelsCommandResult | ModelsLockResult | ModelsSaveResult | null | undefined,
  extras: Omit<SavedModelsActionBase, 'kind'> = {},
  fallbackReason: ModelsCommandReason = 'error'
): SavedModelsActionResult & { kind: K } {
  if (result?.ok) return buildActionSuccess(kind, extras);
  return buildActionFailure(
    kind,
    normalizeModelsCommandReason(result?.reason, fallbackReason),
    extras,
    readResultMessage(result)
  );
}

export function getModelMaybe(modelsApi: ModelsServiceLike, id: SavedModelId): SavedModelLike | null {
  try {
    return modelsApi.getById(id);
  } catch {
    return null;
  }
}

export function identifyModel<K extends IdentifiableSavedModelsActionKind>(
  modelsApi: ModelsServiceLike,
  kind: K,
  id: SavedModelId,
  missingSelectionReason: SavedModelsActionFailureReason = 'missing-selection'
): SavedModelsIdentifiedResult<K> {
  const trimmedId = trimId(id);
  if (!trimmedId) return buildActionFailure(kind, missingSelectionReason, { id: '' });

  const model = getModelMaybe(modelsApi, trimmedId);
  if (!model) return { ...buildActionFailure(kind, 'missing', { id: trimmedId }), model: null };

  return {
    ...buildActionSuccess(kind, {
      id: trimmedId,
      name: getModelName(model),
      locked: isLockedModel(model),
    }),
    model,
  };
}

function readResultMessage(result: { message?: unknown } | null | undefined): string | undefined {
  const message = typeof result?.message === 'string' ? result.message.trim() : '';
  return message || undefined;
}
