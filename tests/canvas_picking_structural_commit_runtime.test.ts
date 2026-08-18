import test from 'node:test';
import assert from 'node:assert/strict';

import {
  commitCanvasModuleStructuralPatch,
  commitCanvasModuleStructuralReplacement,
  readCanvasModuleConfigForStack,
} from '../esm/native/services/canvas_picking_structural_commit.ts';

type Diagnostic = { error: unknown; context: Record<string, unknown> };

function createApp(
  cfg: Record<string, unknown>,
  patchForStack?: (
    stack: string,
    moduleKey: unknown,
    patcher: (cfg: Record<string, unknown>) => void,
    meta?: unknown
  ) => unknown
) {
  const diagnostics: Diagnostic[] = [];
  const App: any = {
    actions: {
      modules: {
        ...(patchForStack ? { patchForStack } : {}),
        ensureForStack() {
          return cfg;
        },
      },
    },
    services: {
      errors: {
        report(error: unknown, context: Record<string, unknown>) {
          diagnostics.push({ error, context });
        },
      },
    },
  };
  return { App, diagnostics };
}

function withoutConsoleWarn<T>(fn: () => T): T {
  const previous = console.warn;
  console.warn = () => undefined;
  try {
    return fn();
  } finally {
    console.warn = previous;
  }
}

test('structural commit preserves nested identity while committing a detached draft', () => {
  const box = { id: 'box-1', widthM: 0.6, nested: { enabled: false } };
  const cfg = { sketchExtras: { boxes: [box] } };
  const { App } = createApp(cfg, (_stack, _moduleKey, patcher) => {
    patcher(cfg);
    return true;
  });

  const outcome = commitCanvasModuleStructuralPatch({
    App,
    stack: 'top',
    moduleKey: 0,
    mutate(draft: any) {
      draft.sketchExtras.boxes[0].widthM = 0.8;
      draft.sketchExtras.boxes[0].nested.enabled = true;
      return true;
    },
    meta: { source: 'test.structural.success' },
    op: 'test.success',
  });

  assert.deepEqual(outcome, { committed: true, changed: true });
  assert.equal((cfg.sketchExtras.boxes as any[])[0], box);
  assert.equal(box.widthM, 0.8);
  assert.equal(box.nested.enabled, true);
});

test('structural commit rolls back a mutation when the writer throws after invoking it', () => {
  const box = { id: 'box-1', widthM: 0.6 };
  const cfg = { sketchExtras: { boxes: [box] } };
  const { App, diagnostics } = createApp(cfg, (_stack, _moduleKey, patcher) => {
    patcher(cfg);
    throw new Error('writer-after-callback');
  });

  const outcome = withoutConsoleWarn(() =>
    commitCanvasModuleStructuralPatch({
      App,
      stack: 'top',
      moduleKey: 0,
      mutate(draft: any) {
        draft.sketchExtras.boxes[0].widthM = 0.9;
        return true;
      },
      meta: { source: 'test.structural.writerThrow' },
      op: 'test.writerThrow',
    })
  );

  assert.deepEqual(outcome, { committed: false, changed: false });
  assert.equal((cfg.sketchExtras.boxes as any[])[0], box);
  assert.equal(box.widthM, 0.6);
  assert.equal(
    diagnostics.some(entry => entry.context.op === 'test.writerThrow.writerThrow'),
    true
  );
});

test('structural commit never applies a partially mutated draft when the mutation throws', () => {
  const box = { id: 'box-1', widthM: 0.6, heightM: 0.8 };
  const cfg = { sketchExtras: { boxes: [box] } };
  const { App, diagnostics } = createApp(cfg, (_stack, _moduleKey, patcher) => {
    patcher(cfg);
    return true;
  });

  const outcome = withoutConsoleWarn(() =>
    commitCanvasModuleStructuralPatch({
      App,
      stack: 'top',
      moduleKey: 0,
      mutate(draft: any) {
        draft.sketchExtras.boxes[0].widthM = 1.2;
        throw new Error('mutation-failed-midway');
      },
      meta: { source: 'test.structural.mutationThrow' },
      op: 'test.mutationThrow',
    })
  );

  assert.deepEqual(outcome, { committed: false, changed: false });
  assert.equal(box.widthM, 0.6);
  assert.equal(box.heightM, 0.8);
  assert.equal(
    diagnostics.some(entry => entry.context.op === 'test.mutationThrow.mutation'),
    true
  );
});

test('structural commit rolls back when the canonical writer explicitly rejects the patch', () => {
  const box = { id: 'box-1', widthM: 0.6 };
  const cfg = { sketchExtras: { boxes: [box] } };
  const { App, diagnostics } = createApp(cfg, (_stack, _moduleKey, patcher) => {
    patcher(cfg);
    return false;
  });

  const outcome = withoutConsoleWarn(() =>
    commitCanvasModuleStructuralPatch({
      App,
      stack: 'top',
      moduleKey: 0,
      mutate(draft: any) {
        draft.sketchExtras.boxes[0].widthM = 1;
        return true;
      },
      meta: { source: 'test.structural.writerReject' },
      op: 'test.writerReject',
    })
  );

  assert.deepEqual(outcome, { committed: false, changed: false });
  assert.equal(box.widthM, 0.6);
  assert.equal(
    diagnostics.some(entry => entry.context.op === 'test.writerReject.writerRejected'),
    true
  );
});

test('structural commit fails closed when the writer never executes the mutation callback', () => {
  const cfg = { sketchExtras: { boxes: [] } };
  const { App, diagnostics } = createApp(cfg, () => true);

  const outcome = withoutConsoleWarn(() =>
    commitCanvasModuleStructuralPatch({
      App,
      stack: 'top',
      moduleKey: 0,
      mutate() {
        throw new Error('must-not-run');
      },
      meta: { source: 'test.structural.noCallback' },
      op: 'test.noCallback',
    })
  );

  assert.deepEqual(outcome, { committed: false, changed: false });
  assert.equal(
    diagnostics.some(entry => entry.context.op === 'test.noCallback.writerRejected'),
    true
  );
});

test('structural commit fails closed when the canonical writer is unavailable', () => {
  const cfg = { sketchExtras: { boxes: [] } };
  const { App, diagnostics } = createApp(cfg);

  const outcome = withoutConsoleWarn(() =>
    commitCanvasModuleStructuralPatch({
      App,
      stack: 'top',
      moduleKey: 0,
      mutate() {
        return true;
      },
      meta: { source: 'test.structural.unavailable' },
      op: 'test.unavailable',
    })
  );

  assert.deepEqual(outcome, { committed: false, changed: false });
  assert.equal(
    diagnostics.some(entry => entry.context.op === 'test.unavailable.writerUnavailable'),
    true
  );
});

test('structural replacement sends a detached config and fails closed on writer rejection', () => {
  const cfg = { modulesConfiguration: [{ id: 'cell-1', widthM: 0.6 }] };
  let received: any = null;
  const { App, diagnostics } = createApp(cfg, (_stack, _moduleKey, replacement: any) => {
    received = replacement;
    replacement.modulesConfiguration[0].widthM = 0.9;
    return false;
  });

  const committed = withoutConsoleWarn(() =>
    commitCanvasModuleStructuralReplacement({
      App,
      stack: 'top',
      moduleKey: 'corner',
      nextConfig: cfg,
      meta: { source: 'test.structural.replacement' },
      op: 'test.replacement',
    })
  );

  assert.equal(committed, false);
  assert.notEqual(received, cfg);
  assert.equal((cfg.modulesConfiguration as any[])[0].widthM, 0.6);
  assert.equal(
    diagnostics.some(entry => entry.context.op === 'test.replacement.writerRejected'),
    true
  );
});

test('structural read reports canonical read failures and returns null', () => {
  const cfg = { sketchExtras: { boxes: [] } };
  const { App, diagnostics } = createApp(cfg);
  App.actions.modules.ensureForStack = () => {
    throw new Error('read-failed');
  };

  const result = withoutConsoleWarn(() =>
    readCanvasModuleConfigForStack({
      App,
      stack: 'top',
      moduleKey: 0,
      op: 'test.read',
    })
  );

  assert.equal(result, null);
  assert.equal(
    diagnostics.some(entry => entry.context.op === 'test.read.readConfig'),
    true
  );
});

test('structural read reports a missing canonical reader instead of failing silently', () => {
  const cfg = { sketchExtras: { boxes: [] } };
  const { App, diagnostics } = createApp(cfg);
  delete App.actions.modules.ensureForStack;

  const result = withoutConsoleWarn(() =>
    readCanvasModuleConfigForStack({
      App,
      stack: 'top',
      moduleKey: 0,
      op: 'test.readUnavailable',
    })
  );

  assert.equal(result, null);
  assert.equal(
    diagnostics.some(entry => entry.context.op === 'test.readUnavailable.readerUnavailable'),
    true
  );
});

test('structural read reports malformed non-null configs instead of treating them as a normal miss', () => {
  const cfg = { sketchExtras: { boxes: [] } };
  const { App, diagnostics } = createApp(cfg);
  App.actions.modules.ensureForStack = () => [];

  const result = withoutConsoleWarn(() =>
    readCanvasModuleConfigForStack({
      App,
      stack: 'top',
      moduleKey: 0,
      op: 'test.invalidRead',
    })
  );

  assert.equal(result, null);
  assert.equal(
    diagnostics.some(entry => entry.context.op === 'test.invalidRead.invalidConfig'),
    true
  );
});
