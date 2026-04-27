import type { ActionMetaLike, UnknownRecord } from '../../../types';

import { getActions } from './actions_access_core.js';

type StoreActionsNamespaceLike = {
  installReactivity?: () => unknown;
};

type BootMetaNamespaceLike = {
  uiOnly?: (meta?: ActionMetaLike, source?: string) => ActionMetaLike;
};

type CommitUiSnapshotFn = (ui: UnknownRecord, meta: ActionMetaLike) => unknown;

function isRecord(v: unknown): v is UnknownRecord {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function asRecord(v: unknown): UnknownRecord | null {
  return isRecord(v) ? v : null;
}

function requireAppRecord(App: unknown, label: string): UnknownRecord {
  const app = asRecord(App);
  if (!app) {
    throw new Error(`[WardrobePro] ${label} requires a valid App container.`);
  }
  return app;
}

function readMetaNamespace(value: unknown): BootMetaNamespaceLike | null {
  const rec = asRecord(value);
  return rec && (!('uiOnly' in rec) || typeof rec.uiOnly === 'function') ? rec : null;
}

function readStoreNamespace(value: unknown): StoreActionsNamespaceLike | null {
  return asRecord(value);
}

function readCommitUiSnapshot(value: unknown): CommitUiSnapshotFn | null {
  if (typeof value !== 'function') return null;
  return (ui: UnknownRecord, meta: ActionMetaLike) => Reflect.apply(value, undefined, [ui, meta]);
}

function bootMeta(App: UnknownRecord, source: string): ActionMetaLike {
  const actions = getActions(App);
  const metaNs = readMetaNamespace(actions?.meta);
  if (metaNs && typeof metaNs.uiOnly === 'function') {
    return metaNs.uiOnly(undefined, source);
  }
  return {
    source,
    immediate: true,
    uiOnly: true,
    noBuild: true,
    noAutosave: true,
    noPersist: true,
    noHistory: true,
    noCapture: true,
  };
}

function requireInstallStoreReactivityFn(App: unknown, label: string): () => unknown {
  const app = requireAppRecord(App, label);
  const actions = getActions(app);
  const storeNs = readStoreNamespace(actions?.store);
  const installViaActions = storeNs?.installReactivity || null;
  if (typeof installViaActions !== 'function') {
    throw new Error(`[WardrobePro] Canonical actions.store.installReactivity() is required for ${label}.`);
  }
  return installViaActions;
}

function requireCommitUiSnapshotFn(
  App: unknown,
  label: string
): { app: UnknownRecord; commitUiSnapshot: CommitUiSnapshotFn } {
  const app = requireAppRecord(App, label);
  const actions = getActions(app);
  const commitUiSnapshot = readCommitUiSnapshot(actions?.commitUiSnapshot);
  if (!commitUiSnapshot) {
    throw new Error(`[WardrobePro] Canonical actions.commitUiSnapshot(ui, meta) is required for ${label}.`);
  }
  return { app, commitUiSnapshot };
}

/**
 * Canonical boot-only seam helpers for store installation / seed commit.
 *
 * Policy:
 * - UI/boot code should not probe legacy kernel internals directly.
 * - Delete-pass: this helper now requires canonical actions surfaces installed by boot manifest
 *   (canonical action surfaces are expected before UI boot).
 */
export function installStoreReactivityOrThrow(App: unknown, label = 'boot store reactivity'): void {
  const install = requireInstallStoreReactivityFn(App, label);
  install();
}

export function installStoreReactivityMaybe(App: unknown): boolean {
  try {
    installStoreReactivityOrThrow(App, 'boot store reactivity');
    return true;
  } catch {
    return false;
  }
}

export function canCommitBootSeedUiSnapshot(App: unknown): boolean {
  try {
    requireCommitUiSnapshotFn(App, 'boot seed ui snapshot');
    return true;
  } catch {
    return false;
  }
}

export function commitBootSeedUiSnapshotOrThrow(
  App: unknown,
  seedUi: unknown,
  source = 'init:seed',
  label = 'boot seed ui snapshot'
): void {
  const { app, commitUiSnapshot } = requireCommitUiSnapshotFn(App, label);
  const snap = asRecord(seedUi) || {};
  const meta = bootMeta(app, source);
  commitUiSnapshot(snap, meta);
}

export function commitBootSeedUiSnapshotMaybe(App: unknown, seedUi: unknown): boolean {
  try {
    commitBootSeedUiSnapshotOrThrow(App, seedUi);
    return true;
  } catch {
    return false;
  }
}
