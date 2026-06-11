import test from 'node:test';
import assert from 'node:assert/strict';

import {
  deleteTemporaryColorsWithConfirm,
  deleteTemporaryModelsWithConfirm,
  syncSketchNowCommand,
} from '../esm/native/ui/cloud_sync_mutation_commands.ts';

test('cloud sync mutation commands await confirm-backed cleanup flows and preserve canonical results', async () => {
  const seen: string[] = [];
  const App = {
    services: {
      uiFeedback: {
        confirm(_title: string, _message: string, onYes: () => void) {
          seen.push('confirm:models');
          onYes();
        },
      },
      cloudSync: {
        panelApi: {
          syncSketchNow() {
            return Promise.resolve({ ok: true, changed: true, hash: 'h1' });
          },
          deleteTemporaryModels() {
            seen.push('delete:models');
            return Promise.resolve({ ok: true, removed: 3 });
          },
        },
      },
    },
  } as any;

  assert.deepEqual(await syncSketchNowCommand(App), { ok: true, changed: true, hash: 'h1' });
  assert.deepEqual(await deleteTemporaryModelsWithConfirm(App), { ok: true, removed: 3 });
  assert.deepEqual(seen, ['confirm:models', 'delete:models']);
});

test('cloud sync mutation cleanup commands return cancelled when confirm is declined', async () => {
  const App = {
    services: {
      uiFeedback: {
        confirm(_title: string, _message: string, _onYes: () => void, onNo?: (() => void) | null) {
          onNo?.();
        },
      },
      cloudSync: {
        panelApi: {
          deleteTemporaryColors() {
            throw new Error('should not run after cancel');
          },
        },
      },
    },
  } as any;

  assert.deepEqual(await deleteTemporaryColorsWithConfirm(App), {
    ok: false,
    removed: 0,
    reason: 'cancelled',
  });
});

test('cloud sync mutation cleanup commands preserve confirm failures instead of flattening them to cancel', async () => {
  let deleteCalls = 0;
  const App = {
    services: {
      uiFeedback: {
        confirm() {
          throw new Error('confirm unavailable');
        },
      },
      cloudSync: {
        panelApi: {
          deleteTemporaryModels() {
            deleteCalls += 1;
            return Promise.resolve({ ok: true, removed: 1 });
          },
        },
      },
    },
  } as any;

  assert.deepEqual(await deleteTemporaryModelsWithConfirm(App), {
    ok: false,
    removed: 0,
    reason: 'error',
    message: 'confirm unavailable',
  });
  assert.equal(deleteCalls, 0);
});
