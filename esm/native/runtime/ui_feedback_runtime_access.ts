import type {
  UiFeedbackConfirmCallback,
  UiFeedbackModalStateLike,
  UiFeedbackReactLike,
  UiFeedbackRuntimeNamespaceLike,
  UiFeedbackPromptCallback,
} from '../../../types';

import { asRecord } from './record.js';
import { ensureServiceSlot, getServiceSlotMaybe } from './services_root_access.js';

function isPromptCallback(value: unknown): value is UiFeedbackPromptCallback {
  return typeof value === 'function';
}

function isConfirmCallback(value: unknown): value is UiFeedbackConfirmCallback {
  return typeof value === 'function';
}

function isUiFeedbackModalState(value: unknown): value is UiFeedbackModalStateLike {
  const rec = asRecord<UiFeedbackModalStateLike>(value);
  return (
    !!rec &&
    (rec.mode === 'prompt' ||
      rec.mode === 'confirm' ||
      rec.mode === null ||
      typeof rec.mode === 'undefined') &&
    (rec.onPrompt == null || isPromptCallback(rec.onPrompt)) &&
    (rec.onConfirm == null || isConfirmCallback(rec.onConfirm)) &&
    (rec.onCancel == null || isConfirmCallback(rec.onCancel))
  );
}

function createFeedbackModalState(): UiFeedbackModalStateLike {
  return {
    mode: null,
    onPrompt: null,
    onConfirm: null,
    onCancel: null,
    bindingsInstalled: false,
    boundConfirmBtn: null,
    boundCancelBtn: null,
    boundInput: null,
  };
}

export function getUiFeedbackRuntimeServiceMaybe(App: unknown): UiFeedbackRuntimeNamespaceLike | null {
  return getServiceSlotMaybe<UiFeedbackRuntimeNamespaceLike>(App, 'uiFeedbackRuntime');
}

export function ensureUiFeedbackRuntimeService(App: unknown): UiFeedbackRuntimeNamespaceLike {
  return ensureServiceSlot<UiFeedbackRuntimeNamespaceLike>(App, 'uiFeedbackRuntime');
}

export function getReactFeedbackHost(App: unknown): UiFeedbackReactLike | null {
  const runtime = getUiFeedbackRuntimeServiceMaybe(App);
  const host = runtime ? asRecord<UiFeedbackReactLike>(runtime.reactHost) : null;
  return host || null;
}

export function setReactFeedbackHost(
  App: unknown,
  host: UiFeedbackReactLike | null
): UiFeedbackReactLike | null {
  const runtime = ensureUiFeedbackRuntimeService(App);
  const previous = asRecord<UiFeedbackReactLike>(runtime.reactHost);
  runtime.reactHost = host || null;
  return previous || null;
}

export function restoreReactFeedbackHost(
  App: unknown,
  mountedHost: UiFeedbackReactLike,
  previous: UiFeedbackReactLike | null
): void {
  const runtime = getUiFeedbackRuntimeServiceMaybe(App);
  if (!runtime) return;
  if (runtime.reactHost !== mountedHost) return;
  runtime.reactHost = previous || null;
}

export function isUiFeedbackInstalled(App: unknown): boolean {
  return getUiFeedbackRuntimeServiceMaybe(App)?.installed === true;
}

export function markUiFeedbackInstalled(App: unknown): void {
  ensureUiFeedbackRuntimeService(App).installed = true;
}

export function isModeToastSyncInstalled(App: unknown): boolean {
  return getUiFeedbackRuntimeServiceMaybe(App)?.modeToastSyncInstalled === true;
}

export function markModeToastSyncInstalled(App: unknown): void {
  ensureUiFeedbackRuntimeService(App).modeToastSyncInstalled = true;
}

export function getModeToastSyncUnsub(App: unknown): unknown {
  return getUiFeedbackRuntimeServiceMaybe(App)?.modeToastSyncUnsub;
}

export function setModeToastSyncUnsub(App: unknown, unsubscribe: unknown): void {
  ensureUiFeedbackRuntimeService(App).modeToastSyncUnsub = unsubscribe;
}

export function getFeedbackModalStateMaybe(App: unknown): UiFeedbackModalStateLike | null {
  const runtime = getUiFeedbackRuntimeServiceMaybe(App);
  return isUiFeedbackModalState(runtime?.modalState) ? runtime.modalState : null;
}

export function ensureFeedbackModalState(App: unknown): UiFeedbackModalStateLike {
  const runtime = ensureUiFeedbackRuntimeService(App);
  const current = isUiFeedbackModalState(runtime.modalState) ? runtime.modalState : null;
  if (current) return current;
  const next = createFeedbackModalState();
  runtime.modalState = next;
  return next;
}

export function hasFeedbackModalBindingsInstalled(App: unknown): boolean {
  return ensureFeedbackModalState(App).bindingsInstalled === true;
}

export function markFeedbackModalBindingsInstalled(App: unknown): void {
  ensureFeedbackModalState(App).bindingsInstalled = true;
}

export function getStickyStatusToastElement(App: unknown): unknown {
  return getUiFeedbackRuntimeServiceMaybe(App)?.stickyStatusToastEl ?? null;
}

export function setStickyStatusToastElement(App: unknown, element: unknown): unknown {
  const runtime = ensureUiFeedbackRuntimeService(App);
  const previous = runtime.stickyStatusToastEl ?? null;
  runtime.stickyStatusToastEl = element ?? null;
  return previous;
}
