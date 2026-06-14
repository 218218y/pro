import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  createCanvasPickingCellDimsRefreshGatedMeta,
  createCanvasPickingCellDimsStructuralMeta,
} from '../esm/native/services/canvas_picking_cell_dims_meta.ts';

test('[canvas-picking/cell-dims-meta] structural cell-dims writes are immediate build-visible writes', () => {
  const meta = createCanvasPickingCellDimsStructuralMeta(' cellDims.apply ');

  assert.deepEqual(meta, {
    source: 'cellDims.apply',
    immediate: true,
  });
  assert.equal('noBuild' in meta, false);
  assert.equal('noHistory' in meta, false);
});

test('[canvas-picking/cell-dims-meta] refresh-gated cell-dims writes suppress duplicate reactive builds', () => {
  const baseMeta = createCanvasPickingCellDimsStructuralMeta(' cellDims.apply.corner ');
  const meta = createCanvasPickingCellDimsRefreshGatedMeta({} as never, ' cellDims.apply.corner ', baseMeta);

  assert.deepEqual(meta, {
    source: 'cellDims.apply.corner',
    immediate: true,
    noBuild: true,
  });
  assert.equal('noBuild' in baseMeta, false);
  assert.equal('noHistory' in meta, false);
});

test('[canvas-picking/cell-dims-meta] cell-dims source fails fast when missing', () => {
  assert.throws(
    () => createCanvasPickingCellDimsStructuralMeta('   '),
    /Canvas picking cell-dims meta requires a source/
  );
  assert.throws(
    () => createCanvasPickingCellDimsRefreshGatedMeta({} as never, '   '),
    /Canvas picking cell-dims meta requires a source/
  );
});
