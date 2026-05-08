import { asRecord } from './record.js';
import { ensureServiceSlot, getServiceSlotMaybe } from './services_root_access.js';
import {
  asDrawerService,
  asDoorsService,
  asFiniteNumber,
  ensureRuntimeRecord,
  isMethod,
  type DoorsRuntimeLike,
  type DoorsServiceLike,
  type DrawerRuntimeLike,
  type DrawerServiceLike,
  type MutableRecord,
  type UnknownMethod,
} from './doors_access_shared.js';

export type RuntimeDoorsServiceLike = DoorsServiceLike;
export type RuntimeDrawerServiceLike = DrawerServiceLike;
export type RuntimeDoorsRuntimeLike = DoorsRuntimeLike;
export type RuntimeDrawerRuntimeLike = DrawerRuntimeLike;

export function ensureDoorsService(App: unknown): DoorsServiceLike {
  return (
    asDoorsService(getServiceSlotMaybe<DoorsServiceLike>(App, 'doors')) ||
    ensureServiceSlot<DoorsServiceLike>(App, 'doors')
  );
}

export function getDoorsService(App: unknown): DoorsServiceLike | null {
  return asDoorsService(getServiceSlotMaybe<DoorsServiceLike>(App, 'doors'));
}

export function getDoorsRuntime<TRuntime extends DoorsRuntimeLike = DoorsRuntimeLike>(
  App: unknown
): TRuntime {
  return ensureRuntimeRecord<TRuntime>(ensureDoorsService(App));
}

export function ensureDrawerService(App: unknown): DrawerServiceLike {
  return (
    asDrawerService(getServiceSlotMaybe<DrawerServiceLike>(App, 'drawer')) ||
    ensureServiceSlot<DrawerServiceLike>(App, 'drawer')
  );
}

export function getDrawerService(App: unknown): DrawerServiceLike | null {
  return asDrawerService(getServiceSlotMaybe<DrawerServiceLike>(App, 'drawer'));
}

export function getDrawerRuntime<TRuntime extends DrawerRuntimeLike = DrawerRuntimeLike>(
  App: unknown
): TRuntime {
  return ensureRuntimeRecord<TRuntime>(ensureDrawerService(App));
}

export function initDrawerRuntime(App: unknown): DrawerRuntimeLike {
  const runtime = getDrawerRuntime(App);
  if (typeof runtime.snapAfterBuildId === 'undefined') runtime.snapAfterBuildId = null;
  if (typeof runtime.openAfterBuildId === 'undefined') runtime.openAfterBuildId = null;
  return runtime;
}

export function getDoorsMethod<T extends UnknownMethod>(App: unknown, key: string): T | null {
  const service = getDoorsService(App);
  const value = service ? service[key] : null;
  return isMethod<T>(value) ? value : null;
}

export function readDoorsRuntimeNumber(App: unknown, key: string, defaultValue = 0): number {
  try {
    return asFiniteNumber(getDoorsRuntime(App)[key], defaultValue);
  } catch {
    return defaultValue;
  }
}

export function writeDoorsRuntimeNumber(App: unknown, key: string, value: number): number {
  const next = asFiniteNumber(value, 0);
  try {
    getDoorsRuntime(App)[key] = next;
  } catch {
    // ignore
  }
  return next;
}

export function readDoorsRuntimeBool(App: unknown, key: string, defaultValue = false): boolean {
  try {
    const runtime = getDoorsRuntime(App);
    const value = runtime[key];
    if (typeof value === 'boolean') return value;
    if (typeof value === 'undefined') return defaultValue;
    return !!value;
  } catch {
    return defaultValue;
  }
}

export function writeDoorsRuntimeBool(App: unknown, key: string, value: boolean): boolean {
  const next = !!value;
  try {
    getDoorsRuntime(App)[key] = next;
  } catch {
    // ignore
  }
  return next;
}

export function getDoorEditHoldActive(App: unknown): boolean {
  try {
    const editHold = getDoorsRuntime(App).editHold;
    return !!asRecord<MutableRecord>(editHold)?.active;
  } catch {
    return false;
  }
}
