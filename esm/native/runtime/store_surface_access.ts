import type { RootStateLike, RootStoreLike, StoreLike } from '../../../types';

import { ensureStoreRoot, getStoreRootMaybe } from './app_roots_access.js';
import { asRecord } from './record.js';

export type StoreSurfaceLike<S = RootStateLike> = Pick<StoreLike<S>, 'getState'> & Partial<StoreLike<S>>;
export type StorePatchSurfaceLike<S = RootStateLike> = StoreSurfaceLike<S> & Pick<StoreLike<S>, 'patch'>;
export type StoreSelectorSurfaceLike<S = RootStateLike> = StoreSurfaceLike<S> &
  Required<Pick<StoreLike<S>, 'subscribeSelector'>>;
type StoreSubscribeFn<S = RootStateLike> = StoreLike<S>['subscribe'];
type StoreSelectorSubscribeFn<S = RootStateLike> = NonNullable<StoreLike<S>['subscribeSelector']>;

function isStoreSurfaceLike<S = RootStateLike>(value: unknown): value is StoreSurfaceLike<S> {
  const store = asRecord<StoreSurfaceLike<S>>(value);
  return !!(store && typeof store.getState === 'function');
}

function isStorePatchSurfaceLike<S = RootStateLike>(value: unknown): value is StorePatchSurfaceLike<S> {
  const store = asRecord<StorePatchSurfaceLike<S>>(value);
  return !!(store && typeof store.getState === 'function' && typeof store.patch === 'function');
}

function isStoreSelectorSurfaceLike<S = RootStateLike>(value: unknown): value is StoreSelectorSurfaceLike<S> {
  const store = asRecord<StoreSelectorSurfaceLike<S>>(value);
  return !!(store && typeof store.getState === 'function' && typeof store.subscribeSelector === 'function');
}

function readStoreRoot<S = RootStateLike>(App: unknown): StoreSurfaceLike<S> | null {
  return getStoreRootMaybe<StoreSurfaceLike<S>>(App);
}

export function getStoreSurfaceMaybe<S = RootStateLike>(App: unknown): StoreSurfaceLike<S> | null {
  const store = readStoreRoot<S>(App);
  return isStoreSurfaceLike<S>(store) ? store : null;
}

export function installStoreSurface<S = RootStateLike>(
  App: unknown,
  createStore: () => RootStoreLike | StoreSurfaceLike<S>
): RootStoreLike | StoreSurfaceLike<S> {
  const current = getStoreSurfaceMaybe<S>(App);
  if (current) return current;
  const next = createStore();
  if (isStoreSurfaceLike<S>(next)) {
    const installed = ensureStoreRoot<StoreSurfaceLike<S> & Record<string, unknown>>(App, () => next);
    return installed;
  }
  return next;
}

export function requireStoreSurface<S = RootStateLike>(
  App: unknown,
  label = 'runtime/store_surface_access'
): StoreSurfaceLike<S> {
  const store = getStoreSurfaceMaybe<S>(App);
  if (!store) {
    throw new Error(`[WardrobePro] Store surface missing (${label}): expected store.getState`);
  }
  return store;
}

export function getStorePatchSurfaceMaybe<S = RootStateLike>(App: unknown): StorePatchSurfaceLike<S> | null {
  const store = readStoreRoot<S>(App);
  return isStorePatchSurfaceLike<S>(store) ? store : null;
}

export function requireStorePatchSurface<S = RootStateLike>(
  App: unknown,
  label = 'runtime/store_surface_access.patch'
): StorePatchSurfaceLike<S> {
  const store = getStorePatchSurfaceMaybe<S>(App);
  if (!store) {
    throw new Error(`[WardrobePro] Store patch surface missing (${label}): expected store.getState + patch`);
  }
  return store;
}

export function getStoreSelectorSurfaceMaybe<S = RootStateLike>(
  App: unknown
): StoreSelectorSurfaceLike<S> | null {
  const store = readStoreRoot<S>(App);
  return isStoreSelectorSurfaceLike<S>(store) ? store : null;
}

export function requireStoreSelectorSurface<S = RootStateLike>(
  App: unknown,
  label = 'runtime/store_surface_access.selector'
): StoreSelectorSurfaceLike<S> {
  const store = getStoreSelectorSurfaceMaybe<S>(App);
  if (!store) {
    throw new Error(
      `[WardrobePro] Store selector surface missing (${label}): expected store.getState + subscribeSelector`
    );
  }
  return store;
}

export function getStoreStateReader<S = RootStateLike>(App: unknown): (() => S) | null {
  const store = getStoreSurfaceMaybe<S>(App);
  return store && typeof store.getState === 'function' ? store.getState.bind(store) : null;
}

export function readStoreStateMaybe<S = RootStateLike>(App: unknown): S | null {
  try {
    const getState = getStoreStateReader<S>(App);
    return getState ? getState() : null;
  } catch {
    return null;
  }
}

export function getStoreSubscriber<S = RootStateLike>(App: unknown): StoreSubscribeFn<S> | null {
  const store = getStoreSurfaceMaybe<S>(App);
  if (!store || typeof store.subscribe !== 'function') return null;
  const subscribe = store.subscribe;
  return fn => Reflect.apply(subscribe, store, [fn]);
}

export function getStoreSelectorSubscriber<S = RootStateLike>(
  App: unknown
): StoreSelectorSubscribeFn<S> | null {
  const store = getStoreSelectorSurfaceMaybe<S>(App);
  if (!store || typeof store.subscribeSelector !== 'function') return null;
  const subscribeSelector = store.subscribeSelector;
  return (selector, fn, opts) => Reflect.apply(subscribeSelector, store, [selector, fn, opts]);
}

export function getStorePatcher<S = RootStateLike>(App: unknown): StorePatchSurfaceLike<S>['patch'] | null {
  const store = getStorePatchSurfaceMaybe<S>(App);
  return store ? store.patch.bind(store) : null;
}

export function hasStorePatchSurface(App: unknown): boolean {
  return !!getStorePatchSurfaceMaybe(App);
}

export function hasStoreSelectorSubscriber(App: unknown): boolean {
  return !!getStoreSelectorSubscriber(App);
}
