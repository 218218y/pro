import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createCanvasPickingConfigStructuralPatchMeta } from '../esm/native/services/canvas_picking_config_patch_meta.ts';

test('[canvas-picking/config-patch-meta] structural config patches are immediate build-visible writes', () => {
  const meta = createCanvasPickingConfigStructuralPatchMeta(' sketch.place ');

  assert.deepEqual(meta, {
    source: 'sketch.place',
    immediate: true,
  });
  assert.equal('noBuild' in meta, false);
  assert.equal('noHistory' in meta, false);
});

test('[canvas-picking/config-patch-meta] structural config patch source fails fast when missing', () => {
  assert.throws(
    () => createCanvasPickingConfigStructuralPatchMeta('   '),
    /Canvas picking config structural patch requires a source/
  );
});
