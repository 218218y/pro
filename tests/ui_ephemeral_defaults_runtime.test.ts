import test from 'node:test';
import assert from 'node:assert/strict';

import {
  seedUiEphemeralDefaults,
  isUiEphemeralDefaultsSeeded,
} from '../esm/native/services/ui_ephemeral_defaults.ts';

function createApp(ui: Record<string, unknown>, patchSoft: (patch: unknown, meta?: any) => unknown) {
  return {
    store: {
      getState: () => ({ ui, config: {}, runtime: {}, mode: {}, meta: { version: 0 } }),
    },
    actions: {
      ui: { patchSoft },
    },
  } as any;
}

test('ui ephemeral defaults runtime: seeds only missing UI-only defaults through canonical soft patching', () => {
  const calls: Array<{ patch: any; meta: any }> = [];
  const App = createApp({}, (patch, meta) => {
    calls.push({ patch, meta });
    Object.assign(App.store.getState().ui, patch);
    return true;
  });

  assert.equal(seedUiEphemeralDefaults(App), true);
  assert.equal(calls.length, 5);
  assert.deepEqual(calls[0].patch, {
    currentLayoutType: 'shelves',
    currentGridDivisions: 6,
    currentGridShelfVariant: 'regular',
  });
  assert.equal(calls[0].meta.source, 'boot:uiDefaults:layout');
  assert.equal(calls[0].meta.noBuild, true);
  assert.equal(calls[0].meta.noAutosave, true);
  assert.equal(calls[0].meta.noPersist, true);
  assert.equal(calls[0].meta.noHistory, true);
  assert.equal(calls[0].meta.uiOnly, true);
  assert.equal(isUiEphemeralDefaultsSeeded(App), true);
});

test('ui ephemeral defaults runtime: reports soft patch owner rejection without failing boot', () => {
  const reports: Array<{ err: unknown; ctx: any }> = [];
  const App = {
    store: {
      getState: () => ({
        ui: {
          currentGridDivisions: 6,
          currentGridShelfVariant: 'regular',
          perCellGridMap: {},
          activeGridCellId: null,
          currentExtDrawerType: 'regular',
          currentExtDrawerCount: 1,
          currentCurtainChoice: 'none',
          currentMirrorDraftHeightCm: '',
          currentMirrorDraftWidthCm: '',
        },
        config: {},
        runtime: {},
        mode: {},
        meta: { version: 0 },
      }),
    },
    services: {
      platform: {
        reportError(err: unknown, ctx: unknown) {
          reports.push({ err, ctx });
        },
      },
    },
    actions: {
      ui: {
        patchSoft() {
          throw new Error('ui patch owner rejected');
        },
      },
    },
  } as any;

  assert.equal(seedUiEphemeralDefaults(App), true);
  assert.equal(reports.length, 1);
  assert.equal(reports[0].ctx.where, 'native/services/ui_ephemeral_defaults');
  assert.equal(reports[0].ctx.op, 'patchUiSoft.ownerRejected');
});
