import test from 'node:test';
import assert from 'node:assert/strict';

import { createStore } from '../esm/native/platform/store.ts';
import { installStateApi } from '../esm/native/kernel/state_api.ts';
import { installMapsApi } from '../esm/native/kernel/maps_api.ts';
import { installDomainApi } from '../esm/native/kernel/domain_api.ts';
import { installBrowserUiOpsAdapter } from '../esm/native/adapters/browser/ui_ops.ts';

function createDomainApp() {
  const store = createStore({
    initialState: {
      config: {
        individualColors: {},
        doorSpecialMap: {},
        curtainMap: {},
        removedDoorsMap: {},
        splitDoorsMap: {},
        splitDoorsBottomMap: {},
        doorStyleMap: {},
        mirrorLayoutMap: {},
      },
      runtime: {},
      ui: {},
    },
  });
  const App: any = { store, actions: {}, services: {}, maps: {} };
  installStateApi(App);
  installMapsApi(App);
  installDomainApi(App);
  return App;
}

test('installDomainApi heals missing methods in place without replacing intact action seams', () => {
  const App = createDomainApp();

  const setKeyRef = App.actions.map.setKey;
  const setOpenRef = App.actions.doors.setOpen;
  const setFloorTypeRef = App.actions.room.setFloorType;
  const recomputeRef = App.actions.modules.recompute;

  delete App.actions.colors.setSavedColors;
  delete App.actions.textures.setCustomUploadedDataURL;

  installDomainApi(App);

  assert.equal(App.actions.map.setKey, setKeyRef);
  assert.equal(App.actions.doors.setOpen, setOpenRef);
  assert.equal(App.actions.room.setFloorType, setFloorTypeRef);
  assert.equal(App.actions.modules.recompute, recomputeRef);
  assert.equal(typeof App.actions.colors.setSavedColors, 'function');
  assert.equal(typeof App.actions.textures.setCustomUploadedDataURL, 'function');
});

test('installBrowserUiOpsAdapter heals missing helpers in place without overriding healthy ones', () => {
  const events: string[] = [];
  const doc = {
    body: { style: { cursor: '' }, scrollTop: 4 },
    documentElement: { scrollTop: 6 },
    createElement() {
      return {};
    },
    querySelector() {
      return null;
    },
  };
  const win = {
    devicePixelRatio: 3,
    pageYOffset: 8,
    getSelection() {
      return null;
    },
    getComputedStyle() {
      return { display: 'grid' } as CSSStyleDeclaration;
    },
    scrollTo(x: number, y: number) {
      events.push(`scroll:${x},${y}`);
    },
    setTimeout(fn: () => void) {
      fn();
      return 22;
    },
    clearTimeout(id: unknown) {
      events.push(`clear:${String(id)}`);
    },
    document: doc,
    navigator: { userAgent: 'UA' },
    location: { search: '' },
  };
  const App: any = {
    deps: { browser: { window: win, document: doc } },
    browser: Object.assign(Object.create(null), {}),
  };

  installBrowserUiOpsAdapter(App);

  const getScrollTopRef = App.browser.getScrollTop;
  const getSelectionRef = App.browser.getSelection;

  delete App.browser.scrollTo;
  delete App.browser.clearTimeout;

  installBrowserUiOpsAdapter(App);

  assert.equal(App.browser.getScrollTop, getScrollTopRef);
  assert.equal(App.browser.getSelection, getSelectionRef);
  assert.equal(typeof App.browser.scrollTo, 'function');
  assert.equal(typeof App.browser.clearTimeout, 'function');

  App.browser.scrollTo(5, 9);
  const id = App.browser.setTimeout?.(() => events.push('timeout'), 1);
  App.browser.clearTimeout?.(id);
  assert.deepEqual(events, ['scroll:5,9', 'timeout', 'clear:22']);
});
