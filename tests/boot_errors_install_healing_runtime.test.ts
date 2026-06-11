import test from 'node:test';
import assert from 'node:assert/strict';

import { installUiBootMain } from '../esm/native/ui/boot_main.ts';
import { installBootFinalizers } from '../esm/native/services/boot_finalizers.ts';
import { installErrorsSurface } from '../esm/native/ui/errors_install.ts';
import {
  clearErrorsWindowEventsCleanup,
  getErrorsWindowEventsCleanup,
} from '../esm/native/runtime/errors_runtime_access.ts';

function createErrorsHarness() {
  const handlers: Record<string, EventListener | undefined> = Object.create(null);
  const addCalls: string[] = [];
  const removeCalls: string[] = [];
  const win = {
    navigator: { userAgent: 'node-test' },
    location: { reload() {}, href: 'http://localhost/' },
    addEventListener(type: string, handler: EventListener) {
      handlers[type] = handler;
      addCalls.push(type);
    },
    removeEventListener(type: string) {
      delete handlers[type];
      removeCalls.push(type);
    },
  } as any;

  const doc = {
    defaultView: win,
    createElement() {
      return {
        style: {},
        appendChild() {},
        remove() {},
        setAttribute() {},
        addEventListener() {},
        removeEventListener() {},
        textContent: '',
      };
    },
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
    getElementById() {
      return null;
    },
    body: {
      appendChild() {},
      removeChild() {},
    },
  } as any;
  win.document = doc;

  const App: any = {
    deps: {
      browser: {
        window: win,
        document: doc,
        navigator: win.navigator,
        location: win.location,
      },
      THREE: {},
    },
    platform: {
      reportError() {},
    },
    services: {
      platform: {
        ensureRenderLoop() {},
      },
    },
  };

  return { App, handlers, addCalls, removeCalls };
}

test('boot/errors install healing: uiBootMain preserves the canonical entry and heals missing aliases', () => {
  const calls: string[] = [];
  const App: any = {
    services: {
      uiBoot: {
        bootMain() {
          calls.push('boot');
        },
      },
    },
  };

  const uiBoot = installUiBootMain(App);
  const bootMainRef = uiBoot?.bootMain;
  const startRef = uiBoot?.start;

  assert.equal(typeof bootMainRef, 'function');
  assert.equal(startRef, bootMainRef);

  const sameUiBoot = installUiBootMain(App);
  assert.equal(sameUiBoot, uiBoot);
  assert.equal(sameUiBoot?.bootMain, bootMainRef);
  assert.equal(sameUiBoot?.start, startRef);

  delete (uiBoot as Record<string, unknown>).start;
  const healedStart = installUiBootMain(App);
  assert.equal(healedStart?.bootMain, bootMainRef);
  assert.equal(healedStart?.start, bootMainRef);

  delete (uiBoot as Record<string, unknown>).bootMain;
  const healedBootMain = installUiBootMain(App);
  assert.equal(healedBootMain?.start, bootMainRef);
  assert.equal(healedBootMain?.bootMain, bootMainRef);

  healedBootMain?.start?.();
  assert.deepEqual(calls, ['boot']);
});

test('boot/errors install healing: bootFinalizers preserves live commands refs and restores missing methods', () => {
  const App: any = {};

  const commands = installBootFinalizers(App);
  const rebuildRef = commands?.rebuildWardrobe;
  const rebuildDebouncedRef = commands?.rebuildWardrobeDebounced;
  const cleanGroupRef = commands?.cleanGroup;

  assert.equal(typeof rebuildRef, 'function');
  assert.equal(typeof rebuildDebouncedRef, 'function');
  assert.equal(typeof cleanGroupRef, 'function');

  const sameCommands = installBootFinalizers(App);
  assert.equal(sameCommands, commands);
  assert.equal(sameCommands?.rebuildWardrobe, rebuildRef);
  assert.equal(sameCommands?.rebuildWardrobeDebounced, rebuildDebouncedRef);
  assert.equal(sameCommands?.cleanGroup, cleanGroupRef);

  delete (commands as Record<string, unknown>).cleanGroup;
  const healedCommands = installBootFinalizers(App);
  assert.equal(healedCommands, commands);
  assert.equal(healedCommands?.rebuildWardrobe, rebuildRef);
  assert.equal(healedCommands?.rebuildWardrobeDebounced, rebuildDebouncedRef);
  assert.equal(typeof healedCommands?.cleanGroup, 'function');
});

test('boot/errors install healing: errors surface heals missing methods and rebinds window listeners when cleanup is lost', () => {
  const { App, handlers, addCalls, removeCalls } = createErrorsHarness();

  installErrorsSurface(App);
  const errors = App.services.errors;
  const installRef = errors.install;
  const reportErrorRef = App.platform.reportError;

  assert.equal(typeof errors.report, 'function');
  assert.equal(typeof errors.fatal, 'function');
  assert.equal(typeof errors.getHistory, 'function');
  assert.equal(typeof errors.createDebugSnapshot, 'function');
  assert.equal(typeof installRef, 'function');

  installErrorsSurface(App);
  assert.equal(errors.install, installRef);
  assert.equal(App.platform.reportError, reportErrorRef);

  delete errors.getHistory;
  installErrorsSurface(App);
  assert.equal(App.services.errors, errors);
  assert.equal(typeof errors.getHistory, 'function');
  assert.equal(App.platform.reportError, reportErrorRef);

  errors.install();
  assert.equal(addCalls.length, 2);
  assert.equal(typeof handlers.error, 'function');
  assert.equal(typeof handlers.unhandledrejection, 'function');
  assert.equal(typeof getErrorsWindowEventsCleanup(App), 'function');

  errors.install();
  assert.equal(addCalls.length, 2, 'healthy repeated install should not double-bind listeners');

  clearErrorsWindowEventsCleanup(App);
  assert.equal(removeCalls.length, 2);
  assert.equal(handlers.error, undefined);
  assert.equal(handlers.unhandledrejection, undefined);
  assert.equal(getErrorsWindowEventsCleanup(App), null);

  errors.install();
  assert.equal(addCalls.length, 4, 'reinstall should rebind after cleanup state is lost');
  assert.equal(typeof handlers.error, 'function');
  assert.equal(typeof handlers.unhandledrejection, 'function');
  assert.equal(typeof getErrorsWindowEventsCleanup(App), 'function');
});
