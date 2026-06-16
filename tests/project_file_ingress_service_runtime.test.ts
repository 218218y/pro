import test from 'node:test';
import assert from 'node:assert/strict';

import { handleProjectFileLoadViaService } from '../esm/native/services/api_services_project_surface.ts';

function createNamedBlob(name: string, text = '{}'): Blob & { name: string } {
  const blob = new Blob([text], { type: 'application/json' }) as Blob & { name: string };
  blob.name = name;
  return blob;
}

test('project file service uses the canonical async ingress and loadProjectData service seam', async () => {
  const file = createNamedBlob('project.json', '{"settings":{}}');
  const calls: string[] = [];
  const App = {
    services: {
      projectIO: {
        loadProjectData(data: unknown, opts?: unknown) {
          calls.push(`canonical:${JSON.stringify({ data, opts })}`);
          return { ok: true, restoreGen: 11 };
        },
        handleFileLoad() {
          calls.push('raw-file-handler');
          return { ok: true, pending: true };
        },
      },
    },
  } as any;

  const result = await handleProjectFileLoadViaService(App, file);
  assert.deepEqual(result, { ok: true, restoreGen: 11 });
  assert.equal(calls.length, 1);
  assert.match(calls[0], /"toast":false/);
  assert.match(calls[0], /"source":"load\.file"/);
});

test('project file service does not fall back to raw handleFileLoad when canonical loadProjectData is missing', async () => {
  const file = createNamedBlob('project.json', '{"settings":{}}');
  const calls: string[] = [];
  const App = {
    services: {
      projectIO: {
        handleFileLoad() {
          calls.push('raw-file-handler');
          return { ok: true, pending: true };
        },
      },
    },
  } as any;

  const result = await handleProjectFileLoadViaService(App, file);
  assert.deepEqual(result, { ok: false, reason: 'not-installed' });
  assert.deepEqual(calls, []);
});

test('project file service reports canonical file parse/read failures before service dispatch', async () => {
  const invalidJsonFile = createNamedBlob('project.json', '{bad-json');
  const calls: string[] = [];
  const App = {
    services: {
      projectIO: {
        loadProjectData() {
          calls.push('canonical');
          return { ok: true };
        },
        handleFileLoad() {
          calls.push('raw-file-handler');
          return { ok: true, pending: true };
        },
      },
    },
  } as any;

  const result = await handleProjectFileLoadViaService(App, invalidJsonFile);
  assert.deepEqual(result, { ok: false, reason: 'invalid' });
  assert.deepEqual(calls, []);
});
