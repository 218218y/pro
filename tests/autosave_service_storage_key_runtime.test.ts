import test from 'node:test';
import assert from 'node:assert/strict';

import { commitAutosaveNow, installAutosaveService } from '../esm/native/services/autosave.ts';

function createApp() {
  const writes: Array<{ key: string; value: string }> = [];
  const App = {
    services: {
      storage: {
        KEYS: { AUTOSAVE_LATEST: 'autosave-custom-key' },
        setString(key: string, value: string) {
          writes.push({ key, value });
          return true;
        },
      },
      project: {
        capture() {
          return { settings: { width: 90 } };
        },
      },
    },
    store: {
      getState() {
        return {
          ui: { orderPdfEditorDraft: { pages: [{ id: 1 }] } },
          config: {},
          runtime: { systemReady: true, restoring: false },
          mode: {},
          meta: {},
        };
      },
    },
  } as any;

  return { App, writes };
}

test('autosave service writes through canonical AUTOSAVE_LATEST storage key seam', () => {
  const { App, writes } = createApp();
  installAutosaveService(App);

  assert.equal(commitAutosaveNow(App), true);
  assert.equal(writes.length, 1);
  assert.equal(writes[0].key, 'autosave-custom-key');
  const parsed = JSON.parse(writes[0].value);
  assert.deepEqual(parsed.orderPdfEditorDraft, { pages: [{ id: 1 }] });
  assert.equal(parsed.version, '2.1');
});
