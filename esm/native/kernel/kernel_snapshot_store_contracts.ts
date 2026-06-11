import type { AppContainer, ActionMetaLike, StateKernelLike, UnknownRecord } from '../../../types';

export interface KernelBuildStateLike extends UnknownRecord {
  ui: UnknownRecord;
  config: UnknownRecord;
  mode: unknown;
  runtime: UnknownRecord;
  build: UnknownRecord;
}

export interface KernelSnapshotStoreMetaLike extends UnknownRecord {
  source?: string;
  reason?: string;
  immediate?: boolean;
  noBuild?: boolean;
  noAutosave?: boolean;
  noPersist?: boolean;
  noHistory?: boolean;
  noCapture?: boolean;
  force?: boolean;
  forceBuild?: boolean;
  silent?: boolean;
  captureConfig?: boolean;
}

export interface KernelSnapshotStoreSyncOpts extends KernelSnapshotStoreMetaLike {
  override?: UnknownRecord | null;
}

export interface KernelSnapshotStoreSystem {
  getBuildState: (override?: unknown) => KernelBuildStateLike;
  commitFromSnapshot: (uiSnapshot: unknown, meta?: KernelSnapshotStoreMetaLike) => void;
  syncStore: (opts?: KernelSnapshotStoreSyncOpts | null) => void;
  setDirty: (isDirtyValue: boolean, meta?: KernelSnapshotStoreMetaLike) => void;
  isDirty: () => boolean;
  markDirty: (reason: unknown) => void;
  clearDirty: (reason: unknown) => void;
  touch: (meta?: KernelSnapshotStoreMetaLike) => void;
  commit: (meta?: KernelSnapshotStoreMetaLike) => void;
  persist: (meta?: KernelSnapshotStoreMetaLike) => void;
}

export interface CreateKernelSnapshotStoreSystemArgs {
  App: AppContainer;
  stateKernel: StateKernelLike & UnknownRecord;
  asRecord: (value: unknown, fallback?: UnknownRecord) => UnknownRecord;
  asRecordOrNull: (value: unknown) => UnknownRecord | null;
  isRecord: (value: unknown) => value is UnknownRecord;
  reportKernelError: (error: unknown, ctx: unknown) => boolean;
  reportNonFatal: (op: string, error: unknown, opts?: { throttleMs?: number; failFast?: boolean }) => void;
  setStoreUiSnapshot: (ui: UnknownRecord, meta: ActionMetaLike, config?: UnknownRecord) => boolean;
  touchStore: (meta: ActionMetaLike) => boolean;
}
