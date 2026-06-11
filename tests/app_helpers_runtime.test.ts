import test from 'node:test';
import assert from 'node:assert/strict';

import { appStr, historyBatch, historyTouch } from '../esm/native/runtime/app_helpers.ts';

test('app helpers stringifier uses the canonical platform seam with a sensible fallback', () => {
  const App: any = {
    platform: {
      util: {
        str(value: unknown, fallback = '') {
          if (value == null) return `fallback:${fallback}`;
          return `platform:${String(value)}`;
        },
      },
    },
  };

  assert.equal(appStr(App, 42), 'platform:42');
  assert.equal(appStr({}, null), '');
});

test('historyBatch prefers the canonical history.batch action and falls back cleanly on failure', () => {
  const calls: string[] = [];
  const App: any = {
    actions: {
      history: {
        batch(fn: () => string, meta?: any) {
          calls.push(`batch:${meta?.source || 'none'}`);
          return `wrapped:${fn()}`;
        },
      },
    },
  };

  const result = historyBatch(App, { source: 'test:batch' }, () => {
    calls.push('fn');
    return 'ok';
  });

  assert.equal(result, 'wrapped:ok');
  assert.deepEqual(calls, ['batch:test:batch', 'fn']);

  const fallbackCalls: string[] = [];
  const fallbackResult = historyBatch(
    {
      actions: {
        history: {
          batch() {
            throw new Error('boom');
          },
        },
      },
    },
    { source: 'test:fallback' },
    () => {
      fallbackCalls.push('ran');
      return 'fallback-ok';
    }
  );

  assert.equal(fallbackResult, 'fallback-ok');
  assert.deepEqual(fallbackCalls, ['ran']);
});

test('historyTouch sends immediate canonical meta and applies the noBuild profile only when available', () => {
  const touched: any[] = [];
  historyTouch(
    {
      actions: {
        meta: {
          touch(meta?: any) {
            touched.push(meta);
          },
        },
      },
    },
    'notes:touch'
  );

  assert.deepEqual(touched, [{ source: 'notes:touch', immediate: true }]);

  const profiledTouched: any[] = [];
  historyTouch(
    {
      actions: {
        meta: {
          noBuild(meta?: any, source?: string) {
            return { ...meta, noBuild: true, profileSource: source };
          },
          touch(meta?: any) {
            profiledTouched.push(meta);
          },
        },
      },
    },
    'export:touch'
  );

  assert.deepEqual(profiledTouched, [
    {
      source: 'export:touch',
      immediate: true,
      noBuild: true,
    },
  ]);
});

test('historyTouch stays fail-soft when touch/noBuild surfaces are missing or throw', () => {
  assert.doesNotThrow(() => historyTouch({}, 'missing:touch'));
  assert.doesNotThrow(() =>
    historyTouch(
      {
        actions: {
          meta: {
            noBuild() {
              throw new Error('profile-boom');
            },
            touch() {
              throw new Error('touch-boom');
            },
          },
        },
      },
      'failing:touch'
    )
  );
});
