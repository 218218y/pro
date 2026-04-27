import test from 'node:test';
import assert from 'node:assert/strict';

import { _getRendererCanvasSource } from '../esm/native/ui/export/export_canvas_core.ts';

test('export canvas core resolves a direct canvas whose methods live on the prototype', () => {
  const canvas = Object.create({
    getContext() {
      return { canvas: this };
    },
  });

  assert.equal(_getRendererCanvasSource({ domElement: canvas as unknown as HTMLCanvasElement }), canvas);
});

test('export canvas core resolves a nested canvas via prototype querySelector', () => {
  const canvas = Object.create({
    getContext() {
      return { canvas: this };
    },
  });

  const host = Object.create({
    querySelector(selector: string) {
      return selector === 'canvas' ? canvas : null;
    },
  });

  assert.equal(_getRendererCanvasSource({ domElement: host }), canvas);
});
