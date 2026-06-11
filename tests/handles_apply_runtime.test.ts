import test from 'node:test';
import assert from 'node:assert/strict';

import { applyHandles } from '../esm/native/builder/handles_apply.ts';

function createApp() {
  const calls: unknown[] = [];
  const App: any = {
    services: {
      builder: {
        handles: { cache: {} },
      },
    },
    store: {
      getState() {
        return {
          ui: { view: {} },
          config: {},
          runtime: {},
          mode: { primary: 'none', opts: {} },
          meta: {},
        };
      },
    },
    render: {
      doorsArray: [],
    },
    platform: {
      triggerRender(updateShadows?: boolean) {
        calls.push(['platform-render', !!updateShadows]);
      },
    },
  };
  return { App, calls };
}

test('handles apply triggers a platform render by default', () => {
  const { App, calls } = createApp();
  applyHandles({ App });
  assert.deepEqual(calls, [['platform-render', false]]);
});

test('handles apply can suppress the trailing platform render for batched callers', () => {
  const { App, calls } = createApp();
  applyHandles({ App, triggerRender: false });
  assert.deepEqual(calls, []);
});

test('handles apply falls back to ensureRenderLoop when triggerRender is unavailable', () => {
  const calls: unknown[] = [];
  const App: any = {
    services: {
      builder: {
        handles: { cache: {} },
      },
      platform: {
        ensureRenderLoop() {
          calls.push(['ensureRenderLoop']);
        },
      },
    },
    store: {
      getState() {
        return {
          ui: { view: {} },
          config: {},
          runtime: {},
          mode: { primary: 'none', opts: {} },
          meta: {},
        };
      },
    },
    render: {
      doorsArray: [],
    },
  };

  applyHandles({ App });
  assert.deepEqual(calls, [['ensureRenderLoop']]);
});
