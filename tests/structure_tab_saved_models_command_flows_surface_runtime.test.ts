import test from 'node:test';
import assert from 'node:assert/strict';

import {
  applySavedModel,
  moveSavedModel,
  reorderSavedModelsByDnD,
  saveCurrentModelByName,
  toggleSavedModelLock,
  transferSavedModelByDnD,
} from '../esm/native/ui/react/tabs/structure_tab_saved_models_command_flows.ts';
import { createSavedModelByIdModelsApi } from './structure_tab_saved_models_command_flows_runtime_helpers.ts';

test('saved-model apply/move/reorder/transfer commands expose canonical result details', () => {
  const moves: string[] = [];
  const modelsApi = createSavedModelByIdModelsApi(
    {
      a: { id: 'a', name: 'Alpha', isPreset: false },
      b: { id: 'b', name: 'Beta', isPreset: false },
    },
    {
      apply(id: string) {
        return id === 'a' ? { ok: true } : { ok: false, reason: 'missing' };
      },
      move(id: string, dir: string) {
        moves.push(`${id}:${dir}`);
        return { ok: true };
      },
      transfer(id: string, targetList: string, overId: string | null, pos: string) {
        return { ok: true, id, targetList, overId, pos };
      },
    }
  );

  assert.deepEqual(applySavedModel(modelsApi, 'a'), {
    ok: true,
    kind: 'apply',
    id: 'a',
    name: 'Alpha',
  });
  assert.deepEqual(moveSavedModel(modelsApi, 'a', 'up'), {
    ok: true,
    kind: 'move',
    id: 'a',
    name: 'Alpha',
    dir: 'up',
  });
  assert.deepEqual(reorderSavedModelsByDnD(modelsApi, ['a', 'b'], 'a', 'b', 'after', 'saved'), {
    ok: true,
    kind: 'reorder',
    id: 'a',
    dir: 'down',
    listType: 'saved',
  });
  assert.deepEqual(transferSavedModelByDnD(modelsApi, 'a', 'preset', null, 'end'), {
    ok: true,
    kind: 'transfer',
    id: 'a',
    listType: 'preset',
  });
  assert.deepEqual(moves, ['a:up', 'a:down']);
});

test('saved-model apply command preserves underlying model-load messages', () => {
  const modelsApi = createSavedModelByIdModelsApi(
    { broken: { id: 'broken', name: 'Broken', isPreset: false } },
    {
      apply() {
        return { ok: false, reason: 'error', message: 'snapshot apply failed' };
      },
    }
  );

  assert.deepEqual(applySavedModel(modelsApi, 'broken'), {
    ok: false,
    kind: 'apply',
    reason: 'error',
    message: 'snapshot apply failed',
    id: 'broken',
    name: 'Broken',
  });
});

test('saved-model command flows normalize missing or unknown service reasons to canonical failures', () => {
  const modelsApi = createSavedModelByIdModelsApi(
    { broken: { id: 'broken', name: 'Broken', isPreset: false } },
    {
      apply() {
        return { ok: false };
      },
      saveCurrent() {
        return { ok: false, reason: 'totally-unknown', message: 'save weird failure' };
      },
      overwriteFromCurrent() {
        return { ok: false, reason: 'bogus-overwrite' };
      },
      deleteById() {
        return { ok: false, reason: 'bogus-delete' };
      },
      setLocked(_id: string, locked: boolean) {
        return { ok: false, reason: 'bogus-lock', locked };
      },
      move() {
        return { ok: false, reason: 'bogus-move' };
      },
      transfer() {
        return { ok: false };
      },
    }
  );

  assert.deepEqual(applySavedModel(modelsApi, 'broken'), {
    ok: false,
    kind: 'apply',
    reason: 'error',
    id: 'broken',
    name: 'Broken',
  });
  assert.deepEqual(saveCurrentModelByName(modelsApi, 'Broken 2'), {
    ok: false,
    kind: 'save',
    reason: 'error',
    message: 'save weird failure',
    id: '',
    name: 'Broken 2',
  });
  assert.deepEqual(toggleSavedModelLock(modelsApi, 'broken'), {
    ok: false,
    kind: 'toggle-lock',
    reason: 'error',
    id: 'broken',
    name: 'Broken',
    locked: true,
  });
  assert.deepEqual(moveSavedModel(modelsApi, 'broken', 'down'), {
    ok: false,
    kind: 'move',
    reason: 'error',
    id: 'broken',
    name: 'Broken',
    dir: 'down',
  });
  assert.deepEqual(transferSavedModelByDnD(modelsApi, 'broken', 'saved', null, 'end'), {
    ok: false,
    kind: 'transfer',
    reason: 'error',
    id: 'broken',
    listType: 'saved',
  });
});
