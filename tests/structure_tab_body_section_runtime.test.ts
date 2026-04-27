import test from 'node:test';
import assert from 'node:assert/strict';

import {
  BASE_TYPE_OPTIONS,
  SLIDING_TRACKS_OPTIONS,
  getSingleDoorPositionOptions,
  getSingleDoorSelectorClassName,
} from '../esm/native/ui/react/tabs/structure_tab_body_section_contracts.ts';

test('structure body section contracts expose canonical base, tracks, and single-door options', () => {
  assert.deepEqual(
    BASE_TYPE_OPTIONS.map(option => option.value),
    ['plinth', 'legs', 'none']
  );
  assert.deepEqual(
    SLIDING_TRACKS_OPTIONS.map(option => option.value),
    ['nickel', 'black']
  );

  assert.deepEqual(
    getSingleDoorPositionOptions(7).map(option => option.value),
    ['right', 'center-right', 'center-left', 'left']
  );
  assert.deepEqual(
    getSingleDoorPositionOptions(5).map(option => option.value),
    ['right', 'center', 'left']
  );
  assert.deepEqual(
    getSingleDoorPositionOptions(3).map(option => option.value),
    ['right', 'left']
  );
  assert.deepEqual(
    getSingleDoorPositionOptions(9).map(option => option.value),
    ['right', 'center', 'left']
  );

  assert.equal(
    getSingleDoorSelectorClassName(7),
    'type-selector wp-r-type-selector wp-r-single-door-selector wp-r-single-door-7'
  );
  assert.equal(
    getSingleDoorSelectorClassName(5),
    'type-selector wp-r-type-selector wp-r-single-door-selector wp-r-single-door-5'
  );
  assert.equal(
    getSingleDoorSelectorClassName(3),
    'type-selector wp-r-type-selector wp-r-single-door-selector wp-r-single-door-3'
  );
  assert.equal(
    getSingleDoorSelectorClassName(4),
    'type-selector wp-r-type-selector wp-r-single-door-selector'
  );
});
