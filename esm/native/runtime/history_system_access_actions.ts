import type { ActionMetaLike, HistoryActionsNamespaceLike, HistoryPushRequestLike } from '../../../types';
import { getHistoryActions } from './actions_access_domains.js';
import { isCallable } from './history_system_access_shared.js';

export type HistoryActionMethodName =
  | 'getSystem'
  | 'schedulePush'
  | 'flushPendingPush'
  | 'pushState'
  | 'flushOrPush';
export type HistoryActionArg = ActionMetaLike | HistoryPushRequestLike | undefined;
export type HistoryActionInvoker = (arg?: HistoryActionArg) => unknown;

export function actionsHistoryNs(App: unknown): HistoryActionsNamespaceLike | null {
  return getHistoryActions(App);
}

export function readActionsHistoryMethod(
  App: unknown,
  fnName: HistoryActionMethodName
): HistoryActionInvoker | null {
  const ns = actionsHistoryNs(App);
  const fn = ns ? ns[fnName] : null;
  if (!ns || !isCallable(fn)) return null;
  return (arg?: HistoryActionArg) => Reflect.apply(fn, ns, [arg]);
}

export function hasActionsHistoryFn(App: unknown, fnName: HistoryActionMethodName): boolean {
  return !!readActionsHistoryMethod(App, fnName);
}

export function callActionsHistory(
  App: unknown,
  fnName: HistoryActionMethodName,
  arg?: HistoryActionArg
): unknown {
  const invoke = readActionsHistoryMethod(App, fnName);
  return invoke ? invoke(arg) : undefined;
}
