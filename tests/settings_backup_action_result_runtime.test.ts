import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildSettingsBackupActionErrorResult,
  buildSettingsBackupExportSuccessResult,
  buildSettingsBackupImportFailureResult,
  buildSettingsBackupImportSuccessResult,
  normalizeSettingsBackupActionResult,
} from '../esm/native/ui/settings_backup_action_result.ts';

test('settings backup action results sanitize counts and normalize failure aliases', () => {
  assert.deepEqual(buildSettingsBackupExportSuccessResult('3.8', -1), {
    ok: true,
    kind: 'export',
    modelsCount: 3,
    colorsCount: 0,
  });
  assert.deepEqual(buildSettingsBackupImportSuccessResult('2', '5.4'), {
    ok: true,
    kind: 'import',
    modelsAdded: 2,
    colorsAdded: 5,
  });
  assert.deepEqual(buildSettingsBackupImportFailureResult('read_failed', ' file exploded '), {
    ok: false,
    kind: 'import',
    reason: 'read-failed',
    message: 'file exploded',
  });
  assert.deepEqual(
    normalizeSettingsBackupActionResult({ ok: false, kind: 'import', reason: 'invalid_backup' }, 'import'),
    {
      ok: false,
      kind: 'import',
      reason: 'invalid-backup',
    }
  );
  assert.deepEqual(
    normalizeSettingsBackupActionResult({ ok: false, kind: 'export', reason: 'busy' }, 'export'),
    {
      ok: false,
      kind: 'export',
      reason: 'busy',
    }
  );
});

test('settings backup action errors preserve string and record messages', () => {
  assert.deepEqual(
    buildSettingsBackupActionErrorResult('export', 'browser download unavailable', 'fallback'),
    {
      ok: false,
      kind: 'export',
      reason: 'error',
      message: 'browser download unavailable',
    }
  );
  assert.deepEqual(
    buildSettingsBackupActionErrorResult('import', { message: 'import exploded' }, 'fallback'),
    {
      ok: false,
      kind: 'import',
      reason: 'error',
      message: 'import exploded',
    }
  );
});
