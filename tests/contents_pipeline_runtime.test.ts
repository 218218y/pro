import test from 'node:test';
import assert from 'node:assert/strict';

import { makeRodCreator } from '../esm/native/builder/contents_pipeline.ts';

test('contents pipeline runtime: createRod forwards normalized config and attaches error context', () => {
  const calls: any[] = [];
  const reported: any[] = [];
  const App: any = {
    services: {
      builder: {
        renderOps: {
          createRodWithContents: (args: unknown) => {
            calls.push(args);
            throw new Error('rod exploded');
          },
        },
      },
      platform: {
        reportError: (err: unknown, ctx?: unknown) => {
          reported.push([err, ctx]);
        },
      },
    },
  };

  const createRod = makeRodCreator({
    App,
    THREE: { Group: function Group() {} },
    cfg: { foo: 1 },
    config: { intDrawersList: ['a'], intDrawersSlot: { id: 'slot' } },
    moduleIndex: 3,
    innerW: 77,
    showContentsEnabled: true,
  });

  assert.throws(() => createRod(1.25, false, true, 2.5), /rod exploded/);
  assert.equal(calls.length, 1);
  assert.equal(reported.length, 1);
  assert.equal((calls[0] as any).yPos, 1.25);
  assert.deepEqual((calls[0] as any).intDrawersList, ['a']);
  assert.deepEqual((calls[0] as any).intDrawersSlot, { id: 'slot' });
  assert.equal((reported[0][1] as any).moduleIndex, 3);
  assert.equal(((reported[0][0] as any).context as any).op, 'createRodWithContents');
});
