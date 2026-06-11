import type { SavedModelsActionFailureResult } from './structure_tab_saved_models_action_feedback_shared.js';
import {
  getMissingSelectionMessage,
  getMoveEdgeMessage,
  isQuietFailureReason,
  readFailureMessage,
  type SavedModelsActionToastLike,
} from './structure_tab_saved_models_action_feedback_shared.js';

export function getSavedModelsFailureToast(
  result: SavedModelsActionFailureResult
): SavedModelsActionToastLike | null {
  const { kind, reason } = result;
  const message = readFailureMessage(result);
  if (isQuietFailureReason(reason)) return null;
  if (reason === 'busy') return { message: 'פעולת דגמים אחרת כבר מתבצעת כרגע', type: 'info' };
  if (reason === 'missing-selection') return getMissingSelectionMessage(kind);

  switch (kind) {
    case 'apply':
      if (reason === 'missing') return { message: 'הדגם לא נמצא', type: 'error' };
      if (reason === 'invalid') return { message: 'הדגם השמור לא תקין', type: 'error' };
      if (reason === 'not-installed') return { message: 'טעינת הדגם לא זמינה כרגע', type: 'error' };
      if ((reason === 'error' || reason === 'load') && message) return { message, type: 'error' };
      return { message: 'טעינת הדגם נכשלה', type: 'error' };
    case 'save':
      if (reason === 'error' && message) return { message, type: 'error' };
      if (reason === 'duplicate-locked') {
        return { message: 'כבר קיים דגם בשם זה והוא נעול. בטל נעילה כדי לעדכן.', type: 'warning' };
      }
      if (reason === 'missing-id') return { message: 'שמירה נכשלה (חסר מזהה לדגם קיים)', type: 'error' };
      return { message: 'שמירת דגם נכשלה', type: 'error' };
    case 'overwrite':
      if (reason === 'error' && message) return { message, type: 'error' };
      if (reason === 'missing') return { message: 'הדגם לא נמצא', type: 'error' };
      if (reason === 'preset') return { message: 'דגם מובנה לא ניתן לעדכון', type: 'info' };
      if (reason === 'locked') return { message: 'הדגם נעול. בטל נעילה כדי לעדכן.', type: 'warning' };
      return { message: 'עדכון דגם נכשל', type: 'error' };
    case 'toggle-lock':
      if (reason === 'missing') return { message: 'הדגם לא נמצא', type: 'error' };
      if (reason === 'preset') return { message: 'דגם מובנה לא צריך נעילה', type: 'info' };
      return { message: 'שינוי נעילה נכשל', type: 'error' };
    case 'delete':
      if (reason === 'error' && message) return { message, type: 'error' };
      if (reason === 'missing') return { message: 'הדגם לא נמצא', type: 'error' };
      if (reason === 'preset') return { message: 'לא ניתן למחוק דגם מובנה', type: 'error' };
      if (reason === 'locked') return { message: 'הדגם נעול. בטל נעילה כדי למחוק.', type: 'warning' };
      return { message: 'מחיקת דגם נכשלה', type: 'error' };
    case 'move':
      if (reason === 'locked') return { message: 'הדגם נעול. בטל נעילה כדי להזיז.', type: 'warning' };
      if (reason === 'edge' || reason === 'overPreset') return getMoveEdgeMessage(reason);
      return { message: 'הזזה נכשלה', type: 'error' };
    case 'reorder':
      if (reason === 'locked') return { message: 'הדגם נעול. בטל נעילה כדי לשנות סדר.', type: 'warning' };
      if (reason === 'edge' || reason === 'overPreset') return getMoveEdgeMessage(reason);
      return { message: 'שינוי סדר נכשל', type: 'error' };
    case 'transfer':
      if (reason === 'locked') return { message: 'הדגם נעול. בטל נעילה כדי להעביר.', type: 'warning' };
      if (reason === 'not-installed') return { message: 'העברת דגם לא זמינה כרגע', type: 'error' };
      return { message: 'העברת דגם נכשלה', type: 'error' };
    default:
      return { message: 'פעולת הדגמים נכשלה', type: 'error' };
  }
}
