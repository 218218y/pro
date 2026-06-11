import test from 'node:test';
import assert from 'node:assert/strict';

import {
  autoStartEntryProRuntime,
  installEntryProEarlyHandlers,
  startEntryProRuntime,
} from '../esm/entry_pro_start_runtime.ts';

type ListenerMap = Record<string, ((event: any) => void)[]>;

function createWindowStub(): any {
  const listeners: ListenerMap = { error: [], unhandledrejection: [] };
  return {
    __wpEarlyHandlersInstalled: false,
    listeners,
    addEventListener(name: string, handler: (event: any) => void) {
      (listeners[name] ||= []).push(handler);
    },
  };
}

test('entry_pro_start_runtime installs early handlers once', () => {
  const win = createWindowStub();
  const doc = {} as Document;

  installEntryProEarlyHandlers(win, doc, {
    loadErrorOverlayModule: async () => ({ showFatalOverlay: () => undefined }) as any,
  });
  installEntryProEarlyHandlers(win, doc, {
    loadErrorOverlayModule: async () => ({ showFatalOverlay: () => undefined }) as any,
  });

  assert.equal(win.listeners.error.length, 1);
  assert.equal(win.listeners.unhandledrejection.length, 1);
});

test('entry_pro_start_runtime starts boot module and falls back to overlay on failure', async () => {
  const win = createWindowStub();
  const doc = {} as Document;
  const calls: string[] = [];

  await startEntryProRuntime(win, doc, {
    loadErrorOverlayModule: async () =>
      ({
        showFatalOverlay: () => calls.push('showFatalOverlay'),
      }) as any,
    loadEntryProMainModule: async () =>
      ({
        bootProEntry: async () => {
          calls.push('bootProEntry');
          throw new Error('boom');
        },
      }) as any,
    hasAnyOverlay: () => false,
    reportBestEffort: () => {
      calls.push('reportBestEffort');
    },
  });

  assert.deepEqual(calls, ['bootProEntry', 'showFatalOverlay']);
});

test('entry_pro_start_runtime autostart delegates to start runtime under browser globals', async () => {
  const calls: string[] = [];
  const prevWindow = (globalThis as any).window;
  const prevDocument = (globalThis as any).document;
  const win = createWindowStub();
  const doc = {} as Document;

  (globalThis as any).window = win;
  (globalThis as any).document = doc;

  try {
    autoStartEntryProRuntime({
      shouldFailFastBoot: () => false,
      loadErrorOverlayModule: async () => ({ showFatalOverlay: () => undefined }) as any,
      loadEntryProMainModule: async () =>
        ({
          bootProEntry: async () => {
            calls.push('bootProEntry');
          },
        }) as any,
    });
    await new Promise(resolve => setTimeout(resolve, 0));
  } finally {
    if (typeof prevWindow === 'undefined') delete (globalThis as any).window;
    else (globalThis as any).window = prevWindow;
    if (typeof prevDocument === 'undefined') delete (globalThis as any).document;
    else (globalThis as any).document = prevDocument;
  }

  assert.deepEqual(calls, ['bootProEntry']);
});
