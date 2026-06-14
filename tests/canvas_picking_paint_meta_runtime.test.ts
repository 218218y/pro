import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  createCanvasPickingPaintMaterialRefreshMeta,
  createCanvasPickingPaintStructuralMeta,
} from '../esm/native/services/canvas_picking_paint_meta.ts';

test('[canvas-picking/paint-meta] structural paint writes are immediate build-visible writes', () => {
  const meta = createCanvasPickingPaintStructuralMeta(' paint.apply:mirror ');

  assert.deepEqual(meta, {
    source: 'paint.apply:mirror',
    immediate: true,
  });
  assert.equal('noBuild' in meta, false);
  assert.equal('noHistory' in meta, false);
});

test('[canvas-picking/paint-meta] color-only material refresh writes opt into the no-build profile', () => {
  const baseMeta = createCanvasPickingPaintStructuralMeta('paint.apply:group');
  const meta = createCanvasPickingPaintMaterialRefreshMeta({} as never, ' paint.apply:group ', baseMeta);

  assert.deepEqual(meta, {
    source: 'paint.apply:group',
    immediate: true,
    noBuild: true,
  });
  assert.equal('noBuild' in baseMeta, false);
});

test('[canvas-picking/paint-meta] paint source fails fast when missing', () => {
  assert.throws(
    () => createCanvasPickingPaintStructuralMeta('   '),
    /Canvas picking paint meta requires a source/
  );
  assert.throws(
    () => createCanvasPickingPaintMaterialRefreshMeta({} as never, '   '),
    /Canvas picking paint meta requires a source/
  );
});
