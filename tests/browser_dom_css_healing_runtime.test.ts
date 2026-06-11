import test from 'node:test';
import assert from 'node:assert/strict';

import { installBrowserDomAdapter } from '../esm/native/adapters/browser/dom.ts';
import { installDoorStatusCssAdapter } from '../esm/native/adapters/browser/door_status_css.ts';

test('browser DOM/CSS adapters keep canonical refs stable and heal partial public drift', () => {
  const calls: Array<[string, string]> = [];
  const legacyCreateCanvas = (width: number, height: number) => ({ kind: 'legacy', width, height });
  const legacySetDoorStatusCss = (isOpen: boolean) => {
    calls.push(['legacy-door', isOpen ? 'open' : 'closed']);
  };
  const doc = {
    body: {
      setAttribute(name: string, value: string) {
        calls.push(['attr', `${name}=${value}`]);
      },
    },
    querySelector() {
      return null;
    },
    createElement(tag: string) {
      return { tag, width: 0, height: 0 };
    },
  } as any;
  const App: any = {
    deps: {
      browser: {
        document: doc,
      },
    },
    browser: Object.assign(Object.create(null), {
      setDoorStatusCss: legacySetDoorStatusCss,
    }),
    platform: Object.assign(Object.create(null), {
      createCanvas: legacyCreateCanvas,
    }),
  };

  installBrowserDomAdapter(App);
  installDoorStatusCssAdapter(App);

  const firstCreateCanvas = App.platform.createCanvas;
  const firstSetDoorStatusCss = App.browser.setDoorStatusCss;

  assert.equal(App.platform.__wpCreateCanvas, firstCreateCanvas);
  assert.equal(App.browser.__wpSetDoorStatusCss, firstSetDoorStatusCss);

  App.platform.createCanvas = () => ({ kind: 'stale' });
  delete App.browser.setDoorStatusCss;

  installBrowserDomAdapter(App);
  installDoorStatusCssAdapter(App);

  assert.equal(App.platform.createCanvas, firstCreateCanvas);
  assert.equal(App.platform.__wpCreateCanvas, firstCreateCanvas);
  assert.equal(App.browser.setDoorStatusCss, firstSetDoorStatusCss);
  assert.equal(App.browser.__wpSetDoorStatusCss, firstSetDoorStatusCss);

  assert.deepEqual(App.platform.createCanvas(7, 8), { kind: 'legacy', width: 7, height: 8 });
  App.browser.setDoorStatusCss(true);
  assert.deepEqual(calls, [['legacy-door', 'open']]);
});

test('browser DOM/CSS adapters synthesize canonical refs when no public methods exist yet', () => {
  const calls: Array<[string, string]> = [];
  const doc = {
    body: {
      setAttribute(name: string, value: string) {
        calls.push(['attr', `${name}=${value}`]);
      },
    },
    querySelector() {
      return null;
    },
    createElement(tag: string) {
      return { tag, width: 0, height: 0 };
    },
  } as any;
  const App: any = {
    deps: {
      browser: {
        document: doc,
      },
    },
  };

  installBrowserDomAdapter(App);
  installDoorStatusCssAdapter(App);

  const firstCreateCanvas = App.platform.createCanvas;
  const firstSetDoorStatusCss = App.browser.setDoorStatusCss;

  assert.equal(typeof firstCreateCanvas, 'function');
  assert.equal(typeof firstSetDoorStatusCss, 'function');
  assert.equal(App.platform.__wpCreateCanvas, firstCreateCanvas);
  assert.equal(App.browser.__wpSetDoorStatusCss, firstSetDoorStatusCss);
  assert.deepEqual(firstCreateCanvas(3, 4), { tag: 'canvas', width: 3, height: 4 });

  delete App.platform.createCanvas;
  delete App.browser.setDoorStatusCss;

  installBrowserDomAdapter(App);
  installDoorStatusCssAdapter(App);

  assert.equal(App.platform.createCanvas, firstCreateCanvas);
  assert.equal(App.browser.setDoorStatusCss, firstSetDoorStatusCss);
  App.browser.setDoorStatusCss(false);
  assert.deepEqual(calls, [['attr', 'data-door-status=closed']]);
});
