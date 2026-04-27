// UI state access helpers (ESM)
//
// Goals:
// - Store-only: read from the root store snapshot.
// - Stay fail-soft: UI should degrade gracefully when App/store is missing.
// - Keep a small, stable API for UI modules (avoid importing from platform/*).

import {
  readConfigStateFromApp,
  readMetaStateFromApp,
  readModeStateFromApp,
  readRuntimeStateFromApp,
  readUiStateFromApp,
} from '../services/api.js';

import type {
  UiStateLike,
  ConfigStateLike,
  RuntimeStateLike,
  ModeStateLike,
  MetaStateLike,
} from '../../../types';

type AppLike = { store?: unknown } | null | undefined;

export function getCfg(App: AppLike): ConfigStateLike {
  return readConfigStateFromApp(App);
}

export function getUi(App: AppLike): UiStateLike {
  return readUiStateFromApp(App);
}

export function getMode(App: AppLike): ModeStateLike {
  return readModeStateFromApp(App);
}

export function getRuntime(App: AppLike): RuntimeStateLike {
  return readRuntimeStateFromApp(App);
}

export function getMeta(App: AppLike): MetaStateLike {
  return readMetaStateFromApp(App);
}
