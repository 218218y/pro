import test from 'node:test';
import assert from 'node:assert/strict';

import { emitSketchInternalDrawerCassettePanels } from '../esm/native/builder/render_interior_sketch_internal_drawer_cassette.ts';

function makeBoardFactory(calls: unknown[][]) {
  return (...args: unknown[]) => {
    calls.push(args);
    return { userData: {} };
  };
}

test('internal drawer cassette panels require real positive runtime numbers', () => {
  const calls: unknown[][] = [];

  assert.equal(
    emitSketchInternalDrawerCassettePanels({
      createBoard: makeBoardFactory(calls) as never,
      stackPartId: 'stack_1',
      centerX: 0,
      baseY: 0.2,
      centerZ: 0,
      outerWidth: 0.7,
      depth: 0.45,
      stackH: 0.3,
      woodThick: 0.018,
    }),
    true
  );
  assert.equal(calls.length > 0, true);

  for (const bad of [
    { outerWidth: '0.7', depth: 0.45, stackH: 0.3 },
    { outerWidth: 0.7, depth: '0.45', stackH: 0.3 },
    { outerWidth: 0.7, depth: 0.45, stackH: '0.3' },
  ]) {
    const badCalls: unknown[][] = [];
    assert.equal(
      emitSketchInternalDrawerCassettePanels({
        createBoard: makeBoardFactory(badCalls) as never,
        stackPartId: 'stack_1',
        centerX: 0,
        baseY: 0.2,
        centerZ: 0,
        outerWidth: bad.outerWidth as never,
        depth: bad.depth as never,
        stackH: bad.stackH as never,
        woodThick: 0.018,
      }),
      false
    );
    assert.equal(badCalls.length, 0);
  }
});
