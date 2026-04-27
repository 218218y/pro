import test from 'node:test';
import assert from 'node:assert/strict';

import { createKernelInstallSupport } from '../esm/native/kernel/kernel_install_support.ts';

test('kernel install support cloneKernelValue preserves valid branches when JSON stringify would throw', () => {
  const support = createKernelInstallSupport({} as never);
  const cyclic: Record<string, unknown> = { keep: 'visible' };
  cyclic.self = cyclic;

  const cloned = support.cloneKernelValue(
    {
      safe: { nested: true },
      badBigInt: 7n,
      cyclic,
      when: new Date('2024-01-02T03:04:05.000Z'),
      list: ['keep', 9n, cyclic],
    },
    null
  ) as Record<string, unknown> | null;

  assert.deepEqual(cloned, {
    safe: { nested: true },
    cyclic: { keep: 'visible' },
    when: '2024-01-02T03:04:05.000Z',
    list: ['keep', null, { keep: 'visible' }],
  });
});

test('kernel install support cloneKernelValue survives platform clone failures and still sanitizes branch-level payloads', () => {
  const App = {
    platform: {
      util: {
        clone() {
          throw new Error('clone failed');
        },
      },
    },
  } as never;
  const support = createKernelInstallSupport(App);
  const cyclic: Record<string, unknown> = { ok: 1 };
  cyclic.self = cyclic;

  const cloned = support.cloneKernelValue(
    {
      safe: { nested: 'yes' },
      cyclic,
      bad: 2n,
    },
    { fallback: true }
  ) as Record<string, unknown>;

  assert.deepEqual(cloned, {
    safe: { nested: 'yes' },
    cyclic: { ok: 1 },
  });
  assert.deepEqual(support.cloneKernelValue(new Map([['k', 'v']]), { fallback: true }), {});
});
