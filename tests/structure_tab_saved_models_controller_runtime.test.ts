import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createSavedModelsCommandController,
  syncSelectedSavedModelId,
} from '../esm/native/ui/react/tabs/structure_tab_saved_models_controller_runtime.ts';

function createFeedbackSpy(promptValue: string | null = null) {
  const toasts: Array<{ message: string; type?: string }> = [];
  return {
    fb: {
      toast(message: string, type?: string) {
        toasts.push({ message, type });
      },
      prompt(_title: string, defaultValue: string, cb: (value: string | null) => void) {
        cb(promptValue === null ? defaultValue : promptValue);
      },
      confirm(_title: string, _message: string, onYes: () => void, _onNo?: (() => void) | null) {
        onYes();
      },
    } as any,
    toasts,
  };
}

test('saved-model selection sync clears stale selected ids and preserves live ones', () => {
  const models = [
    { id: 'preset:1', name: 'מובנה', isPreset: true },
    { id: 'user:1', name: 'שמור', isPreset: false },
  ] as any;

  assert.equal(syncSelectedSavedModelId(models, 'user:1'), 'user:1');
  assert.equal(syncSelectedSavedModelId(models, 'missing'), '');
  assert.equal(syncSelectedSavedModelId(models, ''), '');
});

test('saved-model command controller keeps selection/reporting semantics stable', async () => {
  const seenSelections: string[] = [];
  const { fb, toasts } = createFeedbackSpy();

  const controller = createSavedModelsCommandController({
    fb,
    modelsApi: {
      getById(id: string) {
        if (id === 'm1') return { id: 'm1', name: 'דגם 1', isPreset: false };
        if (id === 'm2') return { id: 'm2', name: 'דגם 2', isPreset: false };
        return null;
      },
      apply(id: string) {
        return id === 'm1' ? { ok: true } : { ok: false, reason: 'missing' };
      },
      saveCurrent(name: string) {
        return { ok: true, id: `new:${name}` };
      },
      overwriteFromCurrent(id: string) {
        return id === 'm2' ? { ok: true } : { ok: false, reason: 'missing' };
      },
      deleteById(id: string) {
        return id === 'm2' ? { ok: true } : { ok: false, reason: 'missing' };
      },
      setLocked(_id: string, locked: boolean) {
        return { ok: true, locked };
      },
      move(id: string, dir: string) {
        return id ? { ok: true, dir } : { ok: false, reason: 'missing' };
      },
    } as any,
    models: [
      { id: 'm1', name: 'דגם 1', isPreset: false },
      { id: 'm2', name: 'דגם 2', isPreset: false },
    ] as any,
    selectedId: 'm2',
    setSelected(id: string) {
      seenSelections.push(id);
    },
  });

  controller.applySelected('m1');
  await controller.saveCurrent();
  await controller.overwriteById('m2');
  controller.toggleLock('m2');
  controller.moveSelected('down');
  await controller.deleteById('m2');

  assert.deepEqual(seenSelections, ['new:דגם 3', '']);
  assert.deepEqual(
    toasts.map(entry => entry.message),
    ['הדגם "דגם 1" נטען בהצלחה', 'נשמר דגם חדש', 'הדגם עודכן', 'הדגם ננעל', 'הדגם הוזז למטה', 'הדגם נמחק']
  );
});

test('saved-model command controller reports missing move selection without mutating selection', () => {
  const { fb, toasts } = createFeedbackSpy();
  const seenSelections: string[] = [];
  const controller = createSavedModelsCommandController({
    fb,
    modelsApi: {} as any,
    models: [],
    selectedId: '',
    setSelected(id: string) {
      seenSelections.push(id);
    },
  });

  controller.moveSelected('up');

  assert.deepEqual(seenSelections, []);
  assert.deepEqual(toasts, [{ message: 'בחר דגם כדי להזיז', type: 'warning' }]);
});
