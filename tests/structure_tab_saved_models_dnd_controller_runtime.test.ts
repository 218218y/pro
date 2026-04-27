import test from 'node:test';
import assert from 'node:assert/strict';

import { createSavedModelsDndController } from '../esm/native/ui/react/tabs/structure_tab_saved_models_dnd_controller_runtime.ts';
import type { SavedModelLike } from '../types';

function createFeedbackSpy() {
  const seen: Array<{ message: string; type?: string }> = [];
  return {
    seen,
    toast(message: string, type?: string) {
      seen.push({ message, type });
    },
    prompt(_title: string, _defaultValue: string, cb: (value: string | null) => void) {
      cb(null);
    },
    confirm(_title: string, _message: string, onYes: () => void, _onNo?: (() => void) | null) {
      onYes();
    },
  };
}

function createModelsApiHarness() {
  const state = {
    saved: ['user:1', 'user:2'],
    preset: ['preset:1', 'preset:2'],
    moves: [] as Array<{ id: string; dir: 'up' | 'down' }>,
    transfers: [] as Array<{
      id: string;
      targetList: 'preset' | 'saved';
      overId: string | null;
      pos: string;
    }>,
  };

  const api = {
    move(id: string, dir: 'up' | 'down') {
      state.moves.push({ id, dir });
      const list = id.startsWith('preset:') ? state.preset : state.saved;
      const index = list.indexOf(id);
      if (index < 0) return { ok: false, reason: 'missing' };
      const nextIndex = dir === 'up' ? index - 1 : index + 1;
      if (nextIndex < 0 || nextIndex >= list.length) return { ok: false, reason: 'edge' };
      list.splice(index, 1);
      list.splice(nextIndex, 0, id);
      return { ok: true };
    },
    transfer(id: string, targetList: 'preset' | 'saved', overId: string | null, pos: string) {
      state.transfers.push({ id, targetList, overId, pos });
      return { ok: true };
    },
  };

  return { state, api };
}

const PRESET_MODELS: SavedModelLike[] = [
  { id: 'preset:1', name: 'מובנה 1', isPreset: true },
  { id: 'preset:2', name: 'מובנה 2', isPreset: true },
];

const SAVED_MODELS: SavedModelLike[] = [
  { id: 'user:1', name: 'שמור 1', isPreset: false },
  { id: 'user:2', name: 'שמור 2', isPreset: false },
];

test('saved models dnd controller opens collapsed lists lazily and resolves dragged id canonically', () => {
  const feedback = createFeedbackSpy();
  const { api } = createModelsApiHarness();
  const opened: string[] = [];
  const controller = createSavedModelsDndController({
    modelsApi: api as never,
    fb: feedback as never,
    presetModels: PRESET_MODELS,
    savedModels: SAVED_MODELS,
    refresh() {},
    draggingListType: '',
    presetModelsOpen: false,
    savedModelsOpen: true,
    setPresetModelsOpen(value) {
      opened.push(`preset:${String(value)}`);
    },
    setSavedModelsOpen(value) {
      opened.push(`saved:${String(value)}`);
    },
  });

  controller.openListIfClosed('preset');
  controller.openListIfClosed('saved');

  assert.deepEqual(opened, ['preset:true']);
  assert.equal(controller.resolveDraggedId('', { getData: () => ' user:2 ' }), 'user:2');
  assert.equal(controller.resolveDraggedId('preset:1', { getData: () => ' user:2 ' }), 'preset:1');
});

test('saved models dnd controller reorders within saved/preset lists and reports through canonical feedback seam', () => {
  const feedback = createFeedbackSpy();
  const { api, state } = createModelsApiHarness();
  const savedController = createSavedModelsDndController({
    modelsApi: api as never,
    fb: feedback as never,
    presetModels: PRESET_MODELS,
    savedModels: SAVED_MODELS,
    refresh() {},
    draggingListType: 'saved',
    presetModelsOpen: true,
    savedModelsOpen: true,
    setPresetModelsOpen() {},
    setSavedModelsOpen() {},
  });
  const presetController = createSavedModelsDndController({
    modelsApi: api as never,
    fb: feedback as never,
    presetModels: PRESET_MODELS,
    savedModels: SAVED_MODELS,
    refresh() {},
    draggingListType: 'preset',
    presetModelsOpen: true,
    savedModelsOpen: true,
    setPresetModelsOpen() {},
    setSavedModelsOpen() {},
  });

  savedController.applyDrop('saved', 'user:1', 'user:2', 'after');
  presetController.applyDrop('preset', 'preset:2', 'preset:1', 'before');

  assert.deepEqual(state.saved, ['user:2', 'user:1']);
  assert.deepEqual(state.preset, ['preset:2', 'preset:1']);
  assert.deepEqual(feedback.seen, [
    { message: 'סדר הדגמים עודכן', type: 'success' },
    { message: 'סדר הדגמים המובנים עודכן', type: 'success' },
  ]);
});

test('saved models dnd controller transfers across lists, refreshes, and reports via canonical seam', () => {
  const feedback = createFeedbackSpy();
  const { api, state } = createModelsApiHarness();
  let refreshCount = 0;
  const controller = createSavedModelsDndController({
    modelsApi: api as never,
    fb: feedback as never,
    presetModels: PRESET_MODELS,
    savedModels: SAVED_MODELS,
    refresh() {
      refreshCount += 1;
    },
    draggingListType: 'saved',
    presetModelsOpen: true,
    savedModelsOpen: true,
    setPresetModelsOpen() {},
    setSavedModelsOpen() {},
  });

  controller.applyDrop('preset', 'user:2', 'preset:1', 'before');

  assert.equal(refreshCount, 1);
  assert.deepEqual(state.transfers, [
    { id: 'user:2', targetList: 'preset', overId: 'preset:1', pos: 'before' },
  ]);
  assert.deepEqual(feedback.seen, [{ message: 'הדגם הועבר', type: 'success' }]);
});
