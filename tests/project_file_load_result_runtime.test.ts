import test from 'node:test';
import assert from 'node:assert/strict';

import { loadProjectFileInput, readProjectFileText } from '../esm/native/io/project_file_ingress_command.ts';

function createNamedBlob(name: string, text = '{}'): Blob & { name: string } {
  const blob = new Blob([text], { type: 'application/json' }) as Blob & { name: string };
  blob.name = name;
  return blob;
}

test('project file ingress reads blob text through the canonical async helper', async () => {
  const file = createNamedBlob('project.json', '{"settings":{}}');
  assert.equal(await readProjectFileText(file), '{"settings":{}}');
});

test('project file ingress returns actual ProjectIO load results and clears legacy input state', async () => {
  const file = createNamedBlob('project.json', '{"settings":{}}');
  const target = { files: [file], value: 'C:/fake/project.json' };
  const calls: Array<{ data: unknown; opts?: unknown }> = [];
  const App = {
    services: {
      projectIO: {
        loadProjectData(data: unknown, opts?: unknown) {
          calls.push({ data, opts });
          return { ok: true, restoreGen: 7 };
        },
      },
    },
  } as any;

  const result = await loadProjectFileInput(App, { target } as never);
  assert.deepEqual(result, { ok: true, restoreGen: 7 });
  assert.deepEqual(calls, [
    { data: { settings: {} }, opts: { toast: false, meta: { source: 'load.file' } } },
  ]);
  assert.equal(target.value, '');
});

test('project file ingress reports invalid JSON and missing install without pretending load succeeded', async () => {
  const invalidFile = createNamedBlob('broken.json', '{');
  assert.deepEqual(await loadProjectFileInput({} as any, invalidFile), { ok: false, reason: 'invalid' });

  const validFile = createNamedBlob('ok.json', '{"settings":{}}');
  assert.deepEqual(await loadProjectFileInput({} as any, validFile), { ok: false, reason: 'not-installed' });
});

test('project file ingress preserves read/load failure causes instead of flattening them', async () => {
  const unreadableFile = createNamedBlob('broken.json', '{"settings":{}}');
  (unreadableFile as any).text = async () => {
    throw new Error('disk read failed');
  };
  const readResult = await loadProjectFileInput({} as any, unreadableFile);
  assert.deepEqual(readResult, { ok: false, reason: 'error', message: 'disk read failed' });

  const file = createNamedBlob('project.json', '{"settings":{}}');
  const target = { files: [file], value: 'C:/fake/project.json' };
  const App = {
    services: {
      errors: {
        report() {
          return undefined;
        },
      },
      projectIO: {
        loadProjectData() {
          throw new Error('project loader exploded');
        },
      },
    },
  } as any;

  const result = await loadProjectFileInput(App, { target } as never);
  assert.deepEqual(result, { ok: false, reason: 'error', message: 'project loader exploded' });
  assert.equal(target.value, '');
});

test('project file ingress reports browser read failures through app diagnostics', async () => {
  const reports: Array<{ error: unknown; ctx: any }> = [];
  const unreadableFile = createNamedBlob('broken.json', '{"settings":{}}');
  (unreadableFile as any).text = async () => {
    throw new Error('project blob read rejected');
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

  const result = await loadProjectFileInput(App, unreadableFile);
  assert.deepEqual(result, { ok: false, reason: 'error', message: 'project blob read rejected' });
  assert.equal(reports.length, 1);
  assert.equal(reports[0].ctx.where, 'native/runtime/browser_file_read');
  assert.equal(reports[0].ctx.op, 'readFileText.blobTextRejected');
  assert.equal(reports[0].ctx.fatal, false);
});
