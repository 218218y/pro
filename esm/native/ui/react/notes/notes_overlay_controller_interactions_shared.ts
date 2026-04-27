import type { SavedNote, SavedNoteStyle } from '../../../../../types';
import { MIN_SIZE, clamp, parsePx, px, type Interaction, type Rect } from './notes_overlay_helpers_shared.js';

export type ReadPaletteAnchorElement = (el: HTMLElement) => HTMLElement;

export type SavedNoteBounds = { left: number; top: number; width: number; height: number };

export function readSavedNoteBounds(style: SavedNoteStyle | null | undefined): SavedNoteBounds {
  return {
    left: parsePx(style?.left, 0),
    top: parsePx(style?.top, 0),
    width: Math.max(MIN_SIZE, parsePx(style?.width, MIN_SIZE)),
    height: Math.max(MIN_SIZE, parsePx(style?.height, MIN_SIZE)),
  };
}

export function createResizeNoteInteraction(args: {
  index: number;
  dir: string;
  startX: number;
  startY: number;
  pointerId: number;
  bounds: SavedNoteBounds;
}): Extract<Interaction, { kind: 'resize' }> {
  const { index, dir, startX, startY, pointerId, bounds } = args;
  return {
    kind: 'resize',
    index,
    dir,
    startX,
    startY,
    startLeft: bounds.left,
    startTop: bounds.top,
    startWidth: bounds.width,
    startHeight: bounds.height,
    pointerId,
  };
}

export function createHandleNoteInteraction(args: {
  index: number;
  dir: string;
  startX: number;
  startY: number;
  pointerId: number;
  bounds: SavedNoteBounds;
}): Exclude<Interaction, { kind: 'create' }> {
  const { index, dir, startX, startY, pointerId, bounds } = args;
  if (dir === 'n' || dir === 's') {
    return {
      kind: 'move',
      index,
      startX,
      startY,
      startLeft: bounds.left,
      startTop: bounds.top,
      pointerId,
    };
  }
  return createResizeNoteInteraction(args);
}

export function didNoteLayoutChange(prev: SavedNote, next: SavedNote): boolean {
  const prevStyle: SavedNoteStyle = prev.style ? { ...prev.style } : {};
  const nextStyle: SavedNoteStyle = next.style ? { ...next.style } : {};
  return (
    prevStyle.left !== nextStyle.left ||
    prevStyle.top !== nextStyle.top ||
    prevStyle.width !== nextStyle.width ||
    prevStyle.height !== nextStyle.height
  );
}

function buildNoteWithNextLayout(args: {
  note: SavedNote;
  left: number;
  top: number;
  width: number;
  height: number;
}): SavedNote {
  const { note, left, top, width, height } = args;
  const currentStyle: SavedNoteStyle = note.style ? { ...note.style } : {};
  const nextLeft = px(clamp(left, 0, 100000));
  const nextTop = px(clamp(top, 0, 100000));
  const nextWidth = px(width);
  const nextHeight = px(height);
  if (
    currentStyle.left === nextLeft &&
    currentStyle.top === nextTop &&
    currentStyle.width === nextWidth &&
    currentStyle.height === nextHeight
  ) {
    return note;
  }
  return {
    ...note,
    style: {
      ...currentStyle,
      left: nextLeft,
      top: nextTop,
      width: nextWidth,
      height: nextHeight,
    },
  };
}

function areUnknownValuesEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return a === b;
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i += 1) {
      if (!areUnknownValuesEqual(a[i], b[i])) return false;
    }
    return true;
  }
  if (typeof a !== 'object' || typeof b !== 'object') return false;
  const aRecord = a as Record<string, unknown>;
  const bRecord = b as Record<string, unknown>;
  const aKeys = Object.keys(aRecord);
  const bKeys = Object.keys(bRecord);
  if (aKeys.length !== bKeys.length) return false;
  for (const key of aKeys) {
    if (!Object.prototype.hasOwnProperty.call(bRecord, key)) return false;
    if (!areUnknownValuesEqual(aRecord[key], bRecord[key])) return false;
  }
  return true;
}

export function didNotesChange(prev: SavedNote[], next: SavedNote[]): boolean {
  if (prev === next) return false;
  if (prev.length !== next.length) return true;
  for (let i = 0; i < prev.length; i += 1) {
    if (!areUnknownValuesEqual(prev[i], next[i])) return true;
  }
  return false;
}

export function finalizeInteractionDraftNotes(args: {
  startNotes: SavedNote[] | null | undefined;
  currentNotes: SavedNote[] | null | undefined;
  fallbackNotes: SavedNote[];
  captureEditorsIntoNotes: (base: SavedNote[]) => SavedNote[];
}): { nextDraft: SavedNote[]; shouldCommit: boolean } {
  const { startNotes, currentNotes, fallbackNotes, captureEditorsIntoNotes } = args;
  const base = currentNotes || fallbackNotes;
  const captured = captureEditorsIntoNotes(base);
  const nextDraft = didNotesChange(base, captured) ? captured : base;
  const baseline = startNotes || fallbackNotes;
  return {
    nextDraft,
    shouldCommit: didNotesChange(baseline, nextDraft),
  };
}

export function buildRectFromPoints(startX: number, startY: number, endX: number, endY: number): Rect {
  return {
    left: Math.min(startX, endX),
    top: Math.min(startY, endY),
    width: Math.abs(endX - startX),
    height: Math.abs(endY - startY),
  };
}

export function createEmptyNoteFromRect(rect: Rect, doorsOpen?: boolean): SavedNote {
  const style: SavedNoteStyle = {
    left: px(rect.left),
    top: px(rect.top),
    width: px(rect.width),
    height: px(rect.height),
    baseTextColor: '#000000',
    baseFontSize: '4',
    textColor: '#000000',
    fontSize: '4',
  };

  return {
    style,
    text: '',
    doorsOpen: typeof doorsOpen === 'boolean' ? doorsOpen : undefined,
  };
}

export function applyInteractionToDraftNotes(
  notes: SavedNote[],
  interaction: Exclude<Interaction, { kind: 'create' }>,
  point: { x: number; y: number }
): SavedNote[] {
  const current = notes[interaction.index];
  if (!current) return notes;
  const updated = applyInteractionToNote(current, interaction, point);
  if (!didNoteLayoutChange(current, updated)) return notes;
  const next = notes.slice();
  next[interaction.index] = updated;
  return next;
}

export function applyInteractionToNote(
  note: SavedNote,
  interaction: Exclude<Interaction, { kind: 'create' }>,
  point: { x: number; y: number }
): SavedNote {
  if (interaction.kind === 'move') {
    const dx = point.x - interaction.startX;
    const dy = point.y - interaction.startY;
    const bounds = readSavedNoteBounds(note.style);
    return buildNoteWithNextLayout({
      note,
      left: interaction.startLeft + dx,
      top: interaction.startTop + dy,
      width: bounds.width,
      height: bounds.height,
    });
  }

  const dx = point.x - interaction.startX;
  const dy = point.y - interaction.startY;

  let left = interaction.startLeft;
  let top = interaction.startTop;
  let width = interaction.startWidth;
  let height = interaction.startHeight;

  const dir = interaction.dir;

  if (dir.indexOf('e') !== -1) width = Math.max(MIN_SIZE, interaction.startWidth + dx);
  if (dir.indexOf('s') !== -1) height = Math.max(MIN_SIZE, interaction.startHeight + dy);

  if (dir.indexOf('w') !== -1) {
    width = Math.max(MIN_SIZE, interaction.startWidth - dx);
    left = interaction.startLeft + dx;
  }
  if (dir.indexOf('n') !== -1) {
    height = Math.max(MIN_SIZE, interaction.startHeight - dy);
    top = interaction.startTop + dy;
  }

  return buildNoteWithNextLayout({ note, left, top, width, height });
}
