import test from 'node:test';
import assert from 'node:assert/strict';

import { installUiFeedback } from '../esm/native/ui/feedback.ts';
import {
  ensureFeedbackModalState,
  getStickyStatusToastElement,
  getUiFeedbackRuntimeServiceMaybe,
  isUiFeedbackInstalled,
  markFeedbackModalBindingsInstalled,
  setStickyStatusToastElement,
} from '../esm/native/runtime/ui_feedback_runtime_access.ts';

test('feedback modal state is stored under canonical services.uiFeedbackRuntime', () => {
  const App = { services: { uiFeedback: {} } } as any;

  const modal = ensureFeedbackModalState(App);
  modal.mode = 'prompt';
  markFeedbackModalBindingsInstalled(App);

  assert.equal(App.services.uiFeedback.__modalState, undefined);
  assert.ok(App.services.uiFeedbackRuntime);
  assert.equal(App.services.uiFeedbackRuntime.modalState, modal);
  assert.equal(App.services.uiFeedbackRuntime.modalState.mode, 'prompt');
  assert.equal(App.services.uiFeedbackRuntime.modalState.bindingsInstalled, true);
});

test('feedback install state is tracked under canonical runtime service instead of uiFeedback public namespace', () => {
  const App = {
    services: { uiFeedback: {} },
    store: {
      subscribe() {
        return () => {};
      },
      getState() {
        return { mode: { primary: 'none' } };
      },
    },
    deps: {
      browser: {
        document: { body: { style: {} }, defaultView: {} },
        window: { document: { body: { style: {} } } },
      },
    },
  } as any;

  const feedback = installUiFeedback(App);
  const runtime = getUiFeedbackRuntimeServiceMaybe(App);

  assert.ok(feedback);
  assert.equal(isUiFeedbackInstalled(App), true);
  assert.ok(runtime);
  assert.equal(runtime?.installed, true);
  assert.equal(App.services.uiFeedback.__feedbackInstalled, undefined);
  assert.equal(App.services.uiFeedback.__wpModeToastSyncInstalled, undefined);
  assert.equal(runtime?.modeToastSyncInstalled, true);
});

test('sticky status toast element is stored under canonical uiFeedbackRuntime service', () => {
  const App = { services: { uiFeedback: {} } } as any;
  const toastEl = { id: 'stickyStatusToast' };

  assert.equal(getStickyStatusToastElement(App), null);
  assert.equal(setStickyStatusToastElement(App, toastEl), null);
  assert.equal(getStickyStatusToastElement(App), toastEl);
  assert.equal(App.__wpStickyStatusToastEl, undefined);
  assert.equal(App.services.uiFeedbackRuntime.stickyStatusToastEl, toastEl);
});

test('ui feedback install heals a damaged surface without replacing canonical method refs and restores mode-sync handle', () => {
  let subscribeCalls = 0;

  const App = {
    services: { uiFeedback: {} },
    store: {
      subscribe(listener?: () => void) {
        subscribeCalls += 1;
        void listener;
        return () => {};
      },
      getState() {
        return { mode: { primary: 'none' } };
      },
    },
    deps: {
      browser: {
        document: { body: { style: {} }, defaultView: {} },
        window: { document: { body: { style: {} } } },
      },
    },
  } as any;

  const feedback = installUiFeedback(App);
  const runtime = getUiFeedbackRuntimeServiceMaybe(App);
  const toastRef = feedback?.toast;
  const confirmRef = feedback?.confirm;
  const promptRef = feedback?.prompt;

  assert.equal(typeof runtime?.modeToastSyncUnsub, 'function');
  assert.equal(subscribeCalls, 1);

  delete feedback?.showToast;
  delete feedback?.openCustomPrompt;
  delete feedback?.openCustomConfirm;
  delete feedback?.updateEditStateToast;
  runtime!.modeToastSyncUnsub = null;

  const repaired = installUiFeedback(App);

  assert.equal(repaired, feedback);
  assert.equal(repaired?.toast, toastRef);
  assert.equal(repaired?.showToast, toastRef);
  assert.equal(repaired?.prompt, promptRef);
  assert.equal(repaired?.openCustomPrompt, promptRef);
  assert.equal(repaired?.confirm, confirmRef);
  assert.equal(repaired?.openCustomConfirm, confirmRef);
  assert.equal(typeof repaired?.updateEditStateToast, 'function');
  assert.equal(typeof runtime?.modeToastSyncUnsub, 'function');
  assert.equal(subscribeCalls, 2);
});
