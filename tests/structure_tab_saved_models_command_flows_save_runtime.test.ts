import test from 'node:test';
import assert from 'node:assert/strict';

import { runSaveCurrentModelFlow } from '../esm/native/ui/react/tabs/structure_tab_saved_models_command_flows.ts';
import {
  createConfirmFeedback,
  createPromptFeedback,
  createSavedModelByIdModelsApi,
} from './structure_tab_saved_models_command_flows_runtime_helpers.ts';

test('saved-model save flow upgrades duplicate name into overwrite after confirm', async () => {
  let overwriteId = '';
  let saveName = '';
  const modelsApi = createSavedModelByIdModelsApi(
    { m1: { id: 'm1', name: 'דגם 1', isPreset: false } },
    {
      saveCurrent(name: string) {
        saveName = name;
        return { ok: true, id: `new:${name}` };
      },
      overwriteFromCurrent(id: string) {
        overwriteId = id;
        return { ok: true };
      },
    }
  );

  const promptFb = createPromptFeedback('דגם 1');
  const confirmFb = createConfirmFeedback();
  const result = await runSaveCurrentModelFlow({
    fb: {
      prompt: promptFb.prompt,
      confirm: confirmFb.confirm,
    } as any,
    modelsApi,
    models: [{ id: 'm1', name: 'דגם 1', isPreset: false }] as any,
  });

  assert.equal(saveName, '');
  assert.equal(overwriteId, 'm1');
  assert.deepEqual(result, {
    ok: true,
    kind: 'overwrite',
    id: 'm1',
    name: 'דגם 1',
  });
});

test('saved-model save flow blocks overwrite when duplicate model is locked', async () => {
  const result = await runSaveCurrentModelFlow({
    fb: {
      ...createPromptFeedback('דגם 7'),
      confirm() {
        throw new Error('confirm should not run for locked duplicate');
      },
    },
    modelsApi: {
      saveCurrent() {
        throw new Error('saveCurrent should not run for locked duplicate');
      },
    } as any,
    models: [{ id: 'm7', name: 'דגם 7', isPreset: false, locked: true }] as any,
  });

  assert.deepEqual(result, {
    ok: false,
    kind: 'save',
    reason: 'duplicate-locked',
    id: 'm7',
    name: 'דגם 7',
  });
});

test('saved-model save flow preserves prompt-surface failures with message', async () => {
  const result = await runSaveCurrentModelFlow({
    fb: {
      prompt() {
        throw new Error('prompt exploded');
      },
      confirm() {
        throw new Error('confirm should not run after prompt failure');
      },
    } as any,
    modelsApi: {
      saveCurrent() {
        throw new Error('saveCurrent should not run after prompt failure');
      },
    } as any,
    models: [],
  });

  assert.deepEqual(result, {
    ok: false,
    kind: 'save',
    reason: 'error',
    message: 'prompt exploded',
  });
});
