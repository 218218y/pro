import test from 'node:test';
import assert from 'node:assert/strict';

import {
  resolveFinalizeBuildContextArgs,
  resolveFinalizeBuildBestEffortArgs,
  runFinalizeBuildBestEffort,
} from '../esm/native/builder/post_build_finalize_runtime.ts';

test('post-build finalize runtime: resolves BuildContext follow-through functions canonically', () => {
  const pruneCachesSafe = () => void 0;
  const triggerRender = () => void 0;
  const rebuildDrawerMeta = () => void 0;

  assert.deepEqual(
    resolveFinalizeBuildContextArgs({
      App: { id: 'app' },
      fns: { pruneCachesSafe, triggerRender, rebuildDrawerMeta },
    } as any),
    {
      App: { id: 'app' },
      pruneCachesSafe,
      triggerRender,
      rebuildDrawerMeta,
    }
  );
});

test('post-build finalize runtime: best-effort normalization strips non-functions before follow-through', () => {
  const App: any = { services: { builder: {} } };
  const normalized = resolveFinalizeBuildBestEffortArgs({
    App,
    pruneCachesSafe: 'nope' as any,
    triggerRender: null,
    rebuildDrawerMeta: 12 as any,
  });

  assert.equal(normalized.App, App);
  assert.equal(normalized.pruneCachesSafe, null);
  assert.equal(normalized.triggerRender, null);
  assert.equal(normalized.rebuildDrawerMeta, null);
});

test('post-build finalize runtime: best-effort follow-through keeps canonical builder seams', () => {
  const calls: unknown[] = [];
  const scene = { tag: 'scene' };
  const App: any = {
    services: {
      builder: {
        buildUi: { busy: true },
        handles: {
          applyHandles(opts?: { triggerRender?: boolean }) {
            calls.push(['handles', opts ?? null]);
          },
        },
        registry: {
          finalize() {
            calls.push('finalize');
          },
        },
      },
      platform: {
        triggerRender(updateShadows?: boolean) {
          calls.push(['platform-render', !!updateShadows]);
          return true;
        },
      },
    },
    platform: {
      triggerRender(updateShadows?: boolean) {
        calls.push(['legacy-platform-render', !!updateShadows]);
      },
    },
    render: { scene },
  };

  runFinalizeBuildBestEffort({
    App,
    pruneCachesSafe(root) {
      calls.push(['prune', root]);
    },
    rebuildDrawerMeta() {
      calls.push('rebuildDrawerMeta');
    },
  });

  assert.equal(App.services.builder.buildUi, null);
  assert.deepEqual(calls, [
    'finalize',
    'rebuildDrawerMeta',
    ['handles', { triggerRender: false }],
    ['prune', scene],
    ['platform-render', true],
  ]);
});
