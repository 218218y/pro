import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ensureServiceSlot,
  ensureServicesRoot,
  getServiceSlotMaybe,
  getServicesRootMaybe,
} from '../esm/native/runtime/services_root_access.ts';

test('services_root_access creates canonical null-prototype services root and slots', () => {
  const App: Record<string, unknown> = {};

  const services = ensureServicesRoot(App);
  const commands = ensureServiceSlot<Record<string, unknown>>(App, 'commands');

  assert.equal(App.services, services);
  assert.equal(getServicesRootMaybe(App), services);
  assert.equal(getServiceSlotMaybe(App, 'commands'), commands);
  assert.equal(Object.getPrototypeOf(services), null);
  assert.equal(Object.getPrototypeOf(commands), null);
});

test('services_root_access reuses existing services root and preserves sibling slots', () => {
  const services = Object.create(null) as Record<string, unknown>;
  const existingProject = Object.create(null) as Record<string, unknown>;
  services.project = existingProject;

  const App: Record<string, unknown> = { services };
  const buildReactions = ensureServiceSlot<Record<string, unknown>>(App, 'buildReactions');

  assert.equal(ensureServicesRoot(App), services);
  assert.equal(buildReactions, getServiceSlotMaybe(App, 'buildReactions'));
  assert.equal((App.services as Record<string, unknown>).project, existingProject);
  assert.equal(Object.getPrototypeOf(buildReactions), null);
});
