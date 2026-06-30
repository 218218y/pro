import test from 'node:test';
import assert from 'node:assert/strict';

import { makeHandleCreator } from '../esm/native/builder/handle_factory.ts';

test('handle factory accepts only finite numeric dimensions', () => {
  const calls: unknown[] = [];
  const App: any = {
    services: {
      builder: {
        renderOps: {
          createHandleMesh(type: string, w: number, h: number) {
            calls.push({ type, w, h });
            return { type, w, h };
          },
        },
      },
    },
  };
  const THREE: any = {};
  const createHandle = makeHandleCreator({ App, THREE, addOutlines: null });

  assert.deepEqual(createHandle('standard', 0.12, 0.22, true), {
    type: 'standard',
    w: 0.12,
    h: 0.22,
  });
  assert.throws(() => createHandle('standard', '0.12' as any, 0.22, true), /Invalid handle dimensions/);
  assert.throws(() => createHandle('standard', 0.12, Number.NaN, true), /Invalid handle dimensions/);
  assert.deepEqual(calls, [{ type: 'standard', w: 0.12, h: 0.22 }]);
});
