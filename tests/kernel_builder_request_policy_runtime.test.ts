import test from 'node:test';
import assert from 'node:assert/strict';

import {
  readKernelBuilderRequestForce,
  readKernelBuilderRequestImmediate,
  readKernelBuilderRequestSource,
  requestKernelBuilderBuild,
  shouldRequestKernelBuilderBuild,
} from '../esm/native/kernel/kernel_builder_request_policy.ts';

type AnyRecord = Record<string, unknown>;

function createApp() {
  const calls: AnyRecord[] = [];
  const App = {
    services: {
      builder: {
        requestBuild(_ui: unknown, meta?: AnyRecord) {
          calls.push(meta || {});
          return true;
        },
      },
    },
  };
  return { App, calls };
}

test('kernel builder request policy reads canonical source/force/immediate fields', () => {
  assert.equal(readKernelBuilderRequestSource({ source: 'alpha' }, 'fallback'), 'alpha');
  assert.equal(readKernelBuilderRequestSource({ reason: 'beta' }, 'fallback'), 'beta');
  assert.equal(readKernelBuilderRequestSource({}, 'fallback'), 'fallback');
  assert.equal(readKernelBuilderRequestForce({ forceBuild: true }), true);
  assert.equal(readKernelBuilderRequestForce({ force: true }), true);
  assert.equal(readKernelBuilderRequestImmediate({ immediate: true }), true);
});

test('kernel builder request policy suppresses noBuild unless force is present', () => {
  assert.equal(shouldRequestKernelBuilderBuild({ noBuild: true }), false);
  assert.equal(shouldRequestKernelBuilderBuild({ noBuild: true, forceBuild: true }), true);
  assert.equal(shouldRequestKernelBuilderBuild({ noBuild: true }, true), true);
});

test('kernel builder request policy forwards canonical build meta with source/reason defaults', () => {
  const h = createApp();
  const ok = requestKernelBuilderBuild(h.App as never, { source: 'kernel:test' }, { immediate: true });
  assert.equal(ok, true);
  assert.deepEqual(h.calls, [
    { source: 'kernel:test', reason: 'kernel:test', immediate: true, force: false },
  ]);
});

test('kernel builder request policy preserves explicit meta reason and honors force over noBuild', () => {
  const h = createApp();
  const ok = requestKernelBuilderBuild(
    h.App as never,
    { source: 'kernel:test', reason: 'explicit', noBuild: true, forceBuild: true },
    { immediate: false }
  );
  assert.equal(ok, true);
  assert.deepEqual(h.calls, [
    { source: 'kernel:test', reason: 'explicit', noBuild: true, immediate: false, force: true },
  ]);
});
