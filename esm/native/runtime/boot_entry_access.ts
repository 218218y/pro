import type { AppStartServiceLike, UiBootServiceLike } from '../../../types';
import type { UnknownCallable } from '../../../types/common';

import { asRecord } from './record.js';
import { ensureServiceSlot, getServiceSlotMaybe } from './services_root_access.js';

type RecordLike = Record<string, unknown>;

function readRecord<T extends RecordLike = RecordLike>(v: unknown): T | null {
  return asRecord<T>(v);
}

function isAppStartServiceLike(value: unknown): value is AppStartServiceLike {
  const rec = readRecord<AppStartServiceLike>(value);
  return !!rec && (typeof rec.start === 'function' || typeof rec.start === 'undefined');
}

function isUiBootServiceLike(value: unknown): value is UiBootServiceLike {
  const rec = readRecord<UiBootServiceLike>(value);
  return (
    !!rec &&
    (typeof rec.bootMain === 'function' || typeof rec.bootMain === 'undefined') &&
    (typeof rec.start === 'function' || typeof rec.start === 'undefined')
  );
}

function readAppStartService(v: unknown): AppStartServiceLike | null {
  return isAppStartServiceLike(v) ? v : null;
}

function readUiBootService(v: unknown): UiBootServiceLike | null {
  return isUiBootServiceLike(v) ? v : null;
}

export function getAppStartServiceMaybe(App: unknown): AppStartServiceLike | null {
  try {
    return readAppStartService(getServiceSlotMaybe<AppStartServiceLike>(App, 'appStart'));
  } catch {
    return null;
  }
}

export function ensureAppStartService(App: unknown): AppStartServiceLike {
  const current = readAppStartService(getServiceSlotMaybe<AppStartServiceLike>(App, 'appStart'));
  return current || ensureServiceSlot<AppStartServiceLike>(App, 'appStart');
}

export function getUiBootServiceMaybe(App: unknown): UiBootServiceLike | null {
  try {
    return readUiBootService(getServiceSlotMaybe<UiBootServiceLike>(App, 'uiBoot'));
  } catch {
    return null;
  }
}

export function ensureUiBootService(App: unknown): UiBootServiceLike {
  const current = readUiBootService(getServiceSlotMaybe<UiBootServiceLike>(App, 'uiBoot'));
  return current || ensureServiceSlot<UiBootServiceLike>(App, 'uiBoot');
}

export function getBootStartEntry(App: unknown): UnknownCallable | null {
  try {
    const appStart = getAppStartServiceMaybe(App);
    if (appStart && typeof appStart.start === 'function') {
      return appStart.start.bind(appStart);
    }
  } catch {
    // ignore
  }

  try {
    const uiBoot = getUiBootServiceMaybe(App);
    if (uiBoot && typeof uiBoot.bootMain === 'function') {
      return uiBoot.bootMain.bind(uiBoot);
    }
  } catch {
    // ignore
  }

  return null;
}
