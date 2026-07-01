import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeKnownMapSnapshot } from '../esm/native/runtime/maps_access_normalizers.ts';
import { tryHandleDoorStyleOverridePaintClick } from '../esm/native/services/canvas_picking_paint_flow_apply_door_style.ts';

test('maps access normalizers keep hinge entries detached and door trim ids stable across normalizations', () => {
  const hingeNested = { inner: { side: 'left' } };
  const hingeMap = normalizeKnownMapSnapshot('hingeMap', {
    d1: { dir: 'left', nested: hingeNested },
  });

  assert.deepEqual(hingeMap.d1, { dir: 'left', nested: { inner: { side: 'left' } } });
  assert.notEqual(hingeMap.d1, null);
  const hingeRec = hingeMap.d1 as Record<string, unknown>;
  assert.notEqual(hingeRec.nested, hingeNested);
  assert.notEqual((hingeRec.nested as Record<string, unknown>).inner, hingeNested.inner);

  const rawTrim = {
    axis: 'vertical',
    color: 'gold',
    span: 'custom',
    sizeCm: '17',
    crossSizeCm: '6.5',
    centerXNorm: '0.25',
    centerYNorm: '0.75',
  };
  const trimMapA = normalizeKnownMapSnapshot('doorTrimMap', { d1_full: [rawTrim] });
  const trimMapB = normalizeKnownMapSnapshot('doorTrimMap', { d1_full: [rawTrim] });

  assert.equal(trimMapA.d1_full?.[0]?.id, trimMapB.d1_full?.[0]?.id);
  assert.equal(trimMapA.d1_full?.[0]?.axis, 'vertical');
  assert.equal(trimMapA.d1_full?.[0]?.color, 'gold');
  assert.equal(trimMapA.d1_full?.[0]?.sizeCm, 17);
  assert.equal(trimMapA.d1_full?.[0]?.crossSizeCm, 6.5);

  const firstId = trimMapA.d1_full?.[0]?.id;
  trimMapA.d1_full?.[0] && (trimMapA.d1_full[0].color = 'black');
  const trimMapC = normalizeKnownMapSnapshot('doorTrimMap', { d1_full: [rawTrim] });
  assert.equal(trimMapC.d1_full?.[0]?.id, firstId);
  assert.equal(trimMapC.d1_full?.[0]?.color, 'gold');

  const trimAliasMap = normalizeKnownMapSnapshot('doorTrimMap', {
    d1: [rawTrim],
    d1_mid2_accent_top: [rawTrim],
    d2_top_trim_preview_hover: [rawTrim],
  });
  assert.deepEqual({ ...trimAliasMap }, {});

  const mirrorMap = normalizeKnownMapSnapshot('mirrorLayoutMap', {
    d1: [{ widthCm: '99', heightCm: 99 }],
    d1_full: [{ widthCm: '45', heightCm: 75, faceSign: -1 }, { widthCm: 0 }],
    d2_mid2_accent_top: [{ widthCm: 20 }],
    d2_full: [{ faceSign: -1 }],
  });
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(mirrorMap).map(([key, list]) => [key, list.map(entry => ({ ...entry }))])
    ),
    {
      d1_full: [{ widthCm: 45, heightCm: 75, faceSign: -1 }],
      d2_full: [{ faceSign: -1 }],
    }
  );

  const doorStyleMap = normalizeKnownMapSnapshot('doorStyleMap', {
    d1: 'PROFILE',
    d1_full: 'double_profile',
    d2: 'flat',
    d2_mid2_accent_top: 'profile',
    drawer_1: 'profile',
    bad: 'glass',
  });
  assert.deepEqual({ ...doorStyleMap }, { d1_full: 'double_profile', drawer_1: 'profile' });
});

test('maps access normalizers keep split maps on canonical keys and values only', () => {
  const splitDoorsMap = normalizeKnownMapSnapshot('splitDoorsMap', {
    split_d1: true,
    split_d2_full: false,
    split_d2_mid2_accent_top: true,
    split_d2_mid2_groove_left: true,
    split_d3: 'true',
    split_d4: 1,
    splitpos_d1: [0.25, '0.5', 0.75],
    splitpos_d1_mid2_accent_top: [0.4],
    splitpos_d1_mid2_groove_left: [0.4],
    split_sketch_box_0_boxA_door_left_mid2_accent_top: true,
    split_sketch_box_free_0_boxA_door_sbdr_1_mid2_groove_left: true,
    splitpos_d2: '0.4',
    d5: true,
  });

  assert.deepEqual({ ...splitDoorsMap }, { split_d1: true, splitpos_d1: [0.25, 0.75] });

  const splitDoorsBottomMap = normalizeKnownMapSnapshot('splitDoorsBottomMap', {
    splitb_d1: true,
    splitb_d2_full: true,
    splitb_d2_mid2_accent_top: true,
    splitb_d2_mid2_groove_left: true,
    splitb_d3: 1,
    splitb_d4: 'true',
    d5: true,
  });

  assert.deepEqual({ ...splitDoorsBottomMap }, { splitb_d1: true });
});

test('maps access normalizers keep generic toggle maps on canonical boolean/null values', () => {
  const removedDoorsMap = normalizeKnownMapSnapshot('removedDoorsMap', {
    removed_d1_full: true,
    removed_d1_mid2: true,
    removed_d2_full: false,
    removed_d3_full: null,
    removed_d4: true,
    removed_d5_full: 1,
    removed_d6_full: 'on',
    removed_d1_mid2_accent_top: true,
    removed_d1_groove_left: true,
    removed_body_left: true,
    removed_lower_body_right: true,
    removed_sketch_box_free_0_alpha_side_left: true,
    removed_sketch_box_free_0_alpha_door_sbdr_1_mid2: true,
    removed_sketch_box_free_0_alpha_door_sbdr_1_mid2_accent_top: true,
    d7_full: true,
  });
  assert.deepEqual(
    { ...removedDoorsMap },
    {
      removed_d1_full: true,
      removed_d1_mid2: true,
      removed_d2_full: false,
      removed_d3_full: null,
      removed_body_left: true,
      removed_lower_body_right: true,
      removed_sketch_box_free_0_alpha_side_left: true,
      removed_sketch_box_free_0_alpha_door_sbdr_1_mid2: true,
    }
  );

  const groovesMap = normalizeKnownMapSnapshot('groovesMap', {
    groove_d1_full: true,
    groove_d2_full: false,
    groove_d3_full: null,
    groove_d10_mid2_accent_top: true,
    groove_d11_mid2_groove_left: true,
    groove_d12_top_trim_preview_hover: true,
    groove_d13_mid2_accent_top: true,
    groove_d13_mid2: false,
    groove_d14_mid2: null,
    groove_d14_mid2_groove_left: true,
    groove_d4_full: 1,
    groove_d5_full: 'true',
    d6_full: true,
  });
  assert.deepEqual(
    { ...groovesMap },
    {
      groove_d1_full: true,
      groove_d2_full: false,
      groove_d3_full: null,
      groove_d13_mid2: false,
      groove_d14_mid2: null,
    }
  );
  assert.equal('groove_d10_mid2_accent_top' in groovesMap, false);
  assert.equal('groove_d11_mid2_groove_left' in groovesMap, false);
  assert.equal('groove_d12_top_trim_preview_hover' in groovesMap, false);
  assert.equal('d6_full' in groovesMap, false);

  const drawerDividersMap = normalizeKnownMapSnapshot('drawerDividersMap', {
    'div:int_1': true,
    'div:int_2': false,
    'div:int_3': null,
    'div:int_4': 0,
    'div:int_5': 'off',
  });
  assert.deepEqual({ ...drawerDividersMap }, { 'div:int_1': true, 'div:int_2': false, 'div:int_3': null });
});

test('maps access normalizers keep groove line count keys unprefixed and canonical', () => {
  const grooveLinesCountMap = normalizeKnownMapSnapshot('grooveLinesCountMap', {
    d1_mid2_accent_top: 4.9,
    d2_mid2_groove_left: 5.8,
    d3_top_trim_preview_hover: 6.2,
    groove_d4_mid2: 8.9,
    d5_mid2_accent_top: 9,
    d5_mid2: 11,
    d6_mid2: 12,
    groove_d6_mid2: 13,
    d7_mid2_accent_top: null,
    d8_full: '8',
    d9_full: 0,
  });

  assert.deepEqual(
    { ...grooveLinesCountMap },
    {
      d5_mid2: 11,
      d6_mid2: 12,
    }
  );
  assert.equal('d1_mid2_accent_top' in grooveLinesCountMap, false);
  assert.equal('d2_mid2_groove_left' in grooveLinesCountMap, false);
  assert.equal('d3_top_trim_preview_hover' in grooveLinesCountMap, false);
  assert.equal('groove_d4_mid2' in grooveLinesCountMap, false);
  assert.equal('d7_mid2' in grooveLinesCountMap, false);
});

test('door style live writer canonicalizes decorated hit ids before storing', () => {
  const writes: Record<string, unknown>[] = [];
  const maps: Record<string, Record<string, unknown>> = {
    doorStyleMap: {},
    doorSpecialMap: {},
    curtainMap: {},
    mirrorLayoutMap: {},
  };
  const App = {
    maps,
    actions: {
      config: {
        setMap(name: string, next: Record<string, unknown>) {
          maps[name] = { ...next };
          if (name === 'doorStyleMap') writes.push({ ...next });
          return maps[name];
        },
      },
      history: {
        batch(_meta: unknown, cb: () => unknown) {
          return cb();
        },
      },
    },
  };

  const handled = tryHandleDoorStyleOverridePaintClick({
    App: App as never,
    foundPartId: 'd1_mid2_accent_top',
    effectiveDoorId: 'd1_mid2_accent_top',
    foundDrawerId: null,
    activeStack: 'top',
    paintSelection: '__wp_door_style__:profile',
    paintSource: 'test:decorated-style-hit',
  });

  assert.equal(handled, true);
  assert.deepEqual(writes, [{ d1_mid2: 'profile' }]);
  assert.equal('d1_mid2_accent_top' in maps.doorStyleMap, false);
});
