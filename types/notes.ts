import type { UnknownRecord } from './common';
import type { AppContainer, BrowserNamespaceLike } from './app';
import type { ActionMetaLike, MetaActionsNamespaceLike } from './kernel';

export type SavedNoteStyle = {
  left?: string;
  top?: string;
  width?: string;
  height?: string;
  baseTextColor?: string;
  baseFontSize?: string;
  textColor?: string;
  fontSize?: string;
};

export interface SavedNote extends UnknownRecord {
  id?: string;
  text?: string;
  style?: SavedNoteStyle;
  doorsOpen?: boolean;
}

export interface NotesRuntimeNamespaceLike extends UnknownRecord {
  onEnterDrawMode?: () => void;
  onExitDrawMode?: () => void;
  subscribeDrawModeChange?: (listener: (active: boolean) => void) => () => void;
}

export interface NotesDrawNamespaceLike extends UnknownRecord {
  isScreenDrawMode?: boolean;
}

export interface NotesNamespaceLike extends UnknownRecord {
  sanitize?: (html: string) => string;
  getForSave?: () => SavedNote[];
  restoreFromSave?: (savedNotes: unknown) => void;
  clear?: () => void;
  persist?: (meta?: ActionMetaLike) => void;
  runtime?: NotesRuntimeNamespaceLike;
  draw?: NotesDrawNamespaceLike;
}

export interface UiNotesNamespaceLike extends UnknownRecord {
  enterScreenDrawMode?: () => void;
  exitScreenDrawMode?: () => void;
}

export interface NotesServicesLike extends UnknownRecord {
  notes?: NotesNamespaceLike;
  uiNotes?: UiNotesNamespaceLike;
}

export interface NotesConfigStateLike extends UnknownRecord {
  savedNotes?: unknown;
}

export interface NotesActionsSurfaceLike extends UnknownRecord {
  meta?: MetaActionsNamespaceLike;
}

export interface NotesServiceAppLike extends Partial<AppContainer> {
  services?: AppContainer['services'] & NotesServicesLike;
  actions?: AppContainer['actions'] & NotesActionsSurfaceLike;
  browser?: BrowserNamespaceLike;
}
