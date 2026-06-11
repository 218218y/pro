import type { PlatformDimsLike, UnknownRecord } from '../../../types';

import { asRecord } from './record.js';
import {
  createRecord,
  ensureActivity,
  ensurePlatformService,
  getPlatformRoot,
  getPlatformService,
  bindMethod,
  isActivity,
  isPlatformDimsLike,
} from './platform_access_shared.js';

export function getBuildUIFromPlatform(App: unknown): UnknownRecord {
  try {
    const fn = getPlatformService(App)?.getBuildUI;
    const ui = typeof fn === 'function' ? fn() : null;
    return asRecord(ui) ?? createRecord();
  } catch {
    return createRecord();
  }
}

export function getDimsMFromPlatform(App: unknown, raw?: unknown): PlatformDimsLike | null {
  try {
    const fn = getPlatformService(App)?.getDimsM;
    const dims = typeof fn === 'function' ? fn(raw) : null;
    return isPlatformDimsLike(dims) ? dims : null;
  } catch {
    return null;
  }
}

export function ensureRenderLoopViaPlatform(App: unknown): boolean {
  try {
    const fn = getPlatformService(App)?.ensureRenderLoop;
    if (typeof fn !== 'function') return false;
    fn();
    return true;
  } catch {
    return false;
  }
}

export function getPlatformComputePerfFlags(App: unknown): (() => unknown) | null {
  return (
    bindMethod<[], unknown>(getPlatformService(App), 'computePerfFlags') ??
    bindMethod<[], unknown>(getPlatformRoot(App), 'computePerfFlags')
  );
}

export function computePerfFlagsViaPlatform(App: unknown): boolean {
  try {
    const fn = getPlatformComputePerfFlags(App);
    if (!fn) return false;
    fn();
    return true;
  } catch {
    return false;
  }
}

export function getPlatformSetAnimate(App: unknown): ((fn: () => unknown) => unknown) | null {
  return (
    bindMethod<[() => unknown], unknown>(getPlatformService(App), 'setAnimate') ??
    bindMethod<[() => unknown], unknown>(getPlatformRoot(App), 'setAnimate')
  );
}

export function installRenderAnimateViaPlatform(App: unknown, animate: () => unknown): boolean {
  try {
    const fn = getPlatformSetAnimate(App);
    if (!fn) return false;
    fn(animate);
    return true;
  } catch {
    return false;
  }
}

export function getPlatformActivity(App: unknown): UnknownRecord | null {
  try {
    const activity = getPlatformService(App)?.activity;
    return isActivity(activity) ? activity : null;
  } catch {
    return null;
  }
}

export function touchPlatformActivity(App: unknown): boolean {
  try {
    const service = ensurePlatformService(App);
    const activity = ensureActivity(service.activity, service);
    if (typeof activity.lastActionTime !== 'number') activity.lastActionTime = Date.now();
    if (typeof activity.touch !== 'function') {
      activity.touch = () => {
        activity.lastActionTime = Date.now();
      };
    }
    activity.touch();
    return true;
  } catch {
    return false;
  }
}

export function getPlatformPerf(App: unknown): UnknownRecord | null {
  try {
    return asRecord(getPlatformService(App)?.perf);
  } catch {
    return null;
  }
}

export function ensurePlatformPerf(App: unknown): UnknownRecord {
  try {
    const service = ensurePlatformService(App);
    const current = asRecord(service.perf);
    if (current) return current;
    const next = createRecord<UnknownRecord>();
    service.perf = next;
    return next;
  } catch {
    return createRecord<UnknownRecord>();
  }
}

export function setPlatformPerfFlag(App: unknown, key: string, value: unknown): boolean {
  if (!key) return false;
  try {
    ensurePlatformPerf(App)[key] = value;
    return true;
  } catch {
    return false;
  }
}

export function markPlatformPerfFlagsDirty(App: unknown, dirty = true): boolean {
  return setPlatformPerfFlag(App, 'perfFlagsDirty', !!dirty);
}

export function setPlatformHasInternalDrawers(App: unknown, hasInternal: boolean): boolean {
  try {
    const perf = ensurePlatformPerf(App);
    perf.hasInternalDrawers = !!hasInternal;
    perf.perfFlagsDirty = false;
    return true;
  } catch {
    return false;
  }
}
