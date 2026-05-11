import type {
  ActionMetaLike,
  HistoryPushRequestLike,
  HistoryServiceLike,
  HistorySystemLike,
} from '../../../types';
import { asRecord } from './record.js';
import {
  isCallable,
  isHistorySystemPaused,
  readHistorySystemMethod,
  reportHistoryAccessOwnerRejection,
  type HistoryMetaInvoker,
  type HistoryOptionsInvoker,
} from './history_system_access_shared.js';
import { ensureServiceSlot, getServiceSlotMaybe } from './services_root_access.js';

function servicesHistoryNs(App: unknown): HistoryServiceLike | null {
  return asRecord<HistoryServiceLike>(getServiceSlotMaybe(App, 'history'));
}

export function getHistoryServiceMaybe(App: unknown): HistoryServiceLike | null {
  try {
    return servicesHistoryNs(App);
  } catch {
    return null;
  }
}

export function ensureHistoryService(App: unknown): HistoryServiceLike {
  const svc = ensureServiceSlot<HistoryServiceLike>(App, 'history');
  return asRecord<HistoryServiceLike>(svc) || svc;
}

export type HistoryServiceMethodName = 'schedulePush' | 'flushPendingPush';
export type HistoryServiceMethodArg = ActionMetaLike | HistoryPushRequestLike | undefined;

export function hasHistoryServiceMethodMaybe(App: unknown, methodName: HistoryServiceMethodName): boolean {
  try {
    const historySvc = getHistoryServiceMaybe(App);
    return !!(historySvc && isCallable(historySvc[methodName]));
  } catch {
    return false;
  }
}

export function callHistoryServiceMethodMaybe(
  App: unknown,
  methodName: HistoryServiceMethodName,
  arg?: HistoryServiceMethodArg
): unknown {
  try {
    const historySvc = getHistoryServiceMaybe(App);
    const fn = historySvc ? historySvc[methodName] : null;
    if (!historySvc || !isCallable(fn)) return undefined;
    return Reflect.apply(fn, historySvc, [arg]);
  } catch (error) {
    reportHistoryAccessOwnerRejection(App, `history.service.${methodName}.ownerRejected`, error);
    return undefined;
  }
}

export function getHistorySystemFromServiceMaybe(App: unknown): HistorySystemLike | null {
  try {
    const historySvc = getHistoryServiceMaybe(App);
    return historySvc ? asRecord<HistorySystemLike>(historySvc.system) : null;
  } catch {
    return null;
  }
}

export function setHistorySystemOnService(
  App: unknown,
  historySystem: HistorySystemLike
): HistorySystemLike | null {
  try {
    if (!historySystem || typeof historySystem !== 'object') return null;
    const historySvc = ensureHistoryService(App);
    historySvc.system = historySystem;
    return asRecord<HistorySystemLike>(historySvc.system) || historySystem;
  } catch {
    return null;
  }
}

export function flushHistoryPendingPushOnServiceMaybe(App: unknown, opts?: HistoryPushRequestLike): boolean {
  try {
    const historySvc = getHistoryServiceMaybe(App);
    const flush =
      historySvc && isCallable<HistoryOptionsInvoker>(historySvc.flushPendingPush)
        ? historySvc.flushPendingPush
        : null;
    if (!flush) return false;
    Reflect.apply(flush, historySvc, [asRecord(opts) || {}]);
    return true;
  } catch (error) {
    reportHistoryAccessOwnerRejection(App, 'history.service.flushPendingPush.ownerRejected', error);
    return false;
  }
}

export function scheduleHistoryPushOnServiceMaybe(App: unknown, meta?: ActionMetaLike): boolean {
  try {
    const historySvc = getHistoryServiceMaybe(App);
    const schedulePush =
      historySvc && isCallable<HistoryMetaInvoker>(historySvc.schedulePush) ? historySvc.schedulePush : null;
    if (!schedulePush) return false;
    Reflect.apply(schedulePush, historySvc, [asRecord(meta) || {}]);
    return true;
  } catch (error) {
    reportHistoryAccessOwnerRejection(App, 'history.service.schedulePush.ownerRejected', error);
    return false;
  }
}

export function pushHistoryStateOnSystemMaybe(App: unknown, opts?: HistoryPushRequestLike): boolean {
  try {
    const hs = getHistorySystemFromServiceMaybe(App);
    if (!hs) return false;
    const pushState = readHistorySystemMethod<HistoryOptionsInvoker>(hs, 'pushState');
    if (!pushState) return false;
    if (isHistorySystemPaused(hs)) return false;
    Reflect.apply(pushState, hs, [asRecord(opts) || {}]);
    return true;
  } catch (error) {
    reportHistoryAccessOwnerRejection(App, 'history.system.pushState.ownerRejected', error);
    return false;
  }
}

export function flushOrPushHistoryStateOnServiceMaybe(App: unknown, opts?: HistoryPushRequestLike): boolean {
  if (flushHistoryPendingPushOnServiceMaybe(App, opts)) return true;
  return pushHistoryStateOnSystemMaybe(App, opts);
}
