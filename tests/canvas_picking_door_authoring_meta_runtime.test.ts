import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  createCanvasPickingDoorAuthoringRefreshGatedMeta,
  createCanvasPickingDoorAuthoringStructuralMeta,
} from '../esm/native/services/canvas_picking_door_authoring_meta.ts';

test('[canvas-picking/door-authoring-meta] structural door-authoring writes are immediate build-visible writes', () => {
  const meta = createCanvasPickingDoorAuthoringStructuralMeta(' groove:click ');

  assert.deepEqual(meta, {
    source: 'groove:click',
    immediate: true,
  });
  assert.equal('noBuild' in meta, false);
  assert.equal('noHistory' in meta, false);
});

test('[canvas-picking/door-authoring-meta] door-authoring source fails fast when missing', () => {
  assert.throws(
    () => createCanvasPickingDoorAuthoringStructuralMeta('   '),
    /Canvas picking door-authoring structural meta requires a source/
  );
  assert.throws(
    () => createCanvasPickingDoorAuthoringRefreshGatedMeta({} as never, '   '),
    /Canvas picking door-authoring structural meta requires a source/
  );
});

test('[canvas-picking/door-authoring-meta] refresh-gated door-authoring writes suppress duplicate reactive builds', () => {
  const baseMeta = createCanvasPickingDoorAuthoringStructuralMeta(' removeDoors:smart ');
  const meta = createCanvasPickingDoorAuthoringRefreshGatedMeta({} as never, ' removeDoors:smart ', baseMeta);

  assert.deepEqual(meta, {
    source: 'removeDoors:smart',
    immediate: true,
    noBuild: true,
  });
  assert.equal('noBuild' in baseMeta, false);
  assert.equal('noHistory' in meta, false);
});
