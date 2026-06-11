import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveProjectFileLoadInput } from '../esm/native/io/project_io_orchestrator.ts';
import { createProjectDragDropController } from '../esm/native/ui/interactions/project_drag_drop_controller_runtime.ts';

class FakeDragEvent extends Event {
  dataTransfer: {
    files?: ArrayLike<Blob>;
    items?: ArrayLike<{ kind?: string }>;
    types?: Iterable<string>;
  } | null;

  constructor(type: string, init?: { dataTransfer?: FakeDragEvent['dataTransfer'] }) {
    super(type, { bubbles: true, cancelable: true });
    this.dataTransfer = init?.dataTransfer ?? null;
  }
}

function createNamedBlob(name: string, text = '{}'): Blob & { name: string } {
  const blob = new Blob([text], { type: 'application/json' }) as Blob & { name: string };
  blob.name = name;
  return blob;
}

function createDocHarness() {
  const listeners = new Map<string, Set<(event: Event) => void>>();
  const classNames = new Set<string>();
  const body = {
    classList: {
      toggle(name: string, force?: boolean) {
        if (force === false) classNames.delete(name);
        else classNames.add(name);
      },
    },
    addEventListener(type: string, handler: (event: Event) => void) {
      const bucket = listeners.get(type) || new Set();
      bucket.add(handler);
      listeners.set(type, bucket);
    },
    removeEventListener(type: string, handler: (event: Event) => void) {
      listeners.get(type)?.delete(handler);
    },
  };
  const doc = { body } as unknown as Document;
  return {
    doc,
    classNames,
    dispatch(type: string, event: Event) {
      for (const handler of listeners.get(type) || []) handler(event);
    },
  };
}

test('resolveProjectFileLoadInput accepts direct files and legacy file-input events', () => {
  const file = createNamedBlob('project.json');
  assert.equal(resolveProjectFileLoadInput(file).file, file);
  assert.equal(resolveProjectFileLoadInput(file).target, null);

  const target = { files: [file], value: 'C:/fake/project.json' };
  const resolved = resolveProjectFileLoadInput({ target } as never);
  assert.equal(resolved.file, file);
  assert.equal(resolved.target, target);
});

test('project drag-drop routes JSON files through canonical ProjectIO file ingress', async () => {
  const prevDragEvent = (globalThis as { DragEvent?: typeof FakeDragEvent }).DragEvent;
  (globalThis as { DragEvent?: typeof FakeDragEvent }).DragEvent =
    FakeDragEvent as unknown as typeof DragEvent;

  try {
    const { doc, classNames, dispatch } = createDocHarness();
    const file = createNamedBlob('drop-project.json');
    const calls: unknown[] = [];
    const toasts: Array<{ msg: string; type?: string }> = [];
    const App = {
      services: {
        projectIO: {
          handleFileLoad(input: unknown) {
            calls.push(input);
            return { ok: true, restoreGen: 3 };
          },
        },
      },
    } as any;

    const controller = createProjectDragDropController(App, {
      doc,
      toast: (msg, type) => toasts.push({ msg, type }),
    });

    controller.onDragOverClass(
      new FakeDragEvent('dragover', {
        dataTransfer: { files: [file], items: [{ kind: 'file' }], types: ['Files'] },
      }) as unknown as Event
    );
    assert.equal(classNames.has('is-dragover'), true);

    await controller.onDropHandle(
      new FakeDragEvent('drop', {
        dataTransfer: { files: [file], items: [{ kind: 'file' }], types: ['Files'] },
      }) as unknown as Event
    );

    assert.deepEqual(calls, [file]);
    assert.deepEqual(toasts, [{ msg: 'הפרויקט נטען בהצלחה!', type: 'success' }]);
    assert.equal(classNames.has('is-dragover'), false);
  } finally {
    (globalThis as { DragEvent?: typeof FakeDragEvent }).DragEvent = prevDragEvent as
      | typeof DragEvent
      | undefined;
  }
});

test('project drag-drop rejects non-json files before touching ProjectIO', async () => {
  const prevDragEvent = (globalThis as { DragEvent?: typeof FakeDragEvent }).DragEvent;
  (globalThis as { DragEvent?: typeof FakeDragEvent }).DragEvent =
    FakeDragEvent as unknown as typeof DragEvent;

  try {
    const { doc, dispatch } = createDocHarness();
    const file = createNamedBlob('notes.txt');
    const calls: unknown[] = [];
    const toasts: Array<{ msg: string; type?: string }> = [];
    const App = {
      services: {
        projectIO: {
          handleFileLoad(input: unknown) {
            calls.push(input);
            return { ok: true, restoreGen: 3 };
          },
        },
      },
    } as any;

    const controller = createProjectDragDropController(App, {
      doc,
      toast: (msg, type) => toasts.push({ msg, type }),
    });

    await controller.onDropHandle(
      new FakeDragEvent('drop', {
        dataTransfer: { files: [file], items: [{ kind: 'file' }], types: ['Files'] },
      }) as unknown as Event
    );

    assert.deepEqual(calls, []);
    assert.deepEqual(toasts, [{ msg: 'אנא גרור קובץ פרויקט (JSON) בלבד.', type: 'error' }]);
  } finally {
    (globalThis as { DragEvent?: typeof FakeDragEvent }).DragEvent = prevDragEvent as
      | typeof DragEvent
      | undefined;
  }
});
