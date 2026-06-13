import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createCanvasPickingHandleAssignStructuralMeta } from '../esm/native/services/canvas_picking_handle_assign_meta.ts';

test('[canvas-picking/handle-assign-meta] handle assignment writes are immediate build-visible writes', () => {
  const meta = createCanvasPickingHandleAssignStructuralMeta(' handles:assign ');

  assert.deepEqual(meta, {
    source: 'handles:assign',
    immediate: true,
  });
  assert.equal('noBuild' in meta, false);
  assert.equal('noHistory' in meta, false);
});

test('[canvas-picking/handle-assign-meta] handle assignment source fails fast when missing', () => {
  assert.throws(
    () => createCanvasPickingHandleAssignStructuralMeta('   '),
    /Canvas picking handle-assignment structural meta requires a source/
  );
});
