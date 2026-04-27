import test from 'node:test';
import assert from 'node:assert/strict';

import {
  resolveOrderPdfSketchActiveKey,
  resolveOrderPdfSketchDrawTriggerResult,
  toggleOrderPdfSketchActivePalette,
  resolveOrderPdfSketchDeletedTextBox,
  resolveOrderPdfSketchTextBoxMutation,
} from '../esm/native/ui/react/pdf/order_pdf_overlay_sketch_panel_controller_runtime.ts';
import {
  buildOrderPdfSketchPreviewEntryMap,
  resolveOrderPdfSketchControlState,
  resolveOrderPdfSketchLatestAnnotationItem,
} from '../esm/native/ui/react/pdf/order_pdf_overlay_sketch_panel_runtime.ts';
import {
  resolveOrderPdfSketchCanvasPointerIntent,
  resolveOrderPdfSketchExitTextTool,
  resolveOrderPdfSketchToolTransition,
} from '../esm/native/ui/react/pdf/order_pdf_overlay_sketch_panel_runtime.ts';

test('[order-pdf] sketch panel controller keeps the current active page when it still exists', () => {
  assert.equal(
    resolveOrderPdfSketchActiveKey({
      activeKey: 'openClosed',
      entries: [
        { key: 'renderSketch', label: 'חזית', pageIndex: 0, width: 100, height: 100, url: 'a' },
        { key: 'openClosed', label: 'פתוח', pageIndex: 1, width: 100, height: 100, url: 'b' },
      ],
    }),
    'openClosed'
  );
});

test('[order-pdf] sketch panel controller falls back to the first available page when the active page disappears', () => {
  assert.equal(
    resolveOrderPdfSketchActiveKey({
      activeKey: 'openClosed',
      entries: [{ key: 'renderSketch', label: 'חזית', pageIndex: 0, width: 100, height: 100, url: 'a' }],
    }),
    'renderSketch'
  );

  assert.equal(
    resolveOrderPdfSketchActiveKey({
      activeKey: 'renderSketch',
      entries: [],
    }),
    'renderSketch'
  );
});

test('[order-pdf] sketch panel controller keeps only one floating palette active at a time', () => {
  assert.equal(toggleOrderPdfSketchActivePalette(null, 'draw'), 'draw');
  assert.equal(toggleOrderPdfSketchActivePalette('draw', 'draw'), null);
  assert.equal(toggleOrderPdfSketchActivePalette('draw', 'width'), 'width');
  assert.equal(toggleOrderPdfSketchActivePalette('width', 'color'), 'color');
  assert.equal(toggleOrderPdfSketchActivePalette('color', 'width'), 'width');
});

test('[order-pdf] sketch panel controller draw trigger restores the last freehand tool while opening the palette', () => {
  assert.deepEqual(
    resolveOrderPdfSketchDrawTriggerResult({
      freehandTool: 'marker',
      activePalette: null,
    }),
    {
      nextTool: 'marker',
      nextPalette: 'draw',
    }
  );
});

test('[order-pdf] sketch panel controller draw trigger can close the palette without forgetting the last freehand tool', () => {
  assert.deepEqual(
    resolveOrderPdfSketchDrawTriggerResult({
      freehandTool: 'pen',
      activePalette: 'draw',
    }),
    {
      nextTool: 'pen',
      nextPalette: null,
    }
  );
});

test('[order-pdf] sketch panel runtime remembers the last non-text tool when entering text mode', () => {
  assert.deepEqual(
    resolveOrderPdfSketchToolTransition({
      lastNonTextTool: 'marker',
      nextTool: 'text',
    }),
    {
      nextTool: 'text',
      nextLastNonTextTool: 'marker',
    }
  );

  assert.deepEqual(
    resolveOrderPdfSketchToolTransition({
      lastNonTextTool: 'marker',
      nextTool: 'eraser',
    }),
    {
      nextTool: 'eraser',
      nextLastNonTextTool: 'eraser',
    }
  );
});

test('[order-pdf] sketch panel runtime exits text mode back to the remembered non-text tool', () => {
  assert.equal(resolveOrderPdfSketchExitTextTool('marker'), 'marker');
  assert.equal(resolveOrderPdfSketchExitTextTool('pen'), 'pen');
});

test('[order-pdf] sketch canvas pointer intent commits active text before arming a new text box', () => {
  assert.equal(
    resolveOrderPdfSketchCanvasPointerIntent({
      tool: 'text',
      activeTextBoxId: 'note-1',
    }),
    'text:commit-exit'
  );

  assert.equal(
    resolveOrderPdfSketchCanvasPointerIntent({
      tool: 'text',
      activeTextBoxId: null,
    }),
    'text:create'
  );

  assert.equal(
    resolveOrderPdfSketchCanvasPointerIntent({
      tool: 'pen',
      activeTextBoxId: 'note-1',
    }),
    'draw'
  );
});

test('[order-pdf] sketch panel controller runtime classifies text-box upserts so history ownership stays canonical', () => {
  const current = {
    id: 'txt-1',
    createdAt: 1,
    x: 0.2,
    y: 0.3,
    width: 0.24,
    height: 0.18,
    color: '#111827',
    fontSize: 18,
    bold: false,
    text: 'same',
  };
  assert.deepEqual(resolveOrderPdfSketchTextBoxMutation({ current: [current], next: { ...current } }), {
    kind: 'ignore',
    existing: current,
  });
  assert.deepEqual(
    resolveOrderPdfSketchTextBoxMutation({
      current: [current],
      next: {
        ...current,
        text: 'changed',
      },
    }),
    {
      kind: 'replace',
      existing: current,
    }
  );
  assert.deepEqual(
    resolveOrderPdfSketchTextBoxMutation({
      current: [current],
      next: {
        ...current,
        id: 'txt-2',
      },
    }),
    {
      kind: 'append',
      existing: null,
    }
  );
});

test('[order-pdf] sketch panel controller runtime resolves delete candidates from the canonical page list', () => {
  const current = {
    id: 'txt-1',
    createdAt: 1,
    x: 0.2,
    y: 0.3,
    width: 0.24,
    height: 0.18,
    color: '#111827',
    fontSize: 18,
    bold: false,
    text: 'same',
  };
  assert.equal(resolveOrderPdfSketchDeletedTextBox({ current: [current], id: 'txt-1' }), current);
  assert.equal(resolveOrderPdfSketchDeletedTextBox({ current: [current], id: 'missing' }), null);
});

test('[order-pdf] sketch panel runtime derives toolbar control state canonically from tool + active palette', () => {
  assert.deepEqual(resolveOrderPdfSketchControlState({ tool: 'marker', activePalette: 'draw' }), {
    drawPaletteOpen: true,
    widthPaletteOpen: false,
    colorPaletteOpen: false,
    colorControlDisabled: false,
    widthControlDisabled: false,
  });
  assert.deepEqual(resolveOrderPdfSketchControlState({ tool: 'text', activePalette: 'color' }), {
    drawPaletteOpen: false,
    widthPaletteOpen: false,
    colorPaletteOpen: true,
    colorControlDisabled: true,
    widthControlDisabled: true,
  });
});

test('[order-pdf] sketch panel runtime keeps the latest created annotation item as the undo candidate', () => {
  const latest = resolveOrderPdfSketchLatestAnnotationItem({
    strokes: [
      {
        id: 'stroke-1',
        createdAt: 10,
        tool: 'pen',
        color: '#111827',
        width: 2,
        points: [{ x: 0.1, y: 0.2 }],
      },
    ],
    textBoxes: [
      {
        id: 'txt-1',
        createdAt: 20,
        x: 0.2,
        y: 0.3,
        width: 0.24,
        height: 0.18,
        color: '#111827',
        fontSize: 18,
        text: 'later',
      },
    ],
  });
  assert.equal(latest && 'text' in latest ? latest.id : null, 'txt-1');
});

test('[order-pdf] sketch panel runtime builds preview-entry maps by page key so active entry lookup stays canonical', () => {
  const entriesByKey = buildOrderPdfSketchPreviewEntryMap([
    { key: 'renderSketch', label: 'חזית', pageIndex: 0, width: 100, height: 100, url: 'a' },
    { key: 'openClosed', label: 'פתוח', pageIndex: 1, width: 120, height: 140, url: 'b' },
  ]);

  assert.equal(entriesByKey.renderSketch?.url, 'a');
  assert.equal(entriesByKey.openClosed?.pageIndex, 1);
});
