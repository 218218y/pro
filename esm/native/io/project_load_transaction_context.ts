import type {
  ActionMetaLike,
  HistorySystemSnapshotLike,
  ProjectLoadStateSnapshotLike,
  ProjectLoadTransactionHandleLike,
} from '../../../types';

import { getActionFn } from '../runtime/actions_access_core.js';
import { commitProjectLoadSnapshotViaActionsOrThrow } from '../runtime/actions_access_mutations.js';
import type { HistorySystemLike, ProjectIoOwnerDeps } from './project_io_orchestrator_shared.js';

type HistoryTransactionSystem = HistorySystemLike &
  Required<Pick<HistorySystemLike, 'resetBaseline' | 'captureSnapshot' | 'restoreSnapshot'>>;

type HistoryRollbackSnapshot = {
  system: HistoryTransactionSystem;
  snapshot: HistorySystemSnapshotLike;
};

function readProjectLoadTransactionState(
  handle: ProjectLoadTransactionHandleLike
): ProjectLoadTransactionHandleLike['state'] {
  return handle.state;
}

function isHistoryTransactionSystem(system: HistorySystemLike | null): system is HistoryTransactionSystem {
  return (
    !!system &&
    typeof system.resetBaseline === 'function' &&
    typeof system.captureSnapshot === 'function' &&
    typeof system.restoreSnapshot === 'function'
  );
}

export type ProjectLoadTransactionContext = {
  assertReady: (requiresHistoryReset: boolean) => void;
  captureHistory: (requiresHistoryReset: boolean) => HistoryRollbackSnapshot | null;
  applyState: (
    snapshot: ProjectLoadStateSnapshotLike,
    meta: ActionMetaLike
  ) => ProjectLoadTransactionHandleLike;
  markCommitted: (handle: ProjectLoadTransactionHandleLike) => void;
  rollbackState: (handle: ProjectLoadTransactionHandleLike, meta: ActionMetaLike) => void;
  rollbackHistory: (snapshot: HistoryRollbackSnapshot | null) => void;
};

export function createProjectLoadTransactionContext(
  deps: Pick<ProjectIoOwnerDeps, 'App' | 'getHistorySystem'>
): ProjectLoadTransactionContext {
  const { App, getHistorySystem } = deps;

  const readRequiredHistorySystem = (): HistoryTransactionSystem => {
    const history = getHistorySystem();
    if (!isHistoryTransactionSystem(history)) {
      throw new Error(
        '[WardrobePro] project.load history baseline requires canonical history transaction ownership.'
      );
    }
    return history;
  };

  return {
    assertReady(requiresHistoryReset: boolean): void {
      const commit = getActionFn(App, 'commitProjectLoadSnapshot');
      if (typeof commit !== 'function') {
        throw new Error(
          '[WardrobePro] project.load requires canonical actions.commitProjectLoadSnapshot(snapshot, meta).'
        );
      }
      if (requiresHistoryReset) readRequiredHistorySystem();
    },

    captureHistory(requiresHistoryReset: boolean): HistoryRollbackSnapshot | null {
      if (!requiresHistoryReset) return null;
      const system = readRequiredHistorySystem();
      return {
        system,
        snapshot: system.captureSnapshot(),
      };
    },

    applyState(
      snapshot: ProjectLoadStateSnapshotLike,
      meta: ActionMetaLike
    ): ProjectLoadTransactionHandleLike {
      return commitProjectLoadSnapshotViaActionsOrThrow(
        App,
        snapshot,
        meta,
        'project.load atomic state commit'
      );
    },

    markCommitted(handle: ProjectLoadTransactionHandleLike): void {
      if (handle.state !== 'prepared') {
        throw new Error(`[WardrobePro] project load transaction cannot finalize from ${handle.state}.`);
      }
      handle.commit();
      if (readProjectLoadTransactionState(handle) !== 'committed') {
        throw new Error('[WardrobePro] project load transaction did not enter committed state.');
      }
    },

    rollbackState(handle: ProjectLoadTransactionHandleLike, meta: ActionMetaLike): void {
      if (handle.state !== 'prepared') {
        throw new Error(`[WardrobePro] project load transaction cannot compensate from ${handle.state}.`);
      }
      handle.rollback(meta);
      if (readProjectLoadTransactionState(handle) !== 'rolled-back') {
        throw new Error('[WardrobePro] project load transaction did not enter rolled-back state.');
      }
    },

    rollbackHistory(snapshot: HistoryRollbackSnapshot | null): void {
      if (!snapshot) return;
      snapshot.system.restoreSnapshot(snapshot.snapshot, { source: 'project.load.rollback.history' });
    },
  };
}
