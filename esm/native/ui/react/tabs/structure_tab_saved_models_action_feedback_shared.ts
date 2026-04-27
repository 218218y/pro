import type { UiFeedbackToastKind } from '../../../../../types';

import type {
  SavedModelsActionFailureResult,
  SavedModelsActionKind,
  SavedModelsActionResult,
} from './structure_tab_saved_models_command_flows.js';
import type { SavedModelsFeedbackLike, SavedModelsListType } from './structure_tab_saved_models_shared.js';

export type SavedModelsActionToastLike = {
  message: string;
  type: UiFeedbackToastKind;
};

export function readFailureMessage(result: SavedModelsActionFailureResult | null | undefined): string {
  return typeof result?.message === 'string' ? result.message.trim() : '';
}

export function isQuietFailureReason(reason: SavedModelsActionFailureResult['reason']): boolean {
  return reason === 'cancelled' || reason === 'superseded';
}

export function getMoveEdgeMessage(
  reason: SavedModelsActionFailureResult['reason']
): SavedModelsActionToastLike {
  if (reason === 'overPreset') {
    return { message: 'לא ניתן להזיז דגם שמור מעל הדגמים המובנים', type: 'info' };
  }
  return { message: 'כבר בקצה הרשימה', type: 'info' };
}

export function getReorderSuccessMessage(listType: SavedModelsListType | undefined): string {
  return listType === 'preset' ? 'סדר הדגמים המובנים עודכן' : 'סדר הדגמים עודכן';
}

export function getMissingSelectionMessage(kind: SavedModelsActionKind): SavedModelsActionToastLike {
  switch (kind) {
    case 'apply':
      return { message: 'בחר דגם כדי לטעון', type: 'warning' };
    case 'overwrite':
      return { message: 'בחר דגם כדי לעדכן', type: 'warning' };
    case 'toggle-lock':
      return { message: 'בחר דגם כדי לנעול/לשחרר', type: 'warning' };
    case 'delete':
      return { message: 'בחר דגם למחיקה', type: 'warning' };
    case 'move':
    case 'reorder':
      return { message: 'בחר דגם כדי להזיז', type: 'warning' };
    case 'transfer':
      return { message: 'בחר דגם כדי להעביר', type: 'warning' };
    default:
      return { message: 'בחר דגם', type: 'warning' };
  }
}

export function emitSavedModelsActionToast(
  fb: Pick<SavedModelsFeedbackLike, 'toast'>,
  toast: SavedModelsActionToastLike | null
): SavedModelsActionToastLike | null {
  if (toast && typeof fb.toast === 'function') fb.toast(toast.message, toast.type);
  return toast;
}

export type { SavedModelsActionFailureResult, SavedModelsActionKind, SavedModelsActionResult };
