import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const read = rel => readFileSync(resolve(here, '..', rel), 'utf8');

test('final root-surface cleanup routes residual runtime/build/service hotspots through canonical seams', () => {
  const buildRunner = [
    read('esm/native/builder/build_runner.ts'),
    read('esm/native/builder/build_runner_runtime.ts'),
  ].join('\n');
  assert.match(buildRunner, /from '\.\.\/runtime\/platform_access\.js';/);
  assert.match(buildRunner, /const reportError = getPlatformReportError\(App\);/);
  assert.doesNotMatch(buildRunner, /app\?\.platform/);

  const chestMode = read('esm/native/builder/chest_mode_pipeline.ts');
  assert.match(chestMode, /from '\.\.\/runtime\/builder_service_access\.js';/);
  assert.match(chestMode, /runBuilderChestModeFollowThrough\(p\.App, \{/);
  assert.doesNotMatch(chestMode, /app\?\.render/);

  const kernel = [
    read('esm/native/kernel/kernel.ts'),
    read('esm/native/kernel/kernel_install_support.ts'),
  ].join('\n');
  assert.match(kernel, /getPlatformReportError,/);
  assert.match(kernel, /reportErrorViaPlatform,/);
  assert.match(kernel, /const reportError = getPlatformReportError\(App\);/);
  assert.doesNotMatch(kernel, /App\?\.platform/);

  const storeReactivity = read('esm/native/runtime/store_reactivity_access.ts');
  assert.match(storeReactivity, /from '\.\/actions_access_domains\.js';/);
  assert.match(storeReactivity, /getStoreActionFn<\(\) => unknown>\(App, 'hasReactivityInstalled'\)/);
  assert.doesNotMatch(storeReactivity, /app\?\.actions/);

  const cameraPresets = read('esm/native/services/camera_presets.ts');
  assert.match(cameraPresets, /from '\.\.\/runtime\/store_surface_access\.js';/);
  assert.match(cameraPresets, /const store = getStoreSurfaceMaybe\(App\);/);
  assert.doesNotMatch(cameraPresets, /App\?\.store/);

  const storeSurface = read('esm/native/runtime/store_surface_access.ts');
  assert.match(storeSurface, /from '\.\/app_roots_access\.js';/);
  assert.match(storeSurface, /const store = readStoreRoot<S>\(App\);/);
  assert.doesNotMatch(storeSurface, /app\?\.store/);

  const cloudSyncFeedback = read('esm/native/services/cloud_sync_support_feedback.ts');
  assert.match(cloudSyncFeedback, /from '\.\.\/runtime\/platform_access\.js';/);
  assert.match(cloudSyncFeedback, /getPlatformReportError\(App\)/);
  assert.doesNotMatch(cloudSyncFeedback, /App\?\.platform\?\.reportError/);

  const historyAccess = read('esm/native/kernel/history_access.ts');
  assert.match(historyAccess, /from '\.\.\/runtime\/actions_access_domains\.js';/);
  assert.match(historyAccess, /const getSystem = getHistoryActionFn<\(\) => unknown>\(A, 'getSystem'\);/);
  assert.match(
    historyAccess,
    /const setSystem = getHistoryActionFn<\(system: HistorySystemLike\) => unknown>/
  );
  assert.doesNotMatch(historyAccess, /A\.actions/);

  const builderProvide = read('esm/native/builder/provide.ts');
  assert.match(builderProvide, /from '\.\.\/runtime\/builder_deps_access\.js';/);
  assert.match(builderProvide, /readBuilderDeps\(getBuilderDepsRoot\(A\)\)/);
  assert.doesNotMatch(builderProvide, /A\.deps/);

  const dirtyFlag = read('esm/native/platform/dirty_flag.ts');
  assert.match(dirtyFlag, /from '\.\.\/runtime\/store_surface_access\.js';/);
  assert.match(dirtyFlag, /readSetDirtyFn\(asObject\(getStoreSurfaceMaybe\(A\)\)\)/);
  assert.doesNotMatch(dirtyFlag, /A\.store/);

  const cachePruning = [
    read('esm/native/platform/cache_pruning.ts'),
    read('esm/native/platform/cache_pruning_shared.ts'),
    read('esm/native/platform/cache_pruning_runtime.ts'),
  ].join('\n');
  assert.match(cachePruning, /readPlatformUtil\(app\)/);
  assert.match(cachePruning, /ensureCachePruningSlots\(root\)/);
  assert.match(cachePruning, /applyCacheLimitsFromApp\(merged, root\)/);
  assert.doesNotMatch(cachePruning, /root\.config/);

  const builderStoreAccess = read('esm/native/builder/store_access.ts');
  assert.match(builderStoreAccess, /from '\.\.\/runtime\/actions_access_core\.js';/);
  assert.match(builderStoreAccess, /from '\.\.\/runtime\/actions_access_domains\.js';/);
  assert.match(builderStoreAccess, /const builder = getActionNamespace\(App, 'builder'\);/);
  assert.match(builderStoreAccess, /const config = getConfigActions\(App\);/);
  assert.doesNotMatch(builderStoreAccess, /asRecord\(asRecord\(App\)\?\.actions\)/);

  const configSelectors = [
    read('esm/native/runtime/config_selectors.ts'),
    read('esm/native/runtime/config_selectors_scalars.ts'),
    read('esm/native/runtime/config_selectors_readers.ts'),
  ].join('\n');
  assert.match(configSelectors, /from '\.\/app_roots_access\.js';/);
  assert.match(configSelectors, /const direct = getConfigRootMaybe<UnknownRecord>\(App\);/);
  assert.doesNotMatch(configSelectors, /appRec\?\.config/);

  const metaProfiles = read('esm/native/runtime/meta_profiles_access.ts');
  assert.match(metaProfiles, /from '\.\/actions_access_domains\.js';/);
  assert.match(metaProfiles, /const metaNs = getMetaActions\(App\);/);
  assert.doesNotMatch(metaProfiles, /appRec\?\.actions/);

  const renderLoopVisuals = [
    read('esm/native/platform/render_loop_visual_effects.ts'),
    read('esm/native/platform/render_loop_visual_effects_shared.ts'),
    read('esm/native/platform/render_loop_visual_effects_mirror.ts'),
    read('esm/native/platform/render_loop_visual_effects_floor.ts'),
    read('esm/native/platform/render_loop_visual_effects_front_overlay.ts'),
  ].join('\n');
  assert.match(renderLoopVisuals, /from '\.\.\/runtime\/config_selectors\.js';/);
  assert.match(renderLoopVisuals, /from '\.\.\/runtime\/three_access\.js';/);
  assert.match(renderLoopVisuals, /setRenderSlot\(App, '__mirrorDirty', true\);/);
  assert.match(renderLoopVisuals, /readConfigNumberLooseFromApp\(App, 'MIRROR_MOTION_HOLD_MS', 220\)/);
  assert.match(
    renderLoopVisuals,
    /assertThreeViaDeps\(App, 'platform\/render_loop_visual_effects\.autoHideFloor'\)/
  );
  assert.doesNotMatch(renderLoopVisuals, /AppBag\.(render|config|deps|view)/);

  const errorsInstall = [
    read('esm/native/ui/errors_install.ts'),
    read('esm/native/ui/errors_install_shared.ts'),
  ].join('\n');
  assert.match(errorsInstall, /(platform_access|services\/api)\.js';/);
  assert.match(errorsInstall, /ensurePlatformRootSurface\(App\)/);
  assert.match(
    errorsInstall,
    /export function platformSurface\(App: AppContainer\): PlatformSurfaceLike \| null \{/
  );
  assert.doesNotMatch(errorsInstall, /root\.platform/);
});
