import type {
  NotesNamespaceLike as NotesNamespace,
  NotesServiceAppLike as NotesServiceApp,
  UiNotesNamespaceLike,
} from '../../../../../types';
import {
  ensureNotesDraw,
  ensureNotesRuntime,
  ensureNotesService,
  getDoorsOpenViaService,
  getUiNotesServiceMaybe,
  readModeStateFromApp,
  setOrbitControlsEnabled,
} from '../../../services/api.js';
import { notesOverlayReportNonFatal } from './notes_overlay_helpers_shared.js';

type DoorsServiceLike = { getOpen?: () => unknown };
type ServicesLike = {
  doors?: DoorsServiceLike;
  notes?: NotesNamespace;
  uiNotes?: UiNotesNamespaceLike | null | undefined;
};

type UiDrawModeLike = {
  enterScreenDrawMode?: () => void;
  exitScreenDrawMode?: () => void;
  getPrimaryMode?: () => unknown;
};

export type NotesOverlayApp = NotesServiceApp & {
  services?: ServicesLike;
  ui?: UiDrawModeLike;
};

export type NotesRuntimeLike = NonNullable<NotesNamespace['runtime']>;
export type NotesDrawLike = NonNullable<NotesNamespace['draw']>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function readUiNotesNamespace(value: unknown): UiNotesNamespaceLike | null {
  return isRecord(value) ? value : null;
}

function readNotesRuntime(value: unknown): NotesRuntimeLike | null {
  return isRecord(value) ? value : null;
}

function readNotesDraw(value: unknown): NotesDrawLike | null {
  return isRecord(value) ? value : null;
}

export function getDoorOpen(App: NotesOverlayApp): boolean | undefined {
  try {
    const open = getDoorsOpenViaService(App);
    return open == null ? undefined : !!open;
  } catch (__wpErr) {
    notesOverlayReportNonFatal('L157', __wpErr);
  }
  return undefined;
}

export function ensureNotesNamespace(App: NotesOverlayApp): NotesNamespace {
  const notes = ensureNotesService(App);
  const runtime = readNotesRuntime(notes.runtime) || ensureNotesRuntime(App);
  const draw = readNotesDraw(notes.draw) || ensureNotesDraw(App);
  if (notes.runtime !== runtime) notes.runtime = runtime;
  if (notes.draw !== draw) notes.draw = draw;
  return notes;
}

export function getUiNotesNamespace(App: NotesOverlayApp): UiNotesNamespaceLike | null {
  return readUiNotesNamespace(getUiNotesServiceMaybe(App));
}

export function setNotesOrbitControlsEnabled(App: NotesOverlayApp, enabled: boolean): void {
  setOrbitControlsEnabled(App, enabled);
}

export function readPrimaryModeId(App: NotesOverlayApp): string {
  try {
    const ms = readModeStateFromApp(App);
    return ms && typeof ms.primary === 'string' ? String(ms.primary || 'none') : 'none';
  } catch {
    return 'none';
  }
}

export function exitNotesDrawMode(App: NotesOverlayApp): void {
  const uiNotes = getUiNotesNamespace(App);
  if (uiNotes && typeof uiNotes.exitScreenDrawMode === 'function') {
    uiNotes.exitScreenDrawMode();
    return;
  }
  const notes = ensureNotesNamespace(App);
  const rt = notes.runtime;
  if (rt && typeof rt.onExitDrawMode === 'function') rt.onExitDrawMode();
}
