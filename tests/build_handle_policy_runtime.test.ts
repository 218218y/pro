import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getExtraLongEdgeHandleLiftAbsY,
  getMaxGlobalExternalDrawerHeightM,
} from '../esm/native/builder/build_handle_policy.ts';

const longEdgeConfig = {
  globalHandleType: 'edge',
  handlesMap: { __wp_edge_handle_variant_global: 'long' },
};

test('build handle policy applies the long-edge lift exactly at the drawer threshold', () => {
  assert.equal(getExtraLongEdgeHandleLiftAbsY(longEdgeConfig, [{ extDrawersCount: 3 }]), 0);
  assert.equal(getExtraLongEdgeHandleLiftAbsY(longEdgeConfig, [{ extDrawersCount: 4 }]), 0.1);
  assert.equal(getExtraLongEdgeHandleLiftAbsY(longEdgeConfig, [{ extDrawersCount: 5 }]), 0.1);
});

test('build handle policy ignores malformed modules and non-long handle configurations', () => {
  assert.equal(getExtraLongEdgeHandleLiftAbsY(null, [{ extDrawersCount: 4 }]), 0);
  assert.equal(getExtraLongEdgeHandleLiftAbsY({ globalHandleType: 'standard' }, [{ extDrawersCount: 4 }]), 0);
  assert.equal(getExtraLongEdgeHandleLiftAbsY(longEdgeConfig, [null, 'bad', { extDrawersCount: '4' }]), 0);
  assert.equal(getExtraLongEdgeHandleLiftAbsY(longEdgeConfig, null), 0);
});

test('build handle policy preserves shoe and regular drawer height aggregation', () => {
  assert.equal(getMaxGlobalExternalDrawerHeightM(null), 0);
  assert.equal(getMaxGlobalExternalDrawerHeightM([null, 'bad']), 0);
  assert.equal(getMaxGlobalExternalDrawerHeightM([{ hasShoeDrawer: true }]), 0.2);
  assert.equal(getMaxGlobalExternalDrawerHeightM([{ extDrawersCount: 2 }]), 0.44);
  assert.equal(
    getMaxGlobalExternalDrawerHeightM([{ hasShoeDrawer: true, extDrawersCount: 2 }, { extDrawersCount: 1 }]),
    0.64
  );
  assert.equal(getMaxGlobalExternalDrawerHeightM([{ extDrawersCount: 1.5 }]), 0.33);
});
