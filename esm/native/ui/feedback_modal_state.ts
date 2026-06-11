import type { AppContainer, UiFeedbackModalStateLike } from '../../../types';

import {
  ensureFeedbackModalState as ensureFeedbackModalStateRuntime,
  getFeedbackModalStateMaybe as getFeedbackModalStateMaybeRuntime,
} from '../services/api.js';

export type FeedbackModalState = UiFeedbackModalStateLike;

export function getFeedbackModalStateMaybe(App: AppContainer | null | undefined): FeedbackModalState | null {
  if (!App || typeof App !== 'object') return null;
  try {
    return getFeedbackModalStateMaybeRuntime(App);
  } catch {
    return null;
  }
}

export function ensureFeedbackModalState(App: AppContainer): FeedbackModalState {
  return ensureFeedbackModalStateRuntime(App);
}
