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
    'esm/native/ui/react/tabs/design_tab_saved_swatches_dnd_controller_runtime.ts'
  );
  const source = fs.readFileSync(file, 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: file,
  }).outputText;
  const mod = { exports: {} };
  const localRequire = specifier => {
    if (specifier === './design_tab_multicolor_panel.js') {
      return {
        __designTabReportNonFatal(scope, err) {
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
    setDraggingColorId(next) {
      state.draggingColorId = typeof next === 'function' ? next(state.draggingColorId) : String(next || '');
    },
    setDragOverColorId(next) {
      state.dragOverColorId = typeof next === 'function' ? next(state.dragOverColorId) : String(next || '');
    },
    setDragOverColorPos(next) {
      state.dragOverColorPos = typeof next === 'function' ? next(state.dragOverColorPos) : String(next || '');
    },
  };
}

function createTarget(direction = 'ltr', left = 0, width = 100) {
  return {
    getBoundingClientRect() {
      return { left, width };
    },
    ownerDocument: {
      defaultView: {
        getComputedStyle() {
          return { direction };
        },
      },
    },
  };
}

function createDragEvent({ id = '', direction = 'ltr', clientX = 10, throwOnSet = false } = {}) {
  let stored = id;
  const event = {
    currentTarget: createTarget(direction),
    clientX,
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

test('[design-saved-swatches-dnd-controller] resolves drop position canonically across ltr/rtl', () => {
  const state = { nonFatal: [] };
  const mod = loadModule(state);

  assert.equal(mod.resolveDesignTabSwatchDropPos(createTarget('ltr'), 10), 'before');
  assert.equal(mod.resolveDesignTabSwatchDropPos(createTarget('ltr'), 90), 'after');
  assert.equal(mod.resolveDesignTabSwatchDropPos(createTarget('rtl'), 90), 'before');
  assert.equal(mod.resolveDesignTabSwatchDropPos(createTarget('rtl'), 10), 'after');
  assert.deepEqual(state.nonFatal, []);
});

test('[design-saved-swatches-dnd-controller] drag lifecycle keeps state updates and reorder semantics centralized', () => {
  const state = {
    draggingColorId: '',
    dragOverColorId: '',
    dragOverColorPos: '',
    nonFatal: [],
    reorders: [],
  };
  const mod = loadModule(state);
  const controller = mod.createDesignTabSavedSwatchesDndController({
    canReorderColorSwatches: true,
    draggingColorId: state.draggingColorId,
    dragOverColorId: state.dragOverColorId,
    dragOverColorPos: state.dragOverColorPos,
    ...createSetters(state),
    reorderByDnD(dragId, overId, pos) {
      state.reorders.push({ dragId, overId, pos });
    },
  });

  const startEvent = createDragEvent();
  controller.handleDragStart('saved_a', startEvent);
  assert.equal(state.draggingColorId, 'saved_a');
  assert.equal(startEvent.dataTransfer.effectAllowed, 'move');
  assert.equal(startEvent.dataTransfer.getData('text/plain'), 'saved_a');

  const overController = mod.createDesignTabSavedSwatchesDndController({
    canReorderColorSwatches: true,
    draggingColorId: state.draggingColorId,
    dragOverColorId: state.dragOverColorId,
    dragOverColorPos: state.dragOverColorPos,
    ...createSetters(state),
    reorderByDnD(dragId, overId, pos) {
      state.reorders.push({ dragId, overId, pos });
    },
  });
  const overEvent = createDragEvent({ clientX: 80 });
  overController.handleDragOver('saved_b', overEvent);
  assert.equal(state.dragOverColorId, 'saved_b');
  assert.equal(state.dragOverColorPos, 'after');
  assert.equal(overEvent.prevented, 1);
  assert.equal(overEvent.stopped, 1);

  const dropController = mod.createDesignTabSavedSwatchesDndController({
    canReorderColorSwatches: true,
    draggingColorId: state.draggingColorId,
    dragOverColorId: state.dragOverColorId,
    dragOverColorPos: state.dragOverColorPos,
    ...createSetters(state),
    reorderByDnD(dragId, overId, pos) {
      state.reorders.push({ dragId, overId, pos });
    },
  });
  const dropEvent = createDragEvent({ clientX: 80 });
  dropController.handleDrop('saved_b', dropEvent);

  assert.deepEqual(state.reorders, [{ dragId: 'saved_a', overId: 'saved_b', pos: 'after' }]);
  assert.equal(state.draggingColorId, '');
  assert.equal(state.dragOverColorId, '');
  assert.equal(state.dragOverColorPos, '');
  assert.equal(dropEvent.prevented, 1);
  assert.equal(dropEvent.stopped, 1);
});

test('[design-saved-swatches-dnd-controller] end-drop fallback and row-leave stay canonical', () => {
  const state = {
    draggingColorId: 'saved_a',
    dragOverColorId: 'saved_b',
    dragOverColorPos: 'after',
    nonFatal: [],
    reorders: [],
  };
  const mod = loadModule(state);
  const setters = createSetters(state);

  const leaveController = mod.createDesignTabSavedSwatchesDndController({
    canReorderColorSwatches: true,
    draggingColorId: state.draggingColorId,
    dragOverColorId: state.dragOverColorId,
    dragOverColorPos: state.dragOverColorPos,
    ...setters,
    reorderByDnD(dragId, overId, pos) {
      state.reorders.push({ dragId, overId, pos });
    },
  });
  leaveController.handleRowDragLeave();
  assert.equal(state.dragOverColorId, '');
  assert.equal(state.dragOverColorPos, '');

  state.dragOverColorId = '';
  state.dragOverColorPos = '';
  const endOverController = mod.createDesignTabSavedSwatchesDndController({
    canReorderColorSwatches: true,
    draggingColorId: state.draggingColorId,
    dragOverColorId: state.dragOverColorId,
    dragOverColorPos: state.dragOverColorPos,
    ...setters,
    reorderByDnD(dragId, overId, pos) {
      state.reorders.push({ dragId, overId, pos });
    },
  });
  const endOverEvent = createDragEvent();
  endOverController.handleEndDragOver(endOverEvent);
  assert.equal(state.dragOverColorId, '__end__');
  assert.equal(state.dragOverColorPos, 'after');
  assert.equal(endOverEvent.prevented, 1);
  assert.equal(endOverEvent.stopped, 1);

  state.draggingColorId = '';
  const endDropController = mod.createDesignTabSavedSwatchesDndController({
    canReorderColorSwatches: true,
    draggingColorId: state.draggingColorId,
    dragOverColorId: state.dragOverColorId,
    dragOverColorPos: state.dragOverColorPos,
    ...setters,
    reorderByDnD(dragId, overId, pos) {
      state.reorders.push({ dragId, overId, pos });
    },
  });
  const endDropEvent = createDragEvent({ id: 'saved_x' });
  endDropController.handleEndDrop(endDropEvent);

  assert.deepEqual(state.reorders, [{ dragId: 'saved_x', overId: null, pos: 'end' }]);
  assert.equal(state.draggingColorId, '');
  assert.equal(state.dragOverColorId, '');
  assert.equal(state.dragOverColorPos, '');
});

test('[design-saved-swatches-dnd-controller] disabled controller stays inert across drag lifecycle', () => {
  const state = {
    draggingColorId: '',
    dragOverColorId: '',
    dragOverColorPos: '',
    nonFatal: [],
    reorders: [],
  };
  const mod = loadModule(state);
  const controller = mod.createDesignTabSavedSwatchesDndController({
    canReorderColorSwatches: false,
    draggingColorId: state.draggingColorId,
    dragOverColorId: state.dragOverColorId,
    dragOverColorPos: state.dragOverColorPos,
    ...createSetters(state),
    reorderByDnD(dragId, overId, pos) {
      state.reorders.push({ dragId, overId, pos });
    },
  });

  const event = createDragEvent({ id: 'saved_x', clientX: 80 });
  controller.handleDragStart('saved_a', event);
  controller.handleDragOver('saved_b', event);
  controller.handleDrop('saved_b', event);
  controller.handleEndDragOver(event);
  controller.handleEndDrop(event);
  controller.handleDragEnd();
  controller.handleRowDragLeave();

  assert.deepEqual(state, {
    draggingColorId: '',
    dragOverColorId: '',
    dragOverColorPos: '',
    nonFatal: [],
    reorders: [],
  });
  assert.equal(event.prevented, 0);
  assert.equal(event.stopped, 0);
});

test('[design-saved-swatches-dnd-controller] non-fatal drag-start and drag-id read failures stay localized', () => {
  const state = {
    draggingColorId: '',
    dragOverColorId: '',
    dragOverColorPos: '',
    nonFatal: [],
    reorders: [],
  };
  const mod = loadModule(state);
  const controller = mod.createDesignTabSavedSwatchesDndController({
    canReorderColorSwatches: true,
    draggingColorId: state.draggingColorId,
    dragOverColorId: state.dragOverColorId,
    dragOverColorPos: state.dragOverColorPos,
    ...createSetters(state),
    reorderByDnD(dragId, overId, pos) {
      state.reorders.push({ dragId, overId, pos });
    },
  });

  controller.handleDragStart('saved_err', createDragEvent({ throwOnSet: true }));
  assert.equal(state.draggingColorId, 'saved_err');

  const dragId = mod.readDesignTabDraggedColorId(
    {
      getData() {
        throw new Error('read failed');
      },
    },
    (scope, err) => state.nonFatal.push([scope, String(err && err.message ? err.message : err)])
  );

  assert.equal(dragId, '');
  assert.deepEqual(state.nonFatal, [
    ['designTabSavedSwatches:dragStart', 'setData failed'],
    ['designTabSavedSwatches:readDragId', 'read failed'],
  ]);
});

test('[design-saved-swatches-dnd-controller] react-style event methods keep their event binding during drag-over', () => {
  const state = {
    draggingColorId: 'saved_a',
    dragOverColorId: '',
    dragOverColorPos: '',
    nonFatal: [],
    reorders: [],
  };
  const mod = loadModule(state);
  const controller = mod.createDesignTabSavedSwatchesDndController({
    canReorderColorSwatches: true,
    draggingColorId: state.draggingColorId,
    dragOverColorId: state.dragOverColorId,
    dragOverColorPos: state.dragOverColorPos,
    ...createSetters(state),
    reorderByDnD(dragId, overId, pos) {
      state.reorders.push({ dragId, overId, pos });
    },
  });

  const event = {
    currentTarget: createTarget('ltr'),
    clientX: 80,
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

  assert.doesNotThrow(() => controller.handleDragOver('saved_b', event));
  assert.equal(event.prevented, true);
  assert.equal(event.stopped, true);
  assert.equal(state.dragOverColorId, 'saved_b');
  assert.equal(state.dragOverColorPos, 'after');
});
