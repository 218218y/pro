import test from 'node:test';
import assert from 'node:assert/strict';

import { installBrowserEnvAdapter } from '../esm/native/adapters/browser/env.ts';
import { installBrowserSurfaceAdapter } from '../esm/native/adapters/browser/surface.ts';

test('browser env adapter heals drifted env + clipboard methods while preserving canonical refs', async () => {
  const customGetWindow = () => 'custom-window';
  const customClipboardWriteText = async (value: string) => {
    return void value;
  };
  const nav = {
    clipboard: {
      readText: async () => 'clip-text',
    },
  };
  const App: any = {
    deps: {
      browser: {
        navigator: nav,
        location: { search: '?env=1' },
        window: { innerWidth: 800, innerHeight: 600 },
        document: { documentElement: { clientWidth: 801, clientHeight: 601 } },
      },
    },
    browser: Object.assign(Object.create(null), {
      getWindow: customGetWindow,
      clipboardWriteText: customClipboardWriteText,
    }),
  };

  installBrowserEnvAdapter(App);

  const firstGetWindow = App.browser.getWindow;
  const firstGetViewportSize = App.browser.getViewportSize;
  const firstClipboardWriteText = App.browser.clipboardWriteText;
  const firstClipboardReadText = App.browser.clipboardReadText;

  App.browser.getWindow = () => 'stale-window';
  delete App.browser.getViewportSize;
  App.browser.clipboardWriteText = async () => void 0;
  delete App.browser.clipboardReadText;

  installBrowserEnvAdapter(App);

  assert.equal(App.browser.getWindow, firstGetWindow);
  assert.equal(App.browser.getWindow(), 'custom-window');
  assert.equal(App.browser.getViewportSize, firstGetViewportSize);
  assert.deepEqual(App.browser.getViewportSize(), { width: 800, height: 600 });
  assert.equal(App.browser.clipboardWriteText, firstClipboardWriteText);
  assert.equal(App.browser.clipboardReadText, firstClipboardReadText);
  assert.equal(await App.browser.clipboardReadText(), 'clip-text');
});

test('browser surface adapter heals drifted dialogs, css, and createCanvas surfaces in place', () => {
  const calls: Array<[string, string]> = [];
  const legacyConfirm = (message: string) => {
    calls.push(['confirm', message]);
    return true;
  };
  const legacyCanvasFactory = (width: number, height: number) => ({ kind: 'legacy', width, height });
  const doc = {
    body: {
      setAttribute(name: string, value: string) {
        calls.push(['attr', `${name}=${value}`]);
      },
      style: { cursor: '' },
    },
    createElement(tag: string) {
      return { tag, width: 0, height: 0 };
    },
    querySelector() {
      return null;
    },
    documentElement: { clientWidth: 300, clientHeight: 200 },
  };
  const win = {
    document: doc,
    navigator: { userAgent: 'Agent/2.0' },
    location: { search: '?surface=1' },
    prompt(message: string, def?: string) {
      calls.push(['prompt', `${message}|${def ?? ''}`]);
      return 'ok';
    },
    getSelection() {
      return null;
    },
    getComputedStyle() {
      return { display: 'block' } as CSSStyleDeclaration;
    },
    scrollTo() {},
    setTimeout(fn: () => void) {
      fn();
      return 1;
    },
    clearTimeout() {},
    addEventListener() {},
    removeEventListener() {},
    requestAnimationFrame(cb: FrameRequestCallback) {
      cb(0);
      return 1;
    },
    cancelAnimationFrame() {},
    pageYOffset: 0,
    devicePixelRatio: 1,
  };
  const App: any = {
    deps: {
      THREE: {},
      browser: {
        window: win,
        document: doc,
        navigator: win.navigator,
        location: win.location,
      },
    },
    browser: Object.assign(Object.create(null), {
      confirm: legacyConfirm,
    }),
    platform: Object.assign(Object.create(null), {
      createCanvas: legacyCanvasFactory,
    }),
  };

  installBrowserSurfaceAdapter(App);

  const firstConfirm = App.browser.confirm;
  const firstPrompt = App.browser.prompt;
  const firstDoorStatus = App.browser.setDoorStatusCss;
  const firstCreateCanvas = App.platform.createCanvas;
  const firstUserAgent = App.browser.userAgent;

  App.browser.confirm = () => false;
  delete App.browser.prompt;
  delete App.browser.setDoorStatusCss;
  delete App.browser.userAgent;
  App.platform.createCanvas = () => ({ kind: 'stale' });

  installBrowserSurfaceAdapter(App);

  assert.equal(App.browser.confirm, firstConfirm);
  assert.equal(App.browser.prompt, firstPrompt);
  assert.equal(App.browser.setDoorStatusCss, firstDoorStatus);
  assert.equal(App.platform.createCanvas, firstCreateCanvas);
  assert.equal(App.browser.userAgent, firstUserAgent);

  assert.equal(App.browser.confirm('keep?'), true);
  assert.equal(App.browser.prompt('name', 7), 'ok');
  App.browser.setDoorStatusCss(true);
  assert.deepEqual(App.platform.createCanvas(9, 11), { kind: 'legacy', width: 9, height: 11 });
  assert.deepEqual(calls, [
    ['confirm', 'keep?'],
    ['prompt', 'name|7'],
    ['attr', 'data-door-status=open'],
  ]);
});
