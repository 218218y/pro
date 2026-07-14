import test from 'node:test';
import assert from 'node:assert/strict';

import {
  readSavedColors,
  writeSavedColors,
  writeColorSwatchesOrder,
} from '../esm/native/runtime/maps_access.ts';

test('maps access runtime: saved color collections normalize and dedupe on read/write', async () => {
  const writes: Array<{ type: string; payload: unknown }> = [];
  const App = {
    maps: {
      getSavedColors() {
        return [
          { id: ' c1 ', value: '#fff' },
          { id: 'c1', value: '#000' },
          ' legacy ',
          'legacy',
          { id: ' ', value: '#broken' },
          null,
        ];
      },
      setSavedColors(payload: unknown) {
        writes.push({ type: 'colors', payload });
        return true;
      },
      setColorSwatchesOrder(payload: unknown) {
        writes.push({ type: 'order', payload });
        return true;
      },
    },
  } as any;

  assert.deepEqual(readSavedColors(App), [{ id: 'c1', value: '#fff' }, 'legacy']);

  assert.equal(
    await writeSavedColors(App, [
      { id: ' c2 ', value: '#111' },
      { id: 'c2', value: '#222' },
      ' walnut ',
      'walnut',
      { id: '', value: '#broken' },
    ] as any),
    true
  );

  assert.equal(
    await writeColorSwatchesOrder(App, [' c2 ', 'c2', ' walnut ', 'walnut', '', null] as any),
    true
  );

  assert.deepEqual(writes, [
    { type: 'colors', payload: [{ id: 'c2', value: '#111' }, 'walnut'] },
    { type: 'order', payload: ['c2', 'walnut'] },
  ]);
});

test('maps access runtime propagates an owner false result', async () => {
  const App = {
    maps: {
      setSavedColors() {
        return false;
      },
      setColorSwatchesOrder() {
        return false;
      },
    },
  } as any;

  assert.equal(await writeSavedColors(App, []), false);
  assert.equal(await writeColorSwatchesOrder(App, []), false);
});
