import type {
  ActionMetaLike,
  ProjectLoadStateSnapshotLike,
  ProjectLoadTransactionHandleLike,
} from '../../../types';

import { getActionFn } from '../runtime/actions_access_core.js';
import { commitProjectLoadSnapshotViaActionsOrThrow } from '../runtime/actions_access_mutations.js';
import type { HistorySystemLike, ProjectIoOwnerDeps } from './project_io_orchestrator_shared.js';

type HistoryRollbackSnapshot = {
  system: HistorySystemLike;
  hadUndoStack: boolean;
  undoStack: unknown[] | undefined;
  hadRedoStack: boolean;
  redoStack: unknown[] | undefined;
  hadLastSavedJSON: boolean;
  lastSavedJSON: string | undefined;
};

export type ProjectLoadTransactionContext = {
  assertReady: (requiresHistoryReset: boolean) => void;
  captureHistory: (requiresHistoryReset: boolean) => HistoryRollbackSnapshot | null;
  commit: (snapshot: ProjectLoadStateSnapshotLike, meta: ActionMetaLike) => ProjectLoadTransactionHandleLike;
  rollbackHistory: (snapshot: HistoryRollbackSnapshot | null) => void;
};

function cloneStack(value: unknown): unknown[] | undefined {
  return Array.isArray(value) ? value.slice() : undefined;
}

export function createProjectLoadTransactionContext(
  deps: Pick<ProjectIoOwnerDeps, 'App' | 'getHistorySystem'>
): ProjectLoadTransactionContext {
  const { App, getHistorySystem } = deps;

  const readRequiredHistorySystem = (): HistorySystemLike => {
    const history = getHistorySystem();
    if (!history || typeof history.resetBaseline !== 'function') {
      throw new Error(
        '[WardrobePro] project.load history baseline requires canonical history.system.resetBaseline(meta).'
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
        hadUndoStack: Object.prototype.hasOwnProperty.call(system, 'undoStack'),
        undoStack: cloneStack(system.undoStack),
        hadRedoStack: Object.prototype.hasOwnProperty.call(system, 'redoStack'),
        redoStack: cloneStack(system.redoStack),
        hadLastSavedJSON: Object.prototype.hasOwnProperty.call(system, 'lastSavedJSON'),
        lastSavedJSON: typeof system.lastSavedJSON === 'string' ? system.lastSavedJSON : undefined,
      };
    },

    commit(snapshot: ProjectLoadStateSnapshotLike, meta: ActionMetaLike): ProjectLoadTransactionHandleLike {
      return commitProjectLoadSnapshotViaActionsOrThrow(
        App,
        snapshot,
        meta,
        'project.load atomic state commit'
      );
    },

    rollbackHistory(snapshot: HistoryRollbackSnapshot | null): void {
      if (!snapshot) return;
      const { system } = snapshot;
      if (snapshot.hadUndoStack) system.undoStack = snapshot.undoStack?.slice();
      else delete system.undoStack;
      if (snapshot.hadRedoStack) system.redoStack = snapshot.redoStack?.slice();
      else delete system.redoStack;
      if (snapshot.hadLastSavedJSON) system.lastSavedJSON = snapshot.lastSavedJSON;
      else delete system.lastSavedJSON;
      if (typeof system.updateButtons === 'function') system.updateButtons();
    },
  };
}
