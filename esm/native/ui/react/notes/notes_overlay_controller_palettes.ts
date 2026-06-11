import type { Dispatch, MutableRefObject, SetStateAction } from 'react';

import type { SavedNote } from '../../../../../types';
import { useNotesOverlayPaletteLayout } from './notes_overlay_controller_palette.js';
import type { ReadPaletteAnchorElement } from './notes_overlay_controller_interactions_shared.js';
import {
  NOTES_OVERLAY_COLOR_PALETTE_LAYOUT_SPEC,
  NOTES_OVERLAY_SIZE_PALETTE_LAYOUT_SPEC,
} from './notes_overlay_palette_runtime.js';
import type { Interaction } from './notes_overlay_helpers.js';

type UseNotesOverlayControllerPalettesArgs = {
  doc: Document | null;
  viewerContainer: HTMLElement | null;
  overlayRef: MutableRefObject<HTMLDivElement | null>;
  activeIndex: number | null;
  draftNotes: SavedNote[];
  interaction: Interaction | null;
  readPaletteAnchorElement: ReadPaletteAnchorElement;
  colorPaletteOpen: boolean;
  colorPaletteRefs: MutableRefObject<Array<HTMLDivElement | null>>;
  setColorPaletteUp: Dispatch<SetStateAction<boolean>>;
  sizePaletteOpen: boolean;
  sizePaletteRefs: MutableRefObject<Array<HTMLDivElement | null>>;
  setSizePaletteUp: Dispatch<SetStateAction<boolean>>;
};

export function useNotesOverlayControllerPalettes(args: UseNotesOverlayControllerPalettesArgs): void {
  const {
    doc,
    viewerContainer,
    overlayRef,
    activeIndex,
    draftNotes,
    interaction,
    readPaletteAnchorElement,
    colorPaletteOpen,
    colorPaletteRefs,
    setColorPaletteUp,
    sizePaletteOpen,
    sizePaletteRefs,
    setSizePaletteUp,
  } = args;

  useNotesOverlayPaletteLayout({
    doc,
    viewerContainer,
    overlayRef,
    activeIndex,
    paletteOpen: colorPaletteOpen,
    paletteRefs: colorPaletteRefs,
    setPaletteUp: setColorPaletteUp,
    draftNotes,
    interaction,
    readPaletteAnchorElement,
    spec: NOTES_OVERLAY_COLOR_PALETTE_LAYOUT_SPEC,
  });

  useNotesOverlayPaletteLayout({
    doc,
    viewerContainer,
    overlayRef,
    activeIndex,
    paletteOpen: sizePaletteOpen,
    paletteRefs: sizePaletteRefs,
    setPaletteUp: setSizePaletteUp,
    draftNotes,
    interaction,
    readPaletteAnchorElement,
    spec: NOTES_OVERLAY_SIZE_PALETTE_LAYOUT_SPEC,
  });
}
