import type { AppContainer } from '../../../types';

import { requestKernelBuilderBuild } from './kernel_builder_request_policy.js';
import { scheduleAutosaveViaService } from '../runtime/autosave_access.js';

import type {
  CreateKernelSnapshotStoreSystemArgs,
  KernelSnapshotStoreMetaLike,
} from './kernel_snapshot_store_contracts.js';

export interface KernelSnapshotStoreCommitArgs extends Pick<
  CreateKernelSnapshotStoreSystemArgs,
  'App' | 'asRecord' | 'asRecordOrNull' | 'reportNonFatal' | 'setStoreUiSnapshot' | 'touchStore'
> {
  captureConfig: (() => unknown) | null;
  setLastCommitAt: (timestamp: number) => void;
  setLastDirtyReason: (reason: string) => void;
}

export function isKernelSnapshotNotesSource(source: string): boolean {
  return (
    source === 'notes' ||
    source.indexOf('notes:') === 0 ||
    source.indexOf('notes/') === 0 ||
    source.indexOf('notesEditor') === 0
  );
}

export function shouldCaptureKernelSnapshotConfig(
  source: string,
  meta: KernelSnapshotStoreMetaLike
): boolean {
  return (
    meta.captureConfig === true ||
    (!isKernelSnapshotNotesSource(source) && meta.captureConfig !== false && meta.noCapture !== true)
  );
}

export function requestKernelSnapshotBuild(
  App: AppContainer,
  meta: KernelSnapshotStoreMetaLike,
  source: string,
  shouldForceBuild: boolean,
  wroteSnapshot: boolean
): void {
  if (meta.noBuild || (!wroteSnapshot && !shouldForceBuild)) return;
  requestKernelBuilderBuild(App, meta, {
    source,
    reason: source,
    immediate: !!meta.immediate,
    force: shouldForceBuild,
  });
}

export function scheduleKernelSnapshotAutosave(
  args: Pick<KernelSnapshotStoreCommitArgs, 'App' | 'reportNonFatal'>,
  wroteSnapshot: boolean,
  meta: KernelSnapshotStoreMetaLike
): void {
  if (!wroteSnapshot || meta.noAutosave) return;
  try {
    scheduleAutosaveViaService(args.App);
  } catch (_eAutosave) {
    args.reportNonFatal('commitFromSnapshot.autosave', _eAutosave, { throttleMs: 6000 });
  }
}
