import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ensureNotesService,
  ensureNotesDraw,
  exitNotesDrawModeViaService,
} from '../esm/native/runtime/notes_access.ts';
import { ensureDoorsService, ensureDrawerService } from '../esm/native/runtime/doors_access.ts';
import { ensurePlatformService, getPlatformService } from '../esm/native/runtime/platform_access.ts';
import { getTools, getUiFeedback } from '../esm/native/runtime/service_access.ts';
import { ensureBuilderService, getBuilderService } from '../esm/native/runtime/builder_service_access.ts';
import {
  ensureCloudSyncServiceState,
  getCloudSyncServiceStateMaybe,
} from '../esm/native/runtime/cloud_sync_access.ts';
import {
  ensureStateKernelService,
  getStateKernelService,
} from '../esm/native/kernel/state_kernel_service.ts';

test('services namespace access helpers share one canonical root without stomping sibling slots', () => {
  let exited = 0;
  const App: any = {};

  const notes = ensureNotesService(App);
  const draw = ensureNotesDraw(App);
  App.services.uiNotes = {
    exitScreenDrawMode() {
      exited += 1;
    },
  };

  const doors = ensureDoorsService(App);
  const drawer = ensureDrawerService(App);
  const platform = ensurePlatformService(App);
  const tools = getTools(App);
  const uiFeedback = getUiFeedback(App);

  assert.equal(typeof App.services, 'object');
  assert.equal(Object.getPrototypeOf(App.services), null);
  assert.equal(App.services.notes, notes);
  assert.equal(App.services.doors, doors);
  assert.equal(App.services.drawer, drawer);
  assert.equal(App.services.platform, platform);
  assert.equal(App.services.tools, tools);
  assert.equal(App.services.uiFeedback, uiFeedback);
  assert.equal(Object.getPrototypeOf(notes), null);
  assert.equal(Object.getPrototypeOf(draw), null);
  assert.equal(Object.getPrototypeOf(doors), null);
  assert.equal(Object.getPrototypeOf(drawer), null);
  assert.equal(Object.getPrototypeOf(platform), null);

  draw.isScreenDrawMode = true;
  assert.equal(exitNotesDrawModeViaService(App), true);
  assert.equal(exited, 1);

  uiFeedback.showToast('alive', 'info');
  assert.equal(typeof tools, 'object');
  assert.equal(typeof uiFeedback.toast, 'function');
});

test('services namespace access helpers ignore legacy root aliases and keep canonical slot ownership', () => {
  const App: any = {
    builder: { legacy: true },
    platform: { legacy: true },
    cloudSync: { legacy: true },
    stateKernel: { legacy: true },
    services: Object.create(null),
  };

  const builder = ensureBuilderService(App);
  const platform = ensurePlatformService(App);
  const cloudSync = ensureCloudSyncServiceState(App);
  const stateKernel = ensureStateKernelService(App);

  assert.equal(getBuilderService(App), builder);
  assert.equal(getPlatformService(App), platform);
  assert.equal(getCloudSyncServiceStateMaybe(App), cloudSync);
  assert.equal(getStateKernelService(App), stateKernel);

  assert.equal(App.services.builder, builder);
  assert.equal(App.services.platform, platform);
  assert.equal(App.services.cloudSync, cloudSync);
  assert.equal(App.services.stateKernel, stateKernel);

  assert.notEqual(builder, App.builder);
  assert.notEqual(platform, App.platform);
  assert.notEqual(cloudSync, App.cloudSync);
  assert.notEqual(stateKernel, App.stateKernel);
  assert.equal(Object.getPrototypeOf(App.services), null);
});
