import type {
  AppContainer,
  UiFeedbackConfirmCallback,
  UiFeedbackEditToastFn,
  UiFeedbackNamespaceLike,
  UiFeedbackPromptCallback,
  UiFeedbackStableLike,
} from '../../../types';

import { getMode } from './store_access.js';
import { getDocumentMaybe, getModeToastSyncUnsub } from '../services/api.js';
import {
  type ToastType,
  __uiFeedbackReportNonFatal,
  ensureFeedbackService,
  isStubFn,
  readAppWithModalState,
} from './feedback_shared.js';
import {
  isModeToastSyncInstalled,
  isUiFeedbackInstalled,
  markModeToastSyncInstalled,
  markUiFeedbackInstalled,
  setModeToastSyncUnsub,
} from '../services/api.js';
import { openCustomConfirm, openCustomPrompt } from './feedback_modal.js';
import { showToast, updateEditStateToast } from './feedback_toast.js';

function isLiveCleanupHandle(value: unknown): boolean {
  return (
    typeof value === 'function' ||
    (!!value && typeof value === 'object' && typeof Reflect.get(value, 'unsubscribe') === 'function')
  );
}

type InstalledCallable = (...args: never[]) => unknown;

function isInstalledCallable<T extends InstalledCallable>(value: unknown): value is T {
  return typeof value === 'function' && !isStubFn(value);
}

function chooseInstalledCallable<T extends InstalledCallable>(
  primary: unknown,
  secondary: unknown,
  fallback: T
): T {
  if (isInstalledCallable<T>(primary)) return primary;
  if (isInstalledCallable<T>(secondary)) return secondary;
  return fallback;
}

function hasStableUiFeedbackSurface(value: UiFeedbackNamespaceLike): value is UiFeedbackStableLike {
  return (
    typeof value.toast === 'function' &&
    typeof value.showToast === 'function' &&
    typeof value.prompt === 'function' &&
    typeof value.openCustomPrompt === 'function' &&
    typeof value.confirm === 'function' &&
    typeof value.openCustomConfirm === 'function' &&
    typeof value.updateEditStateToast === 'function'
  );
}

function installModeToastSync(App: AppContainer): void {
  try {
    if (isLiveCleanupHandle(getModeToastSyncUnsub(App))) {
      if (!isModeToastSyncInstalled(App)) markModeToastSyncInstalled(App);
      return;
    }

    const store = readAppWithModalState(App)?.store;
    if (!store || typeof store.subscribe !== 'function' || typeof store.getState !== 'function') return;

    let lastPrimary = '';
    const check = () => {
      try {
        const mode = getMode(App);
        const primary = mode && mode.primary != null ? String(mode.primary) : 'none';
        if (primary === lastPrimary) return;
        lastPrimary = primary;

        if (!primary || primary === 'none') {
          updateEditStateToast(App, null, false);
          try {
            const doc = getDocumentMaybe(App);
            if (doc?.body) doc.body.style.cursor = 'default';
          } catch (err) {
            __uiFeedbackReportNonFatal('feedback.install.resetCursor', err);
          }
        }
      } catch (err) {
        __uiFeedbackReportNonFatal('feedback.install.modeSyncCheck', err);
      }
    };

    check();
    setModeToastSyncUnsub(App, store.subscribe(check));
    if (!isModeToastSyncInstalled(App)) markModeToastSyncInstalled(App);
  } catch (err) {
    __uiFeedbackReportNonFatal('feedback.install.modeSync', err);
  }
}

function fillUiFeedbackSurface(App: AppContainer, fb: UiFeedbackNamespaceLike): UiFeedbackStableLike {
  const toastImpl = (message: unknown, type?: ToastType | string) => showToast(App, message, type);
  const toast = chooseInstalledCallable(fb.toast, fb.showToast, toastImpl);
  if (fb.toast !== toast) fb.toast = toast;
  if (fb.showToast !== toast) fb.showToast = toast;

  const promptImpl = (title: unknown, def: unknown, cb?: UiFeedbackPromptCallback | null) =>
    openCustomPrompt(App, title, def, cb);
  const prompt = chooseInstalledCallable(fb.prompt, fb.openCustomPrompt, promptImpl);
  if (fb.prompt !== prompt) fb.prompt = prompt;
  if (fb.openCustomPrompt !== prompt) fb.openCustomPrompt = prompt;

  const confirmImpl = (
    title: unknown,
    msg: unknown,
    onYes?: UiFeedbackConfirmCallback | null,
    onNo?: UiFeedbackConfirmCallback | null
  ) => openCustomConfirm(App, title, msg, onYes, onNo);
  const confirm = chooseInstalledCallable(fb.confirm, fb.openCustomConfirm, confirmImpl);
  if (fb.confirm !== confirm) fb.confirm = confirm;
  if (fb.openCustomConfirm !== confirm) fb.openCustomConfirm = confirm;

  const editToastImpl: UiFeedbackEditToastFn = (text: string | null, isActive: boolean) =>
    updateEditStateToast(App, text, isActive);
  const editToast = chooseInstalledCallable(fb.updateEditStateToast, null, editToastImpl);
  if (fb.updateEditStateToast !== editToast) fb.updateEditStateToast = editToast;

  if (!hasStableUiFeedbackSurface(fb)) {
    throw new Error('[WardrobePro] UiFeedback surface install did not produce a stable feedback surface');
  }

  return fb;
}

export function installUiFeedback(App: AppContainer | null | undefined): UiFeedbackStableLike | null {
  if (!App || typeof App !== 'object') return null;

  const appWithState = readAppWithModalState(App);
  if (!appWithState) return null;

  const fb = ensureFeedbackService(appWithState);
  if (!fb) return null;

  try {
    const stableFeedback = fillUiFeedbackSurface(App, fb);
    if (!isUiFeedbackInstalled(appWithState)) markUiFeedbackInstalled(appWithState);
    installModeToastSync(App);
    return stableFeedback;
  } catch (err) {
    __uiFeedbackReportNonFatal('feedback.install', err);
  }

  return hasStableUiFeedbackSurface(fb) ? fb : null;
}
