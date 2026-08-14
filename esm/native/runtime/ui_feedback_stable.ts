import type {
  UiFeedbackAcknowledgeFn,
  UiFeedbackConfirmFn,
  UiFeedbackEditToastFn,
  UiFeedbackNamespaceLike,
  UiFeedbackPromptFn,
  UiFeedbackStableLike,
  UiFeedbackToastFn,
} from '../../../types';
import { formatDisplayScalar, readDisplayScalar } from '../../shared/display_text_shared.js';

import { getDocumentMaybe } from './browser_env.js';
import { asRecord } from './record.js';

type PromptHostLike = Window & { prompt?: (message?: string, def?: string) => string | null };
type ConfirmHostLike = Window & { confirm?: (message?: string) => boolean };

type StubFnMeta = { __wp_isStub?: boolean; __wp_stubKind?: string };
type CallableLike = (...args: never[]) => unknown;

type UiFeedbackToastKey = 'toast' | 'showToast';
type UiFeedbackPromptKey = 'prompt' | 'openCustomPrompt';
type UiFeedbackConfirmKey = 'confirm' | 'openCustomConfirm';

function isCallable<T extends CallableLike>(value: unknown): value is T {
  return typeof value === 'function';
}

function hasCallableProp(value: unknown, key: string): boolean {
  const rec = asRecord(value);
  return !!rec && typeof rec[key] === 'function';
}

function asUiFeedbackToastFn(value: unknown): UiFeedbackToastFn | null {
  return isCallable<UiFeedbackToastFn>(value) ? value : null;
}

function asUiFeedbackPromptFn(value: unknown): UiFeedbackPromptFn | null {
  return isCallable<UiFeedbackPromptFn>(value) ? value : null;
}

function asUiFeedbackConfirmFn(value: unknown): UiFeedbackConfirmFn | null {
  return isCallable<UiFeedbackConfirmFn>(value) ? value : null;
}

function asUiFeedbackAcknowledgeFn(value: unknown): UiFeedbackAcknowledgeFn | null {
  return isCallable<UiFeedbackAcknowledgeFn>(value) ? value : null;
}

function asUiFeedbackEditToastFn(value: unknown): UiFeedbackEditToastFn | null {
  return isCallable<UiFeedbackEditToastFn>(value) ? value : null;
}

function isPromptHostLike(value: unknown): value is PromptHostLike {
  return hasCallableProp(value, 'prompt');
}

function isConfirmHostLike(value: unknown): value is ConfirmHostLike {
  return hasCallableProp(value, 'confirm');
}

function getPromptHost(App: unknown): PromptHostLike | null {
  const doc = getDocumentMaybe(App);
  const view = doc ? doc.defaultView : null;
  return isPromptHostLike(view) ? view : null;
}

function getConfirmHost(App: unknown): ConfirmHostLike | null {
  const doc = getDocumentMaybe(App);
  const view = doc ? doc.defaultView : null;
  return isConfirmHostLike(view) ? view : null;
}

function readFnMeta(value: unknown): StubFnMeta | null {
  if (!isCallable(value)) return null;
  const isStub = Reflect.get(value, '__wp_isStub');
  const stubKind = Reflect.get(value, '__wp_stubKind');
  return {
    __wp_isStub: isStub === true,
    __wp_stubKind: typeof stubKind === 'string' ? stubKind : undefined,
  };
}

function copyStubMeta<T extends CallableLike>(target: T, source: unknown): T {
  const meta = readFnMeta(source);
  if (!meta || meta.__wp_isStub !== true) return target;
  try {
    Reflect.set(target, '__wp_isStub', true);
    if (typeof meta.__wp_stubKind === 'string') Reflect.set(target, '__wp_stubKind', meta.__wp_stubKind);
  } catch {
    // metadata-best-effort: feedback wrapper metadata is diagnostic only and must not affect callability.
  }
  return target;
}

function readWrapperGroup(value: unknown): string {
  if (!isCallable(value)) return '';
  const wrapperGroup = Reflect.get(value, '__wp_wrapperGroup');
  return typeof wrapperGroup === 'string' ? wrapperGroup : '';
}

function markWrapperGroup<T extends CallableLike>(target: T, group: string): T {
  try {
    Reflect.set(target, '__wp_wrapperGroup', group);
  } catch {
    // metadata-best-effort: wrapper-group tagging is advisory and must not affect feedback behavior.
  }
  return target;
}

function readCurrentCallable<T extends CallableLike>(
  owner: UiFeedbackNamespaceLike,
  keys: readonly string[],
  self: T,
  blockedWrapperGroup = ''
): T | null {
  for (const key of keys) {
    const value = owner[key];
    if (!isCallable<T>(value) || value === self) continue;
    if (blockedWrapperGroup && readWrapperGroup(value) === blockedWrapperGroup) continue;
    return value;
  }
  return null;
}

function wrapToastFn(
  owner: UiFeedbackNamespaceLike,
  keys: readonly UiFeedbackToastKey[],
  base: UiFeedbackToastFn
): UiFeedbackToastFn {
  const wrapped: UiFeedbackToastFn = (msg: string, kind?: string) => {
    const current = readCurrentCallable(owner, keys, wrapped, 'toast');
    Reflect.apply(current || base, owner, [msg, kind]);
  };
  return copyStubMeta(markWrapperGroup(wrapped, 'toast'), base);
}

function wrapPromptFn(
  owner: UiFeedbackNamespaceLike,
  keys: readonly UiFeedbackPromptKey[],
  base: UiFeedbackPromptFn
): UiFeedbackPromptFn {
  const wrapped: UiFeedbackPromptFn = (
    title: string,
    defaultValue: string,
    cb: (v: string | null) => void
  ) => {
    const current = readCurrentCallable(owner, keys, wrapped, 'prompt');
    Reflect.apply(current || base, owner, [title, defaultValue, cb]);
  };
  return copyStubMeta(markWrapperGroup(wrapped, 'prompt'), base);
}

function wrapConfirmFn(
  owner: UiFeedbackNamespaceLike,
  keys: readonly UiFeedbackConfirmKey[],
  base: UiFeedbackConfirmFn
): UiFeedbackConfirmFn {
  const wrapped: UiFeedbackConfirmFn = (
    title: string,
    message: string,
    onYes: () => void,
    onNo?: (() => void) | null
  ) => {
    const current = readCurrentCallable(owner, keys, wrapped, 'confirm');
    Reflect.apply(current || base, owner, [title, message, onYes, onNo]);
  };
  return copyStubMeta(markWrapperGroup(wrapped, 'confirm'), base);
}

function wrapAcknowledgeFn(
  owner: UiFeedbackNamespaceLike,
  base: UiFeedbackAcknowledgeFn
): UiFeedbackAcknowledgeFn {
  const wrapped: UiFeedbackAcknowledgeFn = (
    title: string,
    message: string,
    onAcknowledge?: (() => void) | null
  ) => {
    const current = readCurrentCallable(owner, ['acknowledge'], wrapped, 'acknowledge');
    Reflect.apply(current || base, owner, [title, message, onAcknowledge]);
  };
  return copyStubMeta(markWrapperGroup(wrapped, 'acknowledge'), base);
}

function wrapEditToastFn(owner: UiFeedbackNamespaceLike, base: UiFeedbackEditToastFn): UiFeedbackEditToastFn {
  const wrapped: UiFeedbackEditToastFn = (text: string | null, isActive: boolean) => {
    const current = readCurrentCallable(owner, ['updateEditStateToast'], wrapped, 'updateEditStateToast');
    return Reflect.apply(current || base, owner, [text, isActive]);
  };
  return copyStubMeta(markWrapperGroup(wrapped, 'updateEditStateToast'), base);
}

function readToastFn(owner: UiFeedbackNamespaceLike, key: UiFeedbackToastKey): UiFeedbackToastFn | null {
  return asUiFeedbackToastFn(owner[key]);
}

function readPromptFn(owner: UiFeedbackNamespaceLike, key: UiFeedbackPromptKey): UiFeedbackPromptFn | null {
  return asUiFeedbackPromptFn(owner[key]);
}

function readConfirmFn(
  owner: UiFeedbackNamespaceLike,
  key: UiFeedbackConfirmKey
): UiFeedbackConfirmFn | null {
  return asUiFeedbackConfirmFn(owner[key]);
}

function readAcknowledgeFn(owner: UiFeedbackNamespaceLike): UiFeedbackAcknowledgeFn | null {
  return asUiFeedbackAcknowledgeFn(owner.acknowledge);
}

function readEditToastFn(owner: UiFeedbackNamespaceLike): UiFeedbackEditToastFn | null {
  return asUiFeedbackEditToastFn(owner.updateEditStateToast);
}

function safeString(value: unknown): string {
  return formatDisplayScalar(readDisplayScalar(value));
}

function markStub<T extends CallableLike>(fn: T, kind: string): T {
  try {
    Reflect.set(fn, '__wp_isStub', true);
    Reflect.set(fn, '__wp_stubKind', kind);
  } catch {
    // metadata-best-effort: stub tagging is advisory and must not affect the fallback callable.
  }
  return fn;
}

function buildToastBase(feedback: UiFeedbackNamespaceLike): UiFeedbackToastFn {
  return (
    readToastFn(feedback, 'toast') ||
    readToastFn(feedback, 'showToast') ||
    markStub(function (msg: string, kind?: string) {
      try {
        console.log('[toast]', kind || 'info', msg);
      } catch {
        // console-fallback-isolation: logging failure must not make the toast stub throw.
      }
    }, 'toast')
  );
}

function buildPromptBase(App: unknown, feedback: UiFeedbackNamespaceLike): UiFeedbackPromptFn {
  return (
    readPromptFn(feedback, 'prompt') ||
    readPromptFn(feedback, 'openCustomPrompt') ||
    markStub(function (title: string, defaultValue: string, cb: (v: string | null) => void) {
      try {
        const host = getPromptHost(App);
        const value = host ? host.prompt(safeString(title), safeString(defaultValue)) : null;
        cb(value == null ? null : safeString(value));
        return;
      } catch {
        // browser-dialog-fallback: prompt access/callback failure falls through to the explicit null result.
      }

      try {
        cb(null);
      } catch {
        // callback-isolation: consumer prompt callback failure must not escape the feedback stub.
      }
    }, 'prompt')
  );
}

function buildConfirmBase(App: unknown, feedback: UiFeedbackNamespaceLike): UiFeedbackConfirmFn {
  return (
    readConfirmFn(feedback, 'confirm') ||
    readConfirmFn(feedback, 'openCustomConfirm') ||
    markStub(function (_title: string, message: string, onYes: () => void, onNo?: (() => void) | null) {
      try {
        const host = getConfirmHost(App);
        const ok = host ? !!host.confirm(safeString(message)) : false;
        if (ok) onYes();
        if (!ok && typeof onNo === 'function') onNo();
        return;
      } catch {
        // browser-dialog-fallback: confirm access/callback failure falls through to the negative path.
      }

      try {
        if (typeof onNo === 'function') onNo();
      } catch {
        // callback-isolation: consumer confirm callback failure must not escape the feedback stub.
      }
    }, 'confirm')
  );
}

function buildAcknowledgeBase(App: unknown, feedback: UiFeedbackNamespaceLike): UiFeedbackAcknowledgeFn {
  const confirmBase = buildConfirmBase(App, feedback);
  return (
    readAcknowledgeFn(feedback) ||
    markStub(function (title: string, message: string, onAcknowledge?: (() => void) | null) {
      confirmBase(
        title,
        message,
        typeof onAcknowledge === 'function' ? onAcknowledge : () => undefined,
        null
      );
    }, 'acknowledge')
  );
}

function buildEditToastBase(feedback: UiFeedbackNamespaceLike): UiFeedbackEditToastFn {
  return (
    readEditToastFn(feedback) ||
    markStub(function (_text: string | null, _isActive: boolean) {
      return null;
    }, 'updateEditStateToast')
  );
}

export function ensureUiFeedbackStable(
  App: unknown,
  feedback: UiFeedbackNamespaceLike
): UiFeedbackStableLike {
  const toastBase = buildToastBase(feedback);
  const showToastBase = readToastFn(feedback, 'showToast') || toastBase;
  const promptBase = buildPromptBase(App, feedback);
  const openCustomPromptBase = readPromptFn(feedback, 'openCustomPrompt') || promptBase;
  const confirmBase = buildConfirmBase(App, feedback);
  const openCustomConfirmBase = readConfirmFn(feedback, 'openCustomConfirm') || confirmBase;
  const acknowledgeBase = buildAcknowledgeBase(App, feedback);
  const editToastBase = buildEditToastBase(feedback);

  const toast = wrapToastFn(feedback, ['toast', 'showToast'], toastBase);
  const showToast = wrapToastFn(feedback, ['showToast', 'toast'], showToastBase);
  const prompt = wrapPromptFn(feedback, ['prompt', 'openCustomPrompt'], promptBase);
  const openCustomPrompt = wrapPromptFn(feedback, ['openCustomPrompt', 'prompt'], openCustomPromptBase);
  const confirm = wrapConfirmFn(feedback, ['confirm', 'openCustomConfirm'], confirmBase);
  const openCustomConfirm = wrapConfirmFn(feedback, ['openCustomConfirm', 'confirm'], openCustomConfirmBase);
  const acknowledge = wrapAcknowledgeFn(feedback, acknowledgeBase);
  const updateEditStateToast = wrapEditToastFn(feedback, editToastBase);

  return Object.assign(feedback, {
    toast,
    showToast,
    prompt,
    openCustomPrompt,
    confirm,
    openCustomConfirm,
    acknowledge,
    updateEditStateToast,
  });
}
