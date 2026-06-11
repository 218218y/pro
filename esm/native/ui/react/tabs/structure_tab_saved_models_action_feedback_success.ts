import type { SavedModelsActionResult } from './structure_tab_saved_models_action_feedback_shared.js';
import {
  getReorderSuccessMessage,
  type SavedModelsActionToastLike,
} from './structure_tab_saved_models_action_feedback_shared.js';

export function getSavedModelsSuccessToast(
  result: Extract<SavedModelsActionResult, { ok: true }>
): SavedModelsActionToastLike | null {
  switch (result.kind) {
    case 'apply':
      return {
        message: result.name ? `הדגם "${result.name}" נטען בהצלחה` : 'הדגם נטען בהצלחה',
        type: 'success',
      };
    case 'save':
      return { message: 'נשמר דגם חדש', type: 'success' };
    case 'overwrite':
      return { message: 'הדגם עודכן', type: 'success' };
    case 'toggle-lock':
      return { message: result.locked ? 'הדגם ננעל' : 'הנעילה בוטלה', type: 'success' };
    case 'delete':
      return { message: 'הדגם נמחק', type: 'success' };
    case 'move':
      return { message: result.dir === 'up' ? 'הדגם הוזז למעלה' : 'הדגם הוזז למטה', type: 'success' };
    case 'reorder':
      return { message: getReorderSuccessMessage(result.listType), type: 'success' };
    case 'transfer':
      return { message: 'הדגם הועבר', type: 'success' };
    default:
      return null;
  }
}
