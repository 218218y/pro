import { useLayoutEffect } from 'react';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';

import { observeViewportLayout } from '../viewport_layout_runtime.js';

import type { SavedNote } from '../../../../../types';
import { notesOverlayReportNonFatal, type Interaction } from './notes_overlay_helpers.js';
import type { ReadPaletteAnchorElement } from './notes_overlay_controller_interactions_shared.js';
import type { NotesOverlayPaletteLayoutSpec } from './notes_overlay_palette_runtime.js';
import { resolveNotesOverlayMeasuredPaletteLayout } from './notes_overlay_palette_runtime.js';

type NotesOverlayPaletteLayoutArgs = {
  doc: Document | null;
  viewerContainer: HTMLElement | null;
  overlayRef: MutableRefObject<HTMLDivElement | null>;
  activeIndex: number | null;
  paletteOpen: boolean;
  paletteRefs: MutableRefObject<Array<HTMLDivElement | null>>;
  setPaletteUp: Dispatch<SetStateAction<boolean>>;
  draftNotes: SavedNote[];
  interaction: Interaction | null;
  readPaletteAnchorElement: ReadPaletteAnchorElement;
  spec: NotesOverlayPaletteLayoutSpec;
};

export function useNotesOverlayPaletteLayout(args: NotesOverlayPaletteLayoutArgs): void {
  const {
    doc,
    viewerContainer,
    overlayRef,
    activeIndex,
    paletteOpen,
    paletteRefs,
    setPaletteUp,
    draftNotes,
    interaction,
    readPaletteAnchorElement,
    spec,
  } = args;

  useLayoutEffect(() => {
    if (!doc || activeIndex == null) return;

    if (!paletteOpen) {
      setPaletteUp(false);
      return;
    }

    try {
      const el = paletteRefs.current[activeIndex];
      if (!el) return;
      const win = doc.defaultView;
      if (!win) return;

      const measure = () => {
        try {
          const cs = win.getComputedStyle(el);
          if (!cs || cs.display === 'none') return false;

          const host = overlayRef.current || viewerContainer;
          if (!host) return false;
          const hostRect = host.getBoundingClientRect();

          const anchor = readPaletteAnchorElement(el);
          const anchorRect = anchor ? anchor.getBoundingClientRect() : el.getBoundingClientRect();
          const nextLayout = resolveNotesOverlayMeasuredPaletteLayout({
            hostTop: hostRect.top,
            hostBottom: hostRect.bottom,
            anchorTop: anchorRect.top,
            anchorBottom: anchorRect.bottom,
            measuredCount: el.querySelectorAll(spec.itemSelector).length,
            paletteScrollHeight: el.scrollHeight || 0,
            spec,
          });
          setPaletteUp(nextLayout.openUp);
          el.style.maxHeight = `${nextLayout.maxHeight}px`;
          el.style.overflowY = 'auto';
          return true;
        } catch {
          return false;
        }
      };

      if (!measure()) return;

      return observeViewportLayout({
        doc,
        win,
        onUpdate: () => {
          measure();
        },
        resizeTargets: [overlayRef.current, viewerContainer, el, readPaletteAnchorElement(el)],
      });
    } catch (__wpErr) {
      notesOverlayReportNonFatal(spec.reportKey, __wpErr);
    }
  }, [
    doc,
    viewerContainer,
    activeIndex,
    paletteOpen,
    draftNotes,
    interaction,
    paletteRefs,
    overlayRef,
    readPaletteAnchorElement,
    spec,
    setPaletteUp,
  ]);
}
