import type { ServiceInstallStateLike } from '../../../types';

import { asRecord } from './record.js';
import { ensureServiceSlot, getServiceSlotMaybe } from './services_root_access.js';

export type InstallStateFlag = keyof ServiceInstallStateLike;

function readInstallStateService(value: unknown): ServiceInstallStateLike | null {
  return asRecord<ServiceInstallStateLike>(value);
}

export function getServiceInstallStateMaybe(App: unknown): ServiceInstallStateLike | null {
  try {
    return readInstallStateService(getServiceSlotMaybe<AppInstallStateService>(App, 'serviceInstallState'));
  } catch {
    return null;
  }
}

export function ensureServiceInstallState(App: unknown): ServiceInstallStateLike {
  const service = ensureServiceSlot<AppInstallStateService>(App, 'serviceInstallState');
  return readInstallStateService(service) || service;
}

type AppInstallStateService = ServiceInstallStateLike;

function readFlag(App: unknown, key: InstallStateFlag): boolean {
  return getServiceInstallStateMaybe(App)?.[key] === true;
}

function writeFlag(App: unknown, key: InstallStateFlag, value: boolean): boolean {
  const service = ensureServiceInstallState(App);
  service[key] = value === true;
  return service[key] === true;
}

export function isAppStartInstalled(App: unknown): boolean {
  return readFlag(App, 'appStartInstalled');
}

export function markAppStartInstalled(App: unknown): boolean {
  return writeFlag(App, 'appStartInstalled', true);
}

export function isAppStartStarted(App: unknown): boolean {
  return readFlag(App, 'appStartStarted');
}

export function setAppStartStarted(App: unknown, started: boolean): boolean {
  return writeFlag(App, 'appStartStarted', started);
}

export function isCameraInstalled(App: unknown): boolean {
  return readFlag(App, 'cameraInstalled');
}

export function markCameraInstalled(App: unknown): boolean {
  return writeFlag(App, 'cameraInstalled', true);
}

export function isAutosaveInstalled(App: unknown): boolean {
  return readFlag(App, 'autosaveInstalled');
}

export function markAutosaveInstalled(App: unknown): boolean {
  return writeFlag(App, 'autosaveInstalled', true);
}

export function isViewportInstalled(App: unknown): boolean {
  return readFlag(App, 'viewportInstalled');
}

export function markViewportInstalled(App: unknown): boolean {
  return writeFlag(App, 'viewportInstalled', true);
}

export function isConfigCompoundsInstalled(App: unknown): boolean {
  return readFlag(App, 'configCompoundsInstalled');
}

export function markConfigCompoundsInstalled(App: unknown): boolean {
  return writeFlag(App, 'configCompoundsInstalled', true);
}

export function isErrorsInstalled(App: unknown): boolean {
  return readFlag(App, 'errorsInstalled');
}

export function markErrorsInstalled(App: unknown): boolean {
  return writeFlag(App, 'errorsInstalled', true);
}

export function isUiBootMainInstalled(App: unknown): boolean {
  return readFlag(App, 'uiBootMainInstalled');
}

export function markUiBootMainInstalled(App: unknown): boolean {
  return writeFlag(App, 'uiBootMainInstalled', true);
}

export function isBootInstalled(App: unknown): boolean {
  return readFlag(App, 'bootInstalled');
}

export function markBootInstalled(App: unknown): boolean {
  return writeFlag(App, 'bootInstalled', true);
}

export function isPlatformInstalled(App: unknown): boolean {
  return readFlag(App, 'platformInstalled');
}

export function markPlatformInstalled(App: unknown): boolean {
  return writeFlag(App, 'platformInstalled', true);
}

export function isSmokeChecksInstalled(App: unknown): boolean {
  return readFlag(App, 'smokeChecksInstalled');
}

export function markSmokeChecksInstalled(App: unknown): boolean {
  return writeFlag(App, 'smokeChecksInstalled', true);
}

export function isBrowserUiOpsInstalled(App: unknown): boolean {
  return readFlag(App, 'browserUiOpsInstalled');
}

export function markBrowserUiOpsInstalled(App: unknown): boolean {
  return writeFlag(App, 'browserUiOpsInstalled', true);
}

export function isLifecycleVisibilityInstalled(App: unknown): boolean {
  return readFlag(App, 'lifecycleVisibilityInstalled');
}

export function markLifecycleVisibilityInstalled(App: unknown): boolean {
  return writeFlag(App, 'lifecycleVisibilityInstalled', true);
}
