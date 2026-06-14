import test from 'node:test';
import assert from 'node:assert/strict';

import {
  materializeTopModulesConfigurationFromUiConfig,
  resolveTopModulesStructureFromUiConfig,
} from '../esm/native/features/modules_configuration/modules_config_api.ts';

test('top-module materialization prefers canonical ui.raw doors over stale mirrored ui.doors', () => {
  const list = materializeTopModulesConfigurationFromUiConfig(
    [
      { layout: 'left-only', doors: 1 },
      { layout: 'right-only', doors: 1 },
    ],
    {
      doors: 2,
      raw: { doors: 3 },
      singleDoorPos: 'left',
      structureSelect: '',
    },
    { wardrobeType: 'sliding' }
  );

  assert.equal(list.length, 3);
  assert.deepEqual(
    list.map(entry => entry.doors),
    [1, 1, 1]
  );
  assert.equal(list[0].layout, 'left-only');
  assert.equal(list[1].layout, 'right-only');
  assert.equal(list[2].layout, 'shelves');
});

test('top-module structure resolution prefers canonical ui.raw structure controls over stale mirrored ui fields', () => {
  const structure = resolveTopModulesStructureFromUiConfig(
    {
      doors: 3,
      singleDoorPos: 'left',
      structureSelect: '[1,1,1]',
      raw: {
        doors: 3,
        singleDoorPos: 'right',
        structureSelect: '[2,1]',
      },
    },
    { wardrobeType: 'hinged' }
  );

  assert.deepEqual(
    structure.map(entry => entry.doors),
    [2, 1]
  );
});
