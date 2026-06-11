// App layer access helpers (Canonical surface)
//
// Goal:
// - Provide one stable path to read/install App.layers namespaces.
// - Keep core/engine installers on the same null-prototype layer root.
// - Avoid each installer growing its own record-guessing logic.

import type { AppContainer, AppLayersRootLike } from '../../../types';

import { asRecord, createNullRecord } from './record.js';
import { ensureLayersRoot, getLayersRootMaybe } from './app_roots_access.js';

function createNamespace<T extends object>(): T {
  return createNullRecord<T>();
}

function asLayersRootLike(value: unknown): AppLayersRootLike | null {
  return asRecord<AppLayersRootLike>(value);
}

export function getAppLayers(App: AppContainer): AppLayersRootLike | null {
  return asLayersRootLike(getLayersRootMaybe(App));
}

export function ensureAppLayers(App: AppContainer): AppLayersRootLike {
  return ensureLayersRoot(App);
}

export function getAppLayer<K extends keyof AppLayersRootLike>(
  App: AppContainer,
  key: K
): NonNullable<AppLayersRootLike[K]> | null {
  const layers = getAppLayers(App);
  if (!layers) return null;
  return asRecord<NonNullable<AppLayersRootLike[K]>>(layers[key]);
}

export function ensureAppLayer<K extends keyof AppLayersRootLike>(
  App: AppContainer,
  key: K
): NonNullable<AppLayersRootLike[K]> {
  const layers = ensureAppLayers(App);
  const existing = asRecord<NonNullable<AppLayersRootLike[K]>>(layers[key]);
  if (existing) return existing;
  const created = createNamespace<NonNullable<AppLayersRootLike[K]>>();
  layers[key] = created;
  return created;
}
