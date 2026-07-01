import test from 'node:test';
import assert from 'node:assert/strict';

import { readMap, readMapOrEmpty } from '../esm/native/runtime/maps_access.ts';

test('maps_access normalizes known maps and clones unknown maps without leaking raw references', () => {
  const hingeObj = { dir: 'right' };
  const customNested = { a: 1 };
  const doorTrimRawEntry = {
    axis: 'vertical',
    color: 'gold',
    span: 'custom',
    sizeCm: '17',
    crossSizeCm: '6.5',
    centerXNorm: '0.25',
    centerYNorm: '0.75',
  };
  const App: any = {
    maps: {
      handlesMap: { d1: 'bar', d2: null, drop: 123 },
      hingeMap: { d1: 'left', d2: hingeObj, bad: 7 },
      splitDoorsMap: { split_d1: true, splitpos_d1: [0.25, 0.75, 'bad'], skip: { nope: true } },
      removedDoorsMap: {
        removed_d1_full: true,
        removed_d2_full: false,
        removed_d3_full: null,
        removed_d4: true,
        legacy: 'on',
        bad: 'wat',
      },
      roundedFrameSideShelvesMap: {
        body_left: true,
        body_right: false,
        body_null: null,
        legacy: 1,
        bad: 'wat',
      },
      customMap: { nested: customNested },
      doorStyleMap: {
        d1_full: 'PROFILE',
        d2: 'flat',
        d3_mid2_accent_top: 'double_profile',
      },
      mirrorLayoutMap: {
        d1_full: [{ widthCm: '55', heightCm: '88', faceSign: -1 }, { widthCm: 0 }],
        d2: [{ widthCm: 44, heightCm: 77, faceSign: -1 }],
        d3_mid2_accent_top: [{ widthCm: 33, heightCm: 66, faceSign: -1 }],
      },
      doorTrimMap: {
        d1_full: [doorTrimRawEntry, { axis: 'bad', color: 'oops', span: 'half' }],
        d1: [{ ...doorTrimRawEntry, sizeCm: '22' }],
        d1_mid2_trim_preview_hover: [{ ...doorTrimRawEntry, sizeCm: '33' }],
      },
    },
  };

  const handles = readMap(App, 'handlesMap');
  assert.equal(handles?.d1, 'bar');
  assert.equal(handles?.d2, null);
  assert.equal('drop' in (handles || {}), false);

  const hinges = readMap(App, 'hingeMap');
  assert.equal(hinges?.d1, 'left');
  assert.deepEqual(hinges?.d2, { dir: 'right' });
  assert.equal('bad' in (hinges || {}), false);
  assert.notEqual(hinges?.d2, hingeObj);

  const splits = readMap(App, 'splitDoorsMap');
  assert.equal(splits?.split_d1, true);
  assert.deepEqual(splits?.splitpos_d1, [0.25, 0.75]);
  assert.equal('skip' in (splits || {}), false);

  const removed = readMap(App, 'removedDoorsMap');
  assert.equal(removed?.removed_d1_full, true);
  assert.equal(removed?.removed_d2_full, false);
  assert.equal(removed?.removed_d3_full, null);
  assert.equal('removed_d4' in (removed || {}), false);
  assert.equal('legacy' in (removed || {}), false);
  assert.equal('bad' in (removed || {}), false);

  const roundedFrameSides = readMap(App, 'roundedFrameSideShelvesMap');
  assert.equal(roundedFrameSides?.body_left, true);
  assert.equal(roundedFrameSides?.body_right, false);
  assert.equal(roundedFrameSides?.body_null, null);
  assert.equal('legacy' in (roundedFrameSides || {}), false);
  assert.equal('bad' in (roundedFrameSides || {}), false);

  const styles = readMap(App, 'doorStyleMap');
  assert.deepEqual({ ...styles }, { d1_full: 'profile' });
  assert.equal('d2' in (styles || {}), false);
  assert.equal('d3_mid2_accent_top' in (styles || {}), false);

  const mirrorLayouts = readMap(App, 'mirrorLayoutMap');
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(mirrorLayouts || {}).map(([key, list]) => [
        key,
        Array.isArray(list) ? list.map(entry => ({ ...entry })) : list,
      ])
    ),
    { d1_full: [{ widthCm: 55, heightCm: 88, faceSign: -1 }] }
  );
  assert.equal('d2' in (mirrorLayouts || {}), false);
  assert.equal('d3_mid2_accent_top' in (mirrorLayouts || {}), false);

  const trims = readMap(App, 'doorTrimMap');
  assert.equal(trims?.d1_full?.length, 2);
  assert.deepEqual(trims?.d1_full?.[0], {
    id: trims?.d1_full?.[0]?.id,
    axis: 'vertical',
    color: 'gold',
    span: 'custom',
    sizeCm: 17,
    crossSizeCm: 6.5,
    centerXNorm: 0.25,
    centerYNorm: 0.75,
  });
  assert.equal(trims?.d1_full?.[1]?.axis, 'horizontal');
  assert.equal(trims?.d1_full?.[1]?.color, 'nickel');
  assert.equal(trims?.d1_full?.[1]?.span, 'half');
  assert.equal('d1' in (trims || {}), false);
  assert.equal('d1_mid2_trim_preview_hover' in (trims || {}), false);

  const custom = readMapOrEmpty(App, 'customMap');
  assert.deepEqual({ ...custom }, { nested: { a: 1 } });
  assert.notEqual(custom, App.maps.customMap);
  assert.notEqual(custom.nested, customNested);
});
