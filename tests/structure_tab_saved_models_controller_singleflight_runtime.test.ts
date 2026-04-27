import test from 'node:test';
import assert from 'node:assert/strict';

import { createSavedModelsCommandController } from '../esm/native/ui/react/tabs/structure_tab_saved_models_controller_runtime.ts';

test('saved-model mutation controller reuses pending saveCurrent flow and reports once', async () => {
  const toasts: Array<{ message: string; type?: string }> = [];
  const promptCallbacks: Array<(value: string | null) => void> = [];
  const seenSelections: string[] = [];
  let saveCalls = 0;

  const controller = createSavedModelsCommandController({
    fb: {
      toast(message: string, type?: string) {
        toasts.push({ message, type });
      },
      prompt(_title: string, _defaultValue: string, cb: (value: string | null) => void) {
        promptCallbacks.push(cb);
      },
      confirm() {
        throw new Error('confirm should not run for saveCurrent');
      },
    } as any,
    modelsApi: {
      saveCurrent(name: string) {
        saveCalls += 1;
        assert.equal(name, 'דגם זריז');
        return { ok: true, id: 'm:new' };
      },
    } as any,
    models: [] as any,
    selectedId: '',
    setSelected(id: string) {
      seenSelections.push(id);
    },
  });

  const first = controller.saveCurrent();
  const second = controller.saveCurrent();
  assert.equal(first, second);
  assert.equal(promptCallbacks.length, 1);
  assert.equal(saveCalls, 0);

  promptCallbacks[0]('דגם זריז');
  await Promise.all([first, second]);

  assert.equal(saveCalls, 1);
  assert.deepEqual(seenSelections, ['m:new']);
  assert.deepEqual(toasts, [{ message: 'נשמר דגם חדש', type: 'success' }]);
});

test('saved-model mutation controller reuses duplicate target flows and reports busy for conflicting mutations', async () => {
  const toasts: Array<{ message: string; type?: string }> = [];
  const confirmCalls: Array<{ id: string; onYes: () => void }> = [];
  const overwriteCalls: string[] = [];
  const deleteCalls: string[] = [];

  const controller = createSavedModelsCommandController({
    fb: {
      toast(message: string, type?: string) {
        toasts.push({ message, type });
      },
      prompt() {
        throw new Error('prompt should not run for overwrite/delete');
      },
      confirm(_title: string, _message: string, onYes: () => void) {
        const nextId = confirmCalls.length === 0 ? 'a' : confirmCalls.length === 1 ? 'b' : 'delete:a';
        confirmCalls.push({ id: nextId, onYes });
      },
    } as any,
    modelsApi: {
      getById(id: string) {
        return { id, name: id.toUpperCase(), isPreset: false };
      },
      overwriteFromCurrent(id: string) {
        overwriteCalls.push(id);
        return { ok: true };
      },
      deleteById(id: string) {
        deleteCalls.push(id);
        return { ok: true };
      },
    } as any,
    models: [
      { id: 'a', name: 'A', isPreset: false },
      { id: 'b', name: 'B', isPreset: false },
    ] as any,
    selectedId: 'a',
    setSelected() {},
  });

  const overwrite1 = controller.overwriteById('a');
  const overwrite2 = controller.overwriteById('a');
  const overwriteBusy = controller.overwriteById('b');
  assert.equal(overwrite1, overwrite2);
  assert.notEqual(overwrite1, overwriteBusy);
  assert.equal(confirmCalls.length, 1);

  await overwriteBusy;
  assert.deepEqual(overwriteCalls, []);
  assert.deepEqual(
    toasts.map(entry => entry.message),
    ['פעולת דגמים אחרת כבר מתבצעת כרגע']
  );

  confirmCalls[0].onYes();
  await Promise.all([overwrite1, overwrite2]);
  assert.deepEqual(overwriteCalls, ['a']);

  const delete1 = controller.deleteById('a');
  const delete2 = controller.deleteById('a');
  const saveBusy = controller.saveCurrent();
  assert.equal(delete1, delete2);
  assert.equal(confirmCalls.length, 2);

  await saveBusy;
  assert.deepEqual(
    toasts.map(entry => entry.message),
    ['פעולת דגמים אחרת כבר מתבצעת כרגע', 'הדגם עודכן', 'פעולת דגמים אחרת כבר מתבצעת כרגע']
  );

  confirmCalls[1].onYes();
  await Promise.all([delete1, delete2]);
  assert.deepEqual(deleteCalls, ['a']);

  assert.deepEqual(
    toasts.map(entry => entry.message),
    ['פעולת דגמים אחרת כבר מתבצעת כרגע', 'הדגם עודכן', 'פעולת דגמים אחרת כבר מתבצעת כרגע', 'הדגם נמחק']
  );
});

test('saved-model mutation controller closes the synchronous re-entry hole before prompt dispatch', async () => {
  const toasts: Array<{ message: string; type?: string }> = [];
  const promptCalls: string[] = [];
  const saveCalls: string[] = [];
  let nestedPromise: Promise<unknown> | null = null;
  let controller: ReturnType<typeof createSavedModelsCommandController>;

  controller = createSavedModelsCommandController({
    fb: {
      toast(message: string, type?: string) {
        toasts.push({ message, type });
      },
      prompt(_title: string, _defaultValue: string, cb: (value: string | null) => void) {
        promptCalls.push('prompt');
        if (!nestedPromise) nestedPromise = controller.saveCurrent();
        cb('דגם סינכרוני');
      },
      confirm() {
        throw new Error('confirm should not run for saveCurrent');
      },
    } as any,
    modelsApi: {
      saveCurrent(name: string) {
        saveCalls.push(name);
        return { ok: true, id: 'sync:new' };
      },
    } as any,
    models: [] as any,
    selectedId: '',
    setSelected() {},
  });

  const first = controller.saveCurrent();
  await first;
  await nestedPromise;

  assert.deepEqual(promptCalls, ['prompt']);
  assert.deepEqual(saveCalls, ['דגם סינכרוני']);
  assert.deepEqual(toasts, [{ message: 'נשמר דגם חדש', type: 'success' }]);
});
