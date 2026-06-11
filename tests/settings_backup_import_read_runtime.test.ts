import test from 'node:test';
import assert from 'node:assert/strict';

import { importSystemSettings } from '../esm/native/ui/settings_backup.ts';
import { createImportApp, installFakeFilePrimitives } from './settings_backup_import_runtime_helpers.ts';

test('importSystemSettings returns cancelled when no file was provided and clears the input value', async () => {
  const { app } = createImportApp();
  const input = { value: 'stale.json', files: [] as Blob[] };
  const result = await importSystemSettings(app as never, { currentTarget: input });
  assert.deepEqual(result, { ok: false, kind: 'import', reason: 'cancelled' });
  assert.equal(input.value, '');
});

test('importSystemSettings returns cancelled when the user declines the restore confirmation', async () => {
  const env = installFakeFilePrimitives();
  try {
    const { app, confirmed } = createImportApp({ confirm: false });
    const file = new env.FakeFile(
      [JSON.stringify({ type: 'system_backup', timestamp: Date.now() })],
      'backup.json',
      { type: 'application/json' }
    );
    const input = { value: 'backup.json', files: [file] };
    const result = await importSystemSettings(app as never, { currentTarget: input });
    assert.deepEqual(result, { ok: false, kind: 'import', reason: 'cancelled' });
    assert.equal(input.value, '');
    assert.equal(confirmed.length, 1);
  } finally {
    env.restore();
  }
});

test('importSystemSettings reports invalid-json with a preserved parse message for unreadable JSON payloads', async () => {
  const env = installFakeFilePrimitives();
  try {
    const { app } = createImportApp();
    const file = new env.FakeFile(['{not-json'], 'backup.json', { type: 'application/json' });
    const input = { value: 'backup.json', files: [file] };
    const result = await importSystemSettings(app as never, { currentTarget: input });
    assert.equal(result.ok, false);
    assert.equal(result.kind, 'import');
    if (result.ok) throw new Error('expected invalid-json failure result');
    assert.equal(result.reason, 'invalid-json');
    assert.equal(typeof result.message, 'string');
    assert.notEqual(result.message?.trim(), '');
    assert.equal(input.value, '');
  } finally {
    env.restore();
  }
});

test('importSystemSettings accepts BOM-prefixed settings backup JSON payloads', async () => {
  const env = installFakeFilePrimitives();
  try {
    const { app } = createImportApp();
    const payload =
      '\uFEFF' +
      JSON.stringify({
        type: 'system_backup',
        timestamp: Date.now(),
        savedColors: [{ id: 'c1', value: '#fff' }],
      });
    const file = new env.FakeFile([payload], 'backup.json', { type: 'application/json' });
    const input = { value: 'backup.json', files: [file] };
    const result = await importSystemSettings(app as never, { currentTarget: input });
    assert.deepEqual(result, { ok: true, kind: 'import', modelsAdded: 0, colorsAdded: 1 });
    assert.equal(input.value, '');
  } finally {
    env.restore();
  }
});

test('importSystemSettings reports invalid-backup for JSON that is not a settings backup payload', async () => {
  const env = installFakeFilePrimitives();
  try {
    const { app } = createImportApp();
    const file = new env.FakeFile([JSON.stringify({ foo: 'bar' })], 'backup.json', {
      type: 'application/json',
    });
    const input = { value: 'backup.json', files: [file] };
    const result = await importSystemSettings(app as never, { currentTarget: input });
    assert.deepEqual(result, { ok: false, kind: 'import', reason: 'invalid-backup' });
    assert.equal(input.value, '');
  } finally {
    env.restore();
  }
});

test('importSystemSettings reports read-failed when browser file read fails', async () => {
  const env = installFakeFilePrimitives('read-error');
  try {
    const { app } = createImportApp();
    const file = new env.FakeFile(
      [JSON.stringify({ type: 'system_backup', timestamp: Date.now() })],
      'backup.json',
      { type: 'application/json' }
    );
    (file as File & { text?: () => Promise<string> }).text = async () => {
      throw new Error('[WardrobePro] Failed reading settings backup file.');
    };
    const result = await importSystemSettings(app as never, {
      currentTarget: { value: 'backup.json', files: [file] },
    });
    assert.deepEqual(result, {
      ok: false,
      kind: 'import',
      reason: 'read-failed',
      message: '[WardrobePro] Failed reading settings backup file.',
    });
  } finally {
    env.restore();
  }
});

test('importSystemSettings preserves confirm-surface failures instead of flattening them to cancelled', async () => {
  const env = installFakeFilePrimitives();
  try {
    const { app } = createImportApp();
    app.services.uiFeedback.confirm = () => {
      throw new Error('confirm exploded');
    };
    const file = new env.FakeFile(
      [JSON.stringify({ type: 'system_backup', timestamp: Date.now() })],
      'backup.json',
      { type: 'application/json' }
    );
    const input = { value: 'backup.json', files: [file] };
    const result = await importSystemSettings(app as never, { currentTarget: input });
    assert.deepEqual(result, { ok: false, kind: 'import', reason: 'error', message: 'confirm exploded' });
    assert.equal(input.value, '');
  } finally {
    env.restore();
  }
});
