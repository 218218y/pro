// Builder store access helpers (ESM)
//
// Goal: remove scattered legacy selector usage in builder internals.
// This module is side-effect free on import and intentionally fail-fast.

import type {
  AppContainer,
  RootStateLike,
  UiStateLike,
  RuntimeStateLike,
  ConfigStateLike,
  ModeStateLike,
  MetaStateLike,
  BuildStateLike,
} from '../../../types/index.js';

import { canonicalizeProjectConfigStructuralSnapshot } from '../features/project_config/project_config_lists_canonical.js';
import { asRecord, cloneRecord } from '../runtime/record.js';
import { getActionNamespace } from '../runtime/actions_access_core.js';
import { getConfigActions } from '../runtime/actions_access_domains.js';
import {
  readConfigStateFromApp,
  readMetaStateFromApp,
  readModeStateFromApp,
  readRootState,
  readRuntimeStateFromApp,
  readUiStateFromApp,
} from '../runtime/root_state_access.js';

type BuilderActionSurface = {
  getBuildState?: (uiOverride?: unknown) => unknown;
};

type ConfigActionSurface = {
  captureSnapshot?: () => unknown;
};

function _assertAppPresent(App: unknown): void {
  if (!App || typeof App !== 'object') throw new Error('[WardrobePro][builder] missing App');
}

function _isBuilderActionsSurface(value: unknown): value is BuilderActionSurface {
  return !!asRecord(value);
}

function _asBuilderActions(App: unknown): BuilderActionSurface | null {
  _assertAppPresent(App);
  const builder = getActionNamespace(App, 'builder');
  return _isBuilderActionsSurface(builder) ? builder : null;
}

function _isConfigActionsSurface(value: unknown): value is ConfigActionSurface {
  return !!asRecord(value);
}

function _asConfigActions(App: unknown): ConfigActionSurface | null {
  _assertAppPresent(App);
  const config = getConfigActions(App);
  return _isConfigActionsSurface(config) ? config : null;
}

function _isBuildStateCandidate(x: unknown): x is BuildStateLike {
  const r = asRecord(x);
  return !!(r && (r.ui || r.config || r.mode));
}

function _isConfigState(value: unknown): value is ConfigStateLike {
  return !!asRecord(value);
}

function _asConfigState(x: unknown): ConfigStateLike | null {
  return _isConfigState(x) ? x : null;
}

function _canonicalizeConfigState(cfgIn: unknown, uiSnapshot: unknown): ConfigStateLike {
  const cfg = cloneRecord(_asConfigState(cfgIn) || {});
  return canonicalizeProjectConfigStructuralSnapshot(cfg, {
    uiSnapshot,
    cfgSnapshot: cfg,
    cornerMode: 'auto',
    topMode: 'materialize',
  });
}

function _canonicalizeBuildState(x: unknown): BuildStateLike | null {
  if (!_isBuildStateCandidate(x)) return null;

  const state = cloneRecord<BuildStateLike>(x);
  const ui = cloneRecord(state.ui || {});
  const runtime = cloneRecord(state.runtime || {});
  const mode = cloneRecord(state.mode || {});

  state.ui = ui;
  state.runtime = runtime;
  state.mode = mode;
  state.config = _canonicalizeConfigState(state.config, ui);
  return state;
}

export function getState(App: AppContainer): RootStateLike {
  return readRootState(App);
}

export function getUi(App: AppContainer): UiStateLike {
  return readUiStateFromApp(App);
}

export function getCfg(App: AppContainer): ConfigStateLike {
  return readConfigStateFromApp(App);
}

export function getMode(App: AppContainer): ModeStateLike {
  return readModeStateFromApp(App);
}

export function getRuntime(App: AppContainer): RuntimeStateLike {
  return readRuntimeStateFromApp(App);
}

export function getMeta(App: AppContainer): MetaStateLike {
  return readMetaStateFromApp(App);
}

export function getBuildStateMaybe(App: AppContainer, override?: unknown): BuildStateLike | null {
  try {
    const builderActions = _asBuilderActions(App);
    if (builderActions && typeof builderActions.getBuildState === 'function') {
      const buildState = builderActions.getBuildState(override);
      return _canonicalizeBuildState(buildState);
    }
  } catch {
    // fall through to override/store paths
  }

  if (_isBuildStateCandidate(override)) return _canonicalizeBuildState(override);

  try {
    const state = getState(App);
    return _canonicalizeBuildState(state);
  } catch {
    // Final delete-pass policy: builder reads are store/actions-only.
    return null;
  }
}

export function captureConfigSnapshotMaybe(App: AppContainer): ConfigStateLike | null {
  try {
    const configActions = _asConfigActions(App);
    if (configActions && typeof configActions.captureSnapshot === 'function') {
      const captured = _asConfigState(configActions.captureSnapshot());
      return captured ? _canonicalizeConfigState(captured, getUi(App)) : null;
    }
  } catch {
    // fall through to store snapshot path
  }

  try {
    const cfg = _asConfigState(cloneRecord(getCfg(App)));
    return cfg ? _canonicalizeConfigState(cfg, getUi(App)) : null;
  } catch {
    // Final delete-pass policy: config snapshots are store/actions-only.
    return null;
  }
}
