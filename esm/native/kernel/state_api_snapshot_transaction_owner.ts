import type { ActionMetaLike, RootStateLike, StateSnapshotTransactionHandleLike } from '../../../types';
import type { StorePatchPayload } from '../../../types/backend_patch_payload';

type PrepareStateSnapshotTransactionArgs = {
  payload: StorePatchPayload;
  commitMeta: ActionMetaLike;
  readRootSnapshot: () => RootStateLike | null;
  commitSnapshotPatch: (payload: StorePatchPayload, meta: ActionMetaLike) => unknown;
  restoreRootSnapshot: (snapshot: RootStateLike, meta: ActionMetaLike) => unknown;
  normalizeRollbackMeta: (meta?: ActionMetaLike) => ActionMetaLike;
  label: string;
};

export function prepareStateSnapshotTransaction(
  args: PrepareStateSnapshotTransactionArgs
): StateSnapshotTransactionHandleLike {
  const {
    payload,
    commitMeta,
    readRootSnapshot,
    commitSnapshotPatch,
    restoreRootSnapshot,
    normalizeRollbackMeta,
    label,
  } = args;
  const previous = readRootSnapshot();
  if (!previous) {
    throw new Error(`[WardrobePro] ${label} could not capture the current root state.`);
  }

  commitSnapshotPatch(payload, commitMeta);

  let state: StateSnapshotTransactionHandleLike['state'] = 'prepared';
  return {
    get state(): StateSnapshotTransactionHandleLike['state'] {
      return state;
    },
    commit(): void {
      if (state !== 'prepared') {
        throw new Error(`[WardrobePro] ${label} cannot commit from ${state}.`);
      }
      state = 'committed';
    },
    rollback(rollbackMeta?: ActionMetaLike): void {
      if (state !== 'prepared') {
        throw new Error(`[WardrobePro] ${label} cannot roll back from ${state}.`);
      }
      restoreRootSnapshot(previous, normalizeRollbackMeta(rollbackMeta));
      state = 'rolled-back';
    },
  };
}
