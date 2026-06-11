import test from 'node:test';
import assert from 'node:assert/strict';

import { installAutosaveService } from '../esm/native/services/autosave.ts';
import { installAppStartService } from '../esm/native/services/app_start.ts';
import { installConfigCompoundsService } from '../esm/native/services/config_compounds.ts';
import { installCameraService } from '../esm/native/services/camera.ts';

function createAutosaveApp() {
  const uiWrites: Array<{ key: string; value: unknown }> = [];
  return {
    App: {
      services: {
        storage: {
          getString() {
            return JSON.stringify({ timestamp: 111, dateString: '08:45' });
          },
        },
      },
      actions: {
        ui: {
          setScalarSoft(key: string, value: unknown) {
            uiWrites.push({ key, value });
          },
        },
      },
    } as any,
    uiWrites,
  };
}

test('service install healing runtime: autosave reinstall preserves live refs and restores missing methods', () => {
  const { App, uiWrites } = createAutosaveApp();

  const svc = installAutosaveService(App);
  const schedule = svc.schedule;
  const flushPending = svc.flushPending;
  const forceSaveNow = svc.forceSaveNow;

  assert.equal(typeof schedule, 'function');
  assert.equal(typeof flushPending, 'function');
  assert.equal(typeof forceSaveNow, 'function');
  assert.equal(uiWrites.length > 0, true);

  const sameSvc = installAutosaveService(App);
  assert.equal(sameSvc, svc);
  assert.equal(sameSvc.schedule, schedule);
  assert.equal(sameSvc.flushPending, flushPending);
  assert.equal(sameSvc.forceSaveNow, forceSaveNow);

  delete (svc as Record<string, unknown>).schedule;
  const healedSvc = installAutosaveService(App);
  assert.equal(healedSvc, svc);
  assert.equal(typeof healedSvc.schedule, 'function');
  assert.equal(healedSvc.flushPending, flushPending);
  assert.equal(healedSvc.forceSaveNow, forceSaveNow);
});

test('service install healing runtime: appStart reinstall heals missing aliases without replacing the start surface', () => {
  const calls: string[] = [];
  const App: any = {
    services: {
      uiBoot: {
        bootMain() {
          calls.push('bootMain');
        },
      },
    },
  };

  const svc = installAppStartService(App);
  const startRef = svc.start;
  const aliasRef = App.services.uiBoot.start;

  assert.equal(typeof startRef, 'function');
  assert.equal(aliasRef, startRef);

  const sameSvc = installAppStartService(App);
  assert.equal(sameSvc, svc);
  assert.equal(sameSvc.start, startRef);
  assert.equal(App.services.uiBoot.start, aliasRef);

  delete App.services.uiBoot.start;
  const healedAliasSvc = installAppStartService(App);
  assert.equal(healedAliasSvc.start, startRef);
  assert.equal(App.services.uiBoot.start, startRef);

  delete svc.start;
  const healedSvc = installAppStartService(App);
  assert.equal(healedSvc, svc);
  assert.equal(typeof healedSvc.start, 'function');
  assert.equal(App.services.uiBoot.start, startRef);

  healedSvc.start?.();
  assert.deepEqual(calls, ['bootMain']);
});

test('service install healing runtime: configCompounds reinstall updates options but preserves live methods unless repair is needed', () => {
  const App: any = { services: Object.create(null) };

  const service = installConfigCompoundsService(App, { maxAttempts: 4, retryDelayMs: 7 });
  const seedRef = service.seed;
  const isSeededRef = service.isSeeded;

  assert.equal(typeof seedRef, 'function');
  assert.equal(typeof isSeededRef, 'function');
  assert.deepEqual(service.options, { maxAttempts: 4, retryDelayMs: 7 });

  const sameService = installConfigCompoundsService(App, { maxAttempts: 9, retryDelayMs: 2 });
  assert.equal(sameService, service);
  assert.equal(sameService.seed, seedRef);
  assert.equal(sameService.isSeeded, isSeededRef);
  assert.deepEqual(sameService.options, { maxAttempts: 9, retryDelayMs: 2 });

  delete (service as Record<string, unknown>).seed;
  const healedService = installConfigCompoundsService(App, { maxAttempts: 1, retryDelayMs: 0 });
  assert.equal(healedService, service);
  assert.equal(typeof healedService.seed, 'function');
  assert.equal(healedService.isSeeded, isSeededRef);
  assert.deepEqual(healedService.options, { maxAttempts: 1, retryDelayMs: 0 });
});

test('service install healing runtime: camera reinstall preserves the canonical slot and restores moveTo when missing', () => {
  const App: any = {};

  const svc = installCameraService(App);
  const moveRef = svc.moveTo;
  assert.equal(typeof moveRef, 'function');

  const sameSvc = installCameraService(App);
  assert.equal(sameSvc, svc);
  assert.equal(sameSvc.moveTo, moveRef);

  delete (svc as Record<string, unknown>).moveTo;
  const healedSvc = installCameraService(App);
  assert.equal(healedSvc, svc);
  assert.equal(typeof healedSvc.moveTo, 'function');
});
