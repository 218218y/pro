import test from 'node:test';
import assert from 'node:assert/strict';

import { getCommandsServiceMaybe } from '../esm/native/runtime/commands_access.ts';
import { installBootFinalizers } from '../esm/native/services/boot_finalizers.ts';

test('commands access heals drifted command methods back to canonical refs', () => {
  const App: Record<string, unknown> = {
    services: Object.create(null),
    platform: {
      util: {
        cleanGroup: (group: unknown) => group,
      },
    },
    render: {},
    store: {
      getState: () => ({ ui: { raw: {} } }),
    },
  };

  const service = installBootFinalizers(App as any) as Record<string, unknown>;
  const canonicalRebuild = service.rebuildWardrobe;
  const canonicalDebounced = service.rebuildWardrobeDebounced;
  const canonicalCleanGroup = service.cleanGroup;

  assert.equal(typeof canonicalRebuild, 'function');
  assert.equal(typeof canonicalDebounced, 'function');
  assert.equal(typeof canonicalCleanGroup, 'function');

  service.rebuildWardrobe = () => 'foreign-rebuild';
  service.rebuildWardrobeDebounced = () => 'foreign-debounced';
  service.cleanGroup = () => 'foreign-clean';

  const healed = getCommandsServiceMaybe(App) as Record<string, unknown>;
  assert.equal(healed, service);
  assert.equal(healed.rebuildWardrobe, canonicalRebuild);
  assert.equal(healed.rebuildWardrobeDebounced, canonicalDebounced);
  assert.equal(healed.cleanGroup, canonicalCleanGroup);
});
