import test from 'node:test';
import assert from 'node:assert/strict';

import {
  deleteSavedModel,
  overwriteSavedModel,
  runDeleteSavedModelFlow,
  runOverwriteSavedModelFlow,
} from '../esm/native/ui/react/tabs/structure_tab_saved_models_command_flows.ts';
import { createSavedModelByIdModelsApi } from './structure_tab_saved_models_command_flows_runtime_helpers.ts';

test('saved-model overwrite/delete confirm flows report cancelled explicitly', async () => {
  const modelsApi = createSavedModelByIdModelsApi(
    { x: { id: 'x', name: 'מיוחד', isPreset: false } },
    {
      overwriteFromCurrent() {
        throw new Error('overwrite should not run after cancel');
      },
      deleteById() {
        throw new Error('delete should not run after cancel');
      },
    }
  );

  const overwrite = await runOverwriteSavedModelFlow({
    fb: {
      confirm(_title: string, _message: string, _onYes: () => void, onNo?: (() => void) | null) {
        if (onNo) onNo();
      },
    } as any,
    modelsApi,
    id: 'x',
  });
  const deletion = await runDeleteSavedModelFlow({
    fb: {
      confirm(_title: string, _message: string, _onYes: () => void, onNo?: (() => void) | null) {
        if (onNo) onNo();
      },
    } as any,
    modelsApi,
    id: 'x',
  });

  assert.deepEqual(overwrite, {
    ok: false,
    kind: 'overwrite',
    reason: 'cancelled',
    id: 'x',
    name: 'מיוחד',
  });
  assert.deepEqual(deletion, {
    ok: false,
    kind: 'delete',
    reason: 'cancelled',
    id: 'x',
    name: 'מיוחד',
  });
});

test('saved-model confirm-backed flows preserve confirm-surface failures with messages', async () => {
  const modelsApi = createSavedModelByIdModelsApi(
    { x: { id: 'x', name: 'מיוחד', isPreset: false } },
    {
      overwriteFromCurrent() {
        throw new Error('overwrite should not run after confirm failure');
      },
      deleteById() {
        throw new Error('delete should not run after confirm failure');
      },
    }
  );

  const overwrite = await runOverwriteSavedModelFlow({
    fb: {
      confirm() {
        throw new Error('confirm exploded');
      },
    } as any,
    modelsApi,
    id: 'x',
  });
  const deletion = await runDeleteSavedModelFlow({
    fb: {
      confirm() {
        throw new Error('confirm exploded');
      },
    } as any,
    modelsApi,
    id: 'x',
  });

  assert.deepEqual(overwrite, {
    ok: false,
    kind: 'overwrite',
    reason: 'error',
    message: 'confirm exploded',
    id: 'x',
    name: 'מיוחד',
  });
  assert.deepEqual(deletion, {
    ok: false,
    kind: 'delete',
    reason: 'error',
    message: 'confirm exploded',
    id: 'x',
    name: 'מיוחד',
  });
});

test('saved-model overwrite/delete commands normalize unknown service reasons to canonical failures', () => {
  const modelsApi = createSavedModelByIdModelsApi(
    { broken: { id: 'broken', name: 'Broken', isPreset: false } },
    {
      overwriteFromCurrent() {
        return { ok: false, reason: 'bogus-overwrite' };
      },
      deleteById() {
        return { ok: false, reason: 'bogus-delete' };
      },
    }
  );

  assert.deepEqual(overwriteSavedModel(modelsApi, 'broken'), {
    ok: false,
    kind: 'overwrite',
    reason: 'error',
    id: 'broken',
    name: 'Broken',
  });
  assert.deepEqual(deleteSavedModel(modelsApi, 'broken'), {
    ok: false,
    kind: 'delete',
    reason: 'error',
    id: 'broken',
    name: 'Broken',
  });
});
