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
      doorTrimMap: { d1: [doorTrimRawEntry, { axis: 'bad', color: 'oops', span: 'half' }] },
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

  const trims = readMap(App, 'doorTrimMap');
  assert.equal(trims?.d1?.length, 2);
  assert.deepEqual(trims?.d1?.[0], {
    id: trims?.d1?.[0]?.id,
    axis: 'vertical',
    color: 'gold',
    span: 'custom',
    sizeCm: 17,
    crossSizeCm: 6.5,
    centerXNorm: 0.25,
    centerYNorm: 0.75,
  });
  assert.equal(trims?.d1?.[1]?.axis, 'horizontal');
  assert.equal(trims?.d1?.[1]?.color, 'nickel');
  assert.equal(trims?.d1?.[1]?.span, 'half');

  const custom = readMapOrEmpty(App, 'customMap');
  assert.deepEqual({ ...custom }, { nested: { a: 1 } });
  assert.notEqual(custom, App.maps.customMap);
  assert.notEqual(custom.nested, customNested);
});
