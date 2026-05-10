import test from 'node:test';
import assert from 'node:assert/strict';

import { readBackupFileTextSafe } from '../esm/native/ui/settings_backup_import_support.ts';

function createNamedBlob(name: string, text = '{}'): Blob & { name: string } {
  const blob = new Blob([text], { type: 'application/json' }) as Blob & { name: string };
  blob.name = name;
  return blob;
}

test('settings backup import passes the app diagnostics surface to browser file reads', async () => {
  const reports: Array<{ error: unknown; ctx: any }> = [];
  const unreadableFile = createNamedBlob('settings.json', '{"type":"system_backup"}');
  (unreadableFile as any).text = async () => {
    throw new Error('settings blob read rejected');
  };
  const App: any = {
    services: {
      errors: {
        report(error: unknown, ctx?: unknown) {
          reports.push({ error, ctx });
        },
      },
    },
  };

  const result = await readBackupFileTextSafe(App, unreadableFile as File);
  assert.deepEqual(result, {
    ok: false,
    reason: 'read-failed',
    message: 'settings blob read rejected',
  });
  assert.equal(reports.length, 1);
  assert.equal(reports[0].ctx.where, 'native/runtime/browser_file_read');
  assert.equal(reports[0].ctx.op, 'readFileText.blobTextRejected');
  assert.equal(reports[0].ctx.fatal, false);
});
