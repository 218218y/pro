import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createCornerCurtainReader,
  createCornerGrooveReader,
} from '../esm/native/builder/corner_config_readers.ts';
import { readMirrorLayoutListForPart } from '../esm/native/features/mirror_layout.ts';
import { readPartColorEntry } from '../esm/native/builder/materials_apply_color_policy.ts';

test('corner door visual readers inherit full-door state after corner doors are split', () => {
  const cfg = {
    curtainMap: {
      corner_door_1_full: 'linen',
      lower_corner_door_1_full: 'white',
    },
    groovesMap: {
      groove_corner_door_1_full: true,
      groove_lower_corner_door_1_full: true,
    },
  };

  const readCurtain = createCornerCurtainReader(cfg);
  const readGroove = createCornerGrooveReader(cfg);

  assert.equal(readCurtain('corner_door_1_top'), 'linen');
  assert.equal(readCurtain('corner_door_1_bot'), 'linen');
  assert.equal(readCurtain('lower_corner_door_1_top'), 'white');
  assert.equal(readGroove('corner_door_1_top'), true);
  assert.equal(readGroove('corner_door_1_bot'), true);
  assert.equal(readGroove('lower_corner_door_1_bot'), true);
});

test('corner mirror layout lookup inherits the matching full-door key without leaking unscoped upper-stack layouts', () => {
  const topLayout = [{ faceSign: 1 as const }];
  const bottomLayout = [{ faceSign: -1 as const }];
  const map = {
    corner_door_1_full: topLayout,
    lower_corner_door_1_full: bottomLayout,
  };

  assert.deepEqual(readMirrorLayoutListForPart({ map, partId: 'corner_door_1_bot' }), topLayout);
  assert.deepEqual(
    readMirrorLayoutListForPart({
      map,
      partId: 'corner_door_1_bot',
      scopedPartId: 'lower_corner_door_1_bot',
      preferScopedOnly: true,
    }),
    bottomLayout
  );
  assert.deepEqual(
    readMirrorLayoutListForPart({
      map: { corner_door_1_full: topLayout },
      partId: 'corner_door_1_bot',
      scopedPartId: 'lower_corner_door_1_bot',
      preferScopedOnly: true,
    }),
    []
  );
});

test('corner split segment material refresh inherits full-door color by stack scope', () => {
  const colors = {
    corner_door_1_full: 'oak',
    lower_corner_door_1_full: 'walnut',
  };

  assert.equal(
    readPartColorEntry({
      individualColors: colors,
      isMulti: true,
      partId: 'corner_door_1_top',
      stackKey: 'top',
    }),
    'oak'
  );
  assert.equal(
    readPartColorEntry({
      individualColors: colors,
      isMulti: true,
      partId: 'corner_door_1_top',
      stackKey: 'bottom',
    }),
    'walnut'
  );
  assert.equal(
    readPartColorEntry({
      individualColors: { corner_door_1_full: 'oak' },
      isMulti: true,
      partId: 'corner_door_1_top',
      stackKey: 'bottom',
    }),
    undefined
  );
});
