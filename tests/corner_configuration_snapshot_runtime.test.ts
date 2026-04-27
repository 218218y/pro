import test from 'node:test';
import assert from 'node:assert/strict';

import {
  sanitizeCornerConfigurationSnapshot,
  sanitizeLowerCornerConfigurationForPatch,
} from '../esm/native/features/modules_configuration/corner_cells_api.ts';

test('corner snapshot sanitizers detach intDrawersList + customData arrays from source snapshots', () => {
  const source: Record<string, any> = {
    layout: 'drawers',
    intDrawersList: [{ slot: 1, custom: { id: 'top' } }],
    customData: {
      shelves: [true, false],
      rods: [false, true],
      storage: true,
    },
  };

  const sanitized = sanitizeCornerConfigurationSnapshot(source) as Record<string, any>;
  (sanitized.intDrawersList as Record<string, any>[])[0].slot = 9;
  ((sanitized.intDrawersList as Record<string, any>[])[0].custom as Record<string, any>).id = 'mutated-top';
  (sanitized.customData.shelves as boolean[])[0] = false;
  (sanitized.customData.rods as boolean[])[1] = false;

  assert.equal((source.intDrawersList as Record<string, any>[])[0].slot, 1);
  assert.equal(((source.intDrawersList as Record<string, any>[])[0].custom as Record<string, any>).id, 'top');
  assert.equal((source.customData.shelves as boolean[])[0], true);
  assert.equal((source.customData.rods as boolean[])[1], true);
});

test('lower corner sanitizer detaches intDrawersList records from source snapshots', () => {
  const source: Record<string, any> = {
    intDrawersList: [{ slot: 2, payload: { kind: 'bottom' } }],
    modulesConfiguration: [{ layout: 'drawer' }],
  };

  const sanitized = sanitizeLowerCornerConfigurationForPatch(source, source) as Record<string, any>;
  (sanitized.intDrawersList as Record<string, any>[])[0].slot = 7;
  ((sanitized.intDrawersList as Record<string, any>[])[0].payload as Record<string, any>).kind =
    'mutated-bottom';

  assert.equal((source.intDrawersList as Record<string, any>[])[0].slot, 2);
  assert.equal(
    ((source.intDrawersList as Record<string, any>[])[0].payload as Record<string, any>).kind,
    'bottom'
  );
});
