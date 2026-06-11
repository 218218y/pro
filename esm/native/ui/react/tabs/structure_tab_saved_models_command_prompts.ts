import type { SavedModelsFeedbackLike } from './structure_tab_saved_models_shared.js';
import { requestConfirmationFromFeedback, type UiConfirmLike } from '../../feedback_confirm_runtime.js';
import { requestPromptFromFeedback } from '../../feedback_prompt_runtime.js';

export function requestSavedModelName(
  fb: Pick<SavedModelsFeedbackLike, 'prompt' | 'openCustomPrompt'>,
  title: string,
  defaultValue: string
) {
  return requestPromptFromFeedback(fb, title, defaultValue, 'שמירת דגם לא זמינה כרגע');
}

export function confirmSavedModelAction(
  fb: Pick<SavedModelsFeedbackLike, 'confirm'> & UiConfirmLike,
  title: string,
  message: string
) {
  return requestConfirmationFromFeedback(fb, title, message);
}
