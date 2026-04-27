import test from 'node:test';
import assert from 'node:assert/strict';

import { BUILD_CTX_V1, createBuildContext, isBuildContext } from '../esm/native/builder/build_context.ts';

test('build context runtime: createBuildContext normalizes canonical sections', () => {
  const input = {
    label: 'unit',
    flags: null,
    dims: undefined,
    strings: 1,
    layout: [],
    materials: 'x',
    create: false,
    resolvers: 5,
    hinged: null,
    fns: 'noop',
  } as any;

  const ctx = createBuildContext(input);

  assert.equal(ctx.__kind, BUILD_CTX_V1);
  assert.equal(isBuildContext(ctx), true);
  assert.equal(ctx.label, 'unit');
  assert.equal(typeof ctx.flags, 'object');
  assert.equal(typeof ctx.dims, 'object');
  assert.equal(typeof ctx.strings, 'object');
  assert.equal(typeof ctx.layout, 'object');
  assert.equal(typeof ctx.materials, 'object');
  assert.equal(typeof ctx.create, 'object');
  assert.equal(typeof ctx.resolvers, 'object');
  assert.equal(typeof ctx.hinged, 'object');
  assert.equal(typeof ctx.fns, 'object');

  assert.equal(ctx, input);
  assert.equal(isBuildContext({ __kind: 'other' }), false);
  assert.equal(isBuildContext(null), false);
});
