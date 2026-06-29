import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeKnownMapSnapshot } from '../esm/native/runtime/maps_access_normalizers.ts';

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
  const trimMapA = normalizeKnownMapSnapshot('doorTrimMap', { d1: [rawTrim] });
  const trimMapB = normalizeKnownMapSnapshot('doorTrimMap', { d1: [rawTrim] });

  assert.equal(trimMapA.d1?.[0]?.id, trimMapB.d1?.[0]?.id);
  assert.equal(trimMapA.d1?.[0]?.axis, 'vertical');
  assert.equal(trimMapA.d1?.[0]?.color, 'gold');
  assert.equal(trimMapA.d1?.[0]?.sizeCm, 17);
  assert.equal(trimMapA.d1?.[0]?.crossSizeCm, 6.5);

  const firstId = trimMapA.d1?.[0]?.id;
  trimMapA.d1?.[0] && (trimMapA.d1[0].color = 'black');
  const trimMapC = normalizeKnownMapSnapshot('doorTrimMap', { d1: [rawTrim] });
  assert.equal(trimMapC.d1?.[0]?.id, firstId);
  assert.equal(trimMapC.d1?.[0]?.color, 'gold');

  const mirrorMap = normalizeKnownMapSnapshot('mirrorLayoutMap', {
    d1: [{ widthCm: '45', heightCm: 75, faceSign: -1 }, { widthCm: 0 }],
    d2: [{ faceSign: -1 }],
  });
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(mirrorMap).map(([key, list]) => [key, list.map(entry => ({ ...entry }))])
    ),
    {
      d1: [{ widthCm: 45, heightCm: 75, faceSign: -1 }],
      d2: [{ faceSign: -1 }],
    }
  );

  const doorStyleMap = normalizeKnownMapSnapshot('doorStyleMap', {
    d1: 'PROFILE',
    d1_full: 'double_profile',
    d2: 'flat',
    drawer_1: 'profile',
    bad: 'glass',
  });
  assert.deepEqual({ ...doorStyleMap }, { d1_full: 'double_profile', d2_full: 'flat', drawer_1: 'profile' });
});

test('maps access normalizers keep split maps on canonical keys and values only', () => {
  const splitDoorsMap = normalizeKnownMapSnapshot('splitDoorsMap', {
    split_d1: true,
    split_d2_full: false,
    split_d3: 'true',
    split_d4: 1,
    splitpos_d1: [0.25, '0.5', 0.75],
    splitpos_d2: '0.4',
    d5: true,
  });

  assert.deepEqual({ ...splitDoorsMap }, { split_d1: true, splitpos_d1: [0.25, 0.75] });

  const splitDoorsBottomMap = normalizeKnownMapSnapshot('splitDoorsBottomMap', {
    splitb_d1: true,
    splitb_d2_full: true,
    splitb_d3: 1,
    splitb_d4: 'true',
    d5: true,
  });

  assert.deepEqual({ ...splitDoorsBottomMap }, { splitb_d1: true });
});

test('maps access normalizers keep generic toggle maps on canonical boolean/null values', () => {
  const removedDoorsMap = normalizeKnownMapSnapshot('removedDoorsMap', {
    removed_d1_full: true,
    removed_d2_full: false,
    removed_d3_full: null,
    removed_d4: true,
    removed_d5_full: 1,
    removed_d6_full: 'on',
    d7_full: true,
  });
  assert.deepEqual(
    { ...removedDoorsMap },
    { removed_d1_full: true, removed_d2_full: false, removed_d3_full: null }
  );

  const groovesMap = normalizeKnownMapSnapshot('groovesMap', {
    groove_d1_full: true,
    groove_d2_full: false,
    groove_d3_full: null,
    groove_d4_full: 1,
    groove_d5_full: 'true',
    d6_full: true,
  });
  assert.deepEqual({ ...groovesMap }, { groove_d1_full: true, groove_d2_full: false, groove_d3_full: null });

  const drawerDividersMap = normalizeKnownMapSnapshot('drawerDividersMap', {
    'div:int_1': true,
    'div:int_2': false,
    'div:int_3': null,
    'div:int_4': 0,
    'div:int_5': 'off',
  });
  assert.deepEqual({ ...drawerDividersMap }, { 'div:int_1': true, 'div:int_2': false, 'div:int_3': null });
});
