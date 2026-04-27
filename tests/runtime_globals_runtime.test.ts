import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildBrowserDeps,
  ensureUiFrameworkFlag,
  getBrowserDocumentFromDeps,
} from '../esm/native/runtime/runtime_globals.ts';

test('runtime globals bind browser deps to the injected window and preserve flags', () => {
  const events: string[] = [];
  const doc = { title: 'hello' } as Document;
  const browserWindow = {
    document: doc,
    location: { pathname: '/x', search: '' },
    navigator: { userAgent: 'Agent/2.0' },
    performance: { now: () => 42 },
    setTimeout(cb: () => void, ms?: number) {
      events.push(`timeout:${ms ?? 0}`);
      cb();
      return 11;
    },
    clearTimeout(handle?: number) {
      events.push(`clear-timeout:${handle ?? -1}`);
    },
    setInterval(cb: () => void, ms?: number) {
      events.push(`interval:${ms ?? 0}`);
      cb();
      return 22;
    },
    clearInterval(handle?: number) {
      events.push(`clear-interval:${handle ?? -1}`);
    },
    requestAnimationFrame(cb: FrameRequestCallback) {
      events.push('raf');
      cb(16);
      return 33;
    },
    cancelAnimationFrame(handle: number) {
      events.push(`caf:${handle}`);
    },
    queueMicrotask(cb: () => void) {
      events.push('microtask');
      cb();
    },
    fetch(input: RequestInfo | URL) {
      events.push(`fetch:${String(input)}`);
      return Promise.resolve({ ok: true } as Response);
    },
  };
  const browser = buildBrowserDeps({ window: browserWindow as never, document: doc });
  browser.setTimeout?.(() => events.push('timeout-callback'), 5);
  browser.clearTimeout?.(11);
  browser.setInterval?.(() => events.push('interval-callback'), 7);
  browser.clearInterval?.(22);
  browser.requestAnimationFrame?.(() => events.push('raf-callback'));
  browser.cancelAnimationFrame?.(33);
  browser.queueMicrotask?.(() => events.push('microtask-callback'));

  assert.equal(browser.performanceNow?.(), 42);
  assert.equal(browser.document, doc);
  assert.equal(browser.location?.pathname, '/x');
  assert.equal(browser.navigator?.userAgent, 'Agent/2.0');

  const deps = { flags: { debugBoot: true }, browser };
  ensureUiFrameworkFlag(deps as never, 'react');
  assert.deepEqual(deps.flags, { debugBoot: true, uiFramework: 'react' });
  assert.equal(getBrowserDocumentFromDeps(deps as never), doc);
  assert.deepEqual(events, [
    'timeout:5',
    'timeout-callback',
    'clear-timeout:11',
    'interval:7',
    'interval-callback',
    'clear-interval:22',
    'raf',
    'raf-callback',
    'caf:33',
    'microtask',
    'microtask-callback',
  ]);
});
