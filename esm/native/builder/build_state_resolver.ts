// Build state resolver (Pure ESM)
//
// Normalizes the entry inputs for builder/core:
// - accepts either a full state snapshot (state.ui/state.config/state.mode)
// - or a compat build-state override resolver (via centralized store_access seams)
//
// Also derives runtime flags that affect post-build behavior.
// In Stage 21 this module also becomes the single place that:
// - captures/merges a config snapshot (Store.config SSOT)
// - normalizes required config containers (maps/arrays) for older snapshots

import type {
  AppContainer,
  BuildStateLike,
  BuildStateResolvedLike,
  ConfigStateLike,
  RuntimeStateLike,
  UiStateLike,
} from '../../../types';

import { canonicalizeProjectConfigStructuralSnapshot } from '../features/project_config/project_config_lists_canonical.js';
import {
  normalizeColorSwatchesOrderSnapshot,
  normalizeKnownMapSnapshot,
  normalizeSavedColorObjectsSnapshot,
} from '../runtime/maps_access.js';
import { asRecord } from '../runtime/record.js';
import { captureConfigSnapshotMaybe, getBuildStateMaybe } from './store_access.js';
import { getDoorEditHoldActive } from '../runtime/doors_access.js';
import { readRuntimeScalarOrDefault } from '../runtime/runtime_selectors.js';
import { reportErrorViaPlatform } from '../runtime/platform_access.js';

function isUiState(value: unknown): value is UiStateLike {
  return !!asRecord(value);
}

function readUiState(value: unknown): UiStateLike | null {
  return isUiState(value) ? value : null;
}

function isRuntimeState(value: unknown): value is RuntimeStateLike {
  return !!asRecord(value);
}

function readRuntimeState(value: unknown): RuntimeStateLike | null {
  return isRuntimeState(value) ? value : null;
}

function isConfigState(value: unknown): value is ConfigStateLike {
  return !!asRecord(value);
}

function readConfigState(value: unknown): ConfigStateLike | null {
  return isConfigState(value) ? value : null;
}

function _isBuildStateCandidate(value: unknown): value is BuildStateLike {
  const rec = asRecord(value);
  return !!(rec && (rec.ui || rec.config || rec.mode));
}

function _normalizeCfgContainers(cfg: ConfigStateLike): ConfigStateLike {
  cfg.savedColors = normalizeSavedColorObjectsSnapshot(cfg.savedColors);
  cfg.colorSwatchesOrder = normalizeColorSwatchesOrderSnapshot(cfg.colorSwatchesOrder);
  cfg.individualColors = normalizeKnownMapSnapshot('individualColors', cfg.individualColors);

  cfg.groovesMap = normalizeKnownMapSnapshot('groovesMap', cfg.groovesMap);
  cfg.grooveLinesCountMap = normalizeKnownMapSnapshot('grooveLinesCountMap', cfg.grooveLinesCountMap);
  cfg.splitDoorsMap = normalizeKnownMapSnapshot('splitDoorsMap', cfg.splitDoorsMap);
  cfg.splitDoorsBottomMap = normalizeKnownMapSnapshot('splitDoorsBottomMap', cfg.splitDoorsBottomMap);
  cfg.removedDoorsMap = normalizeKnownMapSnapshot('removedDoorsMap', cfg.removedDoorsMap);
  cfg.drawerDividersMap = normalizeKnownMapSnapshot('drawerDividersMap', cfg.drawerDividersMap);
  cfg.handlesMap = normalizeKnownMapSnapshot('handlesMap', cfg.handlesMap);
  cfg.hingeMap = normalizeKnownMapSnapshot('hingeMap', cfg.hingeMap);
  cfg.curtainMap = normalizeKnownMapSnapshot('curtainMap', cfg.curtainMap);
  cfg.doorSpecialMap = normalizeKnownMapSnapshot('doorSpecialMap', cfg.doorSpecialMap);
  cfg.doorStyleMap = normalizeKnownMapSnapshot('doorStyleMap', cfg.doorStyleMap);
  cfg.mirrorLayoutMap = normalizeKnownMapSnapshot('mirrorLayoutMap', cfg.mirrorLayoutMap);
  cfg.doorTrimMap = normalizeKnownMapSnapshot('doorTrimMap', cfg.doorTrimMap);

  return cfg;
}

function _canonicalizeBuilderConfigLists(cfg: ConfigStateLike, uiSnapshot: UiStateLike): ConfigStateLike {
  return canonicalizeProjectConfigStructuralSnapshot(cfg, {
    uiSnapshot,
    cfgSnapshot: cfg,
    cornerMode: 'full',
    topMode: 'materialize',
  });
}

function _captureAndNormalizeConfigSnapshot(
  App: AppContainer,
  cfgMaybe: unknown,
  uiSnapshot: UiStateLike
): ConfigStateLike {
  // Start from the candidate override if provided; otherwise use an empty container.
  // (We intentionally keep this permissive - builder consumers validate required fields later.)
  let cfg: ConfigStateLike = readConfigState(cfgMaybe) || {};

  // If no full snapshot was provided, merge overrides into a fresh config snapshot
  // (single source-of-truth: Store.config).
  if (cfg.__snapshot !== true) {
    const baseCfg = readConfigState(captureConfigSnapshotMaybe(App)) || {};

    cfg = { ...baseCfg, ...cfg };

    // Mark as snapshot for builder consumers. We intentionally add capturedAt only on
    // fresh snapshots (not on store snapshots) to avoid polluting Undo/Redo equality.
    cfg.__snapshot = true;
    cfg.__capturedAt = Date.now();
  }

  return _canonicalizeBuilderConfigLists(_normalizeCfgContainers(cfg), uiSnapshot);
}

function resolveUiSlice(state: BuildStateLike | null | undefined): UiStateLike {
  const rec = asRecord(state);
  return readUiState(rec && rec.ui) || {};
}

function resolveRuntimeSlice(state: BuildStateLike | null | undefined): RuntimeStateLike {
  const rec = asRecord(state);
  return readRuntimeState(rec && rec.runtime) || {};
}

export function resolveBuildStateOrThrow(args: {
  App: AppContainer;
  stateOrOverride: unknown;
}): BuildStateResolvedLike {
  const App = args && args.App;
  const stateOrOverride = args && args.stateOrOverride;
  if (!App) throw new Error('[builder/build_state_resolver] App is required');

  let state: BuildStateLike | null = null;
  if (_isBuildStateCandidate(stateOrOverride)) {
    state = stateOrOverride;
  } else {
    const buildState = getBuildStateMaybe(App, stateOrOverride);
    if (buildState) {
      state = buildState;
    } else {
      const err = new Error(
        '[WardrobePro] Builder requires the canonical build-state seam (actions.builder/store access). ' +
          'Legacy DOM snapshot fallback has been removed.'
      );
      // Best-effort reporting; if reportError throws, let it surface (dev should know).
      reportErrorViaPlatform(App, err, 'builder.buildWardrobe');
      throw err;
    }
  }

  const ui = resolveUiSlice(state);
  const runtime = resolveRuntimeSlice(state);

  const globalClickMode = readRuntimeScalarOrDefault(runtime, 'globalClickMode', true);
  const hadEditHold = !globalClickMode && getDoorEditHoldActive(App);
  const cfgSnapshot = _captureAndNormalizeConfigSnapshot(App, state && state.config, ui);

  return { state, ui, runtime, globalClickMode, hadEditHold, cfgSnapshot };
}
