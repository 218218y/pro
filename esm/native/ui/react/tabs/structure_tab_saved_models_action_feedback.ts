import type { SavedModelsFeedbackLike } from './structure_tab_saved_models_shared.js';
import type {
  SavedModelsActionResult,
  SavedModelsActionToastLike,
} from './structure_tab_saved_models_action_feedback_shared.js';
import { emitSavedModelsActionToast } from './structure_tab_saved_models_action_feedback_shared.js';
import { getSavedModelsFailureToast } from './structure_tab_saved_models_action_feedback_failure.js';
import { getSavedModelsSuccessToast } from './structure_tab_saved_models_action_feedback_success.js';

export type { SavedModelsActionToastLike };

export function getSavedModelsActionToast(
  result: SavedModelsActionResult | null | undefined
): SavedModelsActionToastLike | null {
  if (!result) return { message: 'פעולת הדגמים נכשלה', type: 'error' };
  return result.ok === false ? getSavedModelsFailureToast(result) : getSavedModelsSuccessToast(result);
}

export function reportSavedModelsActionResult(
  fb: Pick<SavedModelsFeedbackLike, 'toast'>,
  result: SavedModelsActionResult | null | undefined
): SavedModelsActionToastLike | null {
  return emitSavedModelsActionToast(fb, getSavedModelsActionToast(result));
}
