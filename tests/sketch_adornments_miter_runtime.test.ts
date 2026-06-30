import test from 'node:test';
import assert from 'node:assert/strict';

import { stripSketchCorniceMiterCaps } from '../esm/native/builder/render_interior_sketch_visuals_adornments_miter.ts';

test('sketch cornice miter cap stripping uses numeric geometry indexes only', () => {
  const state = {
    indices: [0, 1, 0, 2, 3, 2] as unknown[],
    attr: { count: 4 },
  };

  stripSketchCorniceMiterCaps(
    {
      getIndex: () => ({ array: state.indices }),
      getAttribute: () => state.attr,
      setIndex: (indices: number[]) => {
        state.indices = indices;
      },
    } as never,
    true,
    false
  );

  assert.deepEqual(state.indices, [2, 3, 2]);
});

test('sketch cornice miter cap stripping rejects string-encoded geometry indexes', () => {
  const state = {
    indices: ['0', '1', '0', '2', '3', '2'] as unknown[],
    attr: { count: 4 },
  };
  let setIndexCalled = false;

  stripSketchCorniceMiterCaps(
    {
      getIndex: () => ({ array: state.indices }),
      getAttribute: () => state.attr,
      setIndex: () => {
        setIndexCalled = true;
      },
    } as never,
    true,
    false
  );

  assert.equal(setIndexCalled, false);
  assert.deepEqual(state.indices, ['0', '1', '0', '2', '3', '2']);
});

test('sketch cornice miter cap stripping rejects string-encoded vertex count', () => {
  let setIndexCalled = false;

  stripSketchCorniceMiterCaps(
    {
      getIndex: () => ({ array: [0, 1, 0, 2, 3, 2] }),
      getAttribute: () => ({ count: '4' }),
      setIndex: () => {
        setIndexCalled = true;
      },
    } as never,
    true,
    false
  );

  assert.equal(setIndexCalled, false);
});
