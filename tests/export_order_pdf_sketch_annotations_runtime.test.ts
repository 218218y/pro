import test from 'node:test';
import assert from 'node:assert/strict';

import {
  compositeOrderPdfSketchStrokesOntoBase,
  listOrderPdfSketchStrokes,
  listOrderPdfSketchTextBoxes,
  paintOrderPdfSketchAnnotationsForPage,
} from '../esm/native/ui/export/export_order_pdf_sketch_annotations.ts';
import type { OrderPdfDraftLike } from '../types/build.ts';

class MockCanvasContext2D {
  public beginPathCount = 0;
  public strokeCount = 0;
  public fillCount = 0;
  public drawImageCalls: Array<{ source: unknown; x: number; y: number; width: number; height: number }> = [];
  public moves: Array<[number, number]> = [];
  public lines: Array<[number, number]> = [];
  public arcs: Array<[number, number, number]> = [];
  public fillRectCalls: Array<[number, number, number, number]> = [];
  public strokeRectCalls: Array<[number, number, number, number]> = [];
  public fillTextCalls: Array<{ text: string; x: number; y: number }> = [];
  public saved = 0;
  public restored = 0;
  public lineCap = '';
  public lineJoin = '';
  public lineWidth = 0;
  public strokeStyle = '';
  public fillStyle = '';
  public font = '';
  public textAlign = 'right';
  public textBaseline = 'top';
  public globalAlpha = 0;
  public globalCompositeOperation = 'source-over';

  save() {
    this.saved += 1;
  }

  restore() {
    this.restored += 1;
  }

  beginPath() {
    this.beginPathCount += 1;
  }

  moveTo(x: number, y: number) {
    this.moves.push([x, y]);
  }

  lineTo(x: number, y: number) {
    this.lines.push([x, y]);
  }

  arc(x: number, y: number, radius: number) {
    this.arcs.push([x, y, radius]);
  }

  drawImage(source: unknown, x: number, y: number, width: number, height: number) {
    this.drawImageCalls.push({ source, x, y, width, height });
  }

  fillRect(x: number, y: number, width: number, height: number) {
    this.fillRectCalls.push([x, y, width, height]);
  }

  strokeRect(x: number, y: number, width: number, height: number) {
    this.strokeRectCalls.push([x, y, width, height]);
  }

  fillText(text: string, x: number, y: number) {
    this.fillTextCalls.push({ text, x, y });
  }

  measureText(text: string) {
    return { width: String(text).length * 8 };
  }

  stroke() {
    this.strokeCount += 1;
  }

  fill() {
    this.fillCount += 1;
  }
}

class MockCanvasElement {
  public width = 0;
  public height = 0;

  constructor(public readonly ctx: MockCanvasContext2D) {}

  getContext(kind: string) {
    return kind === '2d' ? (this.ctx as unknown as CanvasRenderingContext2D) : null;
  }
}

test('listOrderPdfSketchStrokes keeps only valid strokes for the requested page', () => {
  const draft: OrderPdfDraftLike = {
    sketchAnnotations: {
      renderSketch: {
        strokes: [
          {
            tool: 'pen',
            color: '#2563eb',
            width: 2,
            points: [{ x: 0.1, y: 0.2 }],
          },
          {
            tool: 'square',
            color: '#000000',
            width: 2,
            points: [
              { x: 0.2, y: 0.2 },
              { x: 0.7, y: 0.8 },
            ],
          },
        ],
      },
      openClosed: {
        strokes: [
          {
            tool: 'marker',
            color: '#dc2626',
            width: 4,
            points: [{ x: 0.7, y: 0.8 }],
          },
        ],
      },
    },
  };

  const render = listOrderPdfSketchStrokes(draft, 'renderSketch');
  const openClosed = listOrderPdfSketchStrokes(draft, 'openClosed');

  assert.equal(render.length, 2);
  assert.equal(render[0]?.tool, 'pen');
  assert.equal(render[1]?.tool, 'square');
  assert.equal(openClosed.length, 1);
  assert.equal(openClosed[0]?.tool, 'marker');
});

test('paintOrderPdfSketchAnnotationsForPage paints only the active page strokes onto the full composite canvas', () => {
  const ctx = new MockCanvasContext2D();
  const draft: OrderPdfDraftLike = {
    sketchAnnotations: {
      renderSketch: {
        strokes: [
          {
            tool: 'pen',
            color: '#111827',
            width: 2,
            points: [
              { x: 0.25, y: 0.5 },
              { x: 0.75, y: 0.5 },
            ],
          },
        ],
      },
      openClosed: {
        strokes: [
          {
            tool: 'marker',
            color: '#dc2626',
            width: 6,
            points: [{ x: 0.5, y: 0.5 }],
          },
        ],
      },
    },
  };

  paintOrderPdfSketchAnnotationsForPage({
    ctx: ctx as unknown as CanvasRenderingContext2D,
    canvasWidth: 1000,
    canvasHeight: 800,
    draft,
    key: 'renderSketch',
  });

  assert.equal(ctx.saved, 1);
  assert.equal(ctx.restored, 1);
  assert.equal(ctx.strokeCount, 1);
  assert.equal(ctx.fillCount, 0);
  assert.deepEqual(ctx.moves, [[250, 400]]);
  assert.deepEqual(ctx.lines, [[750, 400]]);
  assert.equal(ctx.lineCap, 'round');
  assert.equal(ctx.lineJoin, 'round');
  assert.equal(ctx.strokeStyle, '#111827');
  assert.ok(ctx.lineWidth > 3 && ctx.lineWidth < 4);
});

test('paintOrderPdfSketchAnnotationsForPage uses destination-out when the persisted stroke is an eraser', () => {
  const ctx = new MockCanvasContext2D();
  const draft: OrderPdfDraftLike = {
    sketchAnnotations: {
      renderSketch: {
        strokes: [
          {
            tool: 'eraser',
            color: '#111827',
            width: 10,
            points: [
              { x: 0.2, y: 0.2 },
              { x: 0.8, y: 0.8 },
            ],
          },
        ],
      },
    },
  };

  paintOrderPdfSketchAnnotationsForPage({
    ctx: ctx as unknown as CanvasRenderingContext2D,
    canvasWidth: 1000,
    canvasHeight: 800,
    draft,
    key: 'renderSketch',
  });

  assert.equal(ctx.strokeCount, 1);
  assert.equal(ctx.globalCompositeOperation, 'destination-out');
  assert.equal(ctx.strokeStyle, '#000000');
});

test('compositeOrderPdfSketchStrokesOntoBase keeps erasing isolated to the transparent annotation layer', () => {
  const baseCtx = new MockCanvasContext2D();
  const layerCtx = new MockCanvasContext2D();
  const layerCanvas = new MockCanvasElement(layerCtx);
  const strokes = [
    {
      tool: 'marker',
      color: '#dc2626',
      width: 8,
      points: [
        { x: 0.15, y: 0.2 },
        { x: 0.75, y: 0.2 },
      ],
    },
    {
      tool: 'eraser',
      color: '#111827',
      width: 12,
      points: [
        { x: 0.45, y: 0.1 },
        { x: 0.45, y: 0.3 },
      ],
    },
  ];

  const painted = compositeOrderPdfSketchStrokesOntoBase({
    targetCtx: baseCtx as unknown as CanvasRenderingContext2D,
    createLayerCanvas: (width, height) => {
      layerCanvas.width = width;
      layerCanvas.height = height;
      return layerCanvas as unknown as HTMLCanvasElement;
    },
    canvasWidth: 900,
    canvasHeight: 700,
    strokes,
  });

  assert.equal(painted, true);
  assert.equal(baseCtx.strokeCount, 0);
  assert.equal(baseCtx.fillCount, 0);
  assert.equal(baseCtx.globalCompositeOperation, 'source-over');
  assert.deepEqual(baseCtx.drawImageCalls, [
    {
      source: layerCanvas,
      x: 0,
      y: 0,
      width: 900,
      height: 700,
    },
  ]);
  assert.equal(layerCanvas.width, 900);
  assert.equal(layerCanvas.height, 700);
  assert.equal(layerCtx.strokeCount, 2);
  assert.equal(layerCtx.globalCompositeOperation, 'destination-out');
});

test('paintOrderPdfSketchAnnotationsForPage paints persisted text boxes onto the active page composite', () => {
  const ctx = new MockCanvasContext2D();
  const draft: OrderPdfDraftLike = {
    sketchAnnotations: {
      renderSketch: {
        textBoxes: [
          {
            id: 'txt-1',
            createdAt: 1,
            x: 0.2,
            y: 0.25,
            width: 0.3,
            height: 0.18,
            color: '#111827',
            fontSize: 18,
            text: 'שלום',
            bold: true,
          },
        ],
      },
    },
  };

  const textBoxes = listOrderPdfSketchTextBoxes(draft, 'renderSketch');
  assert.equal(textBoxes.length, 1);

  paintOrderPdfSketchAnnotationsForPage({
    ctx: ctx as unknown as CanvasRenderingContext2D,
    canvasWidth: 1000,
    canvasHeight: 800,
    draft,
    key: 'renderSketch',
  });

  assert.equal(ctx.fillRectCalls.length, 0);
  assert.equal(ctx.strokeRectCalls.length, 0);
  assert.equal(ctx.fillTextCalls[0]?.text, 'שלום');
  assert.match(ctx.font, /^700 /);
});
