import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createCanvasPickingDrawerDividerStructuralMeta } from '../esm/native/services/canvas_picking_drawer_mode_divider_meta.ts';

test('[canvas-picking/drawer-divider-meta] divider writes are immediate build-visible writes', () => {
  const meta = createCanvasPickingDrawerDividerStructuralMeta(' divider:click ');

  assert.deepEqual(meta, {
    source: 'divider:click',
    immediate: true,
  });
  assert.equal('noBuild' in meta, false);
  assert.equal('noHistory' in meta, false);
});

test('[canvas-picking/drawer-divider-meta] divider source fails fast when missing', () => {
  assert.throws(
    () => createCanvasPickingDrawerDividerStructuralMeta('   '),
    /Canvas picking drawer-divider structural meta requires a source/
  );
});
