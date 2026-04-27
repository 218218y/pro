import test from 'node:test';
import assert from 'node:assert/strict';

import { runSettingsBackupFlight } from '../esm/native/ui/settings_backup_runtime.ts';
import type { SettingsBackupActionResult } from '../esm/native/ui/settings_backup_contracts.ts';

function delay<T>(value: T, ms = 0): Promise<T> {
  return new Promise(resolve => setTimeout(() => resolve(value), ms));
}

test('settings backup runtime reuses same-key flights and reports busy for other keys', async () => {
  const App = {} as object;
  let runs = 0;

  const flight = runSettingsBackupFlight(App as never, 'export', async () => {
    runs += 1;
    return delay(
      { ok: true, kind: 'export', modelsCount: 0, colorsCount: 0 } as SettingsBackupActionResult,
      10
    );
  });

  const reused = runSettingsBackupFlight(App as never, 'export', async () => {
    runs += 1;
    return { ok: true, kind: 'export', modelsCount: 1, colorsCount: 1 } as SettingsBackupActionResult;
  });

  const busy = await runSettingsBackupFlight(App as never, 'import', async () => {
    runs += 1;
    return { ok: true, kind: 'import', modelsAdded: 1, colorsAdded: 1 } as SettingsBackupActionResult;
  });

  assert.equal(flight, reused);
  assert.equal(runs, 1);
  assert.deepEqual(busy, { ok: false, kind: 'import', reason: 'busy' });
  await flight;
});
