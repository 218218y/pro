import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

function read(rel) {
  return fs.readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
}

test('render/config canonical owners route hotspot files through app_roots_access + render_access seams', () => {
  const appRoots = read('esm/native/runtime/app_roots_access.ts');
  assert.match(appRoots, /getConfigRootMaybe/);
  assert.match(appRoots, /ensureConfigRoot/);
  assert.match(appRoots, /getRenderRootMaybe/);
  assert.match(appRoots, /ensureRenderRoot/);

  const renderShared = read('esm/native/runtime/render_access_shared.ts');
  assert.match(renderShared, /from '\.\/app_roots_access\.js';/);
  assert.match(renderShared, /getRenderRootMaybe<RenderBag>/);
  assert.match(renderShared, /ensureRenderRoot<RenderBag>\(App, createRenderBag\)/);
  assert.doesNotMatch(renderShared, /a\.render/);

  const configDefaults = read('esm/native/platform/config_defaults.ts');
  assert.match(configDefaults, /from '\.\.\/runtime\/app_roots_access\.js';/);
  assert.match(configDefaults, /getConfigRootMaybe\(App\)/);
  assert.match(configDefaults, /ensureConfigRoot<UnknownRecord>\(App, cloneConfigDefaults\)/);
  assert.doesNotMatch(configDefaults, /root\.config/);

  const viewerResize = read('esm/native/ui/interactions/viewer_resize.ts');
  assert.match(viewerResize, /(render_access|services\/api)\.js';/);
  assert.match(viewerResize, /getRenderNamespace\(App\)/);
  assert.match(viewerResize, /ensureRenderNamespace\(App\)/);
  assert.doesNotMatch(viewerResize, /appWithRender\.render/);

  const lifecycleVisibility = read('esm/native/platform/lifecycle_visibility.ts');
  assert.match(lifecycleVisibility, /getLoopRaf\(root\)/);
  assert.match(lifecycleVisibility, /setLoopRaf\(root, 0\)/);
  assert.match(lifecycleVisibility, /runPlatformWakeupFollowThrough\(root, \{/);
  assert.doesNotMatch(lifecycleVisibility, /root\.render/);

  const renderScheduler = read('esm/native/platform/render_scheduler.ts');
  assert.match(renderScheduler, /ensureRenderNamespace\(A\)/);
  assert.match(renderScheduler, /getRenderer\(A\)/);
  assert.match(renderScheduler, /(?:ensurePlatformRootSurface\((?:A|App)\)|readTriggerRenderSurface\(A\))/);
  assert.doesNotMatch(renderScheduler, /A\.render/);

  const renderLoop = [
    read('esm/native/platform/render_loop_impl.ts'),
    read('esm/native/platform/render_loop_impl_runtime.ts'),
  ].join('\n');
  assert.match(renderLoop, /(?:ensureRenderNamespace\(root\)|ensureRenderInstallHost\(root\))/);
  assert.match(renderLoop, /setRenderSlot\(A, '__frameStartMs', frameStartMs\)/);
  assert.match(renderLoop, /getRenderSlot\(A, '__wpAutoHideFloorTick'\)/);
  assert.doesNotMatch(renderLoop, /A\.render/);
});
