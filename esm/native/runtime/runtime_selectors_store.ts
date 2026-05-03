// Runtime selector store/App adapters (ESM)
//
// Keeps root-state and App surface access out of pure snapshot selector owners.

import type { RuntimeScalarKey, RuntimeScalarValueMap, RuntimeStateLike } from '../../../types/index.js';
import { readRuntimeStateFromStore } from './root_state_access.js';
import { getStoreSurfaceMaybe } from './store_surface_access.js';
import { EMPTY_RUNTIME } from './runtime_selectors_shared.js';
import { readRuntimeScalarFromSnapshot, readRuntimeScalarOrDefault } from './runtime_selectors_snapshot.js';

/**
 * Read the current store.runtime snapshot (store-only).
 */
export function readRuntimeStateFromApp(App: unknown): RuntimeStateLike {
  try {
    return readRuntimeStateFromStore(getStoreSurfaceMaybe(App));
  } catch {
    return EMPTY_RUNTIME;
  }
}

/** Read a typed runtime scalar from the canonical store surface. */
export function readRuntimeScalarFromStore<K extends RuntimeScalarKey>(
  store: unknown,
  key: K
): RuntimeScalarValueMap[K] | undefined {
  const r = readRuntimeStateFromStore(store);
  return readRuntimeScalarFromSnapshot(r, key);
}

/** Read a typed runtime scalar from App (store-only). */
export function readRuntimeScalarFromApp<K extends RuntimeScalarKey>(
  App: unknown,
  key: K
): RuntimeScalarValueMap[K] | undefined {
  const r = readRuntimeStateFromApp(App);
  return readRuntimeScalarFromSnapshot(r, key);
}

export function readRuntimeScalarOrDefaultFromStore<K extends RuntimeScalarKey>(
  store: unknown,
  key: K,
  fallback?: RuntimeScalarValueMap[K]
): RuntimeScalarValueMap[K] {
  const rt = readRuntimeStateFromStore(store);
  return readRuntimeScalarOrDefault(rt, key, fallback);
}

export function readRuntimeScalarOrDefaultFromApp<K extends RuntimeScalarKey>(
  App: unknown,
  key: K,
  fallback?: RuntimeScalarValueMap[K]
): RuntimeScalarValueMap[K] {
  const rt = readRuntimeStateFromApp(App);
  return readRuntimeScalarOrDefault(rt, key, fallback);
}
