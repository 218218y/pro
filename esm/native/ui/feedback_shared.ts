import type {
  AppContainer,
  UiFeedbackConfirmCallback,
  UiFeedbackNamespaceLike,
  UiFeedbackPromptCallback,
  UiFeedbackReactLike,
  UiFeedbackToastKind,
  UnknownCallable,
  UnknownRecord,
} from '../../../types';

import {
  ensureUiFeedbackService,
  getReactFeedbackHost,
  getUiFeedbackServiceMaybe,
  reportError,
  restoreReactFeedbackHost as restoreReactFeedbackHostRuntime,
  setReactFeedbackHost as setReactFeedbackHostRuntime,
} from '../services/api.js';

const __uiFeedbackReportNonFatalSeen = new Map<string, number>();

export function __uiFeedbackReportNonFatal(App: unknown, op: string, err: unknown, dedupeMs = 4000): void {
  const now = Date.now();
  const e = err instanceof Error ? err : new Error(String(err));
  const key = `${op}|${e.name}|${e.message}`;
  const last = __uiFeedbackReportNonFatalSeen.get(key) ?? 0;
  if (dedupeMs > 0 && now - last < dedupeMs) return;
  __uiFeedbackReportNonFatalSeen.set(key, now);
  reportError(App, err, { where: 'native/ui/feedback', op, fatal: false });
}

export type ToastType = UiFeedbackToastKind;
export type EventListenerLike = EventListenerOrEventListenerObject | ((event: Event) => void);

export type StoreSubscriptionLike = {
  subscribe?: (listener: () => void) => unknown;
  getState?: () => unknown;
};

export interface CustomModalState {
  mode: 'prompt' | 'confirm' | null;
  onPrompt: UiFeedbackPromptCallback | null;
  onConfirm: UiFeedbackConfirmCallback | null;
  onCancel?: UiFeedbackConfirmCallback | null;
  bindingsInstalled?: boolean;
  bindingsCleanup?: (() => void) | null;
  boundConfirmBtn?: unknown;
  boundCancelBtn?: unknown;
  boundInput?: unknown;
}

export type AppWithModalState = AppContainer & {
  store?: StoreSubscriptionLike;
};

export interface CustomModalEls {
  modal?: HTMLElement;
  input?: HTMLInputElement;
  confirmBtn?: HTMLButtonElement;
  cancelBtn?: HTMLButtonElement;
  titleEl?: HTMLElement;
  msgEl?: HTMLElement;
}

export interface EventTargetLike {
  addEventListener?: (
    type: string,
    listener: EventListenerLike,
    options?: boolean | AddEventListenerOptions
  ) => void;
  removeEventListener?: (
    type: string,
    listener: EventListenerLike,
    options?: boolean | EventListenerOptions
  ) => void;
}

export type FeedbackRecordLike = UiFeedbackNamespaceLike & UnknownRecord;
export type StubCallableLike = UnknownCallable & { __wp_isStub?: unknown };

export function isRecord(x: unknown): x is UnknownRecord {
  return !!x && typeof x === 'object';
}

export function isAppWithModalState(App: unknown): App is AppWithModalState {
  return isRecord(App);
}

export function readAppWithModalState(App: unknown): AppWithModalState | null {
  return isAppWithModalState(App) ? App : null;
}

export function readFeedbackService(App: unknown): UiFeedbackNamespaceLike | null {
  const app = readAppWithModalState(App);
  if (!app) return null;
  return getUiFeedbackServiceMaybe(app);
}

export function ensureFeedbackService(App: unknown): UiFeedbackNamespaceLike | null {
  const app = readAppWithModalState(App);
  if (!app) return null;
  return ensureUiFeedbackService(app);
}

export function setReactFeedbackHost(
  App: unknown,
  host: UiFeedbackReactLike | null
): UiFeedbackReactLike | null {
  return setReactFeedbackHostRuntime(App, host);
}

export function restoreReactFeedbackHost(
  App: unknown,
  mountedHost: UiFeedbackReactLike,
  previous: UiFeedbackReactLike | null
): void {
  restoreReactFeedbackHostRuntime(App, mountedHost, previous);
}

export function isFeedbackRecordLike(value: unknown): value is FeedbackRecordLike {
  return isRecord(value);
}

export function readFeedbackRecord(value: unknown): FeedbackRecordLike | null {
  return isFeedbackRecordLike(value) ? value : null;
}

export function isReactFeedbackLike(value: unknown): value is UiFeedbackReactLike {
  return isFeedbackRecordLike(value);
}

export function getReactFeedback(App: unknown): UiFeedbackReactLike | null {
  try {
    return getReactFeedbackHost(App);
  } catch {
    return null;
  }
}

export function isHTMLElement(x: unknown): x is HTMLElement {
  return typeof HTMLElement !== 'undefined' && x instanceof HTMLElement;
}

export function isHTMLInputElement(x: unknown): x is HTMLInputElement {
  return typeof HTMLInputElement !== 'undefined' && x instanceof HTMLInputElement;
}

export function isHTMLButtonElement(x: unknown): x is HTMLButtonElement {
  return typeof HTMLButtonElement !== 'undefined' && x instanceof HTMLButtonElement;
}

export function asHTMLElement(x: unknown): HTMLElement | undefined {
  return isHTMLElement(x) ? x : undefined;
}

export function asHTMLInputElement(x: unknown): HTMLInputElement | undefined {
  return isHTMLInputElement(x) ? x : undefined;
}

export function asHTMLButtonElement(x: unknown): HTMLButtonElement | undefined {
  return isHTMLButtonElement(x) ? x : undefined;
}

export function isStubFn(x: unknown): x is StubCallableLike {
  return typeof x === 'function' && '__wp_isStub' in x && x.__wp_isStub === true;
}
