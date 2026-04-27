import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');

function loadModule(state) {
  const file = path.join(
    process.cwd(),
    'esm/native/ui/react/tabs/structure_tab_saved_models_dnd_events_controller_runtime.ts'
  );
  const source = fs.readFileSync(file, 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: file,
  }).outputText;
  const mod = { exports: {} };
  const localRequire = specifier => {
    if (specifier === './structure_tab_shared.js') {
      return {
        structureTabReportNonFatal(scope, err) {
          state.nonFatal.push([scope, String(err && err.message ? err.message : err)]);
        },
      };
    }
    return require(specifier);
  };
  const sandbox = {
    module: mod,
    exports: mod.exports,
    require: localRequire,
    __dirname: path.dirname(file),
    __filename: file,
    console,
    process,
    setTimeout,
    clearTimeout,
  };
  vm.runInNewContext(transpiled, sandbox, { filename: file });
  return mod.exports;
}

function createSetters(state) {
  return {
    setDraggingModelId(next) {
      state.draggingModelId = typeof next === 'function' ? next(state.draggingModelId) : String(next || '');
    },
    setDragOverModelId(next) {
      state.dragOverModelId = typeof next === 'function' ? next(state.dragOverModelId) : String(next || '');
    },
    setDragOverPos(next) {
      state.dragOverPos = typeof next === 'function' ? next(state.dragOverPos) : String(next || '');
    },
    setDraggingListType(next) {
      state.draggingListType = typeof next === 'function' ? next(state.draggingListType) : String(next || '');
    },
  };
}

function createTarget(top = 0, height = 100) {
  return {
    getBoundingClientRect() {
      return { top, height };
    },
  };
}

function createDragEvent({ id = '', clientY = 10, throwOnSet = false } = {}) {
  let stored = id;
  const event = {
    currentTarget: createTarget(),
    clientY,
    prevented: 0,
    stopped: 0,
    dataTransfer: {
      effectAllowed: 'none',
      setData(_type, value) {
        if (throwOnSet) throw new Error('setData failed');
        stored = String(value || '');
      },
      getData() {
        return stored;
      },
    },
    preventDefault() {
      event.prevented += 1;
    },
    stopPropagation() {
      event.stopped += 1;
    },
  };
  return event;
}

function createCommandSpy(state) {
  return {
    opened: [],
    resolved: [],
    drops: [],
    openListIfClosed(target) {
      this.opened.push(target);
    },
    resolveDraggedId(draggingModelId, dataTransfer) {
      this.resolved.push([draggingModelId, dataTransfer ? 'dt' : '']);
      return String(draggingModelId || (dataTransfer ? dataTransfer.getData('text/plain') : '') || '');
    },
    applyDrop(listType, dragId, overId, pos) {
      this.drops.push({ listType, dragId, overId, pos });
      state.commandDrops.push({ listType, dragId, overId, pos });
    },
  };
}

test('[saved-models-dnd-events-controller] resolves drop position canonically and keeps empty/end states centralized', () => {
  const state = { nonFatal: [] };
  const mod = loadModule(state);

  assert.equal(mod.resolveSavedModelsDropPos(createTarget(0, 100), 10), 'before');
  assert.equal(mod.resolveSavedModelsDropPos(createTarget(0, 100), 90), 'after');
});

test('[saved-models-dnd-events-controller] header, row, and end-drop flows stay centralized around command controller', () => {
  const state = {
    draggingModelId: '',
    dragOverModelId: '',
    dragOverPos: '',
    draggingListType: '',
    commandDrops: [],
    nonFatal: [],
  };
  const mod = loadModule(state);
  const command = createCommandSpy(state);
  const makeController = () =>
    mod.createSavedModelsDndEventsController({
      draggingModelId: state.draggingModelId,
      dragOverModelId: state.dragOverModelId,
      dragOverPos: state.dragOverPos,
      ...createSetters(state),
      commandController: command,
    });

  const startController = makeController();
  const startEvent = createDragEvent();
  startController.handleRowDragStart('user:1', 'saved', startEvent);
  assert.equal(state.draggingModelId, 'user:1');
  assert.equal(state.draggingListType, 'saved');
  assert.equal(startEvent.dataTransfer.effectAllowed, 'move');
  assert.equal(startEvent.dataTransfer.getData('text/plain'), 'user:1');

  const headerController = makeController();
  const headerEvent = createDragEvent();
  headerController.handleHeaderDragEnter('preset', headerEvent);
  headerController.handleHeaderDragOver('preset', headerEvent);
  assert.deepEqual(command.opened, ['preset', 'preset']);
  assert.equal(headerEvent.prevented, 2);
  assert.equal(headerEvent.stopped, 2);

  const overController = makeController();
  const overEvent = createDragEvent({ clientY: 80 });
  overController.handleRowDragOver('user:2', overEvent);
  assert.equal(state.dragOverModelId, 'user:2');
  assert.equal(state.dragOverPos, 'after');

  const dropController = makeController();
  const dropEvent = createDragEvent({ clientY: 20 });
  dropController.handleRowDrop('user:2', 'saved', dropEvent);
  assert.deepEqual(state.commandDrops, [
    { listType: 'saved', dragId: 'user:1', overId: 'user:2', pos: 'before' },
  ]);
  assert.equal(state.draggingModelId, '');
  assert.equal(state.dragOverModelId, '');
  assert.equal(state.dragOverPos, '');
  assert.equal(state.draggingListType, '');

  state.draggingModelId = 'preset:2';
  const endOverController = makeController();
  const endOverEvent = createDragEvent();
  endOverController.handleEndDropZoneDragOver(endOverEvent);
  assert.equal(state.dragOverModelId, '__end__');
  assert.equal(state.dragOverPos, 'after');

  const endDropController = makeController();
  const endDropEvent = createDragEvent();
  endDropController.handleEndDropZoneDrop('preset', endDropEvent);
  assert.deepEqual(state.commandDrops, [
    { listType: 'saved', dragId: 'user:1', overId: 'user:2', pos: 'before' },
    { listType: 'preset', dragId: 'preset:2', overId: null, pos: 'end' },
  ]);
});

test('[saved-models-dnd-events-controller] empty drag ids clear state without dispatching drops', () => {
  const state = {
    draggingModelId: 'user:1',
    dragOverModelId: '__end__',
    dragOverPos: 'after',
    draggingListType: 'saved',
    commandDrops: [],
    nonFatal: [],
  };
  const mod = loadModule(state);
  const command = createCommandSpy(state);
  command.resolveDraggedId = function resolveDraggedId() {
    this.resolved.push(['', '']);
    return '';
  };
  const controller = mod.createSavedModelsDndEventsController({
    draggingModelId: state.draggingModelId,
    dragOverModelId: state.dragOverModelId,
    dragOverPos: state.dragOverPos,
    ...createSetters(state),
    commandController: command,
  });

  const headerEvent = createDragEvent();
  controller.handleHeaderDrop('preset', headerEvent);
  assert.deepEqual(state.commandDrops, []);
  assert.equal(state.draggingModelId, '');
  assert.equal(state.dragOverModelId, '');
  assert.equal(state.dragOverPos, '');
  assert.equal(state.draggingListType, '');

  state.draggingModelId = 'user:1';
  state.dragOverModelId = '__empty__';
  state.dragOverPos = 'after';
  state.draggingListType = 'saved';
  const rowEvent = createDragEvent({ clientY: 90 });
  controller.handleRowDrop('user:2', 'saved', rowEvent);
  assert.deepEqual(state.commandDrops, []);
  assert.equal(state.draggingModelId, '');
  assert.equal(state.dragOverModelId, '');
  assert.equal(state.dragOverPos, '');
  assert.equal(state.draggingListType, '');

  state.draggingModelId = 'user:1';
  state.draggingListType = 'saved';
  const endDropEvent = createDragEvent();
  controller.handleEndDropZoneDrop('saved', endDropEvent);
  assert.deepEqual(state.commandDrops, []);
  assert.equal(state.draggingModelId, '');
  assert.equal(state.dragOverModelId, '');
  assert.equal(state.dragOverPos, '');
  assert.equal(state.draggingListType, '');
});

test('[saved-models-dnd-events-controller] empty-zone drop fallback and drag-start failures stay localized', () => {
  const state = {
    draggingModelId: '',
    dragOverModelId: '',
    dragOverPos: '',
    draggingListType: '',
    commandDrops: [],
    nonFatal: [],
  };
  const mod = loadModule(state);
  const command = createCommandSpy(state);
  const makeController = () =>
    mod.createSavedModelsDndEventsController({
      draggingModelId: state.draggingModelId,
      dragOverModelId: state.dragOverModelId,
      dragOverPos: state.dragOverPos,
      ...createSetters(state),
      commandController: command,
    });

  const startController = makeController();
  startController.handleRowDragStart('user:err', 'saved', createDragEvent({ throwOnSet: true }));
  assert.equal(state.draggingModelId, 'user:err');
  assert.deepEqual(state.nonFatal, [['savedModels:dnd:start', 'setData failed']]);

  state.draggingModelId = '';
  const overController = makeController();
  const overEvent = createDragEvent();
  overController.handleEmptyZoneDragOver(overEvent);
  assert.equal(state.dragOverModelId, '');
  assert.equal(state.dragOverPos, '');

  state.draggingModelId = 'user:1';
  const emptyOverController = makeController();
  const emptyOverEvent = createDragEvent();
  emptyOverController.handleEmptyZoneDragOver(emptyOverEvent);
  assert.equal(state.dragOverModelId, '__empty__');
  assert.equal(state.dragOverPos, 'after');

  const emptyLeaveController = makeController();
  emptyLeaveController.handleEmptyZoneDragLeave();
  assert.equal(state.dragOverModelId, '');
  assert.equal(state.dragOverPos, '');

  state.draggingModelId = '';
  const dropController = makeController();
  const emptyDropEvent = createDragEvent({ id: 'preset:1' });
  dropController.handleEmptyZoneDrop('saved', emptyDropEvent);
  assert.deepEqual(state.commandDrops, [{ listType: 'saved', dragId: 'preset:1', overId: null, pos: 'end' }]);
});

test('[saved-models-dnd-events-controller] react-style event methods keep their event binding during row drag-over', () => {
  const state = {
    draggingModelId: 'user:1',
    dragOverModelId: '',
    dragOverPos: '',
    draggingListType: 'saved',
    commandDrops: [],
    nonFatal: [],
  };
  const mod = loadModule(state);
  const command = createCommandSpy(state);
  const controller = mod.createSavedModelsDndEventsController({
    draggingModelId: state.draggingModelId,
    dragOverModelId: state.dragOverModelId,
    dragOverPos: state.dragOverPos,
    ...createSetters(state),
    commandController: command,
  });

  const event = {
    currentTarget: createTarget(),
    clientY: 80,
    dataTransfer: null,
    prevented: false,
    stopped: false,
    preventDefault() {
      this.prevented = true;
    },
    stopPropagation() {
      this.stopped = true;
    },
  };

  assert.doesNotThrow(() => controller.handleRowDragOver('user:2', event));
  assert.equal(event.prevented, true);
  assert.equal(event.stopped, true);
  assert.equal(state.dragOverModelId, 'user:2');
  assert.equal(state.dragOverPos, 'after');
});
