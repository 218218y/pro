import type {
  ActionMetaLike,
  ActionsNamespaceLike,
  ProjectLoadStateSnapshotLike,
  ProjectLoadTransactionHandleLike,
  UnknownRecord,
  RootStateLike,
} from '../../../types';
import type { PatchPayload } from '../../../types/backend_patch_payload';
import { asRecord, isRecord } from './kernel_shared.js';
import { prepareStateSnapshotTransaction } from './state_api_snapshot_transaction_owner.js';
import { canonicalizeComparableProjectConfigPatch } from './kernel_project_config_snapshot_canonical.js';
import { PROJECT_CONFIG_REPLACE_KEYS } from './state_api_shared.js';

type ProjectLoadTransactionInstallContext = {
  actions: ActionsNamespaceLike;
  readRootSnapshot: () => RootStateLike | null;
  commitSnapshotPatch: (payload: PatchPayload, meta: ActionMetaLike) => unknown;
  restoreRootSnapshot: (snapshot: RootStateLike, meta: ActionMetaLike) => unknown;
  buildSnapshotConfigPatch: (patch: unknown, replaceKeys: unknown) => PatchPayload['config'];
  normMeta: (meta: ActionMetaLike | UnknownRecord | null | undefined, source: string) => ActionMetaLike;
  shallowCloneObj: (value: unknown) => UnknownRecord;
};

function assertProjectLoadStateSnapshot(value: unknown): ProjectLoadStateSnapshotLike {
  const snapshot = asRecord(value);
  if (!snapshot || !isRecord(snapshot.ui) || !isRecord(snapshot.config)) {
    throw new Error(
      '[WardrobePro] actions.commitProjectLoadSnapshot requires complete ui and config snapshots.'
    );
  }
  if (!isRecord(snapshot.runtime) || !isRecord(snapshot.mode) || !isRecord(snapshot.meta)) {
    throw new Error(
      '[WardrobePro] actions.commitProjectLoadSnapshot requires explicit runtime, mode, and meta patches.'
    );
  }
  return {
    ui: snapshot.ui as ProjectLoadStateSnapshotLike['ui'],
    config: snapshot.config as ProjectLoadStateSnapshotLike['config'],
    runtime: snapshot.runtime as ProjectLoadStateSnapshotLike['runtime'],
    mode: snapshot.mode as ProjectLoadStateSnapshotLike['mode'],
    meta: snapshot.meta as ProjectLoadStateSnapshotLike['meta'],
  };
}

export function installStateApiProjectLoadTransaction(ctx: ProjectLoadTransactionInstallContext): void {
  const {
    actions,
    readRootSnapshot,
    commitSnapshotPatch,
    restoreRootSnapshot,
    buildSnapshotConfigPatch,
    normMeta,
    shallowCloneObj,
  } = ctx;
  if (typeof actions.commitProjectLoadSnapshot === 'function') return;

  actions.commitProjectLoadSnapshot = function commitProjectLoadSnapshot(
    value: ProjectLoadStateSnapshotLike,
    meta?: ActionMetaLike
  ): ProjectLoadTransactionHandleLike {
    const snapshot = assertProjectLoadStateSnapshot(value);
    const previous = readRootSnapshot();
    if (!previous) {
      throw new Error('[WardrobePro] project load transaction could not capture the current root state.');
    }

    const ui = {
      ...shallowCloneObj(snapshot.ui),
      __snapshot: true,
      __capturedAt: Date.now(),
    };
    const configSource = shallowCloneObj(snapshot.config);
    const config = canonicalizeComparableProjectConfigPatch(configSource, {
      uiSnapshot: ui,
      cfgSnapshot: { ...shallowCloneObj(previous.config), ...configSource },
      cornerMode: 'auto',
      topMode: 'materialize',
    });
    const configPatch = buildSnapshotConfigPatch(config, PROJECT_CONFIG_REPLACE_KEYS);
    const payload: PatchPayload = {
      ui,
      ...(configPatch !== undefined ? { config: configPatch } : {}),
      runtime: { ...snapshot.runtime },
      mode: { ...snapshot.mode },
      meta: { ...snapshot.meta },
    };
    const commitMeta = normMeta(meta, 'actions:commitProjectLoadSnapshot');
    return prepareStateSnapshotTransaction({
      payload,
      readRootSnapshot,
      commitSnapshotPatch,
      restoreRootSnapshot,
      commitMeta,
      label: 'project load transaction',
      normalizeRollbackMeta: rollbackMeta => normMeta(rollbackMeta, 'actions:rollbackProjectLoadSnapshot'),
    });
  };
}
