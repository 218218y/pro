import type {
  ActionMetaLike,
  ActionsNamespaceLike,
  ProjectLoadStateSnapshotLike,
  ProjectLoadTransactionHandleLike,
  RootStateLike,
  UnknownRecord,
} from '../../../types';
import type { PatchPayload } from '../../../types/backend_patch_payload';
import type { RootStoreLike } from '../../../types/backend_store';

import { buildConfigPatchWithReplaceMetadata } from '../runtime/cfg_access_patch_metadata.js';
import { asRecord, isRecord } from '../runtime/record.js';
import { withStoreConfigMapWriteCapability } from '../runtime/store_config_map_write_capability.js';
import { canonicalizeComparableProjectConfigPatch } from './kernel_project_config_snapshot_canonical.js';
import { PROJECT_CONFIG_REPLACE_KEYS } from './state_api_shared.js';

type ProjectLoadTransactionInstallContext = {
  actions: ActionsNamespaceLike;
  store: RootStoreLike;
  normMeta: (meta: ActionMetaLike | UnknownRecord | null | undefined, source: string) => ActionMetaLike;
  shallowCloneObj: (value: unknown) => UnknownRecord;
};

function assertProjectLoadStateSnapshot(value: unknown): ProjectLoadStateSnapshotLike {
  const snapshot = asRecord<ProjectLoadStateSnapshotLike>(value);
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
  return snapshot;
}

export function installStateApiProjectLoadTransaction(ctx: ProjectLoadTransactionInstallContext): void {
  const { actions, store, normMeta, shallowCloneObj } = ctx;
  if (typeof actions.commitProjectLoadSnapshot === 'function') return;

  actions.commitProjectLoadSnapshot = function commitProjectLoadSnapshot(
    value: ProjectLoadStateSnapshotLike,
    meta?: ActionMetaLike
  ): ProjectLoadTransactionHandleLike {
    const snapshot = assertProjectLoadStateSnapshot(value);
    if (typeof store.patch !== 'function' || typeof store.setRoot !== 'function') {
      throw new Error(
        '[WardrobePro] project load transaction requires atomic store.patch and store.setRoot rollback seams.'
      );
    }

    const previousRoot = store.getState();
    const previous = asRecord<RootStateLike>(previousRoot);
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
    const payload: PatchPayload = {
      ui,
      config: buildConfigPatchWithReplaceMetadata(config, PROJECT_CONFIG_REPLACE_KEYS),
      runtime: { ...snapshot.runtime },
      mode: { ...snapshot.mode },
      meta: { ...snapshot.meta },
    };
    const commitMeta = normMeta(meta, 'actions:commitProjectLoadSnapshot');
    store.patch(payload, commitMeta, withStoreConfigMapWriteCapability({ forceCommit: true }));

    let state: ProjectLoadTransactionHandleLike['state'] = 'prepared';
    return {
      get state(): ProjectLoadTransactionHandleLike['state'] {
        return state;
      },
      commit(): void {
        if (state !== 'prepared') {
          throw new Error(`[WardrobePro] project load transaction cannot commit from ${state}.`);
        }
        state = 'committed';
      },
      rollback(rollbackMeta?: ActionMetaLike): void {
        if (state !== 'prepared') {
          throw new Error(`[WardrobePro] project load transaction cannot roll back from ${state}.`);
        }
        if (typeof store.setRoot !== 'function') {
          throw new Error('[WardrobePro] project load transaction lost its root rollback seam.');
        }
        store.setRoot(previous, normMeta(rollbackMeta, 'actions:rollbackProjectLoadSnapshot'), {
          forceCommit: true,
        });
        state = 'rolled-back';
      },
    };
  };
}
