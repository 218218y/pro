import test from 'node:test';
import assert from 'node:assert/strict';

// NOTE: We import from dist/esm because the repo is TS-first and runtime lives under ./dist.
const mod = async () => await import('../dist/esm/native/builder/doors_state_utils.js');

test('doors_state_utils: makeDoorStateAccessors resolves hinge, split, curtain and groove maps', async () => {
  const { makeDoorStateAccessors } = await mod();

  const acc = makeDoorStateAccessors({
    hingeMap: { hinge_d1: 'left' },
    // Canonical since stage4: curtain keys are door-part ids (no "curtain_" prefix)
    curtainMap: { d7_mid: 'fabric' },
    groovesMap: { groove_d3_full: '1', groove_d4_full: 0 },
  });

  assert.equal(acc.getHingeDir('hinge_d1', 'right'), 'left');
  assert.equal(acc.getHingeDir('hinge_missing', 'right'), 'right');

  // split: default true
  assert.equal(acc.isDoorSplit(null, 1), true);
  assert.equal(acc.isDoorSplit({}, 1), true);
  assert.equal(acc.isDoorSplit({ split_d1: false }, 1), false);
  assert.equal(acc.isDoorSplit({ split_d2_top: false }, 2), false);

  // bottom split: default false
  assert.equal(acc.isDoorSplitBottom(null, 1), false);
  assert.equal(acc.isDoorSplitBottom({}, 1), false);
  assert.equal(acc.isDoorSplitBottom({ splitb_d1: true }, 1), true);
  assert.equal(acc.isDoorSplitBottom({ splitb_d2_full: true }, 2), true);

  // curtain
  assert.equal(acc.curtainVal(7, 'mid', 'none'), 'fabric');
  assert.equal(acc.curtainVal(8, 'mid', 'none'), 'none');

  // groove
  assert.equal(acc.grooveVal(3, 'full', false), true);
  assert.equal(acc.grooveVal(4, 'full', true), false);
  assert.equal(acc.grooveVal(9, 'full', true), true);
});

test('doors_state_utils: remove-doors helpers honor mode and ui toggle', async () => {
  const { isRemoveDoorMode, isRemoveDoorsEnabled } = await mod();

  const App = {}; // getModeId() falls back to canonical constants

  assert.equal(isRemoveDoorMode(App, {}), false);
  assert.equal(isRemoveDoorMode(App, { mode: { primary: 'remove_door' } }), true);

  assert.equal(isRemoveDoorsEnabled(App, { removeDoorsEnabled: true }, {}), true);
  assert.equal(isRemoveDoorsEnabled(App, { removeDoorsEnabled: '1' }, {}), true);
  assert.equal(isRemoveDoorsEnabled(App, {}, { mode: { primary: 'remove_door' } }), true);
  assert.equal(isRemoveDoorsEnabled(App, {}, {}), false);
});

test('doors_state_utils: makeDoorRemovalChecker supports canonical removed_* keys and _top/_bot full fallback', async () => {
  const { makeDoorRemovalChecker } = await mod();

  const isRemoved = makeDoorRemovalChecker({
    removedDoorsMap: {
      // Canonical since stage4:
      // - map keys are always "removed_<doorPartId>"
      // - base ids (d1) canonicalize to d1_full at read/write
      removed_d1_full: true,
      removed_d2_full: 1,
      removed_d3_full: true,
      removed_d4_full: '1',
    },
  });

  assert.equal(isRemoved('d1'), true);
  assert.equal(isRemoved('d2'), true);
  assert.equal(isRemoved('d3_top'), true);
  assert.equal(isRemoved('d4_bot'), true);
  assert.equal(isRemoved('d5'), false);
});

test('doors_state_utils: partial segmented removal does not promote full door to removed', async () => {
  const { makeDoorRemovalChecker } = await mod();

  const isRemoved = makeDoorRemovalChecker({
    removedDoorsMap: {
      removed_d12_top: true,
      removed_d20_bot: 1,
      removed_d30_mid: '1',
    },
  });

  assert.equal(isRemoved('d12_top'), true);
  assert.equal(isRemoved('d12_full'), false);
  assert.equal(isRemoved('d12'), false);

  assert.equal(isRemoved('d20_bot'), true);
  assert.equal(isRemoved('d20_full'), false);
  assert.equal(isRemoved('d20'), false);

  assert.equal(isRemoved('d30_mid'), true);
  assert.equal(isRemoved('d30_full'), false);
  assert.equal(isRemoved('d30'), false);
});

test('doors_state_utils: full segmented removal still applies to top/mid/bot parts', async () => {
  const { makeDoorRemovalChecker } = await mod();

  const isRemoved = makeDoorRemovalChecker({
    removedDoorsMap: {
      removed_d14_full: true,
      removed_d24_full: 1,
      removed_d34_full: '1',
    },
  });

  assert.equal(isRemoved('d14_full'), true);
  assert.equal(isRemoved('d14_top'), true);

  assert.equal(isRemoved('d24_full'), true);
  assert.equal(isRemoved('d24_bot'), true);

  assert.equal(isRemoved('d34_full'), true);
  assert.equal(isRemoved('d34_mid'), true);
});

test('doors_state_utils: edge default-none cache ownership stays canonical across module/corner/pent readers', async () => {
  const { makeDoorStateAccessors, makeHandleTypeResolver } = await mod();
  const { resetEdgeHandleDefaultNoneCacheMaps, markEdgeHandleDefaultNone } =
    await import('../dist/esm/native/builder/edge_handle_default_none_runtime.js');

  const App = { services: {} };
  resetEdgeHandleDefaultNoneCacheMaps(App);
  markEdgeHandleDefaultNone(App, 'top', 'd2');
  markEdgeHandleDefaultNone(App, 'top', 'corner_door_4', 'corner');
  markEdgeHandleDefaultNone(App, 'bottom', 'corner_pent_door_6', 'pent');

  const topResolver = makeHandleTypeResolver({
    App,
    cfg: { globalHandleType: 'edge', handlesMap: {} },
    doorState: makeDoorStateAccessors({}),
    handleControlEnabled: true,
    stackKey: 'top',
  });
  const bottomResolver = makeHandleTypeResolver({
    App,
    cfg: { globalHandleType: 'edge', handlesMap: {} },
    doorState: makeDoorStateAccessors({ splitDoorsBottomMap: {} }),
    handleControlEnabled: true,
    stackKey: 'bottom',
  });

  assert.equal(topResolver('d2'), 'none');
  assert.equal(topResolver('corner_door_4_full'), 'none');
  assert.equal(bottomResolver('corner_pent_door_6_bot'), 'none');
  assert.equal(topResolver('d9'), 'edge');
});
