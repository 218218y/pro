import test from 'node:test';
import assert from 'node:assert/strict';

import {
  estimateNotesOverlayPaletteHeight,
  NOTES_OVERLAY_COLOR_PALETTE_LAYOUT_SPEC,
  NOTES_OVERLAY_SIZE_PALETTE_LAYOUT_SPEC,
  resolveNotesOverlayMeasuredPaletteLayout,
  resolveNotesOverlayPaletteItemCount,
  resolveNotesOverlayPaletteLayout,
} from '../esm/native/ui/react/notes/notes_overlay_palette_runtime.ts';

test('notes overlay palette specs keep color and size geometry canonical', () => {
  assert.equal(NOTES_OVERLAY_COLOR_PALETTE_LAYOUT_SPEC.itemSelector, '.color-swatch');
  assert.equal(NOTES_OVERLAY_SIZE_PALETTE_LAYOUT_SPEC.itemSelector, '.size-swatch');
  assert.equal(NOTES_OVERLAY_COLOR_PALETTE_LAYOUT_SPEC.minMaxHeight, 60);
  assert.equal(NOTES_OVERLAY_SIZE_PALETTE_LAYOUT_SPEC.minMaxHeight, 80);
});

test('notes overlay palette runtime estimates list height from a canonical spec', () => {
  assert.equal(
    estimateNotesOverlayPaletteHeight({
      itemCount: 4,
      spec: NOTES_OVERLAY_COLOR_PALETTE_LAYOUT_SPEC,
    }),
    118
  );
  assert.equal(
    estimateNotesOverlayPaletteHeight({
      itemCount: 5,
      spec: NOTES_OVERLAY_SIZE_PALETTE_LAYOUT_SPEC,
    }),
    198
  );
});

test('notes overlay palette runtime falls back to the canonical default item count when measurement is missing', () => {
  assert.equal(
    resolveNotesOverlayPaletteItemCount({
      measuredCount: 0,
      spec: NOTES_OVERLAY_COLOR_PALETTE_LAYOUT_SPEC,
    }),
    4
  );
  assert.equal(
    resolveNotesOverlayPaletteItemCount({
      measuredCount: 7,
      spec: NOTES_OVERLAY_SIZE_PALETTE_LAYOUT_SPEC,
    }),
    7
  );
});

test('notes overlay palette runtime opens upward only when there is not enough space below the anchor', () => {
  assert.deepEqual(
    resolveNotesOverlayPaletteLayout({
      hostTop: 100,
      hostBottom: 520,
      anchorTop: 380,
      anchorBottom: 420,
      paletteHeight: 150,
      minMaxHeight: 60,
    }),
    { openUp: true, maxHeight: 272 }
  );

  assert.deepEqual(
    resolveNotesOverlayPaletteLayout({
      hostTop: 100,
      hostBottom: 520,
      anchorTop: 180,
      anchorBottom: 220,
      paletteHeight: 120,
      minMaxHeight: 80,
    }),
    { openUp: false, maxHeight: 292 }
  );
});

test('notes overlay palette runtime derives measured palette geometry from one canonical helper', () => {
  assert.deepEqual(
    resolveNotesOverlayMeasuredPaletteLayout({
      hostTop: 120,
      hostBottom: 560,
      anchorTop: 402,
      anchorBottom: 438,
      measuredCount: 0,
      paletteScrollHeight: 90,
      spec: NOTES_OVERLAY_COLOR_PALETTE_LAYOUT_SPEC,
    }),
    { openUp: true, maxHeight: 274, itemCount: 4, paletteHeight: 118 }
  );

  assert.deepEqual(
    resolveNotesOverlayMeasuredPaletteLayout({
      hostTop: 120,
      hostBottom: 560,
      anchorTop: 180,
      anchorBottom: 216,
      measuredCount: 7,
      paletteScrollHeight: 140,
      spec: NOTES_OVERLAY_SIZE_PALETTE_LAYOUT_SPEC,
    }),
    { openUp: false, maxHeight: 336, itemCount: 7, paletteHeight: 274 }
  );
});
