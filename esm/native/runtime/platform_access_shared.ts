import type {
  PlatformActivityLike,
  PlatformDimsLike,
  PlatformNamespace,
  PlatformServiceNamespaceLike,
  PlatformUtilNamespaceLike,
  UnknownRecord,
} from '../../../types';

import { asRecord, createNullRecord, isRecord } from './record.js';
import { ensurePlatformRoot as ensurePlatformRootSlot, getPlatformRootMaybe } from './app_roots_access.js';
import { ensureServiceSlot, getServiceSlotMaybe } from './services_root_access.js';

export type PlatformMethod<Args extends unknown[] = never[], Ret = unknown> = (...args: Args) => Ret;
export type Hash32Fn = PlatformUtilNamespaceLike['hash32'];
export type CloneFn = PlatformUtilNamespaceLike['clone'];
export type StringifierFn = PlatformUtilNamespaceLike['str'];

export type PlatformServiceLike = PlatformServiceNamespaceLike;
export type PlatformRootLike = PlatformNamespace;
export type ActivityLike = PlatformActivityLike;
export type PlatformUtilLike = PlatformUtilNamespaceLike;

export function createRecord<T extends object = UnknownRecord>(): T {
  return createNullRecord<T>();
}

export function isPlatformRoot(value: unknown): value is PlatformRootLike {
  return isRecord(value);
}

export function isPlatformUtil(value: unknown): value is PlatformUtilLike {
  return isRecord(value);
}

export function isActivity(value: unknown): value is ActivityLike {
  return isRecord(value);
}

export function ensureActivity(value: unknown, host?: UnknownRecord, key = 'activity'): ActivityLike {
  if (isActivity(value)) return value;
  const next = createRecord<ActivityLike>();
  if (host) host[key] = next;
  return next;
}

export function getPlatformRoot(App: unknown): PlatformRootLike | null {
  const root = getPlatformRootMaybe(App);
  return isPlatformRoot(root) ? root : null;
}

export function ensurePlatformRoot(App: unknown): PlatformRootLike {
  return ensurePlatformRootSlot(App);
}

export function getPlatformRootSurface(App: unknown): PlatformRootLike | null {
  return getPlatformRoot(App);
}

export function ensurePlatformRootSurface(App: unknown): PlatformRootLike {
  return ensurePlatformRoot(App);
}

export function bindMethod<Args extends unknown[], Ret>(
  obj: unknown,
  key: string
): PlatformMethod<Args, Ret> | null {
  const rec = asRecord(obj);
  const fn = rec?.[key];
  if (typeof fn !== 'function') return null;
  return (...args: Args): Ret => Reflect.apply(fn, rec, args);
}

export function ensurePlatformService(App: unknown): PlatformServiceLike {
  return ensureServiceSlot<PlatformServiceLike>(App, 'platform');
}

export function getPlatformService(App: unknown): PlatformServiceLike | null {
  return getServiceSlotMaybe<PlatformServiceLike>(App, 'platform');
}

export function readUtil(App: unknown): PlatformUtilLike | null {
  const serviceUtil = getPlatformService(App)?.util;
  if (isPlatformUtil(serviceUtil)) return serviceUtil;
  const rootUtil = getPlatformRoot(App)?.util;
  return isPlatformUtil(rootUtil) ? rootUtil : null;
}

export function getPlatformUtil(App: unknown): PlatformUtilLike | null {
  return readUtil(App);
}

export function ensureUtil(App: unknown): PlatformUtilLike {
  const root = ensurePlatformRoot(App);
  const rootUtil = isPlatformUtil(root.util)
    ? root.util
    : (() => {
        const next = createRecord<PlatformUtilLike>();
        root.util = next;
        return next;
      })();
  const service = ensurePlatformService(App);
  if (!isPlatformUtil(service.util)) service.util = rootUtil;
  return rootUtil;
}

export function ensurePlatformUtil(App: unknown): PlatformUtilLike {
  return ensureUtil(App);
}

export function isPlatformDimsLike(value: unknown): value is PlatformDimsLike {
  const rec = asRecord(value);
  return !!rec && typeof rec.w === 'number' && typeof rec.h === 'number' && typeof rec.d === 'number';
}
