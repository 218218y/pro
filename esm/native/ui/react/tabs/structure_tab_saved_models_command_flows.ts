import type { ModelsServiceLike, SavedModelId, SavedModelLike } from '../../../../../types';

import type { SavedModelsFeedbackLike } from './structure_tab_saved_models_shared.js';
import {
  applySavedModel,
  deleteSavedModel,
  findExistingSavedModelByName,
  moveSavedModel,
  overwriteSavedModel,
  reorderSavedModelsByDnD,
  saveCurrentModelByName,
  toggleSavedModelLock,
  transferSavedModelByDnD,
} from './structure_tab_saved_models_commands.js';
import {
  buildActionFailure,
  identifyModel,
  trimName,
  type SavedModelsActionKind,
  type SavedModelsActionResult,
} from './structure_tab_saved_models_command_results.js';
import {
  confirmSavedModelAction,
  requestSavedModelName,
} from './structure_tab_saved_models_command_prompts.js';
import { runConfirmedAction, runPromptedAction } from '../../feedback_action_runtime.js';
import {
  getModelId,
  getModelName,
  getNextDefaultSavedModelName,
  isLockedModel,
  isPresetModel,
} from './structure_tab_saved_models_shared.js';

export type {
  SavedModelsActionBase,
  SavedModelsActionFailureReason,
  SavedModelsActionFailureResult,
  SavedModelsActionKind,
  SavedModelsActionResult,
  SavedModelsActionSuccessResult,
} from './structure_tab_saved_models_command_results.js';
export {
  applySavedModel,
  deleteSavedModel,
  findExistingSavedModelByName,
  moveSavedModel,
  overwriteSavedModel,
  reorderSavedModelsByDnD,
  requestSavedModelName,
  saveCurrentModelByName,
  toggleSavedModelLock,
  transferSavedModelByDnD,
  confirmSavedModelAction,
};

export async function runSaveCurrentModelFlow(args: {
  fb: Pick<SavedModelsFeedbackLike, 'prompt' | 'confirm'>;
  modelsApi: ModelsServiceLike;
  models: SavedModelLike[];
}): Promise<SavedModelsActionResult> {
  const defaultName = getNextDefaultSavedModelNameSafe(args.models);
  return await runPromptedAction<SavedModelsActionResult>({
    request: () => requestSavedModelName(args.fb, 'שם דגם חדש', defaultName),
    onRequestError: message => buildActionFailure('save', 'error', {}, message),
    onCancelled: () => buildActionFailure('save', 'cancelled'),
    normalizeValue: value => trimName(value),
    runSubmitted: async name => {
      const existing = findExistingSavedModelByName(args.models, name);
      if (existing) {
        const existingId = getModelId(existing);
        if (!existingId) return buildActionFailure('save', 'missing-id', { name });
        if (isLockedModel(existing)) {
          return buildActionFailure('save', 'duplicate-locked', {
            id: existingId,
            name: getModelName(existing, name),
          });
        }
        const existingName = getModelName(existing, name);
        return await runConfirmedAction<SavedModelsActionResult>({
          request: () =>
            confirmSavedModelAction(
              args.fb,
              'דגם קיים',
              `כבר קיים דגם בשם "${existingName || name}". לדרוס אותו?`
            ),
          onRequestError: message =>
            buildActionFailure(
              'overwrite',
              'error',
              {
                id: existingId,
                name: existingName,
              },
              message
            ),
          onCancelled: () =>
            buildActionFailure('overwrite', 'cancelled', {
              id: existingId,
              name: existingName,
            }),
          runConfirmed: () => overwriteSavedModel(args.modelsApi, existingId),
        });
      }

      return saveCurrentModelByName(args.modelsApi, name);
    },
  });
}

export async function runOverwriteSavedModelFlow(args: {
  fb: Pick<SavedModelsFeedbackLike, 'confirm'>;
  modelsApi: ModelsServiceLike;
  id: SavedModelId;
}): Promise<SavedModelsActionResult> {
  const identified = identifyWritableSavedModel(args.modelsApi, 'overwrite', args.id);
  if (!identified.ok) return identified;

  return await runConfirmedAction<SavedModelsActionResult>({
    request: () =>
      confirmSavedModelAction(
        args.fb,
        'עדכון דגם שמור',
        `לעדכן את "${identified.name || 'הדגם'}" לפי המצב הנוכחי? (הפעולה תדרוס את הדגם השמור)`
      ),
    onRequestError: message =>
      buildActionFailure('overwrite', 'error', { id: identified.id, name: identified.name }, message),
    onCancelled: () =>
      buildActionFailure('overwrite', 'cancelled', { id: identified.id, name: identified.name }),
    runConfirmed: () => overwriteSavedModel(args.modelsApi, identified.id || ''),
  });
}

export async function runDeleteSavedModelFlow(args: {
  fb: Pick<SavedModelsFeedbackLike, 'confirm'>;
  modelsApi: ModelsServiceLike;
  id: SavedModelId;
}): Promise<SavedModelsActionResult> {
  const identified = identifyWritableSavedModel(args.modelsApi, 'delete', args.id);
  if (!identified.ok) return identified;

  return await runConfirmedAction<SavedModelsActionResult>({
    request: () =>
      confirmSavedModelAction(args.fb, 'מחיקת דגם', 'למחוק את הדגם הנבחר? פעולה זו לא ניתנת לביטול.'),
    onRequestError: message =>
      buildActionFailure('delete', 'error', { id: identified.id, name: identified.name }, message),
    onCancelled: () =>
      buildActionFailure('delete', 'cancelled', { id: identified.id, name: identified.name }),
    runConfirmed: () => deleteSavedModel(args.modelsApi, identified.id || ''),
  });
}

function identifyWritableSavedModel(
  modelsApi: ModelsServiceLike,
  kind: Extract<SavedModelsActionKind, 'overwrite' | 'delete'>,
  id: SavedModelId
): SavedModelsActionResult & { kind: 'overwrite' | 'delete'; model?: SavedModelLike | null } {
  const identified = identifyModel(modelsApi, kind, id);
  if (!identified.ok) return identified;
  if (isPresetModel(identified.model)) {
    return buildActionFailure(kind, 'preset', { id: identified.id, name: identified.name });
  }
  if (isLockedModel(identified.model)) {
    return buildActionFailure(kind, 'locked', { id: identified.id, name: identified.name });
  }
  return identified;
}

function getNextDefaultSavedModelNameSafe(models: SavedModelLike[]): string {
  try {
    return getNextDefaultSavedModelName(models);
  } catch {
    return 'דגם 1';
  }
}
