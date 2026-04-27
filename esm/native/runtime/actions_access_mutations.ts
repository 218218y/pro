// Semantic App.actions mutation helpers (Pure ESM)
//
// This file owns higher-level action flows so callers do not repeat action lookup and
// truthy checks across the codebase.

import type {
  ActionMetaLike,
  ModulesGeometrySnapshotLike,
  SaveProjectAction,
  UnknownRecord,
} from '../../../types';

import { getSingleSlicePatchRoute } from './slice_write_access.js';
import { readPatchPayload } from './slice_write_access_shared.js';
import { ensureActionsRoot, getActionFn, getNamespacedActionFn } from './actions_access_core.js';
import {
  buildProjectSaveActionErrorResult,
  normalizeProjectSaveActionResult,
  type ProjectSaveActionResult,
} from './project_save_action_result.js';
import {
  getMetaActionFn,
  getConfigActionFn,
  getHistoryActionFn,
  getModelsActionFn,
  getColorsActionFn,
  getDividersActionFn,
  getGroovesActionFn,
} from './actions_access_domains.js';

function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function asRecord(value: unknown): UnknownRecord | null {
  return isRecord(value) ? value : null;
}

function getDefinedPatchKeys(patch: UnknownRecord): string[] {
  return Object.keys(asRecord(patch) || {}).filter(key => typeof patch[key] !== 'undefined');
}

function callSlicePatchAction(
  App: unknown,
  namespace: string,
  payload: unknown,
  meta?: ActionMetaLike
): boolean {
  const fn = getNamespacedActionFn<(patch: unknown, meta?: ActionMetaLike) => unknown>(
    App,
    namespace,
    'patch'
  );
  if (typeof fn !== 'function') return false;
  fn(payload, meta);
  return true;
}

export function commitUiSnapshotViaActions(
  App: unknown,
  snapshot: UnknownRecord,
  meta?: ActionMetaLike
): boolean {
  const commitUiSnapshot = getActionFn<(snap: UnknownRecord, meta?: ActionMetaLike) => unknown>(
    App,
    'commitUiSnapshot'
  );
  if (typeof commitUiSnapshot !== 'function') return false;
  commitUiSnapshot(snapshot, meta);
  return true;
}

export function commitUiSnapshotViaActionsOrThrow(
  App: unknown,
  snapshot: UnknownRecord,
  meta?: ActionMetaLike,
  label = 'actions.commitUiSnapshot'
): void {
  const commitUiSnapshot = getActionFn<(snap: UnknownRecord, meta?: ActionMetaLike) => unknown>(
    App,
    'commitUiSnapshot'
  );
  if (typeof commitUiSnapshot !== 'function') {
    throw new Error(`[WardrobePro] ${label} requires canonical actions.commitUiSnapshot(snapshot, meta).`);
  }
  commitUiSnapshot(snapshot, meta);
}

export function setDirtyViaActions(App: unknown, isDirty: boolean, meta?: ActionMetaLike): boolean {
  const setDirty = getMetaActionFn<(next: boolean, meta?: ActionMetaLike) => unknown>(App, 'setDirty');
  if (typeof setDirty !== 'function') return false;
  setDirty(!!isDirty, meta);
  return true;
}

export function setDirtyViaActionsOrThrow(
  App: unknown,
  isDirty: boolean,
  meta?: ActionMetaLike,
  label = 'actions.meta.setDirty'
): void {
  const setDirty = getMetaActionFn<(next: boolean, meta?: ActionMetaLike) => unknown>(App, 'setDirty');
  if (typeof setDirty !== 'function') {
    throw new Error(`[WardrobePro] ${label} requires canonical actions.meta.setDirty(next, meta).`);
  }
  setDirty(!!isDirty, meta);
}

export function setSavedNotesViaActions(App: unknown, next: unknown, meta?: ActionMetaLike): boolean {
  const fn = getConfigActionFn<(next: unknown, meta?: ActionMetaLike) => unknown>(App, 'setSavedNotes');
  if (typeof fn !== 'function') return false;
  fn(next, meta);
  return true;
}

export function applyProjectConfigSnapshotViaActions(
  App: unknown,
  snapshot: UnknownRecord,
  meta?: ActionMetaLike
): boolean {
  const fn = getConfigActionFn<(snapshot: UnknownRecord, meta?: ActionMetaLike) => unknown>(
    App,
    'applyProjectSnapshot'
  );
  if (typeof fn !== 'function') return false;
  fn(snapshot, meta);
  return true;
}

export function applyProjectConfigSnapshotViaActionsOrThrow(
  App: unknown,
  snapshot: UnknownRecord,
  meta?: ActionMetaLike,
  label = 'actions.config.applyProjectSnapshot'
): void {
  const fn = getConfigActionFn<(snapshot: UnknownRecord, meta?: ActionMetaLike) => unknown>(
    App,
    'applyProjectSnapshot'
  );
  if (typeof fn !== 'function') {
    throw new Error(
      `[WardrobePro] ${label} requires canonical actions.config.applyProjectSnapshot(snapshot, meta).`
    );
  }
  fn(snapshot, meta);
}

export function applyModulesGeometrySnapshotViaActions(
  App: unknown,
  snapshot: ModulesGeometrySnapshotLike,
  meta?: ActionMetaLike
): boolean {
  const fn = getConfigActionFn<(snapshot: ModulesGeometrySnapshotLike, meta?: ActionMetaLike) => unknown>(
    App,
    'applyModulesGeometrySnapshot'
  );
  if (typeof fn !== 'function') return false;
  fn(snapshot, meta);
  return true;
}

export function runHistoryBatchViaActions<T>(App: unknown, meta: ActionMetaLike, fn: () => T): T {
  const batch = getHistoryActionFn<(cb: () => T, meta?: ActionMetaLike) => T>(App, 'batch');
  if (typeof batch === 'function') {
    return batch(fn, meta);
  }
  return fn();
}

export function patchViaActions(App: unknown, patch: UnknownRecord, meta?: ActionMetaLike): boolean {
  const safePatch = asRecord(patch) || {};
  const rawKeys = getDefinedPatchKeys(safePatch);

  if (!rawKeys.length) {
    const touch = getMetaActionFn<(meta?: ActionMetaLike) => unknown>(App, 'touch');
    if (typeof touch === 'function') {
      touch(meta);
      return true;
    }
    return false;
  }

  const canonicalPatch = readPatchPayload(safePatch);
  const canonicalKeys = getDefinedPatchKeys(canonicalPatch);
  if (!canonicalKeys.length) {
    return false;
  }

  const route = getSingleSlicePatchRoute(canonicalPatch);
  if (route && callSlicePatchAction(App, route.namespace, route.payload, meta)) {
    return true;
  }

  const fn = getActionFn<(patch: UnknownRecord, meta?: ActionMetaLike) => unknown>(App, 'patch');
  if (typeof fn !== 'function') return false;
  fn(canonicalPatch, meta);
  return true;
}

export function renderModelUiViaActions(App: unknown): boolean {
  const fn = getModelsActionFn<() => unknown>(App, 'renderModelUI');
  if (typeof fn !== 'function') return false;
  fn();
  return true;
}

export function renderModelUiViaActionsOrThrow(App: unknown, label = 'actions.models.renderModelUI'): void {
  const fn = getModelsActionFn<() => unknown>(App, 'renderModelUI');
  if (typeof fn !== 'function') {
    throw new Error(`[WardrobePro] ${label} requires canonical actions.models.renderModelUI().`);
  }
  fn();
}

export function setMultiModeViaActions(App: unknown, enabled: boolean, meta?: ActionMetaLike): boolean {
  const fn = getColorsActionFn<(enabled: boolean, meta?: ActionMetaLike) => unknown>(App, 'setMultiMode');
  if (typeof fn !== 'function') return false;
  fn(!!enabled, meta);
  return true;
}

export function applyPaintViaActions(
  App: unknown,
  colors: unknown,
  curtains: unknown,
  meta?: ActionMetaLike,
  doorSpecialMap?: unknown,
  mirrorLayoutMap?: unknown
): boolean {
  const fn = getColorsActionFn<
    (
      colors: unknown,
      curtains: unknown,
      meta?: ActionMetaLike,
      doorSpecialMap?: unknown,
      mirrorLayoutMap?: unknown
    ) => unknown
  >(App, 'applyPaint');
  if (typeof fn !== 'function') return false;
  fn(colors, curtains, meta, doorSpecialMap, mirrorLayoutMap);
  return true;
}

export function toggleDividerViaActions(App: unknown, dividerKey: unknown, meta?: ActionMetaLike): boolean {
  const fn = getDividersActionFn<(dividerKey: unknown, meta?: ActionMetaLike) => unknown>(App, 'toggle');
  if (typeof fn !== 'function') return false;
  fn(dividerKey, meta);
  return true;
}

export function toggleGrooveViaActions(App: unknown, grooveKey: unknown, meta?: ActionMetaLike): boolean {
  const fn = getGroovesActionFn<(grooveKey: unknown, meta?: ActionMetaLike) => unknown>(App, 'toggle');
  if (typeof fn !== 'function') return false;
  fn(grooveKey, meta);
  return true;
}

export function getSaveProjectAction(App: unknown): SaveProjectAction | null {
  return getActionFn<SaveProjectAction>(App, 'saveProject');
}

export function setSaveProjectAction(App: unknown, fn: SaveProjectAction | null): SaveProjectAction | null {
  if (typeof fn !== 'function') return getSaveProjectAction(App);
  const actions = ensureActionsRoot(App);
  if (typeof actions.saveProject !== 'function') {
    actions.saveProject = fn;
  }
  return getSaveProjectAction(App);
}

export function saveProjectViaActions(App: unknown): boolean {
  const fn = getSaveProjectAction(App);
  if (typeof fn !== 'function') return false;
  fn();
  return true;
}

export type ProjectSaveActionResultLike = ProjectSaveActionResult;

export function saveProjectResultViaActions(
  App: unknown,
  fallbackReason: import('./project_save_action_result.js').ProjectSaveFailureReason = 'not-installed',
  errorFallback = '[WardrobePro] Project save failed.'
): ProjectSaveActionResultLike {
  const fn = getSaveProjectAction(App);
  if (typeof fn !== 'function') return { ok: false, reason: 'not-installed' };

  try {
    return normalizeProjectSaveActionResult(fn(), fallbackReason);
  } catch (error) {
    return buildProjectSaveActionErrorResult(error, errorFallback);
  }
}
