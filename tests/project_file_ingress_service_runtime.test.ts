import test from 'node:test';
import assert from 'node:assert/strict';

import { handleProjectFileLoadViaService } from '../esm/native/services/api_services_project_surface.ts';

function createNamedBlob(name: string, text = '{}'): Blob & { name: string } {
  const blob = new Blob([text], { type: 'application/json' }) as Blob & { name: string };
  blob.name = name;
  return blob;
}

test('project file service prefers canonical async ingress before legacy runtime handleFileLoad', async () => {
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
          calls.push('legacy');
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

test('project file service falls back to legacy runtime handleFileLoad when canonical ingress is not installed', async () => {
  const file = createNamedBlob('project.json', '{"settings":{}}');
  const calls: string[] = [];
  const App = {
    services: {
      projectIO: {
        handleFileLoad() {
          calls.push('legacy');
          return { ok: true, pending: true };
        },
      },
    },
  } as any;

  const result = await handleProjectFileLoadViaService(App, file);
  assert.deepEqual(result, { ok: true, pending: true });
  assert.deepEqual(calls, ['legacy']);
});

test('project file service preserves legacy runtime handleFileLoad throw messages when canonical ingress is unavailable', async () => {
  const file = createNamedBlob('project.json', '{"settings":{}}');
  const App = {
    services: {
      projectIO: {
        async handleFileLoad() {
          throw new Error('legacy file load exploded');
        },
      },
    },
  } as any;

  const result = await handleProjectFileLoadViaService(App, file);
  assert.deepEqual(result, {
    ok: false,
    reason: 'error',
    message: 'legacy file load exploded',
  });
});
