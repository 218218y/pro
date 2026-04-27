import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ensureEditStateService,
  getEditStateServiceMaybe,
  resetAllEditModesViaService,
} from '../esm/native/runtime/edit_state_access.ts';
import { installEditStateService } from '../esm/native/services/edit_state.ts';

test('edit_state_access creates and reuses the edit-state service surface', () => {
  const App: Record<string, unknown> = {};

  assert.equal(getEditStateServiceMaybe(App), null);

  const service = ensureEditStateService(App);
  assert.ok(service);
  assert.equal(getEditStateServiceMaybe(App), service);

  let resets = 0;
  service.resetAllEditModes = () => {
    resets += 1;
  };

  assert.equal(resetAllEditModesViaService(App), true);
  assert.equal(resets, 1);
});

test('edit_state_access heals a drifted resetAllEditModes slot back to the canonical ref', () => {
  const calls: string[] = [];
  const App: Record<string, unknown> = {
    services: {
      tools: {
        setInteriorManualTool: () => void 0,
        setDrawersOpenId: () => void 0,
      },
      uiNotes: {
        exitScreenDrawMode: () => void 0,
      },
      doors: {
        setOpen: () => void 0,
        releaseEditHold: () => void 0,
        closeDrawerById: () => void 0,
      },
      platform: {
        triggerRender: () => void 0,
      },
    },
    store: {
      getState: () => ({
        ui: {},
        config: {},
        runtime: { globalClickMode: true },
        mode: { primary: 'none' },
        meta: {},
      }),
      setModePatch: () => calls.push('setModePatch'),
    },
  };

  const service = installEditStateService(App as any).editState as Record<string, unknown>;
  const canonicalReset = service.resetAllEditModes;
  assert.equal(typeof canonicalReset, 'function');

  service.resetAllEditModes = () => {
    calls.push('foreign');
  };

  const healedService = getEditStateServiceMaybe(App) as Record<string, unknown>;
  assert.equal(healedService, service);
  assert.equal(healedService.resetAllEditModes, canonicalReset);
  assert.equal(healedService.__wpResetAllEditModes, canonicalReset);

  assert.equal(resetAllEditModesViaService(App), true);
  assert.equal(calls.includes('foreign'), false);
});
