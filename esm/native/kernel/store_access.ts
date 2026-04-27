// Kernel store access helpers (TypeScript)
//
// Goal: remove scattered legacy selector checks inside kernel internals.
// This module is side-effect free on import.
// It is intentionally fail-fast: kernel should run only after platform installed the store.

import type {
  AppContainer,
  RootStateLike,
  UiStateLike,
  ConfigStateLike,
  RuntimeStateLike,
  ModeStateLike,
  MetaStateLike,
} from '../../../types';

import { assertApp } from '../runtime/assert.js';
import { readRootStateFromStore } from '../runtime/root_state_access.js';
import { requireStorePatchSurface, type StorePatchSurfaceLike } from '../runtime/store_surface_access.js';

function assertStore(App: unknown): StorePatchSurfaceLike<RootStateLike> {
  const A = assertApp(App, 'kernel/store_access');
  return requireStorePatchSurface(A, 'kernel/store_access');
}

export function getState(App: AppContainer): RootStateLike {
  return readRootStateFromStore(assertStore(App));
}

export function getUi(App: AppContainer): UiStateLike {
  return getState(App).ui;
}

export function getCfg(App: AppContainer): ConfigStateLike {
  return getState(App).config;
}

export function getMode(App: AppContainer): ModeStateLike {
  return getState(App).mode;
}

export function getRuntime(App: AppContainer): RuntimeStateLike {
  return getState(App).runtime;
}

export function getMeta(App: AppContainer): MetaStateLike {
  return getState(App).meta;
}

export function isDirty(App: AppContainer): boolean {
  return getState(App).meta.dirty === true;
}
