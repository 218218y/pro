import test from 'node:test';
import assert from 'node:assert/strict';

import { __isDoorRuntimeRef } from '../esm/native/services/canvas_picking_local_helpers_shared.ts';
import { __wp_readCellDimsDraft } from '../esm/native/services/canvas_picking_local_helpers_cell_dims.ts';

function createAppWithUiRaw(raw: Record<string, unknown>) {
  return {
    store: {
      getState() {
        return {
          ui: { raw },
          config: {},
          runtime: {},
          mode: {},
          meta: {},
        };
      },
      patch() {},
    },
  } as const;
}

test('local helper shared door runtime ref guard accepts objects and rejects invalid groups', () => {
  assert.equal(__isDoorRuntimeRef({ group: null, isOpen: true }), true);
  assert.equal(__isDoorRuntimeRef({ group: { userData: {} } }), true);
  assert.equal(__isDoorRuntimeRef({ group: 123 }), false);
  assert.equal(__isDoorRuntimeRef(null), false);
});

test('cell dims draft reads only finite positive UI raw inputs', () => {
  const App = createAppWithUiRaw({
    cellDimsWidth: 91,
    cellDimsHeight: 'bad',
    cellDimsDepth: 54,
  });
  assert.deepEqual(__wp_readCellDimsDraft(App as any), {
    applyW: 91,
    applyH: null,
    applyD: 54,
  });

  const empty = createAppWithUiRaw({
    cellDimsWidth: 0,
    cellDimsHeight: -3,
    cellDimsDepth: Number.NaN,
  });
  assert.deepEqual(__wp_readCellDimsDraft(empty as any), {
    applyW: null,
    applyH: null,
    applyD: null,
  });
});
