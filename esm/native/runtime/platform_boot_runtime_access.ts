import type { PlatformBootRuntimeServiceLike } from '../../../types';

import { asRecord } from './record.js';
import { ensureServiceSlot, getServiceSlotMaybe } from './services_root_access.js';

function readPlatformBootRuntimeService(value: unknown): PlatformBootRuntimeServiceLike | null {
  return asRecord<PlatformBootRuntimeServiceLike>(value);
}

export function getPlatformBootRuntimeServiceMaybe(App: unknown): PlatformBootRuntimeServiceLike | null {
  try {
    return readPlatformBootRuntimeService(
      getServiceSlotMaybe<PlatformBootRuntimeServiceLike>(App, 'platformBootRuntime')
    );
  } catch {
    return null;
  }
}

export function ensurePlatformBootRuntimeService(App: unknown): PlatformBootRuntimeServiceLike {
  const service = ensureServiceSlot<PlatformBootRuntimeServiceLike>(App, 'platformBootRuntime');
  return readPlatformBootRuntimeService(service) || service;
}

export function isPlatformBootInitDone(App: unknown): boolean {
  return getPlatformBootRuntimeServiceMaybe(App)?.initDone === true;
}

export function setPlatformBootInitDone(App: unknown, value: boolean): boolean {
  const service = ensurePlatformBootRuntimeService(App);
  service.initDone = value === true;
  return service.initDone === true;
}

export function isPlatformBootInitRunning(App: unknown): boolean {
  return getPlatformBootRuntimeServiceMaybe(App)?.initRunning === true;
}

export function setPlatformBootInitRunning(App: unknown, value: boolean): boolean {
  const service = ensurePlatformBootRuntimeService(App);
  service.initRunning = value === true;
  return service.initRunning === true;
}
