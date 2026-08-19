import type {
  ActionMetaLike,
  ActionsNamespaceLike,
  StateSnapshotTransactionHandleLike,
  UiConfigStateSnapshotLike,
  UiStateLike,
  UnknownRecord,
} from '../../../types';
import type { PatchPayload } from '../../../types/backend_patch_payload';
import type { RootStateLike } from '../../../types';

import { asRecord, isRecord } from './kernel_shared.js';
import { canonicalizeComparableProjectConfigPatch } from './kernel_project_config_snapshot_canonical.js';
import { prepareStateSnapshotTransaction } from './state_api_snapshot_transaction_owner.js';
import { PROJECT_CONFIG_REPLACE_KEYS } from './state_api_shared.js';

type UiConfigSnapshotTransactionInstallContext = {
  actions: ActionsNamespaceLike;
  readRootSnapshot: () => RootStateLike | null;
  commitSnapshotPatch: (payload: PatchPayload, meta: ActionMetaLike) => unknown;
  restoreRootSnapshot: (snapshot: RootStateLike, meta: ActionMetaLike) => unknown;
  buildSnapshotConfigPatch: (patch: unknown, replaceKeys: unknown) => PatchPayload['config'];
  normMeta: (meta: ActionMetaLike | UnknownRecord | null | undefined, source: string) => ActionMetaLike;
  shallowCloneObj: (value: unknown) => UnknownRecord;
};

function assertUiConfigStateSnapshot(value: unknown): UiConfigStateSnapshotLike {
  const snapshot = asRecord(value);
  if (!snapshot || !isRecord(snapshot.ui) || !isRecord(snapshot.config)) {
    throw new Error(
      '[WardrobePro] actions.commitUiConfigSnapshot requires explicit ui patch and complete config snapshot.'
    );
  }
  return {
    ui: snapshot.ui as UiConfigStateSnapshotLike['ui'],
    config: snapshot.config as UiConfigStateSnapshotLike['config'],
  };
}

function mergeUiSnapshot(baseUi: unknown, uiPatch: unknown): UiStateLike {
  const base = asRecord(baseUi);
  const patch = asRecord(uiPatch);
  const baseRaw = asRecord(base.raw);
  const patchRaw = asRecord(patch.raw);
  return {
    ...base,
    ...patch,
    raw: {
      ...baseRaw,
      ...patchRaw,
    },
  } as UiStateLike;
}

export function installStateApiUiConfigSnapshotTransaction(
  ctx: UiConfigSnapshotTransactionInstallContext
): void {
  const {
    actions,
    readRootSnapshot,
    commitSnapshotPatch,
    restoreRootSnapshot,
    buildSnapshotConfigPatch,
    normMeta,
    shallowCloneObj,
  } = ctx;
  if (typeof actions.commitUiConfigSnapshot === 'function') return;

  actions.commitUiConfigSnapshot = function commitUiConfigSnapshot(
    value: UiConfigStateSnapshotLike,
    meta?: ActionMetaLike
  ): StateSnapshotTransactionHandleLike {
    const snapshot = assertUiConfigStateSnapshot(value);
    const previous = readRootSnapshot();
    if (!previous || !isRecord(previous.ui) || !isRecord(previous.config)) {
      throw new Error(
        '[WardrobePro] ui/config snapshot transaction could not capture canonical ui/config state.'
      );
    }

    const ui = shallowCloneObj(snapshot.ui);
    if (isRecord(snapshot.ui.raw)) ui.raw = shallowCloneObj(snapshot.ui.raw);
    const nextUi = mergeUiSnapshot(previous.ui, ui);
    const configSource = shallowCloneObj(snapshot.config);
    const config = canonicalizeComparableProjectConfigPatch(configSource, {
      uiSnapshot: nextUi,
      cfgSnapshot: { ...shallowCloneObj(previous.config), ...configSource },
      cornerMode: 'auto',
      topMode: 'materialize',
    });
    const configPatch = buildSnapshotConfigPatch(config, PROJECT_CONFIG_REPLACE_KEYS);
    const payload: PatchPayload = {
      ui,
      ...(configPatch !== undefined ? { config: configPatch } : {}),
    };
    const commitMeta = normMeta(meta, 'actions:commitUiConfigSnapshot');
    return prepareStateSnapshotTransaction({
      payload,
      readRootSnapshot,
      commitSnapshotPatch,
      restoreRootSnapshot,
      commitMeta,
      label: 'ui/config snapshot transaction',
      normalizeRollbackMeta: rollbackMeta => normMeta(rollbackMeta, 'actions:rollbackUiConfigSnapshot'),
    });
  };
}
