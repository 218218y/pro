import type {
  ActionMetaLike,
  AppContainer,
  ProjectExportResultLike,
  ProjectLoadOpts,
  ProjectPdfStateLike,
  HistorySystemSnapshotLike,
  UnknownRecord,
} from '../../../types/index.js';
import {
  isProjectLoadAcceptedResult,
  normalizeProjectLoadActionResult,
  type ProjectLoadActionResult,
} from '../runtime/project_load_action_result.js';
import { readUiStateFromApp } from '../runtime/root_state_access.js';

export type ProjectPdfPatchLike = Pick<ProjectPdfStateLike, 'orderPdfEditorDraft' | 'orderPdfEditorZoom'>;
export type ProjectIoUiStateLike = ProjectPdfStateLike & UnknownRecord & { raw?: UnknownRecord | undefined };
export type HistorySystemLike = UnknownRecord & {
  resetBaseline?: (meta?: ActionMetaLike) => unknown;
  captureSnapshot?: () => HistorySystemSnapshotLike;
  restoreSnapshot?: (snapshot: HistorySystemSnapshotLike, meta?: ActionMetaLike) => unknown;
};

export type ProjectIoRuntimeContext = {
  App: AppContainer;
  showToast: (message: unknown, type: unknown) => void;
  userAgent: string | null;
  schemaId: string;
  schemaVersion: number;
  reportNonFatal: (op: string, err: unknown, throttleMs?: number) => void;
};

export type ProjectIoMetaBuilder = (source: string, meta?: ActionMetaLike | UnknownRecord) => ActionMetaLike;
export type ProjectIoRecordReader = (App: AppContainer) => ProjectIoUiStateLike;

export type ProjectIoOwnerDeps = ProjectIoRuntimeContext & {
  metaRestore: ProjectIoMetaBuilder;
  getHistorySystem: () => HistorySystemLike | null;
  deepCloneJson: <T = unknown>(value: T) => T;
  getProjectNameFromState: () => string;
  asRecord: (value: unknown) => UnknownRecord | null;
  log: (message: string) => void;
};

export function isProjectIoRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function asProjectIoRecord(value: unknown): UnknownRecord | null {
  return isProjectIoRecord(value) ? value : null;
}

export function readProjectIoActionMeta(meta?: ActionMetaLike | UnknownRecord): ActionMetaLike {
  const next: ActionMetaLike = {};
  const metaRec = asProjectIoRecord(meta);
  if (metaRec) Object.assign(next, metaRec);
  return next;
}

export function mergeProjectIoSourceMeta(
  source: string,
  meta?: ActionMetaLike | UnknownRecord
): ActionMetaLike {
  const next = readProjectIoActionMeta(meta);
  next.source = source;
  return next;
}

export function normalizeProjectIoUiState(value: unknown): ProjectIoUiStateLike {
  const rec = asProjectIoRecord(value);
  const ui: ProjectIoUiStateLike = rec ? { ...rec } : {};
  if (ui.raw === null) delete ui.raw;
  else if (typeof ui.raw !== 'undefined') ui.raw = asProjectIoRecord(ui.raw) || undefined;
  return ui;
}

export function readProjectIoUiState(App: AppContainer): ProjectIoUiStateLike {
  return normalizeProjectIoUiState(readUiStateFromApp(App));
}

export function readProjectLoadOptsRecord(options?: ProjectLoadOpts): ProjectLoadOpts {
  const rec = asProjectIoRecord(options);
  return rec ? { ...rec } : {};
}

export function readProjectLoadToastMessage(
  result: ProjectLoadActionResult | null | undefined
): string | null {
  if (!result) return 'טעינת קובץ נכשלה';
  const normalized = normalizeProjectLoadActionResult(result, 'error');
  if (isProjectLoadAcceptedResult(normalized)) return null;
  if (normalized.ok) return 'הפרויקט נטען בהצלחה!';
  const reason =
    'reason' in normalized && typeof normalized.reason === 'string' ? normalized.reason.trim() : '';
  const message =
    'message' in normalized && typeof normalized.message === 'string' ? normalized.message.trim() : '';
  if (reason === 'missing-file') return null;
  if (reason === 'not-installed') return 'טעינת קובץ לא זמינה כרגע';
  if (reason === 'invalid') return 'קובץ הפרויקט לא תקין';
  if (reason === 'error' && message) return message;
  return 'טעינת קובץ נכשלה';
}

export function readHistorySystemRecord(value: unknown): HistorySystemLike | null {
  return asProjectIoRecord(value);
}

export function buildProjectExportResult(options: {
  projectData: UnknownRecord;
  jsonStr: string;
  defaultBaseName: string;
  projectName: string;
  meta: UnknownRecord;
}): ProjectExportResultLike {
  return {
    projectData: options.projectData,
    jsonStr: options.jsonStr,
    defaultBaseName: options.defaultBaseName,
    projectName: options.projectName,
    meta: options.meta,
  };
}
