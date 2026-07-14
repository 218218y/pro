import test from 'node:test';
import assert from 'node:assert/strict';

import { installDomainApiColorsSection } from '../esm/native/kernel/domain_api_colors_section.ts';

function installColorsActions(maps: Record<string, unknown>) {
  const config = {
    savedColors: [{ id: 'existing', value: '#111' }],
    colorSwatchesOrder: ['existing'],
  };
  const colorsActions: Record<string, unknown> = {};
  installDomainApiColorsSection({
    App: { maps } as never,
    select: { colors: {} },
    colorsActions,
    configActions: {},
    _cfg: () => config,
    _map: () => ({}),
    _meta: (meta, source) => ({ ...(meta || {}), source }),
  });
  return { colorsActions: colorsActions as any, config };
}

test('domain color replacement never publishes cfg after canonical owner failure', async () => {
  const { colorsActions, config } = installColorsActions({
    setSavedColors: async () => false,
    setColorSwatchesOrder: async () => {
      throw new Error('order persistence rejected');
    },
  });

  await assert.rejects(
    colorsActions.setSavedColors([{ id: 'new', value: '#fff' }]),
    /Canonical App\.maps\.setSavedColors did not confirm the write/
  );
  await assert.rejects(colorsActions.setColorSwatchesOrder(['new']), /order persistence rejected/);
  assert.deepEqual(config, {
    savedColors: [{ id: 'existing', value: '#111' }],
    colorSwatchesOrder: ['existing'],
  });
});

test('domain color replacement distinguishes a missing canonical owner', async () => {
  const { colorsActions, config } = installColorsActions({});

  await assert.rejects(
    colorsActions.setSavedColors([{ id: 'new' }]),
    /requires canonical App\.maps\.setSavedColors/
  );
  assert.deepEqual(config.savedColors, [{ id: 'existing', value: '#111' }]);
});
