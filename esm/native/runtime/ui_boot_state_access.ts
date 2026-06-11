import type { UiBootRuntimeServiceLike } from '../../../types';

import { ensureServiceSlot, getServiceSlotMaybe } from './services_root_access.js';

export interface UiBootRuntimeState {
  didInit: boolean;
  booting: boolean;
  bootBuildScheduled: boolean;
  bootBuildArgs: unknown | null;
}

export function getUiBootRuntimeServiceMaybe(App: unknown): UiBootRuntimeServiceLike | null {
  try {
    return getServiceSlotMaybe<UiBootRuntimeServiceLike>(App, 'uiBootRuntime');
  } catch {
    return null;
  }
}

export function ensureUiBootRuntimeService(App: unknown): UiBootRuntimeServiceLike {
  return ensureServiceSlot<UiBootRuntimeServiceLike>(App, 'uiBootRuntime');
}

export function getUiBootRuntimeState(App: unknown): UiBootRuntimeState {
  const service = getUiBootRuntimeServiceMaybe(App);
  return {
    didInit: service?.didInit === true,
    booting: service?.booting === true,
    bootBuildScheduled: service?.bootBuildScheduled === true,
    bootBuildArgs: service && 'bootBuildArgs' in service ? (service.bootBuildArgs ?? null) : null,
  };
}

export function markUiBootDidInit(App: unknown): boolean {
  const service = ensureUiBootRuntimeService(App);
  if (service.didInit === true) return false;
  service.didInit = true;
  return true;
}

export function setUiBootBooting(App: unknown, next: boolean): boolean {
  const service = ensureUiBootRuntimeService(App);
  service.booting = next === true;
  return service.booting === true;
}

export function setUiBootBuildScheduled(App: unknown, next: boolean, args?: unknown): boolean {
  const service = ensureUiBootRuntimeService(App);
  service.bootBuildScheduled = next === true;
  service.bootBuildArgs = typeof args === 'undefined' ? null : args;
  return service.bootBuildScheduled === true;
}
