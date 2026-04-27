import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveSketchFrontVisualState } from '../esm/native/builder/render_interior_sketch_visuals_door_state.ts';

test('sketch front visual state reuses canonical full-door mirror/glass maps for split door segments', () => {
  const input = {
    cfg: {
      isMultiColorMode: true,
      doorSpecialMap: { d1_full: 'mirror', d2_full: 'glass' },
      mirrorLayoutMap: { d1_full: [{ faceSign: -1 }] },
      curtainMap: { d2_full: 'linen' },
    },
  };

  const mirrorState = resolveSketchFrontVisualState(input as never, 'd1_top');
  assert.equal(mirrorState.isMirror, true);
  assert.equal(mirrorState.isGlass, false);
  assert.deepEqual(mirrorState.mirrorLayout, [{ faceSign: -1 }]);

  const glassState = resolveSketchFrontVisualState(input as never, 'd2_bot');
  assert.equal(glassState.isMirror, false);
  assert.equal(glassState.isGlass, true);
  assert.equal(glassState.curtainType, 'linen');
});
