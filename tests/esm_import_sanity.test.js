import test from 'node:test';
import assert from 'node:assert/strict';

test('kernel install module imports cleanly and exposes installers', async () => {
  const mod = await import('../dist/esm/native/kernel/install.js');
  assert.equal(typeof mod.installKernel, 'function');
  assert.equal(typeof mod.installStateApi, 'function');
  assert.equal(typeof mod.installDomainApi, 'function');
  assert.equal(typeof mod.installMapsApi, 'function');
});

test('platform install module imports cleanly and exposes installers', async () => {
  const mod = await import('../dist/esm/native/platform/install.js');
  assert.equal(typeof mod.installPlatform, 'function');
  assert.equal(typeof mod.installRenderScheduler, 'function');
  assert.equal(typeof mod.installRenderLoopImpl, 'function');
  assert.ok(mod.CONFIG_DEFAULTS && typeof mod.CONFIG_DEFAULTS === 'object');
});

test('builder install module imports cleanly and exposes installers', async () => {
  const mod = await import('../dist/esm/native/builder/install.js');
  assert.equal(typeof mod.provideBuilder, 'function');
  assert.equal(typeof mod.installBuilderCore, 'function');
  assert.equal(typeof mod.installRoomDesign, 'function');
});

test('boot manifest imports cleanly and contains a stable BOOT_STEPS list', async () => {
  const mod = await import('../dist/esm/boot/boot_manifest.js');
  assert.ok(Array.isArray(mod.BOOT_STEPS));
  assert.ok(mod.BOOT_STEPS.length > 10);
  const first = mod.BOOT_STEPS[0];
  assert.ok(first && typeof first === 'object');
  assert.equal(typeof first.id, 'string');
  assert.equal(typeof first.phase, 'string');
  assert.equal(typeof first.run, 'function');
});
