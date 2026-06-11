import type { UnknownRecord } from '../../../types';

import {
  healStableSurfaceSlot,
  installStableSurfaceSlot,
  resolveStableSurfaceSlot,
} from './stable_surface_slots.js';

type StableMethodOwner = UnknownRecord;

type StableMethod = (...args: never[]) => unknown;

function isCallable<TFn extends StableMethod = StableMethod>(value: unknown): value is TFn {
  return typeof value === 'function';
}

export function resolveStableSurfaceMethod<TFn extends StableMethod = StableMethod>(
  surface: StableMethodOwner,
  key: string,
  stableKey: string,
  create?: () => TFn
): TFn | null {
  return resolveStableSurfaceSlot<TFn>(surface, key, stableKey, isCallable, create);
}

export function healStableSurfaceMethod<TFn extends StableMethod = StableMethod>(
  surface: StableMethodOwner,
  key: string,
  stableKey: string
): TFn | null {
  return healStableSurfaceSlot<TFn>(surface, key, stableKey, isCallable);
}

export function installStableSurfaceMethod<TFn extends StableMethod>(
  surface: StableMethodOwner,
  key: string,
  stableKey: string,
  create: () => TFn
): TFn {
  return installStableSurfaceSlot<TFn>(surface, key, stableKey, isCallable, create);
}
