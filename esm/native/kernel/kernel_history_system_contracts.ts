import type {
  ActionMetaLike,
  AppContainer,
  HistoryPushRequestLike,
  HistoryStatusLike,
  HistoryStatusListener,
  UnknownRecord,
} from '../../../types';

interface BrowserTimersLike {
  setTimeout: (handler: () => void, timeoutMs?: number) => unknown;
}

export type KernelHistoryStatus = HistoryStatusLike;
export type KernelHistoryStatusListener = HistoryStatusListener;

export interface KernelHistorySystem {
  undoStack: string[];
  redoStack: string[];
  maxSteps: number;
  lastSavedJSON: string | null;
  isPaused: boolean;
  _lastCoalesceKey: string;
  _lastCoalesceAt: number;
  __didInit: boolean;
  pause: () => void;
  resume: () => void;
  flushPendingPush: (opts?: HistoryPushRequestLike) => void;
  schedulePush: (a?: ActionMetaLike) => void;
  resumeAfterRestore: (timeoutMs?: unknown) => void;
  getCurrentSnapshot: () => string;
  pushState: (opts?: HistoryPushRequestLike) => void;
  undo: () => void;
  redo: () => void;
  applyState: (jsonState: unknown) => void;
  getStatus: () => KernelHistoryStatus;
  updateButtons: (meta?: ActionMetaLike) => void;
  resetBaseline: (meta?: ActionMetaLike) => void;
  ensureBaseline: () => void;
  init: () => void;
  onStatusChange?: KernelHistoryStatusListener;
  subscribeStatus: (listener: KernelHistoryStatusListener) => () => void;
  _statusListeners: Set<KernelHistoryStatusListener>;
  [k: string]: unknown;
}

export interface CreateKernelHistorySystemArgs {
  App: AppContainer;
  existing: unknown;
  asRecord: (value: unknown, defaultRecord?: UnknownRecord) => UnknownRecord;
  isRecord: (value: unknown) => value is UnknownRecord;
  isRestoring: () => boolean;
  getTimers: () => BrowserTimersLike;
  getProjectUndoSnapshot: () => unknown;
  captureSavedNotes: () => unknown;
  getCurrentUiSnapshot: () => UnknownRecord;
  loadProjectSnapshot: (snapshot: UnknownRecord) => void;
  flushPendingPushViaAccess: (opts?: HistoryPushRequestLike) => boolean;
  schedulePushViaAccess: (meta?: ActionMetaLike) => void;
  reportNonFatal: (op: string, error: unknown, opts?: { throttleMs?: number; failFast?: boolean }) => void;
}
