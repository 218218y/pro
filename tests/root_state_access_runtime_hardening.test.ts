import test from 'node:test';
import assert from 'node:assert/strict';

import {
  readConfigStateFromStore,
  readMetaStateFromStore,
  readRuntimeStateFromStore,
  readUiRawInputsFromStore,
  readUiRawScalarFromStore,
} from '../esm/native/runtime/root_state_access.ts';

test('root_state_access coerces core slices and filters ui.raw scalar reads by declared scalar kind', () => {
  const store = {
    getState() {
      return {
        ui: {
          raw: {
            width: '180',
            depth: 60,
            stackSplitLowerDepthManual: true,
            stackSplitLowerDoorsManual: 'yes',
            extra: 'keep-me',
          },
        },
        config: null,
        runtime: 7,
        meta: { version: '1', updatedAt: 99, dirty: 'yes' },
      };
    },
  };

  assert.deepEqual(readConfigStateFromStore(store), {});
  assert.deepEqual(readRuntimeStateFromStore(store), {});
  assert.deepEqual(readMetaStateFromStore(store), { version: 0, updatedAt: 99, dirty: false });

  assert.deepEqual(readUiRawInputsFromStore(store), {
    width: '180',
    depth: 60,
    stackSplitLowerDepthManual: true,
    stackSplitLowerDoorsManual: 'yes',
    extra: 'keep-me',
  });

  assert.equal(readUiRawScalarFromStore(store, 'width'), undefined);
  assert.equal(readUiRawScalarFromStore(store, 'depth'), 60);
  assert.equal(readUiRawScalarFromStore(store, 'stackSplitLowerDepthManual'), true);
  assert.equal(readUiRawScalarFromStore(store, 'stackSplitLowerDoorsManual'), undefined);
});
