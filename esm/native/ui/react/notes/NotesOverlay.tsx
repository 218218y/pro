import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactElement } from 'react';

import { createPortal } from 'react-dom';

import { normalizeSavedNotes } from '../../notes_service.js';
import type { SavedNote, SavedNoteStyle } from '../../../../../types';
import { useApp, useUiFeedback, useCfgSelector, useUiSelector } from '../hooks.js';
import { getDocumentMaybe } from '../../../services/api.js';
import { getElementByIdHtml } from '../../dom_helpers.js';
import { selectSavedNotes } from '../selectors/config_selectors.js';
import { ensureNotesNamespace } from './notes_overlay_helpers.js';
import type { NotesDrawLike, NotesOverlayApp, NotesRuntimeLike } from './notes_overlay_helpers.js';
import { NoteCard } from './notes_overlay_note_card.js';
import { useNotesOverlayController } from './notes_overlay_controller.js';

function readSavedNotesArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function readSavedNoteStyle(note: SavedNote | null | undefined): SavedNoteStyle {
  return note && note.style && typeof note.style === 'object' ? note.style : {};
}

function ensureNotesRuntimeState(notes: ReturnType<typeof ensureNotesNamespace>): NotesRuntimeLike {
  if (notes.runtime) return notes.runtime;
  const next: NotesRuntimeLike = {};
  notes.runtime = next;
  return next;
}

function ensureNotesDrawState(notes: ReturnType<typeof ensureNotesNamespace>): NotesDrawLike {
  if (notes.draw) return notes.draw;
  const next: NotesDrawLike = { isScreenDrawMode: false };
  notes.draw = next;
  return next;
}

function readPointerEventTarget(target: EventTarget | null): HTMLElement | null {
  return target instanceof HTMLElement ? target : null;
}

function readPaletteAnchorElement(el: HTMLElement): HTMLElement {
  return el.previousElementSibling instanceof HTMLElement
    ? el.previousElementSibling
    : el.parentElement instanceof HTMLElement
      ? el.parentElement
      : el;
}

export function ReactNotesOverlay(): ReactElement | null {
  const app = useApp();
  const fb = useUiFeedback();
  const App: NotesOverlayApp = app;

  const notesEnabled = useUiSelector(ui => !!ui.notesEnabled);
  const [editMode, setEditMode] = useState<boolean>(false);
  const frozenSavedNotesRef = useRef<unknown[]>([]);
  const savedNotesRaw = useCfgSelector(cfg => {
    if (editMode) return frozenSavedNotesRef.current;
    const next = selectSavedNotes(cfg);
    frozenSavedNotesRef.current = next;
    return next;
  });

  const doc = useMemo(() => getDocumentMaybe(App), [App]);
  const viewerContainer = useMemo(() => getElementByIdHtml(doc, 'viewer-container'), [doc]);

  const normalized = useMemo(() => {
    const raw = readSavedNotesArray(savedNotesRaw);
    return normalizeSavedNotes(App, raw);
  }, [App, savedNotesRaw]);

  const controller = useNotesOverlayController({
    App,
    app,
    fb,
    doc,
    viewerContainer,
    notesEnabled,
    normalized,
    ensureNotesRuntimeState,
    ensureNotesDrawState,
    readSavedNoteStyle,
    readPointerEventTarget,
    readPaletteAnchorElement,
  });

  useEffect(() => {
    setEditMode(controller.editMode);
  }, [controller.editMode]);

  if (!doc || !viewerContainer) return null;

  const overlay = (
    <div
      id="notes-overlay"
      className="notes-overlay"
      ref={controller.overlayRef}
      onPointerDown={controller.onOverlayPointerDown}
      onPointerMove={controller.onOverlayPointerMove}
      onPointerUp={controller.onOverlayPointerUp}
      onClick={controller.onOverlayClick}
    >
      {controller.creatingRect ? (
        <div
          className="annotation-box creating"
          style={{
            left: `${Math.round(controller.creatingRect.left)}px`,
            top: `${Math.round(controller.creatingRect.top)}px`,
            width: `${Math.round(controller.creatingRect.width)}px`,
            height: `${Math.round(controller.creatingRect.height)}px`,
          }}
        />
      ) : null}

      {(controller.draftNotes || []).map((note, i) => (
        <NoteCard
          key={`note-${i}`}
          index={i}
          note={note}
          editMode={controller.editMode}
          {...controller.noteCardProps}
        />
      ))}
    </div>
  );

  return createPortal(overlay, viewerContainer);
}
