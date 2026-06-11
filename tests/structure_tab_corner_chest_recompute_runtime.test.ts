import test from 'node:test';
import assert from 'node:assert/strict';

import {
  recomputeStructureFromUi,
  STRUCTURE_RECOMPUTE_OPTS,
} from '../esm/native/ui/react/tabs/structure_tab_actions_controller_shared.ts';

test('recomputeStructureFromUi routes corner/chest recompute through canonical structural recompute owner', async () => {
  const calls: Array<{ uiOverride: unknown; meta: unknown; opts: unknown }> = [];
  const app: any = {
    actions: {
      modules: {
        recomputeFromUi(uiOverride: unknown, meta: unknown, opts: unknown) {
          calls.push({ uiOverride, meta, opts });
          return 'ok';
        },
      },
    },
  };

  const patch = { raw: { chestDrawersCount: 3 } };
  const meta = { source: 'react:structure:test', immediate: true };
  recomputeStructureFromUi(app, patch, meta, 'test:line');

  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].uiOverride, patch);
  assert.deepEqual(calls[0].meta, meta);
  assert.deepEqual(calls[0].opts, STRUCTURE_RECOMPUTE_OPTS);
});
